"use client";

import dynamic from "next/dynamic";

const GameScene = dynamic(
  () => import("@/components/game-scene").then((mod) => mod.GameScene),
  { ssr: false }
);

export default function StarterPage() {
  return <GameScene />;
}
