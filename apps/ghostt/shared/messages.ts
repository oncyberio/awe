export const PLAYER_UPDATE_MESSAGE = "player:update";

export interface PlayerUpdateMessage {
  x: number;
  y: number;
  z: number;
  rotY: number;
  anim: string;
}

export function isPlayerUpdateMessage(
  value: unknown,
): value is PlayerUpdateMessage {
  return (
    value != null &&
    typeof value === "object" &&
    Number.isFinite((value as PlayerUpdateMessage).x) &&
    Number.isFinite((value as PlayerUpdateMessage).y) &&
    Number.isFinite((value as PlayerUpdateMessage).z) &&
    Number.isFinite((value as PlayerUpdateMessage).rotY) &&
    typeof (value as PlayerUpdateMessage).anim === "string"
  );
}
