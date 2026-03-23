import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

const CLI_PATH = path.resolve(__dirname, "../index.ts");
// Use the local monorepo root for testing instead of cloning from GitHub
const MONOREPO_ROOT = path.resolve(__dirname, "../../../..");
const MONOREPO_BRANCH = execSync("git rev-parse --abbrev-ref HEAD", {
  cwd: MONOREPO_ROOT,
  stdio: "pipe",
})
  .toString()
  .trim();

function runCli(
  args: string,
  cwd: string,
  env?: Record<string, string>,
): { stdout: string; exitCode: number } {
  return runCliEntry(CLI_PATH, args, cwd, env);
}

function runCliEntry(
  entryPath: string,
  args: string,
  cwd: string,
  env?: Record<string, string>,
): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`npx tsx "${entryPath}" ${args}`, {
      cwd,
      stdio: "pipe",
      env: {
        ...process.env,
        NO_COLOR: "1",
        AWE_REPO_URL: MONOREPO_ROOT,
        AWE_REPO_BRANCH: MONOREPO_BRANCH,
        ...env,
      },
      timeout: 120000,
    }).toString();
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout?.toString() ?? "") + (err.stderr?.toString() ?? ""),
      exitCode: err.status ?? 1,
    };
  }
}

describe("CLI integration", { timeout: 30000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-oncyber-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates a project with --skip-install --skip-git", () => {
    const { stdout, exitCode } = runCli(
      "test-project --template starter --use-pnpm --skip-install --skip-git",
      tmpDir,
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Success!");
    expect(stdout).toContain("test-project");

    const projectDir = path.join(tmpDir, "test-project");
    expect(fs.existsSync(projectDir)).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "pnpm-workspace.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "apps/test-project/package.json"))).toBe(true);
  });

  it("sets project name in apps/<project-name>/package.json and root package.json", () => {
    runCli("my-cool-game --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const gamePkgPath = path.join(
      tmpDir,
      "my-cool-game",
      "apps/my-cool-game/package.json",
    );
    const gamePkg = JSON.parse(fs.readFileSync(gamePkgPath, "utf-8"));
    expect(gamePkg.name).toBe("my-cool-game");

    const rootPkgPath = path.join(tmpDir, "my-cool-game", "package.json");
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
    expect(rootPkg.name).toBe("my-cool-game");
  });

  it("converts project name to kebab-case", () => {
    runCli("MyCoolGame --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const projectDir = path.join(tmpDir, "my-cool-game");
    expect(fs.existsSync(projectDir)).toBe(true);

    const gamePkg = JSON.parse(
      fs.readFileSync(
        path.join(projectDir, "apps/my-cool-game/package.json"),
        "utf-8",
      ),
    );
    expect(gamePkg.name).toBe("my-cool-game");
  });

  it("removes unwanted directories from clone", () => {
    runCli("cleanup-test --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const projectDir = path.join(tmpDir, "cleanup-test");
    expect(fs.existsSync(path.join(projectDir, "examples"))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, "docs"))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, "packages/create-oncyber-app"))).toBe(false);
  });

  it("keeps the root CLAUDE.md unchanged in scaffolded projects", () => {
    runCli("claude-guidance --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const claudeMd = fs.readFileSync(
      path.join(tmpDir, "claude-guidance", "CLAUDE.md"),
      "utf-8",
    );

    expect(claudeMd).not.toContain("/apps/claude-guidance");
    expect(claudeMd).not.toContain("/examples/starter");
    expect(claudeMd).not.toContain("workspace packages in `/packages`");
    expect(claudeMd).not.toContain("does not keep an `/examples` directory");
    expect(claudeMd).toContain("# Examples");
  });

  it("removes template scripts from root package.json", () => {
    runCli("scripts-test --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "scripts-test", "package.json"), "utf-8"),
    );
    expect(rootPkg.scripts["template:dev"]).toBeUndefined();
    expect(rootPkg.scripts["template:check"]).toBeUndefined();
    expect(rootPkg.scripts["create-game"]).toBeUndefined();
    // Should keep other scripts
    expect(rootPkg.scripts["dev"]).toBeDefined();
  });

  it("writes pnpm workspace scripts for generated projects", () => {
    runCli("pnpm-script-test --template starter --skip-install --skip-git", tmpDir);

    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "pnpm-script-test", "package.json"), "utf-8"),
    );

    expect(rootPkg.packageManager).toBe("pnpm@10.10.0");
    expect(rootPkg.workspaces).toEqual(["packages/*", "apps/*"]);
    expect(rootPkg.scripts["dev"]).toBe(
      "pnpm --filter pnpm-script-test dev",
    );
    expect(rootPkg.scripts["build"]).toBe(
      "pnpm --filter pnpm-script-test build",
    );
  });

  it("removes examples/* from pnpm-workspace.yaml and keeps apps/*", () => {
    runCli("workspace-test --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const workspacePath = path.join(tmpDir, "workspace-test", "pnpm-workspace.yaml");
    const content = fs.readFileSync(workspacePath, "utf-8");
    expect(content).not.toContain("examples");
    expect(content).toContain("packages");
    expect(content).toContain("apps");
  });

  it("fails when directory already exists", () => {
    fs.mkdirSync(path.join(tmpDir, "existing-dir"));
    const { exitCode, stdout } = runCli(
      "existing-dir --template starter --use-pnpm --skip-install --skip-git",
      tmpDir,
    );

    expect(exitCode).not.toBe(0);
    expect(stdout).toContain("already exists");
  });

  it("fails with unknown template", () => {
    const { exitCode, stdout } = runCli(
      "bad-template --template nonexistent --use-pnpm --skip-install --skip-git",
      tmpDir,
    );

    expect(exitCode).not.toBe(0);
    expect(stdout).toContain("Unknown template");
    expect(stdout).toContain("nonexistent");
  });

  it("fails fast when --use-npm is passed", () => {
    const { exitCode, stdout } = runCli(
      "bad-package-manager --use-npm --skip-install --skip-git",
      tmpDir,
    );

    expect(exitCode).not.toBe(0);
    expect(stdout).toContain("pnpm only");
  });

  it("fails fast when --use-yarn is passed", () => {
    const { exitCode, stdout } = runCli(
      "bad-package-manager --use-yarn --skip-install --skip-git",
      tmpDir,
    );

    expect(exitCode).not.toBe(0);
    expect(stdout).toContain("pnpm only");
  });

  it("initializes git repo when --skip-git is not passed", () => {
    runCli("git-test --template starter --use-pnpm --skip-install", tmpDir);

    const projectDir = path.join(tmpDir, "git-test");
    expect(fs.existsSync(path.join(projectDir, ".git"))).toBe(true);

    // Check that initial commit was made
    const log = execSync("git log --oneline", {
      cwd: projectDir,
      stdio: "pipe",
    }).toString();
    expect(log).toContain("Initial commit from create-oncyber-app");
  });

  it("skips git init when --skip-git is passed", () => {
    runCli("no-git-test --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const projectDir = path.join(tmpDir, "no-git-test");
    expect(fs.existsSync(path.join(projectDir, ".git"))).toBe(false);
  });

  it("shows install command in next steps when --skip-install is passed", () => {
    const { stdout } = runCli(
      "skip-install-test --template starter --use-pnpm --skip-install --skip-git",
      tmpDir,
    );

    expect(stdout).toContain("pnpm install");
    expect(stdout).toContain("pnpm dev");
  });

  it("shows --help output", () => {
    const { stdout, exitCode } = runCli("--help", tmpDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("--template");
    expect(stdout).toContain("--skip-install");
    expect(stdout).toContain("--skip-git");
    expect(stdout).toContain("Uses pnpm automatically");
    expect(stdout).not.toContain("--use-npm");
    expect(stdout).not.toContain("--use-yarn");
    expect(stdout).toContain("update");
    expect(stdout).toContain("Templates:");
    expect(stdout).toContain("starter");
    expect(stdout).toContain("multiplayer");
  });

  it("shows --version output", () => {
    const { stdout, exitCode } = runCli("--version", tmpDir);

    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("shows help when invoked through a symlinked entrypoint", () => {
    const symlinkPath = path.join(tmpDir, "create-oncyber-app.ts");
    fs.symlinkSync(CLI_PATH, symlinkPath);

    const { stdout, exitCode } = runCliEntry(symlinkPath, "--help", tmpDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("create-oncyber-app");
  });

  it("includes packages/ directory in scaffolded project", () => {
    runCli("packages-test --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const projectDir = path.join(tmpDir, "packages-test");
    expect(fs.existsSync(path.join(projectDir, "packages/engine"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "packages/studio"))).toBe(true);
  });

  it("keeps workspace:* dependencies in apps/<project-name> (monorepo)", () => {
    runCli("workspace-deps --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const gamePkg = JSON.parse(
      fs.readFileSync(
        path.join(tmpDir, "workspace-deps", "apps/workspace-deps/package.json"),
        "utf-8",
      ),
    );
    const engineDep = gamePkg.dependencies?.["@oncyberio/engine"];
    expect(engineDep).toBe("workspace:*");
  });

  it("scaffolds with multiplayer template", () => {
    const { stdout, exitCode } = runCli(
      "mp-test --template multiplayer --use-pnpm --skip-install --skip-git",
      tmpDir,
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Success!");

    const projectDir = path.join(tmpDir, "mp-test");
    expect(fs.existsSync(path.join(projectDir, "apps/mp-test/package.json"))).toBe(true);

    // Multiplayer template should have server/ and shared/ dirs
    expect(fs.existsSync(path.join(projectDir, "apps/mp-test/server"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "apps/mp-test/shared"))).toBe(true);

    // Should have colyseus dependency
    const gamePkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, "apps/mp-test/package.json"), "utf-8"),
    );
    expect(gamePkg.name).toBe("mp-test");
    expect(gamePkg.dependencies?.["colyseus"]).toBeDefined();
  });
});

describe("CLI local mode", { timeout: 30000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    // Create a fake monorepo structure
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-oncyber-local-"));
    fs.writeFileSync(
      path.join(tmpDir, "pnpm-workspace.yaml"),
      'packages:\n  - "packages/*"\n  - "apps/*"\n  - "examples/*"\n',
    );
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "awe", private: true }, null, 2),
    );
    // Create fake packages/engine so detection works
    fs.mkdirSync(path.join(tmpDir, "packages/engine"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "packages/engine/package.json"),
      JSON.stringify({ name: "@oncyberio/engine" }, null, 2),
    );
    // Create a fake template in examples/starter
    const starterDir = path.join(tmpDir, "examples/starter");
    fs.mkdirSync(path.join(starterDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(starterDir, "package.json"),
      JSON.stringify({ name: "starter", version: "0.0.0" }, null, 2),
    );
    fs.writeFileSync(path.join(starterDir, "src/index.ts"), "// game code");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates app in apps/ when --local is passed", () => {
    const { stdout, exitCode } = runCli(
      "my-game --local --template starter --skip-install",
      tmpDir,
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Success!");
    expect(stdout).toContain("my-game");

    const appDir = path.join(tmpDir, "apps/my-game");
    expect(fs.existsSync(appDir)).toBe(true);
    expect(fs.existsSync(path.join(appDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(appDir, "src/index.ts"))).toBe(true);
  });

  it("skips generated template artifacts in local mode", () => {
    const starterDir = path.join(tmpDir, "examples/starter");
    fs.mkdirSync(path.join(starterDir, ".next/static"), { recursive: true });
    fs.mkdirSync(path.join(starterDir, "node_modules/fake-package"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(starterDir, "dist"), { recursive: true });
    fs.writeFileSync(
      path.join(starterDir, ".next/static/chunk.js"),
      "compiled output",
    );
    fs.writeFileSync(
      path.join(starterDir, "node_modules/fake-package/index.js"),
      "module.exports = {};",
    );
    fs.writeFileSync(path.join(starterDir, "dist/output.js"), "compiled output");
    fs.writeFileSync(
      path.join(starterDir, "tsconfig.tsbuildinfo"),
      "typescript cache",
    );

    const { exitCode } = runCli(
      "clean-game --local --template starter --skip-install",
      tmpDir,
    );

    expect(exitCode).toBe(0);

    const appDir = path.join(tmpDir, "apps/clean-game");
    expect(fs.existsSync(path.join(appDir, ".next"))).toBe(false);
    expect(fs.existsSync(path.join(appDir, "node_modules"))).toBe(false);
    expect(fs.existsSync(path.join(appDir, "dist"))).toBe(false);
    expect(fs.existsSync(path.join(appDir, "tsconfig.tsbuildinfo"))).toBe(false);
    expect(fs.existsSync(path.join(appDir, "src/index.ts"))).toBe(true);
  });

  it("sets app name in package.json", () => {
    runCli("cool-game --local --template starter --skip-install", tmpDir);

    const pkg = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "apps/cool-game/package.json"), "utf-8"),
    );
    expect(pkg.name).toBe("cool-game");
  });

  it("converts app name to kebab-case", () => {
    runCli("MyCoolGame --local --template starter --skip-install", tmpDir);

    expect(fs.existsSync(path.join(tmpDir, "apps/my-cool-game"))).toBe(true);
    const pkg = JSON.parse(
      fs.readFileSync(
        path.join(tmpDir, "apps/my-cool-game/package.json"),
        "utf-8",
      ),
    );
    expect(pkg.name).toBe("my-cool-game");
  });

  it("fails when app already exists", () => {
    fs.mkdirSync(path.join(tmpDir, "apps/existing"), { recursive: true });
    const { exitCode, stdout } = runCli(
      "existing --local --template starter --skip-install",
      tmpDir,
    );

    expect(exitCode).not.toBe(0);
    expect(stdout).toContain("already exists");
  });

  it("fails with unknown template", () => {
    const { exitCode, stdout } = runCli(
      "bad --local --template nonexistent --skip-install",
      tmpDir,
    );

    expect(exitCode).not.toBe(0);
    expect(stdout).toContain("Unknown template");
  });

  it("does not create a project directory in cwd (only in apps/)", () => {
    runCli("my-game --local --template starter --skip-install", tmpDir);

    // Should NOT create tmpDir/my-game (that's what scaffold does)
    expect(fs.existsSync(path.join(tmpDir, "my-game"))).toBe(false);
    // Should create tmpDir/apps/my-game
    expect(fs.existsSync(path.join(tmpDir, "apps/my-game"))).toBe(true);
  });

  it("works with --local flag from subdirectory", () => {
    // Run from packages/ subdirectory — should still find monorepo root
    const subDir = path.join(tmpDir, "packages");
    const { stdout, exitCode } = runCli(
      "sub-game --local --template starter --skip-install",
      subDir,
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Success!");
    expect(fs.existsSync(path.join(tmpDir, "apps/sub-game"))).toBe(true);
  });

  it("falls back to upstream template when examples are missing locally", () => {
    fs.rmSync(path.join(tmpDir, "examples"), { recursive: true, force: true });

    const { stdout, exitCode } = runCli(
      "fallback-game --local --template starter --skip-install",
      tmpDir,
      { AWE_REPO_BRANCH: "dev" },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Fetching template from upstream");
    expect(stdout).toContain("Success!");
    expect(fs.existsSync(path.join(tmpDir, "apps/fallback-game"))).toBe(true);
  });
});

describe.skipIf(!process.env.TEST_REAL_CLONE)(
  "real clone from GitHub",
  { timeout: 120000 },
  () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-oncyber-real-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("scaffolds a project from the real GitHub repo", () => {
      const start = performance.now();

      const { stdout, exitCode } = runCli(
        "real-clone-test --template starter --use-pnpm --skip-install --skip-git",
        tmpDir,
        { AWE_REPO_URL: "", AWE_REPO_BRANCH: "main" }, // clear override to use real URL
      );

      const elapsed = ((performance.now() - start) / 1000).toFixed(1);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Success!");

      const projectDir = path.join(tmpDir, "real-clone-test");

      // Monorepo structure present
      expect(fs.existsSync(path.join(projectDir, "package.json"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "pnpm-workspace.yaml"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "apps/real-clone-test/package.json"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "packages/engine"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "packages/studio"))).toBe(true);

      // Unwanted dirs not present (sparse checkout)
      expect(fs.existsSync(path.join(projectDir, "examples"))).toBe(false);
      expect(fs.existsSync(path.join(projectDir, "docs"))).toBe(false);
      expect(fs.existsSync(path.join(projectDir, "packages/create-oncyber-app"))).toBe(false);

      // No .git (cleaned up)
      expect(fs.existsSync(path.join(projectDir, ".git"))).toBe(false);

      // Project name applied
      const gamePkg = JSON.parse(
        fs.readFileSync(
          path.join(projectDir, "apps/real-clone-test/package.json"),
          "utf-8",
        ),
      );
      expect(gamePkg.name).toBe("real-clone-test");

      console.log(`\n  Real GitHub clone completed in ${elapsed}s\n`);
    });
  },
);
