import type { ControlStateManager } from "./control-state";

export interface ControlStateCaptureBackend {
  attach(state: ControlStateManager): void;
  detach(): void;
  processInputFrame?(delta: number, absTimer: number): void;
}

export type ControlStateCaptureMode = "browser" | "none";

export interface BrowserInputCaptureOptions {
  /** Pointer/touch target. Defaults to no pointer capture if omitted. */
  target?: EventTarget | null | (() => EventTarget | null);
  /** Keyboard target. Defaults to `window` when available. */
  keyboardTarget?: EventTarget | null | (() => EventTarget | null);
  /** Optional key-event filter. Defaults to accepting all keyboard events. */
  canHandleKeyEvent?: (event: KeyboardEvent) => boolean;
  /** Prevent default browser touch handling when capturing touch input. */
  preventTouchDefaults?: boolean;
}

function resolveTarget(
  target: EventTarget | null | (() => EventTarget | null) | undefined,
): EventTarget | null {
  if (typeof target === "function") {
    return target() ?? null;
  }
  return target ?? null;
}

function getDefaultKeyboardTarget(): EventTarget | null {
  if (typeof window !== "undefined") {
    return window;
  }
  return null;
}

/**
 * Browser capture path for the input system.
 * Mouse and touch stay separate, keyboard remains event-driven, and gamepad is
 * polled once per input frame.
 */
export class BrowserInputCapture implements ControlStateCaptureBackend {
  private readonly _target: BrowserInputCaptureOptions["target"];
  private readonly _keyboardTarget: BrowserInputCaptureOptions["keyboardTarget"];
  private readonly _canHandleKeyEvent: NonNullable<
    BrowserInputCaptureOptions["canHandleKeyEvent"]
  >;
  private readonly _preventTouchDefaults: boolean;

  private _state: ControlStateManager | null = null;
  private _pointerTarget: EventTarget | null = null;
  private _resolvedKeyboardTarget: EventTarget | null = null;
  private _resolvedMouseUpTarget: EventTarget | null = null;

  constructor(options: BrowserInputCaptureOptions = {}) {
    this._target = options.target;
    this._keyboardTarget = options.keyboardTarget;
    this._canHandleKeyEvent = options.canHandleKeyEvent ?? (() => true);
    this._preventTouchDefaults = options.preventTouchDefaults ?? false;
  }

  attach(state: ControlStateManager): void {
    if (this._state === state) {
      return;
    }

    this.detach();
    this._state = state;

    this._pointerTarget = resolveTarget(this._target);
    this._resolvedKeyboardTarget =
      resolveTarget(this._keyboardTarget) ?? getDefaultKeyboardTarget();
    this._resolvedMouseUpTarget = getDefaultKeyboardTarget();

    this._resolvedKeyboardTarget?.addEventListener("keydown", this._onKeyDown);
    this._resolvedKeyboardTarget?.addEventListener("keyup", this._onKeyUp);

    this._pointerTarget?.addEventListener("mousedown", this._onMouseDown);
    this._pointerTarget?.addEventListener("mousemove", this._onMouseMove);
    this._pointerTarget?.addEventListener("mouseup", this._onMouseUp);
    this._pointerTarget?.addEventListener("wheel", this._onWheel);
    this._pointerTarget?.addEventListener("touchstart", this._onTouchStart);
    this._pointerTarget?.addEventListener("touchmove", this._onTouchMove);
    this._pointerTarget?.addEventListener("touchend", this._onTouchEnd);
    this._pointerTarget?.addEventListener("touchcancel", this._onTouchCancel);

    this._resolvedMouseUpTarget?.addEventListener("mouseup", this._onMouseUp);
  }

  detach(): void {
    this._resolvedKeyboardTarget?.removeEventListener("keydown", this._onKeyDown);
    this._resolvedKeyboardTarget?.removeEventListener("keyup", this._onKeyUp);

    this._pointerTarget?.removeEventListener("mousedown", this._onMouseDown);
    this._pointerTarget?.removeEventListener("mousemove", this._onMouseMove);
    this._pointerTarget?.removeEventListener("mouseup", this._onMouseUp);
    this._pointerTarget?.removeEventListener("wheel", this._onWheel);
    this._pointerTarget?.removeEventListener("touchstart", this._onTouchStart);
    this._pointerTarget?.removeEventListener("touchmove", this._onTouchMove);
    this._pointerTarget?.removeEventListener("touchend", this._onTouchEnd);
    this._pointerTarget?.removeEventListener("touchcancel", this._onTouchCancel);

    this._resolvedMouseUpTarget?.removeEventListener("mouseup", this._onMouseUp);

    this._pointerTarget = null;
    this._resolvedKeyboardTarget = null;
    this._resolvedMouseUpTarget = null;
    this._state = null;
  }

  processInputFrame(): void {
    const state = this._state;
    if (!state) return;

    const gamepads = globalThis.navigator?.getGamepads?.() ?? [];
    let gamepad: Gamepad | null = null;

    for (const candidate of gamepads) {
      if (candidate && candidate.connected) {
        gamepad = candidate;
        break;
      }
    }

    if (!gamepad) {
      state.gamepad.setSnapshot(null);
      return;
    }

    const buttonsDown: number[] = [];
    for (let i = 0; i < gamepad.buttons.length; i++) {
      if (gamepad.buttons[i]?.pressed) {
        buttonsDown.push(i);
      }
    }

    state.gamepad.setSnapshot({
      index: gamepad.index,
      buttonsDown,
      axes: gamepad.axes,
    });
  }

  private _onKeyDown = (event: KeyboardEvent): void => {
    if (!this._canHandleKeyEvent(event)) return;
    this._state?.keyboard.pressKey(event.code);
  };

  private _onKeyUp = (event: KeyboardEvent): void => {
    if (!this._canHandleKeyEvent(event)) return;
    this._state?.keyboard.releaseKey(event.code);
  };

  private _onMouseDown = (event: MouseEvent): void => {
    if (!this._state) return;
    this._state.mouse.pressButton(event.button);
    this._state.mouse.setPosition(event.clientX, event.clientY);
  };

  private _onMouseMove = (event: MouseEvent): void => {
    this._state?.mouse.move(
      event.movementX ?? 0,
      event.movementY ?? 0,
      event.clientX,
      event.clientY,
    );
  };

  private _onMouseUp = (event: MouseEvent): void => {
    if (!this._state) return;
    this._state.mouse.releaseButton(event.button);
    this._state.mouse.setPosition(event.clientX, event.clientY);
  };

  private _onWheel = (event: WheelEvent): void => {
    this._state?.mouse.scroll(event.deltaY);
  };

  private _onTouchStart = (event: TouchEvent): void => {
    if (!this._state) return;
    if (this._preventTouchDefaults) {
      event.preventDefault();
    }

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this._state.touch.startTouch(
        touch.identifier,
        touch.clientX,
        touch.clientY,
        event.touches.length,
      );
    }
  };

  private _onTouchMove = (event: TouchEvent): void => {
    if (!this._state) return;
    if (this._preventTouchDefaults) {
      event.preventDefault();
    }

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this._state.touch.moveTouch(
        touch.identifier,
        touch.clientX,
        touch.clientY,
        event.touches.length,
      );
    }
  };

  private _onTouchEnd = (event: TouchEvent): void => {
    if (!this._state) return;
    if (this._preventTouchDefaults) {
      event.preventDefault();
    }

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this._state.touch.endTouch(
        touch.identifier,
        touch.clientX,
        touch.clientY,
        event.touches.length,
      );
    }
  };

  private _onTouchCancel = (event: TouchEvent): void => {
    if (!this._state) return;
    if (this._preventTouchDefaults) {
      event.preventDefault();
    }

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this._state.touch.cancelTouch(
        touch.identifier,
        touch.clientX,
        touch.clientY,
        event.touches.length,
      );
    }
  };
}
