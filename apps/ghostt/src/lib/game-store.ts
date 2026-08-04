import { Store } from "@/hooks/use-store";

interface GameState {
  started: boolean;
  paused: boolean;
}

export const gameStore = new Store<GameState>({
  started: false,
  paused: false,
});

export function setStarted(started: boolean) {
  gameStore.update({ started });
}

export function setPaused(paused: boolean) {
  gameStore.update({ paused });
}
