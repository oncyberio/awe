import type { Room } from "@colyseus/sdk";
import {
  Camera,
  type Space,
  AvatarComponent,
  createInputs,
  Keyboard,
  Gamepad,
  Mouse,
  Touch,
  Custom,
  Interactions,
  Processors,
  withProcessors,
} from "@oncyberio/engine";
import {
  Mover,
  ThirdPersonCameraRig,
  createMoverAnimStateMachine,
} from "@oncyberio/engine/controls";
import type { MoverAnimLocomotionState } from "@oncyberio/engine/controls";
import { Vector3 } from "three";
import { createGame } from "@/lib/utils";
import { gameStore, setStarted, setPaused } from "@/lib/game-store";
import { loadPortals } from "@/lib/portals";
import {
  setPortals,
  setPlayers,
  setChunk,
  openInfo,
  type PlayerInfo,
} from "@/lib/info-store";
import { connectToRoom, disconnectFromRoom } from "@/multiplayer/client";
import {
  createPlayersReplica,
  type PlayersReplica,
} from "@/multiplayer/players-replica";
import { PLAYER_UPDATE_MESSAGE } from "../../shared/messages";
import { NETWORK_TICK_INTERVAL } from "../../shared/network-constants";

// --- Input definitions ---
const GAMEPLAY_INPUTS = {
  Move: {
    type: "vector2" as const,
    bindings: [
      Keyboard.wasd(),
      Keyboard.arrows(),
      Gamepad.leftStick(),
      Gamepad.dpad(),
      Touch.joystick(),
    ],
  },
  Look: {
    type: "vector2" as const,
    bindings: [
      Mouse.pointerLockDelta(),
      withProcessors(Touch.delta(), Processors.scaleVector2(-1)),
      Gamepad.rightStick(),
    ],
  },
  Zoom: {
    type: "value" as const,
    bindings: [Mouse.wheel()],
  },
  Jump: {
    type: "button" as const,
    bindings: [
      Keyboard.button("Space"),
      Gamepad.button("A"),
      Custom.button("jump"),
    ],
    interactions: [Interactions.press()],
  },
  Sprint: {
    type: "button" as const,
    bindings: [
      Keyboard.button("ShiftLeft"),
      Keyboard.button("ShiftRight"),
      Gamepad.button("LB"),
    ],
  },
} as const;

// --- Animation clip names ---
const ANIMS = {
  idle: "idle",
  walk: "walk",
  run: "run",
  sprint: "sprint",
  jump_idle: "jump_idle",
  jump_walking: "jump_walking",
  jump_running: "jump_running",
  jump_sprinting: "jump_sprinting",
  jump_double: "jump_double",
  falling: "falling",
  drop_idle: "drop_idle",
  drop_walking: "drop_walking",
  drop_walking_roll: "drop_walking_roll",
  drop_running: "drop_running",
  drop_running_roll: "drop_running_roll",
  drop_sprinting: "drop_sprinting",
  drop_sprinting_roll: "drop_sprinting_roll",
};

function getJumpClip(state: MoverAnimLocomotionState): string {
  switch (state) {
    case "walk":
      return ANIMS.jump_walking;
    case "run":
      return ANIMS.jump_running;
    case "sprint":
      return ANIMS.jump_sprinting;
    default:
      return ANIMS.jump_idle;
  }
}

function getLandingClip(
  state: MoverAnimLocomotionState,
  velocityY: number,
): string {
  const roll = velocityY < -0.6;
  switch (state) {
    case "walk":
      return roll ? ANIMS.drop_walking_roll : ANIMS.drop_walking;
    case "run":
      return roll ? ANIMS.drop_running_roll : ANIMS.drop_running;
    case "sprint":
      return roll ? ANIMS.drop_sprinting_roll : ANIMS.drop_sprinting;
    default:
      return ANIMS.drop_idle;
  }
}

// --- Movement tuning ---
const SPEED = 10;
const SPRINT_BOOST = 1.5;

// Module-level reference for external control
let scriptInstance: GameScript | null = null;

export function startGame() {
  scriptInstance?.start();
}

export function togglePause() {
  scriptInstance?.togglePause();
}

/** Access the running game script from UI code. */
export function getScript(): GameScript | null {
  return scriptInstance;
}

// How often (ms) to push player/chunk snapshots to the info UI store.
const INFO_SYNC_INTERVAL = 200;

export class GameScript {
  private space: Space | null = null;
  private cleanup: (() => void) | null = null;
  private playersReplica: PlayersReplica | null = null;
  private room: Room<any> | null = null;
  private localPlayerAvatar: AvatarComponent | null = null;
  private timeSinceLastBroadcast = 0;
  private portalCleanup: (() => void) | null = null;
  private timeSinceInfoSync = 0;

  // Control primitives
  private inputs: ReturnType<typeof createInputs<typeof GAMEPLAY_INPUTS>> | null = null;
  private cameraRig: ThirdPersonCameraRig | null = null;
  private mover: Mover | null = null;
  private animStateMachine: ReturnType<typeof createMoverAnimStateMachine> | null = null;
  private controlsActive = false;

  /**
   * Initialize the game scene.
   * Returns when space is fully loaded and ready.
   */
  async init() {
    scriptInstance = this;
    try {
      // Create space - returns when fully loaded
      const { space, reveal } = await createGame({ baseUrl: "" });
      this.space = space;

      const playerTemplate = this.space.components.byId(
        "player",
      ) as AvatarComponent | null;
      if (!playerTemplate) {
        throw new Error("[Game] Player avatar template not found");
      }

      const room = await connectToRoom();
      this.room = room;
      console.log("[MP] Connected, sessionId:", room.sessionId);

      this.playersReplica = createPlayersReplica(
        room,
        this.space,
        playerTemplate.data as AvatarComponent["data"],
      );
      this.playersReplica.init();

      const playerAvatar = await this.playersReplica.whenLocalComponentReady();
      this.localPlayerAvatar = playerAvatar;

      playerTemplate.destroy();

      // Input system
      this.inputs = createInputs(GAMEPLAY_INPUTS);

      // Camera rig
      this.cameraRig = new ThirdPersonCameraRig({
        camera: Camera.current,
        target: playerAvatar,
        distance: 5,
        height: 0,
        collision: true,
        smoothing: 0.2,
        smoothMethod: "orbit",
      });

      // Mover
      this.mover = new Mover({
        body: playerAvatar,
        target: Camera.current,
        movement: {
          speed: SPEED,
          gravity: -1.81,
          acceleration: 100,
          deceleration: 50,
          airControl: 1,
          facingMode: "movement",
        },
        jump: {
          height: 4,
          duration: 1,
          maxJumps: 2,
          coyoteTime: Infinity,
          maxFallSpeed: 20,
        },
      });

      // Animation state machine
      this.animStateMachine = createMoverAnimStateMachine({
        body: playerAvatar,
        mover: this.mover,
        defaultBlendTime: 0.1,
        locomotionClips: {
          idle: ANIMS.idle,
          walk: ANIMS.walk,
          run: ANIMS.run,
          sprint: ANIMS.sprint,
        },
        locomotionThresholds: { walk: 10, sprint: SPEED * SPRINT_BOOST },
        jump: {
          clip: (ctx) => getJumpClip(ctx.jumpTakeoffState),
          toFallWhen: (ctx) => ctx.finished && !ctx.mover.grounded,
        },
        doubleJump: { clip: ANIMS.jump_double },
        fall: { clip: ANIMS.falling },
        landing: {
          clip: (ctx) =>
            getLandingClip(ctx.jumpTakeoffState, ctx.landingVelocityY),
        },
      });

      // Wire jump input
      this.inputs.Jump.onPerformed(() => {
        this.mover?.startJump();
      });

      this.setActive(false);

      gameStore.update({
        started: false,
        paused: false,
      });

      this.cleanup = this.space.use({
        onFixedUpdate: this.onFixedUpdate,
        onUpdate: this.onUpdate,
        onDispose: this.onDispose,
      });

      // Populate the destination directory ("yellowpages").
      loadPortals().then(setPortals);

      // Entering a portal opens the directory on the Destinations tab.
      this.portalCleanup = this.space._onEngineEvent("portal_open", () => {
        openInfo("destinations");
        try {
          document.exitPointerLock();
        } catch {
          // ignore
        }
      });

      await reveal();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  dispose() {
    // Disconnect from multiplayer
    this.playersReplica?.dispose();
    this.playersReplica = null;
    this.room = null;
    this.localPlayerAvatar = null;
    this.timeSinceLastBroadcast = 0;
    disconnectFromRoom();

    this.portalCleanup?.();
    this.portalCleanup = null;

    // Clean up space event handlers
    this.cleanup?.();
    this.cleanup = null;

    this.animStateMachine?.dispose();
    this.animStateMachine = null;
    this.mover?.dispose();
    this.mover = null;
    this.cameraRig?.dispose();
    this.cameraRig = null;
    this.inputs?.dispose();
    this.inputs = null;

    // Destroy the space
    this.space?.destroy();
    this.space = null;
    scriptInstance = null;
  }

  private setActive(val: boolean) {
    this.controlsActive = val;
    if (val) {
      this.inputs?.enable();
      this.mover?.reset();
      this.animStateMachine?.forceState("idle");
    } else {
      this.inputs?.disable();
      this.animStateMachine?.forceState("idle");
    }
    if (this.cameraRig) this.cameraRig.active = val;
    if (this.animStateMachine) this.animStateMachine.enabled = val;
  }

  start() {
    if (!this.space) return;

    this.setActive(true);
    setStarted(true);
    this.space.start();
  }

  togglePause() {
    if (!this.space) return;

    const currentPaused = gameStore.state.paused;

    if (currentPaused) {
      // Resume
      this.setActive(true);
      this.space.start();
      setPaused(false);
    } else {
      // Pause
      this.setActive(false);
      this.space.stop();
      setPaused(true);
    }
  }

  // Called on fixed timestep for physics (via space.use)
  onFixedUpdate = (dt: number) => {
    if (!this.controlsActive || !this.inputs || !this.mover) return;

    this.inputs.update(dt);

    const moveDir = this.inputs.Move.readValue();
    const isSprinting = this.inputs.Sprint.isPressed;
    const speed = isSprinting ? SPEED * SPRINT_BOOST : SPEED;

    const lookDelta = this.inputs.Look.readValue();
    const zoomDelta = this.inputs.Zoom.readValue();

    this.cameraRig?.rotate(lookDelta.x, lookDelta.y);
    this.cameraRig?.zoom(zoomDelta * 0.1);
    this.mover.move(moveDir.x, moveDir.y, speed);

    if (this.inputs.Jump.wasJustPressed) {
      this.mover.startJump();
    }

    this.mover.update(dt);
    this.animStateMachine?.update(dt);
  };

  // Called every frame when game is running (via space.use)
  onUpdate = (dt: number) => {
    this.playersReplica?.update(dt);
    this.broadcastLocalPlayerState(dt);
    this.syncInfoState(dt);
  };

  /** Throttled push of player roster + current chunk to the info UI store. */
  private syncInfoState(dt: number): void {
    this.timeSinceInfoSync += dt * 1000;
    if (this.timeSinceInfoSync < INFO_SYNC_INTERVAL) return;
    this.timeSinceInfoSync = 0;

    if (this.room) {
      const localId = this.room.sessionId;
      const players: PlayerInfo[] = [];
      this.room.state.players.forEach((p, sessionId) => {
        players.push({
          sessionId,
          x: p.x,
          y: p.y,
          z: p.z,
          isLocal: sessionId === localId,
        });
      });
      setPlayers(players);
    }

    const chunks = this.space?.chunks ?? null;
    setChunk(
      chunks?.currentKey ?? null,
      chunks?.isLoading ?? false,
      chunks?.currentInfo ?? null,
    );
  }

  onDispose = () => {
    console.log("[Game] Game disposed");
  };

  private broadcastLocalPlayerState(dt: number): void {
    if (!this.room || !this.localPlayerAvatar) return;

    const avatar = this.localPlayerAvatar;
    this.timeSinceLastBroadcast += dt * 1000;

    while (this.timeSinceLastBroadcast >= NETWORK_TICK_INTERVAL) {
      this.timeSinceLastBroadcast -= NETWORK_TICK_INTERVAL;

      this.room.send(PLAYER_UPDATE_MESSAGE, {
        x: avatar.position.x,
        y: avatar.position.y,
        z: avatar.position.z,
        rotY: avatar.rotation.y,
        anim: avatar.data?.animation ?? "idle",
      });

      if (this.timeSinceLastBroadcast > NETWORK_TICK_INTERVAL * 4) {
        this.timeSinceLastBroadcast = 0;
        break;
      }
    }
  }

  getSpace(): Space | null {
    return this.space;
  }

  /**
   * Move the local player to a world position. When the chunk system is
   * enabled the destination chunk is streamed in via {@link ChunkManager};
   * otherwise (full scene loaded) we teleport the avatar directly.
   */
  async travelTo(pos: { x: number; y: number; z: number }): Promise<void> {
    const avatar = this.localPlayerAvatar as any;
    if (!avatar?.rigidBody) return;

    const target = new Vector3(pos.x, pos.y, pos.z);
    const chunks = this.space?.chunks;

    if (chunks) {
      await chunks.travelTo(target, avatar);
      return;
    }

    // No chunking: direct teleport (assets already present).
    avatar.rigidBody.resetVelocities();
    avatar.rigidBody.enabled = false;
    avatar.position.copy(target);
    avatar.rigidBody.enabled = true;
    avatar.rigidBody.teleport(target, avatar.quaternion);
  }

  /** Teleport the local player to another player's current position. */
  async teleportToPlayer(sessionId: string): Promise<void> {
    const remote = this.room?.state.players.get(sessionId);
    if (!remote) return;
    await this.travelTo({ x: remote.x, y: remote.y, z: remote.z });
  }
}
