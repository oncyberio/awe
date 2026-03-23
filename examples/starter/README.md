# AWE Starter Example

`starter` is the baseline AWE example and the template used by `create-oncyber-app`.
It wires up the engine, the embedded Studio editor, a sample scene, and basic player controls in a minimal Next.js app.

## Run

From the monorepo root:

```bash
pnpm install
pnpm --filter starter dev
```

Open `http://localhost:3000` for the game and `http://localhost:3000/studio` for the scene editor.

## Useful Scripts

```bash
pnpm --filter starter check
pnpm --filter starter build
```

## Where To Look

- `src/app/page.tsx` boots the playable scene.
- `src/app/studio/page.tsx` mounts the embedded editor.
- `src/components/game-scene.tsx` initializes the game runtime.
- `src/lib/game-script.ts` contains the example gameplay logic.
- `public/data/static-scene.json` is the sample scene loaded by the game.
