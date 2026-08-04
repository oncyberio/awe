import { Server } from "colyseus";
import { Client, getStateCallbacks } from "@colyseus/sdk";
import { GameRoom } from "./game-room";
import { GameState, PlayerState } from "../shared/game-state";

const PORT = 2568; // Use a different port to avoid conflicts

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Get player IDs from room state */
function getPlayerKeys(state: GameState): string[] {
  return Array.from(state.players.keys());
}

/** Find players by sessionId */
function getPlayersBySessionId(
  state: GameState,
  sessionId: string,
): PlayerState[] {
  const result: PlayerState[] = [];
  state.players.forEach((player) => {
    if (player.sessionId === sessionId) result.push(player);
  });
  return result;
}

async function smokeTest() {
  console.log("=== Colyseus Multiplayer Smoke Test ===\n");

  // 1. Start server
  const server = new Server();
  server.define("game", GameRoom);
  await server.listen(PORT);
  console.log(`[Test] Server listening on port ${PORT}\n`);

  try {
    // 2. Client A joins
    console.log("--- Test 1: Single client joins ---");
    const clientA = new Client(`ws://localhost:${PORT}`);
    const roomA = await clientA.joinOrCreate<GameState>("game", {});
    console.log(`[Test] Client A connected, sessionId: ${roomA.sessionId}`);

    // Wait for state sync
    await sleep(200);

    const state = roomA.state as GameState;
    const playersAfterA = getPlayerKeys(state);
    console.log(`[Test] Players in room: [${playersAfterA.join(", ")}]`);
    assert(playersAfterA.length === 1, `Expected 1 player, got ${playersAfterA.length}`);

    const myPlayers = getPlayersBySessionId(state, roomA.sessionId);
    assert(myPlayers.length === 1, "Client A should have 1 player");
    assert(myPlayers[0].sessionId === roomA.sessionId, "Player should belong to client A");
    console.log("[Test] PASS: Single client join\n");

    // 3. Client B joins
    console.log("--- Test 2: Second client joins ---");
    const clientB = new Client(`ws://localhost:${PORT}`);
    const roomB = await clientB.joinOrCreate<GameState>("game", {});
    console.log(`[Test] Client B connected, sessionId: ${roomB.sessionId}`);

    await sleep(200);

    const playersAfterB = getPlayerKeys(state);
    console.log(`[Test] Players in room (from A's view): [${playersAfterB.join(", ")}]`);
    assert(playersAfterB.length === 2, `Expected 2 players, got ${playersAfterB.length}`);
    console.log("[Test] PASS: Second client join\n");

    // 4. Client C joins (3 entities)
    console.log("--- Test 3: Third client joins ---");
    const clientC = new Client(`ws://localhost:${PORT}`);
    const roomC = await clientC.joinOrCreate<GameState>("game", {});
    console.log(`[Test] Client C connected, sessionId: ${roomC.sessionId}`);

    await sleep(200);

    const playersAfterC = getPlayerKeys(state);
    console.log(`[Test] Players in room: [${playersAfterC.join(", ")}]`);
    assert(playersAfterC.length === 3, `Expected 3 players, got ${playersAfterC.length}`);
    console.log("[Test] PASS: Third client join\n");

    // 5. Client B leaves — player should be removed
    console.log("--- Test 4: Client B leaves ---");
    await roomB.leave();

    await sleep(200);

    const playersAfterLeave = getPlayerKeys(state);
    console.log(`[Test] Players in room after B left: [${playersAfterLeave.join(", ")}]`);
    assert(playersAfterLeave.length === 2, `Expected 2 players, got ${playersAfterLeave.length}`);

    const bPlayers = getPlayersBySessionId(state, roomB.sessionId);
    assert(bPlayers.length === 0, "Client B should have no player after leaving");
    console.log("[Test] PASS: Client leave\n");

    // 6. onAdd/onRemove callbacks fire
    console.log("--- Test 5: onAdd/onRemove callbacks ---");
    let addedKey: string | null = null;
    let removedKey: string | null = null;

    const $ = getStateCallbacks(roomA) as any;
    const state$ = $(roomA.state);

    state$.players.onAdd((_player: any, key: string) => {
      addedKey = key;
    });
    state$.players.onRemove((_player: any, key: string) => {
      removedKey = key;
    });

    const clientD = new Client(`ws://localhost:${PORT}`);
    const roomD = await clientD.joinOrCreate<GameState>("game", {});
    await sleep(200);
    assert(addedKey !== null, `onAdd should have fired`);
    console.log(`[Test] onAdd fired for player key: ${addedKey}`);

    await roomD.leave();
    await sleep(200);
    assert(removedKey !== null, `onRemove should have fired`);
    console.log(`[Test] onRemove fired for player key: ${removedKey}`);
    console.log("[Test] PASS: onAdd/onRemove callbacks\n");

    // 7. Cleanup remaining clients
    await roomA.leave();
    await roomC.leave();
    await sleep(200);

    console.log("=== All tests passed! ===");
  } finally {
    await server.gracefullyShutdown(false);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

smokeTest().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("\n[Test] FAILED:", err.message);
  process.exit(1);
});
