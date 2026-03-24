import { createInputs } from "../../src/input/input-map";
import { Mouse } from "../../src/input/bindings";
import { ControlStateManager } from "../../src/input/control-state";
import { sharedControlState } from "../../src/input/shared-control-state";
import {
  emitInputFrame,
  moveMouse,
  pressMouseButton,
  scrollMouse,
  setupNavigatorMock,
} from "./input-test-utils";

describe("Inputs delta frame safety (mouse delta and wheel distribution)", () => {
  const originalDocument = globalThis.document;

  beforeAll(() => {
    setupNavigatorMock();
  });

  beforeEach(() => {
    sharedControlState.reset();
  });

  afterEach(() => {
    sharedControlState.reset();
    if (originalDocument === undefined) {
      delete (globalThis as any).document;
    } else {
      (globalThis as any).document = originalDocument;
    }
  });

  it("should distribute mouse delta and wheel across multiple updates between samples", () => {
    const config = {
        Look: {
          type: "vector2",
          bindings: [Mouse.delta()],
        },
        Scroll: {
          type: "value",
          bindings: [Mouse.wheel()],
        },
      } as const;

    const inputs = createInputs(config);
    const look = inputs.Look;
    const scroll = inputs.Scroll;

    try {
      // Simulate a single render-frame mouse movement + wheel
      moveMouse(12, -6);
      scrollMouse(9);
      emitInputFrame(3);

      // Multiple fixed updates in the same render frame
      const lookValues: Array<{ x: number; y: number }> = [];
      const wheelValues: number[] = [];
      for (let i = 0; i < 3; i++) {
        // consume on fixed frame
        inputs.update(1 / 60);
        lookValues.push({ ...(look as any).readValue() });
        wheelValues.push((scroll as any).readValue());
      }

      // Expected behavior: deltas distributed across fixed updates
      // (total 12,-6 => 4,-2 per update; wheel 9 => 3 per update)
      expect(lookValues).toEqual([
        { x: 4, y: -2 },
        { x: 4, y: -2 },
        { x: 4, y: -2 },
      ]);
      expect(wheelValues).toEqual([3, 3, 3]);
    } finally {
      inputs.dispose();
    }
  });

  it("should accumulate mouse delta when fixed updates lag behind render frames", () => {
    const config = {
        Look: {
          type: "vector2",
          bindings: [Mouse.delta()],
        },
        Scroll: {
          type: "value",
          bindings: [Mouse.wheel()],
        },
      } as const;

    const inputs = createInputs(config);
    const look = inputs.Look;
    const scroll = inputs.Scroll;

    const lookValues: Array<{ x: number; y: number }> = [];
    const wheelValues: number[] = [];

    const renderFrame = (
      iterationCount: number,
      dx: number,
      dy: number,
      wheel: number
    ) => {
      moveMouse(dx, dy);
      scrollMouse(wheel);
      emitInputFrame(iterationCount);

      for (let i = 0; i < iterationCount; i++) {
        // consume on fixed frame
        inputs.update(1 / 60);
        lookValues.push({ ...(look as any).readValue() });
        wheelValues.push((scroll as any).readValue());
      }
    };

    try {
      // Render runs faster than fixed (about 0.6x fixed frame):
      // two frames without fixed updates, then a catch-up with 2 updates.
      renderFrame(0, 6, -3, 3);
      renderFrame(0, 6, -3, 3);
      renderFrame(2, 4, -2, 2);

      // Residual deltas should accumulate and be distributed across the catch-up updates.
      // Total delta: (6,-3) + (6,-3) + (4,-2) = (16,-8), wheel 8
      // 2 updates => (8,-4) and wheel 4 per update
      expect(lookValues).toEqual([
        { x: 8, y: -4 },
        { x: 8, y: -4 },
      ]);
      expect(wheelValues).toEqual([4, 4]);
    } finally {
      inputs.dispose();
    }
  });

  it("should allow render-frame consumption of mouse deltas", () => {
    const config = {
        Look: {
          type: "vector2",
          bindings: [Mouse.delta()],
        },
        Scroll: {
          type: "value",
          bindings: [Mouse.wheel()],
        },
      } as const;

    const inputs = createInputs(config);
    const look = inputs.Look;
    const scroll = inputs.Scroll;

    try {
      const lookValues: Array<{ x: number; y: number }> = [];
      const wheelValues: number[] = [];

      // Consume on render (one update per render frame, no fixed updates).
      moveMouse(3, -1);
      scrollMouse(2);
      emitInputFrame(0);
      // consume on render
      inputs.update(1 / 60);
      lookValues.push({ ...(look as any).readValue() });
      wheelValues.push((scroll as any).readValue());

      moveMouse(-5, 4);
      scrollMouse(-1);
      emitInputFrame(0);
      // consume on render
      inputs.update(1 / 60);
      lookValues.push({ ...(look as any).readValue() });
      wheelValues.push((scroll as any).readValue());

      expect(lookValues).toEqual([
        { x: 3, y: -1 },
        { x: -5, y: 4 },
      ]);
      expect(wheelValues).toEqual([2, -1]);
    } finally {
      inputs.dispose();
    }
  });

  it("should not distribute mouse delta when consumed in render loop", () => {
    const config = {
        Look: {
          type: "vector2",
          bindings: [Mouse.delta()],
        },
        Scroll: {
          type: "value",
          bindings: [Mouse.wheel()],
        },
      } as const;

    const inputs = createInputs(config);
    const look = inputs.Look;
    const scroll = inputs.Scroll;

    try {
      // Simulate a render frame that would otherwise expect 3 fixed updates.
      moveMouse(12, -6);
      scrollMouse(9);
      emitInputFrame(3);

      // End physics phase - now we're in render loop
      sharedControlState.endFixedUpdates();

      // Render-loop consumption should read the full delta (no distribution).
      inputs.update(1 / 60);
      expect((look as any).readValue()).toEqual({ x: 12, y: -6 });
      expect((scroll as any).readValue()).toEqual(9);
    } finally {
      inputs.dispose();
    }
  });

  it("should ignore pointer-lock mouse delta when pointer lock is inactive", () => {
    (globalThis as any).document = { pointerLockElement: null };

    const config = {
      Look: {
        type: "vector2",
        bindings: [Mouse.pointerLockDelta()],
      },
    } as const;

    const inputs = createInputs(config);

    try {
      moveMouse(12, -6);
      emitInputFrame(1);
      inputs.update(1 / 60);

      expect(inputs.Look.readValue()).toEqual({ x: 0, y: 0 });
    } finally {
      inputs.dispose();
    }
  });

  it("should read pointer-lock mouse delta when pointer lock is active", () => {
    (globalThis as any).document = { pointerLockElement: {} };

    const config = {
      Look: {
        type: "vector2",
        bindings: [Mouse.pointerLockDelta()],
      },
    } as const;

    const inputs = createInputs(config);

    try {
      moveMouse(12, -6);
      emitInputFrame(3);

      const values: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 3; i++) {
        inputs.update(1 / 60);
        values.push({ ...inputs.Look.readValue() });
      }

      expect(values).toEqual([
        { x: 4, y: -2 },
        { x: 4, y: -2 },
        { x: 4, y: -2 },
      ]);
    } finally {
      inputs.dispose();
    }
  });

  it("should ignore pointer-lock mouse buttons when pointer lock is inactive", () => {
    (globalThis as any).document = { pointerLockElement: null };

    const config = {
      Fire: {
        type: "button",
        bindings: [Mouse.button(0, { requirePointerLock: true })],
      },
    } as const;

    const inputs = createInputs(config);

    try {
      pressMouseButton(0);
      emitInputFrame(1);
      inputs.update(1 / 60);

      expect(inputs.Fire.isPressed).toBe(false);
      expect(inputs.Fire.wasJustPressed).toBe(false);
    } finally {
      inputs.dispose();
    }
  });

  it("should read pointer-lock mouse buttons when pointer lock is active", () => {
    (globalThis as any).document = { pointerLockElement: {} };

    const config = {
      Fire: {
        type: "button",
        bindings: [Mouse.button(0, { requirePointerLock: true })],
      },
    } as const;

    const inputs = createInputs(config);

    try {
      pressMouseButton(0);
      emitInputFrame(1);
      inputs.update(1 / 60);

      expect(inputs.Fire.isPressed).toBe(true);
      expect(inputs.Fire.wasJustPressed).toBe(true);
    } finally {
      inputs.dispose();
    }
  });

  it("should support manual sampling for fixed-tick consumers", () => {
    const config = {
      Look: {
        type: "vector2",
        bindings: [Mouse.delta()],
      },
      Scroll: {
        type: "value",
        bindings: [Mouse.wheel()],
      },
    } as const;

    const controlState = new ControlStateManager();
    const inputs = createInputs(config, {
      controlState,
      sampling: "manual",
    });
    const look = inputs.Look;
    const scroll = inputs.Scroll;

    try {
      moveMouse(12, -6, controlState);
      scrollMouse(9, controlState);

      controlState.processInputFrame(1 / 60, 0);
      controlState.beginFixedUpdates(3);
      inputs.sample();

      const lookValues: Array<{ x: number; y: number }> = [];
      const wheelValues: number[] = [];
      for (let i = 0; i < 3; i++) {
        inputs.update(1 / 60);
        lookValues.push({ ...(look as any).readValue() });
        wheelValues.push((scroll as any).readValue());
      }
      controlState.endFixedUpdates();

      expect(lookValues).toEqual([
        { x: 4, y: -2 },
        { x: 4, y: -2 },
        { x: 4, y: -2 },
      ]);
      expect(wheelValues).toEqual([3, 3, 3]);
    } finally {
      inputs.dispose();
      controlState.dispose();
    }
  });

  it("mouse delta should carry residual forward when fewer updates occur than expected", () => {
    const config = {
        Look: {
          type: "vector2",
          bindings: [Mouse.delta()],
        },
      } as const;

    const inputs = createInputs(config);
    const look = inputs.Look;

    try {
      // Frame 1: Expect 4 updates but only do 2
      moveMouse(40, -20);
      emitInputFrame(4); // System expects 4 updates

      // Only perform 2 updates (delta distributed as 40/4=10 per update)
      inputs.update(1 / 60);
      expect((look as any).readValue()).toEqual({ x: 10, y: -5 });
      inputs.update(1 / 60);
      expect((look as any).readValue()).toEqual({ x: 10, y: -5 });

      // Frame 2: New sample - residual from frame 1 is queued separately
      // Residual: ~20, -10 with 2 remaining updates
      // New delta: 10, -5 queued after residual
      moveMouse(10, -5);
      emitInputFrame(2);

      // Updates consume residual first (FIFO), then new delta
      inputs.update(1 / 60);
      const val1 = (look as any).readValue();
      inputs.update(1 / 60);
      const val2 = (look as any).readValue();

      // Both updates consume from residual (~20, -10 over 2 updates)
      // The new delta (10, -5) remains queued for next frame
      expect(val1.x + val2.x).toBeCloseTo(20, 5);
      expect(val1.y + val2.y).toBeCloseTo(-10, 5);

      // Frame 3: New delta from frame 2 should now be consumed
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((look as any).readValue()).toEqual({ x: 10, y: -5 });
    } finally {
      inputs.dispose();
    }
  });

  it("mouse delta should handle more updates than expected gracefully", () => {
    const config = {
        Look: {
          type: "vector2",
          bindings: [Mouse.delta()],
        },
      } as const;

    const inputs = createInputs(config);
    const look = inputs.Look;

    try {
      moveMouse(20, -10);
      emitInputFrame(2); // System expects 2 updates

      const values: Array<{ x: number; y: number }> = [];

      // Perform 4 updates (more than expected)
      for (let i = 0; i < 4; i++) {
        inputs.update(1 / 60);
        values.push({ ...(look as any).readValue() });
      }

      // First 2 updates should get the delta (10, -5 each)
      // Remaining updates should get 0 (delta exhausted)
      expect(values[0]).toEqual({ x: 10, y: -5 });
      expect(values[1]).toEqual({ x: 10, y: -5 });
      expect(values[2]).toEqual({ x: 0, y: 0 });
      expect(values[3]).toEqual({ x: 0, y: 0 });
    } finally {
      inputs.dispose();
    }
  });

  it("wheel delta should handle expectedFixedUpdates of 0 gracefully", () => {
    const config = {
        Scroll: {
          type: "value",
          bindings: [Mouse.wheel()],
        },
      } as const;

    const inputs = createInputs(config);
    const scroll = inputs.Scroll;

    try {
      scrollMouse(100);
      emitInputFrame(0); // 0 expected updates (render faster than fixed)

      // No updates this frame

      // Next frame with actual updates
      emitInputFrame(2);
      inputs.update(1 / 60);
      const val1 = (scroll as any).readValue();
      inputs.update(1 / 60);
      const val2 = (scroll as any).readValue();

      // Total should equal original delta
      expect(val1 + val2).toBe(100);
    } finally {
      inputs.dispose();
    }
  });

  it("delta distribution should adjust when expectedFixedUpdates changes between frames", () => {
    const config = {
        Look: {
          type: "vector2",
          bindings: [Mouse.delta()],
        },
      } as const;

    const inputs = createInputs(config);
    const look = inputs.Look;

    try {
      // Frame 1: Small movement, expect 1 update
      moveMouse(5, -3);
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((look as any).readValue()).toEqual({ x: 5, y: -3 });

      // Frame 2: Large movement, expect 4 updates
      moveMouse(40, -20);
      emitInputFrame(4);

      const values: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 4; i++) {
        inputs.update(1 / 60);
        values.push({ ...(look as any).readValue() });
      }

      // Should be distributed as 10, -5 per update
      expect(values).toEqual([
        { x: 10, y: -5 },
        { x: 10, y: -5 },
        { x: 10, y: -5 },
        { x: 10, y: -5 },
      ]);

      // Frame 3: Back to 1 update
      moveMouse(7, -2);
      emitInputFrame(1);
      inputs.update(1 / 60);
      expect((look as any).readValue()).toEqual({ x: 7, y: -2 });
    } finally {
      inputs.dispose();
    }
  });

  it("mouse delta should distribute correctly across 5+ fixed updates", () => {
    const config = {
        Look: {
          type: "vector2",
          bindings: [Mouse.delta()],
        },
      } as const;

    const inputs = createInputs(config);
    const look = inputs.Look;

    try {
      // Large mouse movement
      moveMouse(60, -30);
      emitInputFrame(6); // Expect 6 fixed updates

      const values: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 6; i++) {
        inputs.update(1 / 60);
        values.push({ ...(look as any).readValue() });
      }

      // Delta should be evenly distributed: 60/6=10, -30/6=-5
      expect(values).toEqual([
        { x: 10, y: -5 },
        { x: 10, y: -5 },
        { x: 10, y: -5 },
        { x: 10, y: -5 },
        { x: 10, y: -5 },
        { x: 10, y: -5 },
      ]);
    } finally {
      inputs.dispose();
    }
  });

  it("scalar value should remain stable across multiple fixed updates", () => {
    const config = {
        Scroll: {
          type: "value",
          bindings: [Mouse.wheel()],
        },
      } as const;

    const inputs = createInputs(config);
    const scroll = inputs.Scroll;

    try {
      // Single wheel event
      scrollMouse(120);
      emitInputFrame(3);

      const values: number[] = [];
      for (let i = 0; i < 3; i++) {
        inputs.update(1 / 60);
        values.push((scroll as any).readValue());
      }

      // Wheel delta should be distributed: 120 / 3 = 40 per update
      expect(values).toEqual([40, 40, 40]);
    } finally {
      inputs.dispose();
    }
  });

  it("mouse delta should return 0 after all queued deltas consumed", () => {
    const config = {
        Look: {
          type: "vector2",
          bindings: [Mouse.delta()],
        },
      } as const;

    const inputs = createInputs(config);
    const look = inputs.Look;

    try {
      moveMouse(20, -10);
      emitInputFrame(2);

      // Consume all expected deltas
      inputs.update(1 / 60);
      expect((look as any).readValue()).toEqual({ x: 10, y: -5 });
      inputs.update(1 / 60);
      expect((look as any).readValue()).toEqual({ x: 10, y: -5 });

      // Extra updates should return 0 (queue exhausted)
      inputs.update(1 / 60);
      expect((look as any).readValue()).toEqual({ x: 0, y: 0 });
      inputs.update(1 / 60);
      expect((look as any).readValue()).toEqual({ x: 0, y: 0 });
    } finally {
      inputs.dispose();
    }
  });
});
