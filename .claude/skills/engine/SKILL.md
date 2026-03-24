---
name: engine api usage
description: |
  oncyberio engine usage guide for game development. Use when you need familiarize with oncyber engine and usage patterns
---

# oncyberio Engine Usage

## Core Workflow

1. **Define static components** by editing `static-scene.json` directly
2. **Implement game logic** in a game script file (events, collisions, interactions)
3. **Add UI** in a React component if needed (score, timer, menus)

## Scene Editing

Edit `public/data/static-scene.json` directly for all scene CRUD operations (adding, updating, deleting components, managing assets, physics, lighting).

For adding assets (models, avatars, animations, media), see [references/assets-guide.md](references/assets-guide.md).

### Exact Spatial Compute

Some scene edits are simple enough to do directly in `static-scene.json`.

Consider the `/run-space` skill when code-driven spatial or headless execution would materially help, especially for tasks like:

- placing one object relative to another
- measuring exact bounds, dimensions, or transforms
- checking whether a component exists in a real scene snapshot
- computing coordinates before patching `static-scene.json`
- smoke-testing what the headless runtime actually loads
- build-time or procedural scene generation

Keep `/engine` for scene structure, component APIs, gameplay logic, and normal scene edits. Reach for `/run-space` when a short headless program is the clearer or safer way to answer the task.

### static-scene.json Overview

The scene file maps component IDs to component data. Each component has `id`, `name`, `type`, `position`, `rotation`, `scale`, and type-specific properties at the root level. Use `script.identifier` / `script.tag` for runtime lookups via `byId()` / `byTag()`.

### Model Notes

For `model` components, keep these runtime semantics in mind:

- `center` is explicit opt-in. Default model behavior preserves the asset's authored pivot.
- `fixedTransform` is a hint that the model will not move at runtime. This can enable static-instance optimizations for instanced models and is a good fit for fixed scene dressing.
- Treat `fixedTransform` as a runtime hint, not a placement tool. In edit mode, models should still be movable.

**See:** [references/examples/static-scene-minimal.json](references/examples/static-scene-minimal.json) for a working minimal scene.

## Reference Documentation

For detailed information, read these docs as needed:

- **[references/engine-guide.md](references/engine-guide.md)** - Core API (components, physics, game loop, interactions)

When working with a component, check its `*-data.ts` file for the data interface (e.g., `MeshComponentData`, `ModelComponentData`).

The guides in this folder focus on **game logic patterns and workflows** (scripts, input, physics, interactions) — the API types are the authoritative reference for exact signatures.

## Examples

Quick-reference examples in `references/examples/`:

| File                        | Description                                         |
| --------------------------- | --------------------------------------------------- |
| `static-scene-minimal.json` | Minimal scene setup                                 |
| `game-script-template.md`   | Game script lifecycle template                      |
| `collision-handling.md`     | Collision and sensor events                         |
| `physics-config.md`         | Physics and rigidbody configuration                 |
| `input-system.md`           | Declarative input system (keyboard, gamepad, touch) |
| `interaction-lookat.md`     | Interaction prompts                                 |
| `spawn-collectibles.md`     | Spawning items via template duplication             |
| `npc-animation.md`          | NPC animation with AnimationStateMachine            |
