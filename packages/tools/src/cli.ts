#!/usr/bin/env node

import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { validateScene } from "./scene/validate-scene";
import { uploadAsset } from "./upload/upload-asset";
import { bakeAnimation } from "./bake/bake-animation";
import { inspectGltf } from "./inspect/inspect-gltf";
import { OptimizeService } from "./optimize-service";
import { fileExists, resolveProjectPath, readJsonFile, writeJsonFile, getUploadedAssetsPath, getUploadedAvatarsPath } from "./file-utils";
import type { OOAsset } from "./types";
import type { UploadedAsset } from "./upload/upload-asset";

function printUsage() {
  console.error(`Usage: tools <command> [options]

Commands:
  add-model <path>          Upload, optimize, and register a 3D model (GLB/GLTF)
  add-avatar <path>         Upload, optimize, and register an avatar asset
  optimize-model <path>     Optimize a 3D model asset
  optimize-vrm <path>       Optimize a VRM-compatible avatar asset
  bake-anim <fbx-path>      Bake a Mixamo FBX animation to JSON
  upload-asset <source>     Upload a local asset to the project
  validate-scene            Validate the project's static-scene.json
  inspect-gltf <path>       Inspect a GLTF/GLB file metadata
  run-space                 Run a headless space program against a scene snapshot

Global options:
  --project-dir=PATH        Project directory (default: cwd)

optimize-model options:
  --no-draco                Disable Draco compression
  --no-meshopt              Disable MeshOptimizer simplification
  --no-weld                 Disable vertex welding

bake-anim options:
  <name>                    Optional animation name (2nd positional arg)

add-model options:
  --name=NAME               Override asset name
  --no-draco                Disable Draco compression
  --no-meshopt              Disable MeshOptimizer simplification
  --no-weld                 Disable vertex welding

add-avatar options:
  --name=NAME               Override avatar name

upload-asset options:
  --name=NAME               Override asset name

run-space options:
  --scene=PATH              Path to the scene snapshot JSON
  --file=PATH               Path to a TS module exporting a space program
  --stdin                   Read the space program module source from stdin`);
}

function parseArgs(argv: string[]) {
  const args: { positional: string[]; flags: Record<string, string | boolean> } = {
    positional: [],
    flags: {},
  };

  for (const arg of argv) {
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        args.flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else if (arg.startsWith("--no-")) {
        args.flags[arg.slice(5)] = false;
      } else {
        args.flags[arg.slice(2)] = true;
      }
    } else {
      args.positional.push(arg);
    }
  }

  return args;
}

function outputJson(data: unknown) {
  const seen = new WeakSet<object>();

  console.log(
    JSON.stringify(
      data === undefined ? null : data,
      (_key, value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }

        if (value instanceof Map) {
          return Object.fromEntries(value);
        }

        if (value instanceof Set) {
          return [...value];
        }

        if (value instanceof Error) {
          return {
            message: value.message,
            name: value.name,
            stack: value.stack,
          };
        }

        if (value && typeof value === "object") {
          if (seen.has(value)) {
            return "[Circular]";
          }

          seen.add(value);
        }

        return value;
      },
      2,
    ),
  );
}

function fail(message: string): never {
  outputJson({ error: true, message });
  process.exit(1);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const command = positional[0];
  const projectDirFlag = flags["project-dir"] as string | undefined;
  const projectDir = resolve(projectDirFlag || process.cwd());

  if (!command || flags["help"] === true) {
    printUsage();
    process.exit(flags["help"] === true ? 0 : command ? 0 : 1);
  }

  switch (command) {
    case "add-model": {
      const sourcePath = positional[1];
      if (!sourcePath) fail("Missing required argument: <path>");

      try {
        // Step 1: Upload (hash, copy, register)
        const uploaded = await uploadAsset({
          sourcePath,
          projectDir,
          name: flags["name"] as string | undefined,
        });

        // Step 2: Optimize
        const publicDir = resolveProjectPath(projectDir, "public");
        const asset: OOAsset = {
          type: "model",
          url: uploaded.url,
          mime_type: uploaded.mimeType,
        };
        const compressionOptions = {
          useWeld: flags["weld"] !== false,
          useDraco: flags["draco"] !== false,
          useMeshOpt: flags["meshopt"] !== false,
        };
        const optimized = await OptimizeService.optimizeAsset(asset, compressionOptions, { publicDir });

        // Step 3: Update uploaded_assets.json with optimized URLs
        const assetsPath = getUploadedAssetsPath(projectDir);
        if (await fileExists(assetsPath)) {
          const assets = await readJsonFile<UploadedAsset[]>(assetsPath);
          const entry = assets.find((a) => a.hash === uploaded.hash);
          if (entry) {
            entry.d_optimized_files = optimized.optimized;
            await writeJsonFile(assetsPath, assets);
          }
        }

        outputJson({
          url: uploaded.url,
          optimized: optimized.optimized,
          name: uploaded.name,
          mimeType: uploaded.mimeType,
        });
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
      break;
    }

    case "add-avatar": {
      const sourcePath = positional[1];
      if (!sourcePath) fail("Missing required argument: <path>");

      try {
        // Step 1: Upload (hash, copy, register in uploaded_assets.json)
        const uploaded = await uploadAsset({
          sourcePath,
          projectDir,
          name: flags["name"] as string | undefined,
        });

        // Step 2: Optimize VRM
        const publicDir = resolveProjectPath(projectDir, "public");
        const relativePath = uploaded.url.replace(/^\/+/, "");
        const resolvedPath = resolveProjectPath(projectDir, "public", relativePath);
        const buffer = await readFile(resolvedPath);
        const urlCompressed = await OptimizeService.optimizeVRM(buffer, basename(uploaded.url), publicDir);

        // Step 3: Register in uploaded_avatars.json
        const avatarsPath = getUploadedAvatarsPath(projectDir);
        let avatars: any[] = [];
        if (await fileExists(avatarsPath)) {
          avatars = await readJsonFile<any[]>(avatarsPath);
        }
        const existingAvatar = avatars.find((a: any) => a.fileHash === uploaded.hash);
        if (!existingAvatar) {
          avatars.push({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            fileHash: uploaded.hash,
            url: uploaded.url,
            urlCompressed,
            name: uploaded.name,
            createdAt: Date.now(),
          });
          await writeJsonFile(avatarsPath, avatars);
        }

        outputJson({
          url: uploaded.url,
          urlCompressed,
          name: uploaded.name,
        });
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
      break;
    }

    case "optimize-model": {
      const assetPath = positional[1];
      if (!assetPath) fail("Missing required argument: <path>");

      const relativePath = assetPath.replace(/^\/+/, "");
      const resolvedPath = resolveProjectPath(projectDir, "public", relativePath);
      if (!(await fileExists(resolvedPath))) {
        fail(`File not found: ${assetPath}`);
      }

      const publicDir = resolveProjectPath(projectDir, "public");
      const asset: OOAsset = {
        type: "model",
        url: assetPath,
        mime_type: "model/gltf-binary",
      };

      const compressionOptions = {
        useWeld: flags["weld"] !== false,
        useDraco: flags["draco"] !== false,
        useMeshOpt: flags["meshopt"] !== false,
      };

      try {
        const result = await OptimizeService.optimizeAsset(asset, compressionOptions, { publicDir });
        outputJson(result);
      } catch (err) {
        fail(`Optimization failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      break;
    }

    case "optimize-vrm": {
      const assetPath = positional[1];
      if (!assetPath) fail("Missing required argument: <path>");

      const relativePath = assetPath.replace(/^\/+/, "");
      const resolvedPath = resolveProjectPath(projectDir, "public", relativePath);
      if (!(await fileExists(resolvedPath))) {
        fail(`File not found: ${assetPath}`);
      }

      const publicDir = resolveProjectPath(projectDir, "public");
      const filename = basename(assetPath);

      try {
        const buffer = await readFile(resolvedPath);
        const url = await OptimizeService.optimizeVRM(buffer, filename, publicDir);
        outputJson({ optimizedUrl: url });
      } catch (err) {
        fail(`VRM optimization failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      break;
    }

    case "bake-anim": {
      const fbxPath = positional[1];
      if (!fbxPath) fail("Missing required argument: <fbx-path>");

      try {
        const result = await bakeAnimation({
          fbxPath,
          projectDir,
          name: positional[2],
        });
        outputJson(result);
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
      break;
    }

    case "upload-asset": {
      const sourcePath = positional[1];
      if (!sourcePath) fail("Missing required argument: <source-path>");

      try {
        const result = await uploadAsset({
          sourcePath,
          projectDir,
          name: flags["name"] as string | undefined,
        });
        outputJson(result);
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
      break;
    }

    case "validate-scene": {
      try {
        const result = await validateScene(projectDir);
        outputJson(result);
        if (!result.valid) process.exit(1);
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
      break;
    }

    case "inspect-gltf": {
      const filePath = positional[1];
      if (!filePath) fail("Missing required argument: <path>");

      try {
        const result = await inspectGltf(filePath);
        outputJson(result);
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
      break;
    }

    case "run-space": {
      const scenePath = flags["scene"] as string | undefined;
      const programPath = flags["file"] as string | undefined;
      const useStdin = flags["stdin"] === true;

      if (!scenePath) {
        fail("Missing required option: --scene=<path>");
      }

      if ((programPath ? 1 : 0) + (useStdin ? 1 : 0) !== 1) {
        fail("Provide exactly one program input: --file=<path> or --stdin");
      }

      try {
        const { runSpaceProgram } = await import("./space/run-space");
        const result = await runSpaceProgram({
          programPath,
          projectDir: projectDirFlag ? projectDir : undefined,
          scenePath,
          sourceText: useStdin ? await readStdin() : undefined,
        });

        outputJson(result);
        process.exit(0);
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
      break;
    }

    default:
      fail(`Unknown command: ${command}`);
  }
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
