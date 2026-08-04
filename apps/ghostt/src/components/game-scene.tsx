"use client";

import { useEffect, useRef, useState } from "react";
import { GameUI } from "@/components/game-ui";
import { GameCanvas } from "@/components/game-canvas";
import { GameScript } from "@/lib/game-script";

export interface GameSceneProps {
  onLoad?: () => void;
}

export function GameScene({ onLoad }: GameSceneProps) {
  const wasInit = useRef(false);
  const isLoaded = useRef(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    if (wasInit.current) return;
    wasInit.current = true;

    const gameInstance = new GameScript();

    async function startGame() {
      try {
        console.log("[Game] Starting game initialization");
        // init() handles space creation internally using createSpace
        await gameInstance.init();
        console.log("[Game] Game initialized!");
        isLoaded.current = true;
        setSceneReady(true);
        onLoad?.();
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
        console.log("[Game] Game disposed");
        gameInstance.dispose();
      } catch (err) {
        console.error("Dispose Error", err);
      }
    };
  }, []);

  return (
    <div className="relative h-screen w-screen">
      <GameCanvas />
      {sceneReady && <GameUI />}
    </div>
  );
}
