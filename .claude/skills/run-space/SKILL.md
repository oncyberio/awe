---
name: run-space
description: |
  Use when a short headless engine program would help answer a scene question or produce scene data. Triggers include: measure bounds, compute placement, inspect a scene snapshot, smoke-test a scene in headless mode, procedurally generate scene data, verify what the runtime loads, or run a short TS program against static-scene.json with pnpm run-space.
---

# Run Space

Use this skill when a short headless program is a good way to answer the task.

`run-space` runs a short TypeScript program against a scene snapshot through the headless engine and prints the program's return value as JSON.

## When To Use It

Consider `pnpm run-space` when the user needs:

- exact placement or offsets
- bounding boxes or dimensions
- scene inspection against a real snapshot
- coordinate derivation before editing `static-scene.json`
- a smoke test to see what the headless runtime actually loads
- procedural or build-time scene generation
- runtime-backed checks before patching scene data

It is optional, not mandatory. If the scene edit is trivial and no runtime-backed computation is needed, direct JSON edits may still be simpler.

## Command Surface

Use one of these forms:

```bash
pnpm run-space --scene=examples/starter/public/data/static-scene.json --file=/abs/path/program.ts
```

```bash
cat <<'EOF' | pnpm run-space --scene=examples/starter/public/data/static-scene.json --stdin
import { defineSpaceProgram } from "@oncyberio/tools/space";

export default defineSpaceProgram(async ({ space, snapshot }) => {
  return {
    sceneId: snapshot.id,
    terrainCount: space.components.byType("terrain").length,
  };
});
EOF
```

Prefer `--stdin` for short, AI-generated probes. Use `--file` when the program is long enough to be annoying inline.

## Program Contract

The program should export either:

- a default function
- or a named `run` function

Use the helper for clarity:

```ts
import { defineSpaceProgram } from "@oncyberio/tools/space";

export default defineSpaceProgram(async ({ space, snapshot, scenePath, projectDir, publicDir }) => {
  const player = space.components.byId("Player");

  return {
    sceneId: snapshot.id,
    hasPlayer: Boolean(player),
    scenePath,
    projectDir,
    publicDir,
  };
});
```

The context object contains:

- `snapshot` - parsed scene snapshot
- `engine` - headless engine instance
- `space` - loaded space
- `scenePath`
- `projectDir`
- `publicDir`

The program may import libraries normally, just like a regular TS module.

Examples:

- `import { Vector3 } from "three"`
- `import { defineSpaceProgram } from "@oncyberio/tools/space"`
- `import { EngineHeadless } from "@oncyberio/engine/headless"`

## Output Rules

- Return the value you want on stdout as JSON.
- Treat stdout as the result channel.
- If you need debug logs, prefer stderr.
- Keep the result small and task-shaped. The caller decides what fields matter.

## Default Workflow

1. Pick the scene snapshot path.
2. Write the smallest possible TS program that answers the exact spatial question.
3. Run it with `pnpm run-space`.
4. Inspect the JSON result.
5. Only after that, patch `static-scene.json` or other project files.

For many placement or measurement tasks:

1. Inspect the source component.
2. Measure bounds or transforms.
3. Compute the new coordinates in code.
4. Return the computed values.
5. Apply the scene edit separately.

For smoke tests or procedural generation:

1. Load the real scene snapshot.
2. Inspect what headless actually instantiates.
3. Return the derived data, generated components, or diagnostics.
4. Apply edits separately if needed.

## Current Headless Caveat

The current headless runtime does not load every visual component type.

Expect scene/world effects like these to be skipped in headless smoke tests:

- fog
- background
- envmap
- lighting
- postprocessing
- other web-only component types

That is normal. Use `run-space` for authoritative geometry/gameplay-relevant queries, not for render fidelity.

## Good Use Patterns

Good:

- "measure the player's bbox in the starter example"
- "compute a point 5m left of the house"
- "verify whether this snapshot loads a navmesh in headless"
- "return exact coordinates before editing the scene"
- "smoke test the starter scene in headless mode"
- "generate component data procedurally before writing it to the scene"

Bad:

- rewriting large project logic inside the probe
- mutating project files from inside the probe when a normal edit step is clearer
- using `run-space` when simple JSON inspection or a direct edit is clearly enough
