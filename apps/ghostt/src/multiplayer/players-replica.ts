import type { Room } from "@colyseus/sdk";
import type { AvatarComponent, Space } from "@oncyberio/engine";
import { GameState, PlayerState } from "../../shared/game-state";
import {
  ComponentReplica,
  type ComponentReplicaSpec,
} from "./component-replica";
import type { TransformSyncState } from "./transform-sync";

type PlayerAvatarTemplate = AvatarComponent["data"];

export type PlayersReplica = ComponentReplica<
  GameState,
  PlayerState,
  AvatarComponent
>;

export function createPlayersReplica(
  room: Room<any, GameState>,
  space: Space,
  playerAvatarTemplate: PlayerAvatarTemplate,
): PlayersReplica {
  const template = structuredClone(playerAvatarTemplate);
  const spec: ComponentReplicaSpec<
    GameState,
    PlayerState,
    AvatarComponent
  > = {
    isLocal(player, targetRoom) {
      return player.sessionId === targetRoom.sessionId;
    },
    async createComponent({ model, isLocal, space }) {
      const data = {
        ...structuredClone(template),
        type: "avatar",
        id: `player-${model.sessionId}`,
        position: { x: model.x, y: model.y, z: model.z },
        rotation: { x: 0, y: model.rotY, z: 0 },
        animation: model.anim || "idle",
        useCpuAnimation: true,
        collider: isLocal ? template.collider : undefined,
        script: undefined,
      } as PlayerAvatarTemplate;

      return (await space.components.create(data as any)) as unknown as AvatarComponent;
    },
    getTransform(player): TransformSyncState {
      return {
        position: { x: player.x, y: player.y, z: player.z },
        rotation: { x: 0, y: player.rotY, z: 0 },
        updatedAt: player.updatedAt || Date.now(),
      };
    },
    onModelChange({ model, component, isLocal }) {
      if (!component || isLocal || !model.anim) return;

      if (component.data?.animation !== model.anim) {
        component.play(model.anim, { fadeIn: 0.15, persist: true });
      }
    },
  };

  return new ComponentReplica({
    room,
    stateKey: "players",
    space,
    spec,
    transformSync: {
      lockRotation: { x: true, z: true },
    },
  });
}
