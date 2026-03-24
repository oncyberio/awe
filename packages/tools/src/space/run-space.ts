import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fileExists, readJsonFile } from "../file-utils";
import type { RunSpaceContext, SpaceProgram, SpaceSnapshot } from "./types";

interface RawScene {
  id?: string;
  creatorId?: string;
  editors?: string[];
  components?: Record<string, any>;
  items?: any[];
}

export interface RunSpaceOptions {
  programPath?: string;
  projectDir?: string;
  scenePath: string;
  sourceText?: string;
}

interface LoadedProgram {
  cleanup: () => Promise<void>;
  program: SpaceProgram;
}

function isAbsoluteAssetUrl(url: string): boolean {
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    url.startsWith("file://")
  );
}

function normalizeScene(raw: RawScene): SpaceSnapshot {
  let components: Record<string, any> = {};

  if (raw.components && typeof raw.components === "object" && !Array.isArray(raw.components)) {
    components = raw.components;
  } else if (Array.isArray(raw.items)) {
    for (const item of raw.items) {
      if (item?.id) {
        components[item.id] = item;
      }
    }
  }

  return {
    id: raw.id ?? "run-space-scene",
    creatorId: raw.creatorId ?? "run-space",
    editors: raw.editors ?? ["run-space"],
    components,
  };
}

function inferProjectDir(scenePath: string, projectDir?: string): string {
  if (projectDir) {
    return resolve(projectDir);
  }

  const resolvedScenePath = resolve(scenePath);
  const publicSegment = `${sep}public${sep}`;
  const publicIndex = resolvedScenePath.lastIndexOf(publicSegment);

  if (publicIndex !== -1) {
    return resolvedScenePath.slice(0, publicIndex);
  }

  return process.cwd();
}

function createSceneAssetResolver(scenePath: string, publicDir: string | null) {
  const sceneDir = dirname(scenePath);

  return (url: string): string => {
    if (!url || isAbsoluteAssetUrl(url)) {
      return url;
    }

    if (url.startsWith("/") && publicDir) {
      return pathToFileURL(resolve(publicDir, url.slice(1))).href;
    }

    if (url.startsWith("./") || url.startsWith("../")) {
      return pathToFileURL(resolve(sceneDir, url)).href;
    }

    return url;
  };
}

async function withFileFetch<T>(callback: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: any, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.startsWith("file://")) {
      const filePath = fileURLToPath(url);

      if (!(await fileExists(filePath))) {
        return new Response(null, {
          status: 404,
          statusText: "Not Found",
        });
      }

      const buffer = await readFile(filePath);
      return new Response(buffer);
    }

    return originalFetch(input, init);
  };

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function resolveProgram(moduleExports: Record<string, unknown>): SpaceProgram {
  const program =
    typeof moduleExports.default === "function"
      ? moduleExports.default
      : moduleExports.run;

  if (typeof program !== "function") {
    throw new Error(
      "Space program must export a default function or a named `run` function.",
    );
  }

  return program as SpaceProgram;
}

async function loadSpaceProgram(opts: RunSpaceOptions): Promise<LoadedProgram> {
  const packageTempDir = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    ".run-space-tmp",
  );

  await mkdir(packageTempDir, { recursive: true });

  const tempRoot = await mkdtemp(
    join(packageTempDir, "run-space-program-"),
  );
  const tempPath = join(tempRoot, "program.ts");

  let sourceText = opts.sourceText;

  if (!sourceText && opts.programPath) {
    sourceText = await readFile(resolve(opts.programPath), "utf-8");
  }

  if (!sourceText) {
    throw new Error("Missing space program source.");
  }

  await writeFile(tempPath, sourceText, "utf-8");

  try {
    const moduleExports = await import(
      `${pathToFileURL(tempPath).href}?t=${Date.now()}`
    );

    return {
      cleanup: async () => {
        await rm(tempRoot, { force: true, recursive: true });
      },
      program: resolveProgram(moduleExports),
    };
  } catch (error) {
    await rm(tempRoot, { force: true, recursive: true });
    throw error;
  }
}

async function getEngineHeadlessCtor(): Promise<any> {
  const modulePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../engine/src/engine-headless.ts",
  );
  const moduleExports = await import(pathToFileURL(modulePath).href);
  return moduleExports.default?.EngineHeadless ?? moduleExports.EngineHeadless;
}

async function waitForEngineReset(engine: { sessionState: string }): Promise<void> {
  for (let index = 0; index < 20 && engine.sessionState !== "void"; index += 1) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
}

export async function runSpaceProgram(opts: RunSpaceOptions): Promise<unknown> {
  const scenePath = resolve(opts.scenePath);
  const projectDir = inferProjectDir(scenePath, opts.projectDir);
  const publicDirPath = resolve(projectDir, "public");
  const publicDir = (await fileExists(publicDirPath)) ? publicDirPath : null;
  const snapshot = normalizeScene(
    await readJsonFile<RawScene>(scenePath),
  );
  const EngineHeadless = await getEngineHeadlessCtor();
  const engine = new EngineHeadless();
  const loadedProgram = await loadSpaceProgram(opts);

  let space: RunSpaceContext["space"] | null = null;

  try {
    return await withFileFetch(async () => {
      const { space: createdSpace, reveal } = await engine.createSpace({
        runtime: "headless",
        mode: "game",
        game: snapshot,
        user: {
          id: "run-space",
          name: "run-space",
        },
        assets: {
          customResolver: createSceneAssetResolver(scenePath, publicDir),
        },
      });

      await reveal();

      space = createdSpace;

      return loadedProgram.program({
        engine,
        projectDir,
        publicDir,
        scenePath,
        snapshot,
        space,
      });
    });
  } finally {
    if (space) {
      space.destroy();
      await waitForEngineReset(engine);
    }

    await loadedProgram.cleanup();
  }
}
