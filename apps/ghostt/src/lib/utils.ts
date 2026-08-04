//

import { Engine, EnterSpaceOpts, CreateSpaceResult } from "@oncyberio/engine";

export interface LoadGameOpts {
  /**
   * Base URL for fetching game data and resolving asset paths.
   * Game data is fetched from `{baseUrl}/data/static-scene.json`.
   * @example "http://localhost:3001" for development with studio
   */
  baseUrl: string;
}

/**
 * @deprecated Use {@link createGame} instead, which returns the Space directly.
 *
 * Load and enter a game space from a base URL.
 * Fetches game data from `{baseUrl}/data/static-scene.json` and configures
 * the asset resolver to use the same base URL.
 */
export async function loadGame(opts: LoadGameOpts): Promise<CreateSpaceResult> {
  return createGame(opts);
}

/**
 * Create a game space from a base URL using the new explicit API.
 * Returns the Space and a reveal function for controlling intro fade timing.
 *
 * @example
 * ```ts
 * const { space, reveal } = await createGame({ baseUrl: "/games/shooter" });
 *
 * // Set up camera, controls before revealing
 * const player = space.components.byId("player");
 * initializeCamera(player);
 *
 * // Now reveal the scene
 * await reveal();
 *
 * space.use({
 *   onUpdate: (dt) => { player.position.x += dt; },
 * });
 *
 * space.start();
 * ```
 */
export async function createGame(opts: LoadGameOpts): Promise<CreateSpaceResult> {
  const { baseUrl } = opts;

  const res = await fetch(`${baseUrl}/data/static-scene.json`);
  const game = (await res.json()) as EnterSpaceOpts["game"];

  const engine = Engine.getInstance();

  return engine.createSpace({
    mode: "game",
    game,
    assets: { baseUrl },
    userReady: Promise.resolve({ id: "demo", name: "Demo User" }),
  });
}
