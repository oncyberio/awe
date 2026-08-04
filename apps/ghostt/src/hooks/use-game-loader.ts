import { useEffect, useRef } from "react";

export interface GameScript {
  init: () => void | Promise<void>;
  dispose: () => void;
}

export function useGameLoader(opts: {
  script: GameScript;
  onLoad?: () => void;
}) {
  const wasInit = useRef(false);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (wasInit.current) return;
    wasInit.current = true;

    const script = opts.script;

    async function startGame() {
      try {
        console.log("[Game] Starting game initialization");
        await script.init();
        console.log("[Game] Game initialized!");
        isLoaded.current = true;
        opts.onLoad?.();
      } catch (err) {
        console.error("[Game] Game error:", err);
      }
    }

    startGame();

    return () => {
      // Only dispose if it was fully loaded
      // This prevents React Strict Mode from aborting the load
      if (!isLoaded.current) return;
      try {
        script.dispose();
      } catch (err) {
        console.error("Dispose Error", err);
      }
    };
  }, []);
}
