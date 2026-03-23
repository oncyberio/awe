import { vi } from "vitest";
import Emitter from "../../src/internal/engine-emitter";
import { EngineEvents } from "../../src/internal/engine-events";
import {
  ControlStateEvents,
  ControlStateManager,
} from "../../src/input/control-state";
import type { ControlStateCaptureBackend } from "../../src/input/input-capture";

describe("ControlStateManager", () => {
  it("should stay inert to engine events unless driven imperatively", () => {
    const backend: ControlStateCaptureBackend = {
      attach: vi.fn(),
      detach: vi.fn(),
      processInputFrame: vi.fn(),
    };
    const controlState = new ControlStateManager({
      capture: backend,
    });

    const ready = vi.fn();
    controlState.on(ControlStateEvents.INPUT_STATE_READY, ready);

    try {
      expect(backend.attach).toHaveBeenCalledTimes(1);

      Emitter.emit(EngineEvents.INPUT_PROCESS, 1 / 60, 1 / 60);
      Emitter.emit(EngineEvents.BEFORE_FIXED_UPDATES, 3);
      Emitter.emit(EngineEvents.AFTER_PHYSICS_UPDATE, 1 / 60, 1 / 60);

      expect(backend.processInputFrame).not.toHaveBeenCalled();
      expect(controlState.frameCounter).toBe(0);
      expect(controlState.expectedFixedUpdates).toBe(1);
      expect(controlState.insideFixedLoop).toBe(false);
      expect(ready).not.toHaveBeenCalled();

      controlState.processInputFrame(1 / 60, 2 / 60);

      expect(backend.processInputFrame).toHaveBeenCalledTimes(1);
      expect(backend.processInputFrame).toHaveBeenCalledWith(1 / 60, 2 / 60);
      expect(controlState.frameCounter).toBe(1);
      expect(ready).toHaveBeenCalledTimes(1);
      expect(ready).toHaveBeenCalledWith(controlState);

      controlState.beginFixedUpdates(3);
      expect(controlState.expectedFixedUpdates).toBe(3);
      expect(controlState.insideFixedLoop).toBe(true);

      controlState.endFixedUpdates();
      expect(controlState.insideFixedLoop).toBe(false);
    } finally {
      controlState.dispose();
    }

    expect(backend.detach).toHaveBeenCalledTimes(1);
  });
});
