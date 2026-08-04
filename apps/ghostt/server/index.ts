import { Server } from "colyseus";
import { GameRoom } from "./game-room";

const server = new Server();
server.define("game", GameRoom);
server.listen(2567).then(() => {
  console.log("[Server] Listening on port 2567");
});
