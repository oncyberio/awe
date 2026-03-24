import { vi } from "vitest";
import Emitter from "../../src/internal/engine-emitter";
import { EngineEvents } from "../../src/internal/engine-events";
import { ControlStateEvents } from "../../src/input/control-state";
import { SharedControlStateManager } from "../../src/input/shared-control-state";
import type { ControlStateCaptureBackend } from "../../src/input/input-capture";

describe("SharedControlStateManager", () => {
  it("should bridge engine events into the imperative control-state lifecycle", () => {
    const backend: ControlStateCaptureBackend = {
      attach: vi.fn(),
      detach: vi.fn(),
      processInputFrame: vi.fn(),
    };
    const controlState = new SharedControlStateManager({
      capture: backend,
    });

    const ready = vi.fn();
    controlState.on(ControlStateEvents.INPUT_STATE_READY, ready);

    try {
      Emitter.emit(EngineEvents.INPUT_PROCESS, 1 / 60, 1 / 60);

      expect(backend.processInputFrame).toHaveBeenCalledTimes(1);
      expect(backend.processInputFrame).toHaveBeenCalledWith(1 / 60, 1 / 60);
      expect(controlState.frameCounter).toBe(1);
      expect(ready).toHaveBeenCalledTimes(1);
      expect(ready).toHaveBeenCalledWith(controlState);

      Emitter.emit(EngineEvents.BEFORE_FIXED_UPDATES, 4);
      expect(controlState.expectedFixedUpdates).toBe(4);
      expect(controlState.insideFixedLoop).toBe(true);

      Emitter.emit(EngineEvents.AFTER_PHYSICS_UPDATE, 1 / 60, 1 / 60);
      expect(controlState.insideFixedLoop).toBe(false);
    } finally {
      controlState.dispose();
    }
  });

  it("should unsubscribe from engine events on dispose", () => {
    const backend: ControlStateCaptureBackend = {
      attach: vi.fn(),
      detach: vi.fn(),
      processInputFrame: vi.fn(),
    };
    const controlState = new SharedControlStateManager({
      capture: backend,
    });

    controlState.dispose();

    Emitter.emit(EngineEvents.INPUT_PROCESS, 1 / 60, 1 / 60);
    Emitter.emit(EngineEvents.BEFORE_FIXED_UPDATES, 5);
    Emitter.emit(EngineEvents.AFTER_PHYSICS_UPDATE, 1 / 60, 1 / 60);

    expect(backend.detach).toHaveBeenCalledTimes(1);
    expect(backend.processInputFrame).not.toHaveBeenCalled();
    expect(controlState.frameCounter).toBe(0);
    expect(controlState.expectedFixedUpdates).toBe(1);
    expect(controlState.insideFixedLoop).toBe(false);
  });
});
