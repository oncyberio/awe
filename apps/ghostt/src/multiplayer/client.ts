import { Client, Room } from "@colyseus/sdk";
import { GameState } from "../../shared/game-state";

let room: Room<any, GameState> | null = null;

export async function connectToRoom(): Promise<Room<any, GameState>> {
  const client = new Client("ws://localhost:2567");
  room = await client.joinOrCreate<GameState>("game", {});
  return room;
}

export function disconnectFromRoom() {
  room?.leave();
  room = null;
}

export function getRoom(): Room<any, GameState> | null {
  return room;
}
