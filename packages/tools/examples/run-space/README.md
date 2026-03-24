# `run-space` Examples

These examples are small, self-contained TypeScript programs meant to be run with `pnpm run-space`.

They are intentionally single-file modules because `run-space` copies the program source into a temporary file before executing it.

## Run An Example

```bash
pnpm run-space --scene=examples/starter/public/data/static-scene.json --file=packages/tools/examples/run-space/headless-smoke.ts
```

## Included Examples

- `headless-smoke.ts`: report what the headless runtime actually loaded from a scene snapshot
- `procedural-placement.ts`: place generated runtime probes using `duplicate()` plus `getBBox()` so pivot/origin and scale are reflected in the final footprint
- `input-smoke.ts`: drive the input system inside a headless space and report the sampled results
