import { createInputs } from "../../src/input/input-map";
import { Gamepad } from "../../src/input/bindings";
import { BrowserInputCapture } from "../../src/input/input-capture";
import { Interactions } from "../../src/input/interactions";
import { ControlStateManager } from "../../src/input/control-state";
import { emitInputFrame, setupNavigatorMock } from "./input-test-utils";

describe("Inputs gamepad frame safety (buttons and sticks)", () => {
  let controlState!: ControlStateManager;

  beforeAll(() => {
    setupNavigatorMock();
  });

  beforeEach(() => {
    controlState = new ControlStateManager({
      capture: new BrowserInputCapture(),
    });
  });

  afterEach(() => {
    controlState.dispose();
    // Reset mock
    (globalThis as any).navigator.getGamepads = () => [];
  });

  it("gamepad button press should not duplicate across multiple fixed updates", () => {
    const config = {
        Jump: {
          type: "button",
          bindings: [Gamepad.button("A")],
          interactions: [Interactions.press("pressOnly")],
        },
      } as const;

    const inputs = createInputs(config, { controlState });
    const jump = inputs.Jump;

    let performedCount = 0;
    const unsubscribe = jump.onPerformed(() => {
      performedCount++;
    });

    // Mock gamepad with A button pressed
    const mockGamepad = {
      connected: true,
      index: 0,
      buttons: Array(16)
        .fill(null)
        .map((_, i) => ({ pressed: i === 0, value: i === 0 ? 1 : 0 })), // A is button 0
      axes: [0, 0, 0, 0],
    };
    (globalThis as any).navigator.getGamepads = () => [mockGamepad];

    try {
      // Sample with A pressed
      emitInputFrame(2, controlState);

      // Multiple fixed updates
      inputs.update(1 / 60);
      inputs.update(1 / 60);

      // Press should fire exactly once
      expect(performedCount).toBe(1);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("gamepad button release should fire exactly once across multiple fixed updates", () => {
    const config = {
        Fire: {
          type: "button",
          bindings: [Gamepad.button("A")],
          interactions: [Interactions.press("releaseOnly")],
        },
      } as const;

    const inputs = createInputs(config, { controlState });
    const fire = inputs.Fire;

    let performedCount = 0;
    const unsubscribe = fire.onPerformed(() => {
      performedCount++;
    });

    const createGamepadMock = (aPressed: boolean) => ({
      connected: true,
      index: 0,
      buttons: Array(16)
        .fill(null)
        .map((_, i) => ({
          pressed: i === 0 ? aPressed : false,
          value: i === 0 && aPressed ? 1 : 0,
        })),
      axes: [0, 0, 0, 0],
    });

    try {
      // Press A
      (globalThis as any).navigator.getGamepads = () => [
        createGamepadMock(true),
      ];
      emitInputFrame(1, controlState);
      inputs.update(1 / 60);

      // Release A
      (globalThis as any).navigator.getGamepads = () => [
        createGamepadMock(false),
      ];
      emitInputFrame(2, controlState);

      // Multiple fixed updates after release
      inputs.update(1 / 60);
      inputs.update(1 / 60);

      // Release should fire exactly once
      expect(performedCount).toBe(1);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("gamepad stick value should be consistent across fixed updates until next sample", () => {
    const config = {
        Look: {
          type: "vector2",
          bindings: [Gamepad.rightStick(0.1)],
        },
      } as const;

    const inputs = createInputs(config, { controlState });
    const look = inputs.Look;

    const createGamepadMock = (rx: number, ry: number) => ({
      connected: true,
      index: 0,
      buttons: Array(16)
        .fill(null)
        .map(() => ({ pressed: false, value: 0 })),
      axes: [0, 0, rx, ry], // Right stick is axes 2 and 3
    });

    try {
      // Set right stick to (0.5, -0.3)
      (globalThis as any).navigator.getGamepads = () => [
        createGamepadMock(0.5, -0.3),
      ];
      emitInputFrame(3, controlState);

      const values: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 3; i++) {
        inputs.update(1 / 60);
        values.push({ ...(look as any).readValue() });
      }

      // All values should be identical (Y inverted for standard up=positive)
      expect(values).toEqual([
        { x: 0.5, y: 0.3 },
        { x: 0.5, y: 0.3 },
        { x: 0.5, y: 0.3 },
      ]);
    } finally {
      inputs.dispose();
    }
  });
});
