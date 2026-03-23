# Project Overview

This is a 3D game engine/framework built with Three.js and Next.js. The project uses a pnpm monorepo structure with workspaces.

# Code Style Guide

All files in this mono repo MUST use **kebab-case** naming (eg `editor-events.ts`, `constants.ts`)

# Skills

- `/engine` — oncyber engine API and usage patterns. Use before working on game code.
- `/run-space` — headless engine programs via `pnpm run-space`. Use when exact spatial compute, scene inspection, smoke testing, or procedural generation would help.
- `/game-prd` — create a game spec / PRD before implementation. Use when planning a new game or scoping a game idea.

# Examples

Game examples live in `/examples`. Use them as reference when building games with the engine.

If you are working in a scaffolded repo and `/examples` is not present locally, look up the examples in the scaffold origin repository at `https://github.com/oncyberio/awe`, using the matching path under `/examples`.
