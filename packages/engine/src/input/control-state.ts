/**
 * Low-level device state management.
 *
 * This module provides raw device state (keyboard, mouse, gamepad, touch, custom) that
 * is polled/captured each frame. Higher-level input handling (edge detection,
 * interactions, callbacks) is done at the InputAction/InputValue level.
 *
 * Architecture:
 * - Each device has its own state class (KeyboardState, MouseState, etc.)
 * - ControlStateManager composes all device states and exposes imperative frame hooks
 * - Capture backends feed raw device state into these stores
 * - The host runtime decides when to call `processInputFrame()`,
 *   `beginFixedUpdates()`, and `endFixedUpdates()`
 * - Emits INPUT_STATE_READY locally when state is ready for consumers to sample
 *
 * Usage:
 * - Create a ControlStateManager for isolated input handling
 * - Subscribe to INPUT_STATE_READY via `controlState.on(...)`
 * - Use `shared-control-state.ts` when you want browser/engine wiring
 *
 * @module control-state
 */

import Augmented from "../internal/events/augmented";
import type { ControlStateCaptureBackend } from "./input-capture";

/**
 * Gamepad button mapping (Standard Gamepad layout).
 * Based on W3C Gamepad API standard layout.
 */
export const GamepadButtons = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  Back: 8,
  Start: 9,
  LS: 10,
  RS: 11,
  DPadUp: 12,
  DPadDown: 13,
  DPadLeft: 14,
  DPadRight: 15,
} as const;

export type GamepadButtonName = keyof typeof GamepadButtons;

/**
 * Gamepad axis mapping
 */
export const GamepadAxes = {
  LeftX: 0,
  LeftY: 1,
  RightX: 2,
  RightY: 3,
} as const;

export type GamepadAxisName = keyof typeof GamepadAxes;

/**
 * Device types supported by the input system
 */
export type DeviceType = "keyboard" | "mouse" | "gamepad" | "touch" | "custom";

/**
 * Local event emitted by ControlStateManager when input state is ready for sampling.
 */
export const ControlStateEvents = {
  /** Emitted after all devices have been sampled. Callback: `(state: ControlStateManager) => void` */
  INPUT_STATE_READY: "input_state_ready",
} as const;

/**
 * Event listener signatures for ControlStateManager local events.
 */
export interface ControlStateEventListeners {
  [ControlStateEvents.INPUT_STATE_READY]: (state: ControlStateManager) => void;
}

export interface ControlStateManagerOptions {
  /** Optional capture backend. Omit to drive device state imperatively. */
  capture?: ControlStateCaptureBackend | null;
}

// ============================================================================
// KeyboardState
// ============================================================================

/**
 * Keyboard input state.
 * Tracks currently held keys. Edge detection is computed at the InputAction level.
 */
export class KeyboardState {
  private _keysDown = new Set<string>();
  private _active = false;

  /**
   * Whether keyboard input is active
   */
  get active(): boolean {
    return this._active;
  }

  set active(val: boolean) {
    this._active = val;
  }

  /**
   * Capture frame state. Call once in BEFORE_FIXED_UPDATES.
   * No-op for keyboard (kept for interface consistency).
   */
  sample(): void {
    // No-op - keyboard state is event-driven
  }

  /**
   * Check if a key is currently held down
   */
  isKeyDown(code: string): boolean {
    return this._keysDown.has(code);
  }

  /**
   * Set the pressed state for a key.
   */
  setKey(code: string, pressed: boolean): void {
    if (!this._active) return;
    if (pressed) {
      this._keysDown.add(code);
    } else {
      this._keysDown.delete(code);
    }
  }

  /**
   * Mark a key as pressed.
   */
  pressKey(code: string): void {
    this.setKey(code, true);
  }

  /**
   * Mark a key as released.
   */
  releaseKey(code: string): void {
    this.setKey(code, false);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this._keysDown.clear();
  }
}

// ============================================================================
// MouseState
// ============================================================================

/**
 * Mouse input state.
 * Tracks button state and accumulates delta/wheel for frame capture.
 * Edge detection is computed at the InputAction level.
 */
export class MouseState {
  private _buttons = new Set<number>();
  private _x = 0;
  private _y = 0;
  private _deltaX = 0;
  private _deltaY = 0;
  private _wheelDelta = 0;

  // Frame-captured values
  private _frameDeltaX = 0;
  private _frameDeltaY = 0;
  private _frameWheelDelta = 0;

  private _active = false;

  /**
   * Whether mouse input is active
   */
  get active(): boolean {
    return this._active;
  }

  set active(val: boolean) {
    this._active = val;
  }

  /**
   * Capture frame state. Call once in BEFORE_FIXED_UPDATES.
   */
  sample(_iterationCount: number = 1): void {
    this._frameDeltaX = this._deltaX;
    this._frameDeltaY = this._deltaY;
    this._frameWheelDelta = this._wheelDelta;

    this._deltaX = 0;
    this._deltaY = 0;
    this._wheelDelta = 0;
  }

  /**
   * Check if a mouse button is currently held down (0=left, 1=middle, 2=right)
   */
  isButtonDown(button: number): boolean {
    return this._buttons.has(button);
  }

  /**
   * Current mouse position
   */
  get position(): { x: number; y: number } {
    return { x: this._x, y: this._y };
  }

  /**
   * Mouse movement delta for current frame.
   */
  get delta(): { x: number; y: number } {
    return { x: this._frameDeltaX, y: this._frameDeltaY };
  }

  /**
   * Get the full frame delta (not divided)
   */
  getFrameDelta(): { x: number; y: number } {
    return { x: this._frameDeltaX, y: this._frameDeltaY };
  }

  /**
   * Mouse wheel delta for current frame.
   */
  get wheelDelta(): number {
    return this._frameWheelDelta;
  }

  /**
   * Set whether a button is down.
   */
  setButton(button: number, pressed: boolean): void {
    if (!this._active) return;
    if (pressed) {
      this._buttons.add(button);
    } else {
      this._buttons.delete(button);
    }
  }

  /**
   * Mark a mouse button as pressed.
   */
  pressButton(button: number): void {
    this.setButton(button, true);
  }

  /**
   * Mark a mouse button as released.
   */
  releaseButton(button: number): void {
    this.setButton(button, false);
  }

  /**
   * Set mouse position without applying any delta.
   */
  setPosition(x: number, y: number): void {
    if (!this._active) return;
    this._x = x;
    this._y = y;
  }

  /**
   * Accumulate mouse movement and update position.
   */
  move(deltaX: number, deltaY: number, x = this._x, y = this._y): void {
    if (!this._active) return;
    this._x = x;
    this._y = y;
    this._deltaX += deltaX;
    this._deltaY += deltaY;
  }

  /**
   * Accumulate wheel movement.
   */
  scroll(delta: number): void {
    if (!this._active) return;
    this._wheelDelta += delta;
  }

  /**
   * Reset all state
   */
  reset(): void {
    this._buttons.clear();
    this._x = 0;
    this._y = 0;
    this._deltaX = 0;
    this._deltaY = 0;
    this._frameDeltaX = 0;
    this._frameDeltaY = 0;
    this._wheelDelta = 0;
    this._frameWheelDelta = 0;
  }
}

// ============================================================================
// GamepadState
// ============================================================================

/**
 * Gamepad input state.
 * Tracks connected gamepad button/axis state.
 * Edge detection is computed at the InputAction level.
 */
export class GamepadState {
  private _active = false;
  private _index: number | null = null;
  private _buttonsDown = new Set<number>();
  private _axes: number[] = [0, 0, 0, 0];

  /**
   * Whether gamepad input is active
   */
  get active(): boolean {
    return this._active;
  }

  set active(val: boolean) {
    this._active = val;
    if (!val) {
      this.reset();
    }
  }

  /**
   * Whether a gamepad is connected
   */
  get connected(): boolean {
    return this._index !== null;
  }

  /**
   * Capture frame state. No-op for gamepad (kept for interface consistency).
   */
  sample(): void {
    // No-op - gamepad state is updated by the active capture backend
  }

  /**
   * Check if a button is currently held down
   */
  isButtonDown(button: GamepadButtonName | number): boolean {
    const index = typeof button === "number" ? button : GamepadButtons[button];
    return this._buttonsDown.has(index);
  }

  /**
   * Get an axis value (-1 to 1)
   */
  getAxis(axis: GamepadAxisName | number): number {
    const index = typeof axis === "number" ? axis : GamepadAxes[axis];
    return this._axes[index] ?? 0;
  }

  /**
   * Replace the current gamepad snapshot.
   */
  setSnapshot(snapshot: {
    index: number;
    buttonsDown: Iterable<number>;
    axes?: ArrayLike<number>;
  } | null): void {
    if (!this._active) return;

    if (!snapshot) {
      this.reset();
      return;
    }

    this._index = snapshot.index;
    this._buttonsDown.clear();
    for (const button of snapshot.buttonsDown) {
      this._buttonsDown.add(button);
    }

    for (let i = 0; i < 4; i++) {
      this._axes[i] = snapshot.axes?.[i] ?? 0;
    }
  }

  /**
   * Reset all state
   */
  reset(): void {
    this._index = null;
    this._buttonsDown.clear();
    this._axes = [0, 0, 0, 0];
  }
}

// ============================================================================
// TouchState
// ============================================================================

interface TouchPoint {
  x: number;
  y: number;
}

/**
 * Touch/joystick input state.
 * Tracks direct touch contact plus optional virtual joystick state.
 * Edge detection is computed at the InputAction level.
 */
export class TouchState {
  private _touches = new Map<number, TouchPoint>();
  private _touchCount = 0;
  private _primaryTouchId: number | null = null;

  private _x = 0;
  private _y = 0;
  private _deltaX = 0;
  private _deltaY = 0;

  private _joystickX = 0;
  private _joystickY = 0;

  // Frame-captured values
  private _frameX = 0;
  private _frameY = 0;
  private _frameDeltaX = 0;
  private _frameDeltaY = 0;
  private _frameJoystickX = 0;
  private _frameJoystickY = 0;

  private _active = false;

  /**
   * Whether touch input is active
   */
  get active(): boolean {
    return this._active;
  }

  set active(val: boolean) {
    this._active = val;
  }

  /**
   * Capture frame state. Call once in BEFORE_FIXED_UPDATES.
   */
  sample(): void {
    this._frameX = this._x;
    this._frameY = this._y;
    this._frameDeltaX = this._deltaX;
    this._frameDeltaY = this._deltaY;
    this._frameJoystickX = this._joystickX;
    this._frameJoystickY = this._joystickY;

    this._deltaX = 0;
    this._deltaY = 0;
  }

  /**
   * Latest sampled primary touch position.
   */
  get position(): { x: number; y: number } {
    return { x: this._frameX, y: this._frameY };
  }

  /**
   * Latest sampled primary touch delta.
   */
  get delta(): { x: number; y: number } {
    return { x: this._frameDeltaX, y: this._frameDeltaY };
  }

  /**
   * Joystick X value (-1 to 1)
   */
  get joystickX(): number {
    return this._frameJoystickX;
  }

  /**
   * Joystick Y value (-1 to 1)
   */
  get joystickY(): number {
    return this._frameJoystickY;
  }

  /**
   * Number of active touches.
   */
  get touchCount(): number {
    return this._touchCount;
  }

  /**
   * Whether touch is currently active
   */
  get isTouching(): boolean {
    return this._touchCount > 0;
  }

  /**
   * Mark a touch as started.
   */
  startTouch(
    identifier: number,
    x: number,
    y: number,
    countHint?: number,
  ): void {
    if (!this._active) return;

    this._touches.set(identifier, { x, y });
    this._touchCount = countHint ?? this._touches.size;

    if (this._primaryTouchId == null || this._primaryTouchId === identifier) {
      this._primaryTouchId = identifier;
      this._x = x;
      this._y = y;
    }
  }

  /**
   * Update a touch position.
   */
  moveTouch(
    identifier: number,
    x: number,
    y: number,
    countHint?: number,
  ): void {
    if (!this._active) return;

    const prev = this._touches.get(identifier);
    this._touches.set(identifier, { x, y });
    this._touchCount = countHint ?? this._touches.size;

    if (this._primaryTouchId == null) {
      this._primaryTouchId = identifier;
      this._x = x;
      this._y = y;
      return;
    }

    if (this._primaryTouchId !== identifier) {
      return;
    }

    if (prev) {
      this._deltaX += x - prev.x;
      this._deltaY += y - prev.y;
    }

    this._x = x;
    this._y = y;
  }

  /**
   * Mark a touch as ended.
   */
  endTouch(
    identifier: number,
    x = this._x,
    y = this._y,
    countHint?: number,
  ): void {
    if (!this._active) return;

    this._touches.delete(identifier);
    this._touchCount = countHint ?? this._touches.size;

    if (this._primaryTouchId !== identifier) {
      return;
    }

    this._x = x;
    this._y = y;

    const nextTouch = this._touches.entries().next();
    if (!nextTouch.done) {
      this._primaryTouchId = nextTouch.value[0];
      this._x = nextTouch.value[1].x;
      this._y = nextTouch.value[1].y;
    } else {
      this._primaryTouchId = null;
    }
  }

  /**
   * Mark a touch as canceled.
   */
  cancelTouch(
    identifier: number,
    x = this._x,
    y = this._y,
    countHint?: number,
  ): void {
    this.endTouch(identifier, x, y, countHint);
  }

  /**
   * Set joystick values (for virtual joystick controls)
   */
  setJoystick(x: number, y: number): void {
    if (!this._active) return;
    this._joystickX = x;
    this._joystickY = y;
  }

  /**
   * Reset all state
   */
  reset(): void {
    this._touches.clear();
    this._touchCount = 0;
    this._primaryTouchId = null;

    this._x = 0;
    this._y = 0;
    this._deltaX = 0;
    this._deltaY = 0;

    this._joystickX = 0;
    this._joystickY = 0;

    this._frameX = 0;
    this._frameY = 0;
    this._frameDeltaX = 0;
    this._frameDeltaY = 0;
    this._frameJoystickX = 0;
    this._frameJoystickY = 0;
  }
}

// ============================================================================
// CustomState
// ============================================================================

/**
 * Imperative custom input state.
 * Useful for wiring game actions to app-level UI such as mobile HUD buttons.
 */
export class CustomState {
  private _buttons = new Set<string>();
  private _values = new Map<string, number>();
  private _vectors = new Map<string, { x: number; y: number }>();
  private _active = false;

  /**
   * Whether custom input is active
   */
  get active(): boolean {
    return this._active;
  }

  set active(val: boolean) {
    this._active = val;
  }

  /**
   * Capture frame state. Call once in BEFORE_FIXED_UPDATES.
   * No-op for imperative custom buttons.
   */
  sample(): void {
    // No-op - custom state is updated imperatively by the host app
  }

  /**
   * Check if a custom button is currently held down.
   */
  isButtonDown(event: string): boolean {
    return this._buttons.has(event);
  }

  /**
   * Set whether a custom button is down.
   */
  setButton(event: string, pressed: boolean): void {
    if (!this._active) return;
    if (pressed) {
      this._buttons.add(event);
    } else {
      this._buttons.delete(event);
    }
  }

  /**
   * Mark a custom button as pressed.
   */
  pressButton(event: string): void {
    this.setButton(event, true);
  }

  /**
   * Mark a custom button as released.
   */
  releaseButton(event: string): void {
    this.setButton(event, false);
  }

  /**
   * Get the latest scalar value for a custom control.
   */
  getValue(event: string): number {
    return this._values.get(event) ?? 0;
  }

  /**
   * Set the scalar value for a custom control.
   */
  setValue(event: string, value: number): void {
    if (!this._active) return;
    this._values.set(event, value);
  }

  /**
   * Get the latest Vector2 value for a custom control.
   */
  getVector2(event: string): { x: number; y: number } {
    const value = this._vectors.get(event);
    if (!value) {
      return { x: 0, y: 0 };
    }
    return { x: value.x, y: value.y };
  }

  /**
   * Set the Vector2 value for a custom control.
   */
  setVector2(event: string, x: number, y: number): void {
    if (!this._active) return;
    this._vectors.set(event, { x, y });
  }

  /**
   * Reset all state
   */
  reset(): void {
    this._buttons.clear();
    this._values.clear();
    this._vectors.clear();
  }
}

// ============================================================================
// Shared Control State (Unified Facade)
// ============================================================================

/**
 * Unified control state - facade that composes all device states.
 * Provides a single point of access for all input devices.
 * Auto-updates by subscribing to engine frame events.
 */
export class ControlStateManager {
  readonly keyboard: KeyboardState;
  readonly mouse: MouseState;
  readonly gamepad: GamepadState;
  readonly touch: TouchState;
  readonly custom: CustomState;

  private _emitter = new Augmented<ControlStateEventListeners>({
    scope: "engine",
  });
  private _captureBackend: ControlStateCaptureBackend | null;

  private _active = false;
  private _disposed = false;
  private _frameCounter = 0;
  private _expectedFixedUpdates = 1;
  private _insideFixedLoop = false;

  /**
   * Current frame counter, incremented each input processing frame.
   */
  get frameCounter(): number {
    return this._frameCounter;
  }

  /**
   * Expected number of fixed updates for the current render frame.
   */
  get expectedFixedUpdates(): number {
    return this._expectedFixedUpdates;
  }

  /**
   * Whether we're currently inside the fixed loop (physics phase).
   */
  get insideFixedLoop(): boolean {
    return this._insideFixedLoop;
  }

  constructor(options: ControlStateManagerOptions = {}) {
    this.keyboard = new KeyboardState();
    this.mouse = new MouseState();
    this.gamepad = new GamepadState();
    this.touch = new TouchState();
    this.custom = new CustomState();

    this._captureBackend = options.capture ?? null;
    this.active = true;
  }

  /**
   * Subscribe to a control state event.
   */
  on<K extends keyof ControlStateEventListeners>(
    type: K,
    callback: ControlStateEventListeners[K],
  ): void {
    this._emitter.on(type, callback);
  }

  /**
   * Subscribe to a control state event once.
   */
  once<K extends keyof ControlStateEventListeners>(
    type: K,
    callback: ControlStateEventListeners[K],
  ): void {
    this._emitter.once(type, callback);
  }

  /**
   * Unsubscribe from a control state event.
   */
  off<K extends keyof ControlStateEventListeners>(
    type: K,
    callback: ControlStateEventListeners[K],
  ): void {
    this._emitter.off(type, callback);
  }

  /**
   * Whether the control state is active and listening for input
   */
  get active(): boolean {
    return this._active;
  }

  set active(val: boolean) {
    if (this._active === val) return;
    this._active = val;

    this.keyboard.active = val;
    this.mouse.active = val;
    this.gamepad.active = val;
    this.touch.active = val;
    this.custom.active = val;

    if (val) {
      this._captureBackend?.attach(this);
    } else {
      this._captureBackend?.detach();
    }
  }

  /**
   * Reset all input state
   */
  reset(): void {
    this.keyboard.reset();
    this.mouse.reset();
    this.gamepad.reset();
    this.touch.reset();
    this.custom.reset();
  }

  /**
   * Dispose the control state
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.active = false;
    this.reset();
    this._emitter.dispose();
  }

  /**
   * Imperatively mark the start of a fixed-update phase.
   */
  beginFixedUpdates(iterationCount: number): void {
    this._onBeforeFixedUpdates(iterationCount);
  }

  /**
   * Imperatively mark the end of a fixed-update phase.
   */
  endFixedUpdates(): void {
    this._onAfterPhysicsUpdate();
  }

  /**
   * Imperatively process one input frame and publish sampled state.
   */
  processInputFrame(delta: number = 0, absTimer: number = 0): void {
    this._onInputProcess(delta, absTimer);
  }

  private _onBeforeFixedUpdates = (iterationCount: number): void => {
    if (!this._active || this._disposed) return;
    this._expectedFixedUpdates = Math.max(1, Math.floor(iterationCount));
    this._insideFixedLoop = true;
  };

  private _onAfterPhysicsUpdate = (): void => {
    if (!this._active || this._disposed) return;
    this._insideFixedLoop = false;
  };

  private _onInputProcess = (_delta: number, _absTimer: number): void => {
    if (!this._active || this._disposed) return;
    this._frameCounter++;
    this._expectedFixedUpdates = 1;

    this._captureBackend?.processInputFrame?.(_delta, _absTimer);

    this.keyboard.sample();
    this.mouse.sample();
    this.gamepad.sample();
    this.touch.sample();
    this.custom.sample();

    this._emitter.emit(ControlStateEvents.INPUT_STATE_READY, this);
  };
}
