import { Server } from "colyseus";
import { GameRoom } from "../../server/game-room";

async function main() {
  const port = Number(process.env.PORT ?? 2567);
  const server = new Server();

  server.define("game", GameRoom);
  await server.listen(port);

  console.log(`[TestServer] Listening on port ${port}`);

  const shutdown = async (exitCode: number) => {
    await server.gracefullyShutdown(false);
    process.exit(exitCode);
  };

  process.on("SIGINT", () => {
    void shutdown(0);
  });

  process.on("SIGTERM", () => {
    void shutdown(0);
  });
}

main().catch((error) => {
  console.error("[TestServer] Failed to start", error);
  process.exit(1);
});
