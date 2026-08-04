import { Store } from "@/hooks/use-store";
import type { PortalEntry } from "./portals";

export type InfoTab = "players" | "chunk" | "destinations";

export interface PlayerInfo {
  sessionId: string;
  x: number;
  y: number;
  z: number;
  isLocal: boolean;
}

export interface ChunkInfo {
  title?: string;
  owner?: string;
  tags?: string[];
  image?: string;
  description?: string;
  [key: string]: unknown;
}

export interface InfoState {
  isOpen: boolean;
  tab: InfoTab;
  players: PlayerInfo[];
  chunkKey: string | null;
  chunkLoading: boolean;
  chunkInfo: ChunkInfo | null;
  portals: PortalEntry[];
}

export const infoStore = new Store<InfoState>({
  isOpen: false,
  tab: "chunk",
  players: [],
  chunkKey: null,
  chunkLoading: false,
  chunkInfo: null,
  portals: [],
});

export function openInfo(tab?: InfoTab) {
  infoStore.update((s) => ({ ...s, isOpen: true, tab: tab ?? s.tab }));
}

export function closeInfo() {
  infoStore.update({ isOpen: false });
}

export function toggleInfo() {
  infoStore.update((s) => ({ ...s, isOpen: !s.isOpen }));
}

export function setInfoTab(tab: InfoTab) {
  infoStore.update({ tab });
}

export function setPlayers(players: PlayerInfo[]) {
  infoStore.update({ players });
}

export function setChunk(
  chunkKey: string | null,
  chunkLoading: boolean,
  chunkInfo: ChunkInfo | null,
) {
  infoStore.update({ chunkKey, chunkLoading, chunkInfo });
}

export function setPortals(portals: PortalEntry[]) {
  infoStore.update({ portals });
}
