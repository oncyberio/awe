import { afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const packageDir = path.resolve(__dirname, "..", "..");
export const repoRoot = path.resolve(packageDir, "..", "..");
export const cliPath = path.resolve(packageDir, "src", "cli.ts");
export const tsxPath = path.resolve(repoRoot, "node_modules", ".bin", "tsx");
export const artifactsDir = path.resolve(packageDir, "artifacts");

export const soccerFieldFixture = path.join(artifactsDir, "soccer-field.glb");
export const slideAnimFixture = path.join(artifactsDir, "slide-anim.fbx");
export const pepeVrmFixture = path.join(artifactsDir, "pepe-vrm.glb");

const tempDirs = new Set<string>();

export function makeTempProjectDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tools-cli-test-"));
  tempDirs.add(tempDir);
  return tempDir;
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function copyFixture(sourcePath: string, destinationPath: string): void {
  ensureDir(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

export function runCli(
  args: string[],
  cwd = repoRoot,
  input?: string,
): { stdout: string; exitCode: number } {
  const result = spawnSync(tsxPath, [cliPath, ...args], {
    cwd,
    input,
    stdio: "pipe",
    encoding: "utf-8",
    env: {
      ...process.env,
      NO_COLOR: "1",
    },
    timeout: 180_000,
  });

  if (result.error) {
    throw result.error;
  }

  return {
    stdout: (result.stderr ?? "") + (result.stdout ?? ""),
    exitCode: result.status ?? 1,
  };
}

export function extractLastJson<T>(output: string): T {
  const trimmed = output.trim();

  for (let i = trimmed.length - 1; i >= 0; i -= 1) {
    if (trimmed[i] !== "{" && trimmed[i] !== "[") continue;

    try {
      return JSON.parse(trimmed.slice(i)) as T;
    } catch {
      continue;
    }
  }

  throw new Error(`No JSON payload found in output:\n${output}`);
}

export function publicPathFromUrl(projectDir: string, url: string): string {
  return path.join(projectDir, "public", url.replace(/^\/+/, ""));
}

afterEach(() => {
  for (const tempDir of tempDirs) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  tempDirs.clear();
});
