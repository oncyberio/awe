---
name: run-space
description: |
  Use when a short headless engine program would help answer a scene question or produce scene data. Triggers include: measure bounds, compute placement, inspect a scene snapshot, smoke-test a scene in headless mode, procedurally generate scene data, verify what the runtime loads, test input/AI behavior in headless mode, or run a short TS program against static-scene.json with pnpm run-space.
---

# Run Space

Runs a short TypeScript program against a scene snapshot through the headless engine. Returns the program's result as JSON on stdout.

Skip this when a direct JSON edit is clearly enough.

## Command

```bash
# from a file
pnpm run-space --scene=path/to/static-scene.json --file=/abs/path/program.ts

# inline (prefer for short probes)
cat <<'EOF' | pnpm run-space --scene=path/to/static-scene.json --stdin
import { defineSpaceProgram } from "@oncyberio/tools/space";
export default defineSpaceProgram(async ({ space, snapshot }) => {
  return { terrainCount: space.components.byType("terrain").length };
});
EOF
```

## Program Shape

Export a default (or named `run`) function. The context object:

```ts
import { defineSpaceProgram } from "@oncyberio/tools/space";

export default defineSpaceProgram(async ({ engine, space, snapshot, scenePath, projectDir, publicDir }) => {
  // engine  — EngineHeadless instance
  // space   — loaded Space
  // snapshot — parsed scene JSON
  // scenePath, projectDir, publicDir — resolved paths
  return { /* result → stdout as JSON */ };
});
```

Normal TS imports work (`three`, `@oncyberio/engine/headless`, `@oncyberio/engine/input`, etc.).

## Use Cases

- **Measurement / placement** — bbox, dimensions, coordinate math before editing scene JSON. Prefer `getBBox()` over raw position when pivot/origin matters; duplicate a probe, measure, destroy if scale-dependent.
- **Smoke testing** — verify what headless actually loads from a snapshot. Visual-only types (fog, envmap, lighting, postprocessing, background) are skipped — that's expected.
- **Procedural generation** — compute and return component data programmatically.
- **Headless input / AI testing** — drive the input system imperatively to test gameplay logic, AI behavior, or input bindings without a browser.

## Examples

Runnable examples in `packages/tools/examples/run-space/` — read these for patterns:

- **`headless-smoke.ts`** — smoke-test what headless loads from a snapshot; reports loaded vs skipped components
- **`procedural-placement.ts`** — runtime-backed measurement with `getBBox()` / `getDimensions()`, probe-then-destroy pattern
- **`input-smoke.ts`** — drive `sharedControlState` imperatively (keyboard, custom buttons), step with `engine.tick()` + `inputs.update()`, verify input state

## Tips

- Return only what matters — keep results small and task-shaped.
- Use stderr for debug logs (stdout is the result channel).
- For placement: measure bbox first, edit scene JSON separately.
- `engine.run({ hz: 60 })` starts a continuous loop; `engine.stopRun()` to stop.
