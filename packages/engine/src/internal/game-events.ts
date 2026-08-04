import type { Object3D } from "three";

/**
 * Built-in event constants for the engine event system.
 *
 * @public
 */
export const GameEvents = {
  // ─── Space ───────────────────────────────────────────────────────────
  /** Emitted when a space is created */
  SPACE_CREATED: "space_init",

  /** Emitted when a space is disposed */
  SPACE_DISPOSED: "space_disposed",

  // ─── Game Lifecycle ──────────────────────────────────────────────────
  /** Game initialized */
  GAME_INIT: "game_init",

  /** Game space loaded */
  GAME_SPACE_LOADED: "game_space_loaded",

  /** Game ready */
  GAME_READY: "game_ready",

  /** Game started */
  GAME_START: "game_start",

  /** Game stopped */
  GAME_STOP: "game_stop",

  /** Game update. Callback: `(delta, absTimer) => void` */
  GAME_UPDATE: "game_update",

  /** Game late update. Callback: `(delta, absTimer) => void` */
  GAME_LATE_UPDATE: "game_late_update",

  /** Game frame. Callback: `(delta, absTimer) => void` */
  GAME_FRAME: "game_frame",

  /** Game fixed update. Callback: `(delta, absTimer) => void` */
  GAME_FIXED_UPDATE: "game_fixed_update",

  /** Game before render */
  GAME_BEFORE_RENDER: "game_before_render",

  /** Game after fixed update. Callback: `(delta, absTimer) => void` */
  GAME_AFTER_FIXED_UPDATE: "game_after_fixed_update",

  /** Game fixed interpolation. Callback: `(alpha) => void` */
  GAME_FIXED_INTERPOLATE: "game_fixed_interpolate",

  /** Game disposed */
  GAME_DISPOSE: "game_dispose",

  /** Game post-ready */
  GAME_POST_READY: "game_post_ready",

  // ─── Component ───────────────────────────────────────────────────────
  /** Child added to parent. Callback: `(child: Object3D) => void` */
  CHILD_ADDED: "child_added",

  /** Child removed from parent. Callback: `(child: Object3D) => void` */
  CHILD_REMOVED: "child_removed",

  /** Component added. Callback: `(component) => void` */
  COMPONENT_ADDED: "component_added",

  /** Component removed. Callback: `(component) => void` */
  COMPONENT_REMOVED: "component_removed",

  /** Component factory initialized */
  COMPONENT_FACTORY_INIT: "component_factory_init",

  /** Component factory added. Callback: `(factory) => void` */
  COMPONENT_FACTORY_ADDED: "component_factory_added",

  /** Component factory removed. Callback: `(factory) => void` */
  COMPONENT_FACTORY_REMOVED: "component_factory_removed",

  // ─── Portal ──────────────────────────────────────────────────────────
  /**
   * A portal was entered. The host should open the destination directory
   * ("yellowpages") so the player can pick where to travel.
   * Callback: `(payload: { portalId: string; avatar: unknown }) => void`
   */
  PORTAL_OPEN: "portal_open",
} as const;

/**
 * Type representing all valid event keys.
 * @public
 */
export type EventType = keyof typeof GameEvents;

/**
 * Type representing all valid event string values.
 * @public
 */
export type EventValue = (typeof GameEvents)[EventType];

/**
 * Type-safe event listener signatures for public game events.
 *
 * @public
 */
export interface GameEventListeners {
  /** ─── Game Loop Events ─────────────────────────────────────────────── */

  /** Main game update (every frame when game is running). */
  [GameEvents.GAME_UPDATE]: (delta: number, absTimer: number) => void;
  /** Late update during active game. */
  [GameEvents.GAME_LATE_UPDATE]: (delta: number, absTimer: number) => void;
  /** Fixed timestep during active game. */
  [GameEvents.GAME_FIXED_UPDATE]: (delta: number, absTimer: number) => void;
  /** After fixed update during active game. */
  [GameEvents.GAME_AFTER_FIXED_UPDATE]: (
    delta: number,
    absTimer: number
  ) => void;
  /** Interpolation during active game. */
  [GameEvents.GAME_FIXED_INTERPOLATE]: (alpha: number) => void;
  /** Every frame (even if game not started). */
  [GameEvents.GAME_FRAME]: (delta: number, absTimer: number) => void;
  /** Game-level before render hook. */
  [GameEvents.GAME_BEFORE_RENDER]: () => void;

  /** ─── Space/Scene Events ─────────────────────────────────────────── */

  /** New space/level created. */
  [GameEvents.SPACE_CREATED]: () => void;
  /** Space/level destroyed. */
  [GameEvents.SPACE_DISPOSED]: () => void;

  /** ─── Object Hierarchy Events ────────────────────────────────────── */

  /** Child object added to parent. */
  [GameEvents.CHILD_ADDED]: (child: Object3D) => void;
  /** Child object removed from parent. */
  [GameEvents.CHILD_REMOVED]: (child: Object3D) => void;

  /** ─── Component Events ───────────────────────────────────────────── */

  /** Component instance created. */
  [GameEvents.COMPONENT_ADDED]: (component: unknown) => void;
  /** Component instance destroyed. */
  [GameEvents.COMPONENT_REMOVED]: (component: unknown) => void;
  /** Component registry initialized. */
  [GameEvents.COMPONENT_FACTORY_INIT]: () => void;
  /** New component factory registered. */
  [GameEvents.COMPONENT_FACTORY_ADDED]: (factory: unknown) => void;
  /** Component factory unregistered. */
  [GameEvents.COMPONENT_FACTORY_REMOVED]: (factory: unknown) => void;

  /** ─── Portal Events ──────────────────────────────────────────────── */

  /** Player entered a portal; open the destination directory. */
  [GameEvents.PORTAL_OPEN]: (payload: {
    portalId: string;
    avatar: unknown;
  }) => void;

  /** ─── Game Lifecycle Events ──────────────────────────────────────── */

  /** Game initialization begins. */
  [GameEvents.GAME_INIT]: () => void;
  /** All components loaded. */
  [GameEvents.GAME_SPACE_LOADED]: () => void;
  /** Game ready for user interaction. */
  [GameEvents.GAME_READY]: () => void;
  /** Ready tasks completed. */
  [GameEvents.GAME_POST_READY]: () => void;
  /** Game loop starts. */
  [GameEvents.GAME_START]: () => void;
  /** Game stopped. */
  [GameEvents.GAME_STOP]: () => void;
  /** Game cleanup/disposal. */
  [GameEvents.GAME_DISPOSE]: () => void;
}
