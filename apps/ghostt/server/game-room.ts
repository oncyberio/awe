import { Client, Room } from "colyseus";
import { GameState, PlayerState } from "../shared/game-state";
import {
  isPlayerUpdateMessage,
  PLAYER_UPDATE_MESSAGE,
} from "../shared/messages";
import { NETWORK_TICK_INTERVAL } from "../shared/network-constants";

export class GameRoom extends Room<GameState> {
  state = new GameState();

  onCreate() {
    this.setPatchRate(NETWORK_TICK_INTERVAL);
  }

  messages = {
    [PLAYER_UPDATE_MESSAGE]: (client: Client, payload: unknown) => {
      if (!isPlayerUpdateMessage(payload)) return;

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.x = payload.x;
      player.y = payload.y;
      player.z = payload.z;
      player.rotY = payload.rotY;
      player.anim = payload.anim;
      player.updatedAt = Date.now();
    },
  };

  onJoin(client: Client) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.updatedAt = Date.now();
    this.state.players.set(client.sessionId, player);
    console.log("[Server] Player joined:", client.sessionId);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    console.log("[Server] Player left:", client.sessionId);
  }
}
