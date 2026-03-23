import { createInputs } from "../../src/input/input-map";
import { Touch } from "../../src/input/bindings";
import { sharedControlState } from "../../src/input/shared-control-state";
import {
  emitInputFrame,
  setJoystick,
  setupNavigatorMock,
} from "./input-test-utils";

describe("Inputs touch frame safety (touch joystick)", () => {
  beforeAll(() => {
    setupNavigatorMock();
  });

  beforeEach(() => {
    sharedControlState.reset();
  });

  afterEach(() => {
    sharedControlState.reset();
  });

  it("touch joystick value should remain stable across multiple fixed updates", () => {
    const config = {
        Move: {
          type: "vector2",
          bindings: [Touch.joystick()],
        },
      } as const;

    const inputs = createInputs(config);
    const move = inputs.Move;

    try {
      // Set touch joystick via event
      setJoystick(0.7, -0.5);
      emitInputFrame(3);

      const values: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 3; i++) {
        inputs.update(1 / 60);
        values.push({ ...(move as any).readValue() });
      }

      // All values should be identical (sampled once, stable across updates)
      expect(values).toEqual([
        { x: 0.7, y: -0.5 },
        { x: 0.7, y: -0.5 },
        { x: 0.7, y: -0.5 },
      ]);
    } finally {
      inputs.dispose();
    }
  });

  it("touch joystick should handle rapid direction changes between samples", () => {
    const config = {
        Move: {
          type: "vector2",
          bindings: [Touch.joystick()],
        },
      } as const;

    const inputs = createInputs(config);
    const move = inputs.Move;

    try {
      // Frame 1: Moving right
      setJoystick(1, 0);
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 1, y: 0 });

      // Frame 2: Snap to left (rapid direction change)
      setJoystick(-1, 0);
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: -1, y: 0 });

      // Frame 3: Release (center)
      setJoystick(0, 0);
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 0, y: 0 });
    } finally {
      inputs.dispose();
    }
  });

  it("touch joystick axis binding should remain stable across fixed updates", () => {
    const config = {
        Horizontal: {
          type: "value",
          bindings: [Touch.joystickAxis("x")],
        },
        Vertical: {
          type: "value",
          bindings: [Touch.joystickAxis("y")],
        },
      } as const;

    const inputs = createInputs(config);
    const horizontal = inputs.Horizontal;
    const vertical = inputs.Vertical;

    try {
      setJoystick(0.8, -0.6);
      emitInputFrame(3);

      const hValues: number[] = [];
      const vValues: number[] = [];
      for (let i = 0; i < 3; i++) {
        inputs.update(1 / 60);
        hValues.push((horizontal as any).readValue());
        vValues.push((vertical as any).readValue());
      }

      expect(hValues).toEqual([0.8, 0.8, 0.8]);
      expect(vValues).toEqual([-0.6, -0.6, -0.6]);
    } finally {
      inputs.dispose();
    }
  });
});
