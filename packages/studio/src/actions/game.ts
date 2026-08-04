"use server";

import { Patch } from "immer";
import { GameData } from "../types/game-data";
import {
  GameRevision,
  GameService,
  type ChunkConfig,
  type Role,
} from "../server/game-service";

export async function getGameData(chunkKey?: string): Promise<GameData> {
  return GameService.getGameData(chunkKey);
}

export async function getGameRevision(): Promise<GameRevision> {
  return GameService.getGameRevision();
}

export async function updateGame(opts: {
  id: string;
  patches: Patch[];
  chunkKey?: string;
}): Promise<{ success: boolean }> {
  return GameService.updateGame(opts);
}

export async function switchChunk(targetKey: string): Promise<GameData> {
  return GameService.switchChunk(targetKey);
}

export async function listChunks(): Promise<string[]> {
  return GameService.listChunks();
}

export async function getChunkConfig(key: string): Promise<ChunkConfig> {
  return GameService.getChunkConfig(key);
}

export async function setChunkConfig(
  key: string,
  config: ChunkConfig,
): Promise<{ success: boolean }> {
  return GameService.setChunkConfig(key, config);
}

export async function getRoles(): Promise<Role[]> {
  return GameService.getRoles();
}

export async function setRoles(roles: Role[]): Promise<{ success: boolean }> {
  return GameService.setRoles(roles);
}
