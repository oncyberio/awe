import { createInputs } from "../../src/input/input-map";
import { Keyboard } from "../../src/input/bindings";
import { sharedControlState } from "../../src/input/shared-control-state";
import {
  emitInputFrame,
  pressKey,
  releaseKey,
  setupNavigatorMock,
} from "./input-test-utils";

describe("Inputs value frame safety (value stability, lock, readValue)", () => {
  beforeAll(() => {
    setupNavigatorMock();
  });

  beforeEach(() => {
    sharedControlState.reset();
  });

  afterEach(() => {
    sharedControlState.reset();
  });

  it("WASD vector2 value should remain stable across multiple fixed updates while held", () => {
    const config = {
        Move: {
          type: "vector2",
          bindings: [Keyboard.wasd()],
        },
      } as const;

    const inputs = createInputs(config);
    const move = inputs.Move;

    try {
      // Press W and D (diagonal up-right)
      pressKey("KeyW");
      pressKey("KeyD");
      emitInputFrame(3);

      const values: Array<{ x: number; y: number }> = [];

      // Multiple fixed updates should all see the same value
      for (let i = 0; i < 3; i++) {
        inputs.update(1 / 60);
        values.push({ ...(move as any).readValue() });
      }

      // All values should be identical: up-right diagonal
      expect(values).toEqual([
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ]);
    } finally {
      inputs.dispose();
    }
  });

  it("vector2 value should update correctly when keys change between samples", () => {
    const config = {
        Move: {
          type: "vector2",
          bindings: [Keyboard.wasd()],
        },
      } as const;

    const inputs = createInputs(config);
    const move = inputs.Move;

    try {
      // Frame 1: Press W (up)
      pressKey("KeyW");
      emitInputFrame();
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 0, y: 1 });

      // Frame 2: Release W, press S (down)
      releaseKey("KeyW");
      pressKey("KeyS");
      emitInputFrame();
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 0, y: -1 });

      // Frame 3: Release S (no input)
      releaseKey("KeyS");
      emitInputFrame();
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 0, y: 0 });
    } finally {
      inputs.dispose();
    }
  });

  it("locked value should ignore all binding updates", () => {
    const config = {
        Move: {
          type: "vector2",
          bindings: [Keyboard.wasd()],
        },
      } as const;

    const inputs = createInputs(config);
    const move = inputs.Move;

    try {
      // Lock to a fixed value
      (move as any).lock({ x: 1, y: 0 });

      // Press W (would normally give {x: 0, y: 1})
      pressKey("KeyW");
      emitInputFrame(3);

      const values: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 3; i++) {
        inputs.update(1 / 60);
        values.push({ ...(move as any).readValue() });
      }

      // All values should be the locked value, not the binding value
      expect(values).toEqual([
        { x: 1, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 0 },
      ]);
    } finally {
      inputs.dispose();
    }
  });

  it("locked value should remain stable across sample/update cycles", () => {
    const config = {
        Move: {
          type: "vector2",
          bindings: [Keyboard.wasd()],
        },
      } as const;

    const inputs = createInputs(config);
    const move = inputs.Move;

    try {
      // Lock value
      (move as any).lock({ x: 0.5, y: 0.5 });

      // Multiple frames with varying inputs
      pressKey("KeyW");
      emitInputFrame(2);
      inputs.update(1 / 60);
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 0.5, y: 0.5 });

      pressKey("KeyS");
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 0.5, y: 0.5 });

      releaseKey("KeyW");
      releaseKey("KeyS");
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 0.5, y: 0.5 });
    } finally {
      inputs.dispose();
    }
  });

  it("unlocking should immediately reflect current binding state", () => {
    const config = {
        Move: {
          type: "vector2",
          bindings: [Keyboard.wasd()],
        },
      } as const;

    const inputs = createInputs(config);
    const move = inputs.Move;

    try {
      // Lock and hold a key
      (move as any).lock({ x: 1, y: 0 });
      pressKey("KeyW");
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 1, y: 0 });

      // Unlock - next update should reflect actual binding state
      (move as any).unlock();
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 0, y: 1 });
    } finally {
      inputs.dispose();
    }
  });

  it("multiple readValue() calls in same update should return same value", () => {
    const config = {
        Move: {
          type: "vector2",
          bindings: [Keyboard.wasd()],
        },
      } as const;

    const inputs = createInputs(config);
    const move = inputs.Move;

    try {
      pressKey("KeyW");
      pressKey("KeyD");
      emitInputFrame(1);
      inputs.update(1 / 60);

      // Multiple reads in same frame should return identical values
      const val1 = (move as any).readValue();
      const val2 = (move as any).readValue();
      const val3 = (move as any).readValue();

      expect(val1).toEqual({ x: 1, y: 1 });
      expect(val2).toEqual({ x: 1, y: 1 });
      expect(val3).toEqual({ x: 1, y: 1 });
    } finally {
      inputs.dispose();
    }
  });

  it("does not expose a redundant value getter", () => {
    const config = {
        Move: {
          type: "vector2",
          bindings: [Keyboard.wasd()],
        },
      } as const;

    const inputs = createInputs(config);
    const move = inputs.Move as any;

    try {
      expect("value" in move).toBe(false);

      pressKey("KeyW");
      emitInputFrame(1);
      inputs.update(1 / 60);

      expect(move.readValue()).toEqual({ x: 0, y: 1 });
      expect(move.value).toBeUndefined();
    } finally {
      inputs.dispose();
    }
  });

  it("readValue() after update() should return last computed value until next sample", () => {
    const config = {
        Move: {
          type: "vector2",
          bindings: [Keyboard.wasd()],
        },
      } as const;

    const inputs = createInputs(config);
    const move = inputs.Move;

    try {
      pressKey("KeyW");
      emitInputFrame(1);
      inputs.update(1 / 60);

      const valAfterUpdate1 = (move as any).readValue();
      expect(valAfterUpdate1).toEqual({ x: 0, y: 1 });

      // Change input state (but don't sample yet)
      releaseKey("KeyW");
      pressKey("KeyS");

      // Read value without new sample - should still return previous value
      const valBeforeSample = (move as any).readValue();
      expect(valBeforeSample).toEqual({ x: 0, y: 1 });

      // Now sample and update
      emitInputFrame(1);
      inputs.update(1 / 60);

      // Now should reflect new input state
      const valAfterNewSample = (move as any).readValue();
      expect(valAfterNewSample).toEqual({ x: 0, y: -1 });
    } finally {
      inputs.dispose();
    }
  });

  it("value bindings should work correctly when consumed only in render loop", () => {
    const config = {
        Move: {
          type: "vector2",
          bindings: [Keyboard.wasd()],
        },
      } as const;

    const inputs = createInputs(config);
    const move = inputs.Move;

    try {
      // Frame 1: Press W
      pressKey("KeyW");
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 0, y: 1 });

      // Frame 2: Add D (diagonal)
      pressKey("KeyD");
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 1, y: 1 });

      // Frame 3: Release both
      releaseKey("KeyW");
      releaseKey("KeyD");
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((move as any).readValue()).toEqual({ x: 0, y: 0 });
    } finally {
      inputs.dispose();
    }
  });
});
