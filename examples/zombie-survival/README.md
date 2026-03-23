# Zombie Survival Example

`zombie-survival` is a wave-based combat example built on AWE.
It includes player shooting, zombie spawning and AI, navmesh-driven movement, and the embedded Studio editor for scene iteration.

## Run

From the monorepo root:

```bash
pnpm install
pnpm --filter zombie-survival dev
```

Open `http://localhost:3000` for the game and `http://localhost:3000/studio` for the scene editor.

## Useful Scripts

```bash
pnpm --filter zombie-survival check
pnpm --filter zombie-survival build
```

## Where To Look

- `src/app/page.tsx` boots the playable scene.
- `src/lib/game-script.ts` coordinates combat, spawning, and mission flow.
- `src/lib/zombie-manager.ts` handles zombie creation, AI, and damage.
- `src/components/game-ui.tsx` renders the HUD and win/lose states.
- `public/data/static-scene.json` contains the sample level data.
