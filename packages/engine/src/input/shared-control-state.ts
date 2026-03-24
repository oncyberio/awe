import emitter from "../internal/engine-emitter";
import { EngineEvents } from "../internal/engine-events";
import { CANVAS, FRONT_END } from "../internal/constants";
import {
  BrowserInputCapture,
  type BrowserInputCaptureOptions,
  type ControlStateCaptureBackend,
  type ControlStateCaptureMode,
} from "./input-capture";
import { ControlStateManager } from "./control-state";

export interface SharedControlStateOptions {
  /**
   * Capture backend selection.
   * - `browser`: uses browser input capture with separate mouse/touch channels
   * - `none`: no capture backend, caller drives state imperatively
   * - custom backend object: attach your own source
   */
  capture?: ControlStateCaptureMode | ControlStateCaptureBackend;
  /** Browser capture options, used when `capture: "browser"` */
  browserCapture?: BrowserInputCaptureOptions;
}

function resolveCaptureBackend(
  options: SharedControlStateOptions,
): ControlStateCaptureBackend | null {
  const capture = options.capture ?? (FRONT_END ? "browser" : "none");

  if (capture === "none") {
    return null;
  }

  if (capture === "browser") {
    return new BrowserInputCapture(options.browserCapture);
  }

  return capture;
}

/**
 * Shared control state wired to engine frame events.
 */
export class SharedControlStateManager extends ControlStateManager {
  constructor(options: SharedControlStateOptions = {}) {
    super({
      capture: resolveCaptureBackend(options),
    });

    emitter.on(EngineEvents.INPUT_PROCESS, this._onEngineInputProcess);
    emitter.on(
      EngineEvents.BEFORE_FIXED_UPDATES,
      this._onEngineBeforeFixedUpdates,
    );
    emitter.on(
      EngineEvents.AFTER_PHYSICS_UPDATE,
      this._onEngineAfterPhysicsUpdate,
    );
  }

  override dispose(): void {
    emitter.off(EngineEvents.INPUT_PROCESS, this._onEngineInputProcess);
    emitter.off(
      EngineEvents.BEFORE_FIXED_UPDATES,
      this._onEngineBeforeFixedUpdates,
    );
    emitter.off(
      EngineEvents.AFTER_PHYSICS_UPDATE,
      this._onEngineAfterPhysicsUpdate,
    );

    super.dispose();
  }

  private _onEngineInputProcess = (delta: number, absTimer: number): void => {
    this.processInputFrame(delta, absTimer);
  };

  private _onEngineBeforeFixedUpdates = (iterationCount: number): void => {
    this.beginFixedUpdates(iterationCount);
  };

  private _onEngineAfterPhysicsUpdate = (): void => {
    this.endFixedUpdates();
  };
}

/**
 * Shared control state instance.
 * Defaults to the browser capture backend in browser environments and to manual
 * wiring outside the browser.
 */
export const sharedControlState = new SharedControlStateManager({
  capture: FRONT_END ? "browser" : "none",
  browserCapture: {
    target: () => CANVAS,
    keyboardTarget: () => window,
  },
});
