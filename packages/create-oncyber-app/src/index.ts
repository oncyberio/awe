#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { input, select } from "@inquirer/prompts";
import pc from "picocolors";
import { createSpinner, createSteps } from "./spinner";

const REPO_URL =
  process.env.AWE_REPO_URL || "https://github.com/oncyberio/awe.git";
const REPO_BRANCH = process.env.AWE_REPO_BRANCH || "main";
const PNPM_VERSION = "10.10.0";
const PNPM_PACKAGE_MANAGER = `pnpm@${PNPM_VERSION}`;
const PNPM_BOOTSTRAP_COMMAND =
  `corepack enable && corepack prepare ${PNPM_PACKAGE_MANAGER} --activate`;

const TEMPLATES = [
  { name: "starter", description: "Minimal game setup with player controls" },
  { name: "multiplayer", description: "Multiplayer game with Colyseus networking" },
] as const;

type TemplateName = (typeof TEMPLATES)[number]["name"];

const DEFAULT_TEMPLATE: TemplateName = "starter";

const TEMPLATE_NAMES = TEMPLATES.map((t) => t.name) as string[];

export type PackageManager = "npm" | "pnpm" | "yarn";

export interface CliOptions {
  projectName?: string;
  template?: string;
  packageManager?: PackageManager;
  skipInstall: boolean;
  skipGit: boolean;
  local: boolean;
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function readJson(filePath: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath: string, data: Record<string, any>) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

const SCAFFOLD_EXCLUDED_DIR_NAMES = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  ".cache",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

const SCAFFOLD_EXCLUDED_FILE_NAMES = new Set([
  ".DS_Store",
]);

const SCAFFOLD_EXCLUDED_FILE_SUFFIXES = [
  ".tsbuildinfo",
];

/**
 * Walk up from `startDir` looking for the monorepo root
 * (identified by having both pnpm-workspace.yaml and packages/engine/).
 * Returns the root path or null.
 */
function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    if (
      fs.existsSync(path.join(dir, "pnpm-workspace.yaml")) &&
      fs.existsSync(path.join(dir, "packages/engine"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function sparseCloneDirs(repoUrl: string, dest: string, dirs: string[]) {
  execSync(
    `git clone --depth 1 --filter=blob:none --sparse --branch "${REPO_BRANCH}" "${repoUrl}" "${dest}"`,
    { stdio: "pipe" },
  );
  execSync(
    `git -C "${dest}" sparse-checkout set ${dirs.join(" ")}`,
    { stdio: "pipe" },
  );
}

function sparseClone(repoUrl: string, dest: string, template: string) {
  sparseCloneDirs(repoUrl, dest, [
    "packages",
    "scripts",
    ".claude",
    `examples/${template}`,
  ]);
}

function getWorkspaceScriptCommand(workspaceName: string, scriptName: string) {
  return `pnpm --filter ${workspaceName} ${scriptName}`;
}

function canRunCommand(command: string) {
  try {
    execSync(command, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function ensurePnpmAvailable() {
  if (canRunCommand("pnpm --version")) {
    return;
  }

  console.log(pc.dim("pnpm was not found. Trying to set it up with Corepack..."));

  if (!canRunCommand("corepack --version")) {
    console.error("Error: pnpm is required to work with this project.");
    console.error(`Run:\n  ${PNPM_BOOTSTRAP_COMMAND}`);
    process.exit(1);
  }

  try {
    execSync("corepack enable", { stdio: "pipe" });
    execSync(`corepack prepare ${PNPM_PACKAGE_MANAGER} --activate`, {
      stdio: "pipe",
    });
    execSync("pnpm --version", { stdio: "pipe" });
    console.log(pc.dim("pnpm is ready."));
  } catch (err: any) {
    console.error("Failed to set up pnpm automatically.");
    console.error(`Run:\n  ${PNPM_BOOTSTRAP_COMMAND}`);
    if (err.stderr) {
      console.error(err.stderr.toString());
    }
    process.exit(1);
  }
}

function cleanupScaffold(
  projectDir: string,
  projectName: string,
  template: string,
) {
  // Remove .git from the clone
  const gitDir = path.join(projectDir, ".git");
  if (fs.existsSync(gitDir)) {
    fs.rmSync(gitDir, { recursive: true, force: true });
  }

  // Remove the CLI package itself from the scaffolded project
  const cliDir = path.join(projectDir, "packages/create-oncyber-app");
  if (fs.existsSync(cliDir)) {
    fs.rmSync(cliDir, { recursive: true, force: true });
  }

  // Copy selected template to apps/<project-name>/
  const templateDir = path.join(projectDir, "examples", template);
  const gameDir = path.join(projectDir, "apps", projectName);
  fs.mkdirSync(path.join(projectDir, "apps"), { recursive: true });
  copyDirSync(templateDir, gameDir, {
    shouldSkip: shouldSkipScaffoldEntry,
  });

  // Remove examples/ directory
  const examplesDir = path.join(projectDir, "examples");
  if (fs.existsSync(examplesDir)) {
    fs.rmSync(examplesDir, { recursive: true, force: true });
  }

  // Update apps/<project-name>/package.json — set name to project name
  const gamePkgPath = path.join(gameDir, "package.json");
  if (fs.existsSync(gamePkgPath)) {
    const gamePkg = readJson(gamePkgPath);
    gamePkg.name = projectName;
    writeJson(gamePkgPath, gamePkg);
  }

  // Update root package.json — set name and generated-project scripts
  const rootPkgPath = path.join(projectDir, "package.json");
  if (fs.existsSync(rootPkgPath)) {
    const rootPkg = readJson(rootPkgPath);
    rootPkg.name = projectName;
    rootPkg.packageManager = PNPM_PACKAGE_MANAGER;
    rootPkg.workspaces = ["packages/*", "apps/*"];
    rootPkg.scripts = {
      ...rootPkg.scripts,
      dev: getWorkspaceScriptCommand(projectName, "dev"),
      build: getWorkspaceScriptCommand(projectName, "build"),
      start: getWorkspaceScriptCommand(projectName, "start"),
      check: getWorkspaceScriptCommand(projectName, "check"),
    };
    delete rootPkg.scripts["create-game"];
    delete rootPkg.scripts["template:dev"];
    delete rootPkg.scripts["template:check"];
    writeJson(rootPkgPath, rootPkg);
  }

  // Update pnpm-workspace.yaml — remove "examples/*", ensure "apps/*"
  const workspacePath = path.join(projectDir, "pnpm-workspace.yaml");
  if (fs.existsSync(workspacePath)) {
    let content = fs.readFileSync(workspacePath, "utf-8");
    content = content
      .split("\n")
      .filter((line) => !line.includes('"examples/*"'))
      .join("\n");
    if (!content.includes('"apps/*"')) {
      content = content.trimEnd() + '\n  - "apps/*"\n';
    }
    fs.writeFileSync(workspacePath, content);
  }
}

function printHelp() {
  const templateList = TEMPLATES.map(
    (t) => `    ${t.name.padEnd(16)} ${t.description}`,
  ).join("\n");

  console.log(`
${pc.bold("create-oncyber-app")} — Scaffold a new 3D game powered by the AWE Engine.

Clones the AWE monorepo and sets up a ready-to-use game project.

${pc.bold("Usage:")}
  create-oncyber-app [project-name] [options]
  create-oncyber-app update [options]

${pc.bold("Commands:")}
  update           Update packages/ and scripts/ from the latest upstream

${pc.bold("Options:")}
  --template NAME  Choose a project template (default: ${DEFAULT_TEMPLATE})
  --skip-install   Skip automatic dependency installation
  --skip-git       Skip git repository initialization
  --local          Create app inside the monorepo's apps/ directory
  --help           Show this help message
  --version        Show the CLI version

${pc.bold("Package Manager:")}
  Uses pnpm automatically. If pnpm is missing, the CLI will try to enable it with Corepack.

${pc.bold("Templates:")}
${templateList}

${pc.bold("Examples:")}
  ${pc.dim("# Interactive mode — prompts for name, template, and package manager")}
  npx create-oncyber-app

  ${pc.dim("# Create a project with a specific name")}
  npx create-oncyber-app my-game

  ${pc.dim("# Create a multiplayer project")}
  npx create-oncyber-app my-game --template multiplayer

  ${pc.dim("# Skip git init")}
  npx create-oncyber-app my-game --skip-git

  ${pc.dim("# Create an app inside the monorepo")}
  create-oncyber-app my-game --local

  ${pc.dim("# Update an existing project's engine and packages")}
  cd my-game && npx create-oncyber-app update

${pc.bold("What's included:")}
  - pnpm monorepo with the AWE engine, studio, and game app
  - Next.js app with the AWE 3D game engine pre-configured
  - Embedded studio at /studio for visual scene editing
  - Claude skills for engine usage, VFX creation, and GLTF inspection
  - CLI tools for asset optimization and scene validation
  - Sample scene with a default environment and avatar
`);
}

function printVersion() {
  const pkgPath = path.join(__dirname, "../package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  console.log(pkg.version);
}

function validatePackageManager(options: CliOptions) {
  if (!options.packageManager || options.packageManager === "pnpm") {
    return;
  }

  console.error("Error: create-oncyber-app currently supports pnpm only.");
  console.error("Remove the package manager flag and run the command again.");
  console.error(`If pnpm is missing, run:\n  ${PNPM_BOOTSTRAP_COMMAND}`);
  process.exit(1);
}

export function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const options: CliOptions = {
    skipInstall: false,
    skipGit: false,
    local: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--template":
        if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
          options.template = args[++i];
        }
        break;
      case "--use-npm":
        options.packageManager = "npm";
        break;
      case "--use-pnpm":
        options.packageManager = "pnpm";
        break;
      case "--use-yarn":
        options.packageManager = "yarn";
        break;
      case "--skip-install":
        options.skipInstall = true;
        break;
      case "--skip-git":
        options.skipGit = true;
        break;
      case "--local":
        options.local = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
      case "--version":
        printVersion();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith("-") && !options.projectName) {
          options.projectName = arg;
        }
        break;
    }
  }

  return options;
}

async function promptProjectName(): Promise<string> {
  const name = await input({
    message: "What is your project named?",
    default: "my-app",
    validate(value) {
      const kebab = toKebabCase(value || "my-app");
      const dir = path.resolve(process.cwd(), kebab);
      if (fs.existsSync(dir)) {
        return `Directory already exists: ${dir}`;
      }
      return true;
    },
  });
  return toKebabCase(name || "my-app");
}

function shouldSkipScaffoldEntry(entry: fs.Dirent) {
  if (SCAFFOLD_EXCLUDED_DIR_NAMES.has(entry.name)) {
    return true;
  }

  if (SCAFFOLD_EXCLUDED_FILE_NAMES.has(entry.name)) {
    return true;
  }

  return SCAFFOLD_EXCLUDED_FILE_SUFFIXES.some((suffix) =>
    entry.name.endsWith(suffix),
  );
}

function copyDirSync(
  src: string,
  dest: string,
  options?: {
    shouldSkip?: (entry: fs.Dirent) => boolean;
  },
) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (options?.shouldSkip?.(entry)) {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(srcPath);
      fs.symlinkSync(target, destPath);
    } else if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, options);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function update(options: CliOptions) {
  const projectDir = process.cwd();

  // Verify we're in a scaffolded project
  const hasWorkspace = fs.existsSync(
    path.join(projectDir, "pnpm-workspace.yaml"),
  );
  const hasApps = fs.existsSync(path.join(projectDir, "apps"));
  if (!hasWorkspace || !hasApps) {
    console.error(
      "Error: Not in a scaffolded project. Run this from a project created by create-oncyber-app.",
    );
    process.exit(1);
  }

  // Warn user
  const confirm = await select<boolean>({
    message:
      "This will overwrite packages/, scripts/, and root config files. Your apps/ directory will NOT be modified. Continue?",
    choices: [
      { name: "Yes", value: true },
      { name: "No", value: false },
    ],
    default: false,
  });

  if (!confirm) {
    console.log("Update cancelled.");
    process.exit(0);
  }

  const tmpDir = fs.mkdtempSync(path.join(require("os").tmpdir(), "awe-update-"));

  try {
    // Clone to temp dir (sparse — only packages, scripts, root configs)
    const cloneSpinner = createSpinner("Cloning latest repository...");
    cloneSpinner.start();
    try {
      sparseClone(REPO_URL, path.join(tmpDir, "repo"), DEFAULT_TEMPLATE);
      cloneSpinner.stop("Cloned latest repository.");
    } catch (err: any) {
      cloneSpinner.stop();
      console.error("Failed to clone repository. Make sure git is installed and you have access.");
      if (err.stderr) console.error(err.stderr.toString());
      process.exit(1);
    }

    const repoDir = path.join(tmpDir, "repo");

    // Replace packages/ and scripts/
    const updateSpinner = createSpinner("Updating packages...");
    updateSpinner.start();

    const dirsToUpdate = ["packages", "scripts"];
    for (const dir of dirsToUpdate) {
      const destDir = path.join(projectDir, dir);
      const srcDir = path.join(repoDir, dir);
      if (fs.existsSync(srcDir)) {
        if (fs.existsSync(destDir)) {
          fs.rmSync(destDir, { recursive: true, force: true });
        }
        copyDirSync(srcDir, destDir);
      }
    }

    // Remove create-oncyber-app from the copied packages
    const cliPkgDir = path.join(projectDir, "packages/create-oncyber-app");
    if (fs.existsSync(cliPkgDir)) {
      fs.rmSync(cliPkgDir, { recursive: true, force: true });
    }

    // Update root configs
    const configFiles = ["tsconfig.json", ".editorconfig"];
    for (const file of configFiles) {
      const srcFile = path.join(repoDir, file);
      const destFile = path.join(projectDir, file);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, destFile);
      }
    }

    // Update root package.json — preserve name, clean up scripts
    const currentRootPkg = readJson(path.join(projectDir, "package.json"));
    const newRootPkg = readJson(path.join(repoDir, "package.json"));
    newRootPkg.name = currentRootPkg.name;
    writeJson(path.join(projectDir, "package.json"), newRootPkg);

    // Update pnpm-workspace.yaml — remove examples/* line, ensure apps/*
    const srcWorkspace = path.join(repoDir, "pnpm-workspace.yaml");
    if (fs.existsSync(srcWorkspace)) {
      let content = fs.readFileSync(srcWorkspace, "utf-8");
      content = content
        .split("\n")
        .filter((line) => !line.includes('"examples/*"'))
        .join("\n");
      if (!content.includes('"apps/*"')) {
        content = content.trimEnd() + '\n  - "apps/*"\n';
      }
      fs.writeFileSync(path.join(projectDir, "pnpm-workspace.yaml"), content);
    }

    updateSpinner.stop("Packages updated.");

    // Install deps
    if (!options.skipInstall) {
      ensurePnpmAvailable();
      const installSpinner = createSpinner("Installing dependencies...");
      installSpinner.start();
      try {
        execSync("pnpm install", {
          cwd: projectDir,
          stdio: "pipe",
        });
        installSpinner.stop("Dependencies installed.");
      } catch (err: any) {
        installSpinner.stop();
        console.error("Failed to install dependencies:");
        if (err.stderr) console.error(err.stderr.toString());
        process.exit(1);
      }
    }

    console.log();
    console.log(
      pc.green(pc.bold("Success!")) +
        " Project updated to latest engine and packages.",
    );
    console.log();
  } finally {
    // Clean up temp dir
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function scaffoldLocal(options: CliOptions, monorepoRoot: string) {
  // Resolve app name
  let appName: string;
  if (options.projectName) {
    appName = toKebabCase(options.projectName);
  } else {
    appName = await input({
      message: "What is your app named?",
      default: "my-game",
      validate(value) {
        const name = toKebabCase(value || "my-game");
        const dir = path.join(monorepoRoot, "apps", name);
        if (fs.existsSync(dir)) {
          return `App already exists: apps/${name}`;
        }
        return true;
      },
    });
    appName = toKebabCase(appName || "my-game");
  }

  const appDir = path.join(monorepoRoot, "apps", appName);
  if (fs.existsSync(appDir)) {
    console.error(`Error: App already exists: apps/${appName}`);
    process.exit(1);
  }

  // Resolve template
  let template: string;
  if (options.template) {
    if (!TEMPLATE_NAMES.includes(options.template)) {
      console.error(
        `Error: Unknown template "${options.template}". Available templates: ${TEMPLATE_NAMES.join(", ")}`,
      );
      process.exit(1);
    }
    template = options.template;
  } else {
    template = await select<string>({
      message: "Which template would you like to use?",
      choices: TEMPLATES.map((t) => ({
        name: `${t.name} — ${t.description}`,
        value: t.name,
      })),
      default: DEFAULT_TEMPLATE,
    });
  }

  let templateDir = path.join(monorepoRoot, "examples", template);
  let tmpTemplateRoot: string | null = null;
  const needsFetch = !fs.existsSync(templateDir);

  // Build step labels
  const stepLabels: string[] = [];
  if (needsFetch) stepLabels.push("Fetching template from upstream");
  stepLabels.push("Copying template");
  if (!options.skipInstall) stepLabels.push("Installing dependencies");

  // Visual separator after prompts
  console.log();

  const steps = createSteps(stepLabels);
  steps.start();

  try {
    // Fetch template from upstream if not available locally
    if (needsFetch) {
      steps.startStep();
      tmpTemplateRoot = fs.mkdtempSync(
        path.join(require("os").tmpdir(), "awe-local-template-"),
      );
      const repoDir = path.join(tmpTemplateRoot, "repo");
      try {
        sparseCloneDirs(REPO_URL, repoDir, [`examples/${template}`]);
        templateDir = path.join(repoDir, "examples", template);
        if (!fs.existsSync(templateDir)) {
          throw new Error(
            `Template directory not found: examples/${template}`,
          );
        }
        steps.completeStep();
      } catch (err: any) {
        fs.rmSync(tmpTemplateRoot, { recursive: true, force: true });
        console.error("\nFailed to fetch template from upstream.");
        if (err.stderr) console.error(err.stderr.toString());
        else if (err.message) console.error(err.message);
        process.exit(1);
      }
    }

    // Copy template
    steps.startStep();
    fs.mkdirSync(path.join(monorepoRoot, "apps"), { recursive: true });
    copyDirSync(templateDir, appDir, {
      shouldSkip: shouldSkipScaffoldEntry,
    });

    // Update package.json name
    const pkgPath = path.join(appDir, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = readJson(pkgPath);
      pkg.name = appName;
      writeJson(pkgPath, pkg);
    }
    steps.completeStep();

    // Install deps
    if (!options.skipInstall) {
      ensurePnpmAvailable();
      steps.startStep();
      try {
        execSync("pnpm install", {
          cwd: monorepoRoot,
          stdio: "pipe",
        });
        steps.completeStep();
      } catch (err: any) {
        console.error("\nFailed to install dependencies:");
        if (err.stderr) console.error(err.stderr.toString());
        process.exit(1);
      }
    }

    // Success
    console.log();
    console.log(
      `🎮 ${pc.green(pc.bold("Success!"))} Created ${pc.bold(appName)} at ${pc.cyan(`apps/${appName}`)}`,
    );
    console.log();
    console.log("Next steps:");
    if (options.skipInstall) {
      console.log(`  ${pc.cyan("pnpm install")}`);
    }
    console.log(`  ${pc.cyan(`pnpm --filter ${appName} dev`)}`);
    console.log();
  } finally {
    if (tmpTemplateRoot) {
      fs.rmSync(tmpTemplateRoot, { recursive: true, force: true });
    }
  }
}

async function scaffold(options: CliOptions) {
  let projectName: string;
  if (options.projectName) {
    projectName = toKebabCase(options.projectName);
    const dir = path.resolve(process.cwd(), projectName);
    if (fs.existsSync(dir)) {
      console.error(`Error: Directory already exists: ${dir}`);
      process.exit(1);
    }
  } else {
    projectName = await promptProjectName();
  }

  // Resolve template
  let template: string;
  if (options.template) {
    if (!TEMPLATE_NAMES.includes(options.template)) {
      console.error(
        `Error: Unknown template "${options.template}". Available templates: ${TEMPLATE_NAMES.join(", ")}`,
      );
      process.exit(1);
    }
    template = options.template;
  } else {
    template = await select<string>({
      message: "Which template would you like to use?",
      choices: TEMPLATES.map((t) => ({
        name: `${t.name} — ${t.description}`,
        value: t.name,
      })),
      default: DEFAULT_TEMPLATE,
    });
  }

  const projectDir = path.resolve(process.cwd(), projectName);

  // Register SIGINT handler to clean up partial project directory
  const cleanup = () => {
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    process.exit(1);
  };
  process.on("SIGINT", cleanup);

  // Clone repository (sparse checkout — only fetches needed dirs + template)
  const cloneSpinner = createSpinner("Cloning repository...");
  cloneSpinner.start();
  try {
    sparseClone(REPO_URL, projectDir, template);
    cloneSpinner.stop("Cloned repository.");
  } catch (err: any) {
    cloneSpinner.stop();
    console.error(
      "Failed to clone repository. Make sure git is installed and you have access to the repo.",
    );
    if (err.stderr) {
      console.error(err.stderr.toString());
    }
    cleanup();
    return;
  }

  // Set up project
  const setupSpinner = createSpinner("Setting up project...");
  setupSpinner.start();
  cleanupScaffold(projectDir, projectName, template);
  setupSpinner.stop("Project set up.");

  // Git initialization
  if (!options.skipGit) {
    const gitSpinner = createSpinner("Initializing git repository...");
    gitSpinner.start();
    try {
      execSync("git init", { cwd: projectDir, stdio: "pipe" });
      execSync("git add -A", { cwd: projectDir, stdio: "pipe" });
      execSync(
        'git commit -m "Initial commit from create-oncyber-app"',
        { cwd: projectDir, stdio: "pipe" },
      );
      gitSpinner.stop("Initialized git repository.");
    } catch {
      // git not installed or failed — skip silently
      gitSpinner.stop();
    }
  }

  // Dependency installation
  let depsInstalled = false;
  if (!options.skipInstall) {
    ensurePnpmAvailable();
    const installSpinner = createSpinner("Installing dependencies...");
    installSpinner.start();
    try {
      execSync("pnpm install", {
        cwd: projectDir,
        stdio: "pipe",
      });
      installSpinner.stop("Dependencies installed.");
      depsInstalled = true;
    } catch (err: any) {
      installSpinner.stop();
      console.error("Failed to install dependencies:");
      if (err.stderr) {
        console.error(err.stderr.toString());
      }
      process.exit(1);
    }
  }

  // Remove SIGINT handler after successful creation
  process.removeListener("SIGINT", cleanup);

  // Styled success output
  console.log();
  console.log(pc.green(pc.bold(`Success!`)) + ` Created ${pc.bold(projectName)} at ${projectDir}`);
  console.log();
  console.log("Next steps:");
  console.log(`  ${pc.cyan(`cd ${projectName}`)}`);
  if (!depsInstalled) {
    console.log(`  ${pc.cyan("pnpm install")}`);
  }
  console.log(`  ${pc.cyan("pnpm dev")}`);
  console.log();
}

async function main() {
  const options = parseArgs(process.argv);
  validatePackageManager(options);

  if (options.projectName === "update") {
    options.projectName = undefined;
    await update(options);
    return;
  }

  if (options.local) {
    const monorepoRoot = findMonorepoRoot(process.cwd());
    if (!monorepoRoot) {
      console.error(
        "Error: --local flag used but not inside an AWE monorepo.",
      );
      process.exit(1);
    }
    await scaffoldLocal(options, monorepoRoot);
    return;
  }

  await scaffold(options);
}

function isDirectExecution() {
  return typeof require !== "undefined"
    && typeof module !== "undefined"
    && require.main === module;
}

if (isDirectExecution()) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
