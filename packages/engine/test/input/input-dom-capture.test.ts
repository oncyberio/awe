import { createInputs } from "../../src/input/input-map";
import { Mouse, Touch, withProcessors } from "../../src/input/bindings";
import { Processors } from "../../src/input/processors";
import {
  BrowserInputCapture,
  ControlStateManager,
} from "../../src/input/index";
import { setupNavigatorMock } from "./input-test-utils";

type Listener = (event: any) => void;

class MockEventTarget {
  private _listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const callback =
      typeof listener === "function"
        ? (listener as Listener)
        : (event: any) => listener.handleEvent(event);

    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }

    this._listeners.get(type)!.add(callback);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) {
    const callbacks = this._listeners.get(type);
    if (!callbacks) return;

    if (typeof listener !== "function") {
      return;
    }

    for (const callback of callbacks) {
      if (callback === listener) {
        callbacks.delete(callback);
      }
    }
  }

  dispatch(type: string, event: any): void {
    for (const listener of this._listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe("BrowserInputCapture", () => {
  beforeAll(() => {
    setupNavigatorMock();
  });

  it("captures touch separately from mouse for the input system", () => {
    const pointerTarget = new MockEventTarget();
    const keyboardTarget = new MockEventTarget();
    const controlState = new ControlStateManager({
      capture: new BrowserInputCapture({
        target: pointerTarget as unknown as EventTarget,
        keyboardTarget: keyboardTarget as unknown as EventTarget,
      }),
    });

    const inputs = createInputs(
      {
        TouchPosition: {
          type: "vector2",
          bindings: [Touch.position()],
        },
        TouchDelta: {
          type: "vector2",
          bindings: [Touch.delta()],
        },
        TouchDragDelta: {
          type: "vector2",
          bindings: [withProcessors(Touch.delta(), Processors.scaleVector2(-1))],
        },
        MouseDelta: {
          type: "vector2",
          bindings: [Mouse.delta()],
        },
      } as const,
      {
        controlState,
        sampling: "manual",
      },
    );

    try {
      const preventDefault = () => {};
      pointerTarget.dispatch("touchstart", {
        changedTouches: [{ identifier: 1, clientX: 10, clientY: 20 }],
        touches: [{ identifier: 1, clientX: 10, clientY: 20 }],
        preventDefault,
      });
      pointerTarget.dispatch("touchmove", {
        changedTouches: [{ identifier: 1, clientX: 16, clientY: 24 }],
        touches: [{ identifier: 1, clientX: 16, clientY: 24 }],
        preventDefault,
      });

      controlState.processInputFrame(1 / 60, 0);
      controlState.beginFixedUpdates(2);
      inputs.sample();

      inputs.update(1 / 60);
      expect(inputs.TouchPosition.readValue()).toEqual({ x: 16, y: 24 });
      expect(inputs.TouchDelta.readValue()).toEqual({ x: 3, y: 2 });
      expect(inputs.TouchDragDelta.readValue()).toEqual({ x: -3, y: -2 });
      expect(inputs.MouseDelta.readValue()).toEqual({ x: 0, y: 0 });

      inputs.update(1 / 60);
      expect(inputs.TouchDelta.readValue()).toEqual({ x: 3, y: 2 });
      expect(inputs.TouchDragDelta.readValue()).toEqual({ x: -3, y: -2 });
      expect(inputs.MouseDelta.readValue()).toEqual({ x: 0, y: 0 });

      controlState.endFixedUpdates();
    } finally {
      inputs.dispose();
      controlState.dispose();
    }
  });
});
