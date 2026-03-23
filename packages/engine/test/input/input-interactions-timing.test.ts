import { createInputs } from "../../src/input/input-map";
import { Keyboard } from "../../src/input/bindings";
import { Interactions } from "../../src/input/interactions";
import { sharedControlState } from "../../src/input/shared-control-state";
import {
  emitInputFrame,
  pressKey,
  releaseKey,
  setupNavigatorMock,
} from "./input-test-utils";

describe("Inputs interaction timing frame safety (hold, tap, multiTap)", () => {
  beforeAll(() => {
    setupNavigatorMock();
  });

  beforeEach(() => {
    sharedControlState.reset();
  });

  afterEach(() => {
    sharedControlState.reset();
  });

  it("should not accumulate hold duration multiple times when update() runs multiple times", () => {
    const HOLD_DURATION = 0.4; // seconds
    const config = {
        Charge: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.hold(HOLD_DURATION)],
        },
      } as const;

    const inputs = createInputs(config);
    const charge = inputs.Charge;

    let performedCount = 0;
    const unsubscribe = (charge as any).onPerformed(() => {
      performedCount++;
    });

    // Press and hold
    pressKey("Space");
    emitInputFrame();

    // Simulate 12 render frames, each with 2 fixed updates.
    // Real time: 12 * (1/60) = 0.2s
    // But with 2 updates per frame, interaction sees: 12 * 2 * (1/60) = 0.4s
    // This would prematurely trigger hold at 0.2s real time.
    for (let i = 0; i < 12; i++) {
      emitInputFrame();
      inputs.update(1 / 60);
      inputs.update(1 / 60);
    }

    // Expected: hold should NOT have fired yet (only 0.2s real time elapsed)
    expect(performedCount).toBe(0);

    unsubscribe();
    inputs.dispose();
  });

  it("should not cancel tap prematurely when update() runs multiple times", () => {
    const TAP_MAX_DURATION = 0.2; // seconds
    const config = {
        Dodge: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.tap(TAP_MAX_DURATION)],
        },
      } as const;

    const inputs = createInputs(config);
    const dodge = inputs.Dodge;

    let performedCount = 0;
    let canceledCount = 0;
    const unsubPerformed = (dodge as any).onPerformed(() => {
      performedCount++;
    });
    const unsubCanceled = (dodge as any).onCanceled(() => {
      canceledCount++;
    });

    // Press
    pressKey("Space");
    emitInputFrame();

    // Simulate 6 render frames with 2 updates each while holding.
    // Real time: 6 * (1/60) = 0.1s (within tap threshold)
    // But interaction sees: 6 * 2 * (1/60) = 0.2s (at threshold)
    for (let i = 0; i < 6; i++) {
      emitInputFrame();
      inputs.update(1 / 60);
      inputs.update(1 / 60);
    }

    // Release - should be a valid tap (0.1s real time < 0.2s threshold)
    releaseKey("Space");
    emitInputFrame();
    inputs.update(1 / 60);

    // Expected: tap should succeed (0.1s real hold time)
    expect(performedCount).toBe(1);
    expect(canceledCount).toBe(0);

    unsubPerformed();
    unsubCanceled();
    inputs.dispose();
  });

  it("should not corrupt multiTap timing when update() runs multiple times", () => {
    const TAP_SPACING = 0.4; // seconds between taps
    const config = {
        DoubleJump: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.multiTap(2, TAP_SPACING)],
        },
      } as const;

    const inputs = createInputs(config);
    const doubleJump = inputs.DoubleJump;

    let performedCount = 0;
    let canceledCount = 0;
    const unsubPerformed = (doubleJump as any).onPerformed(() => {
      performedCount++;
    });
    const unsubCanceled = (doubleJump as any).onCanceled(() => {
      canceledCount++;
    });

    // First tap: quick press and release
    pressKey("Space");
    emitInputFrame();
    inputs.update(1 / 60);
    inputs.update(1 / 60);

    releaseKey("Space");
    emitInputFrame();
    inputs.update(1 / 60);
    inputs.update(1 / 60);

    // Wait 0.1s real time (6 frames) before second tap.
    // With 2 updates per frame, interaction sees 0.2s.
    for (let i = 0; i < 6; i++) {
      emitInputFrame();
      inputs.update(1 / 60);
      inputs.update(1 / 60);
    }

    // Second tap
    pressKey("Space");
    emitInputFrame();
    inputs.update(1 / 60);
    inputs.update(1 / 60);

    releaseKey("Space");
    emitInputFrame();
    inputs.update(1 / 60);
    inputs.update(1 / 60);

    // Expected: double-tap should succeed (0.1s real spacing < 0.4s threshold)
    expect(performedCount).toBe(1);
    expect(canceledCount).toBe(0);

    unsubPerformed();
    unsubCanceled();
    inputs.dispose();
  });

  it("hold interaction should not re-start on every update() call between samples", () => {
    const HOLD_DURATION = 0.1;
    const config = {
        Charge: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.hold(HOLD_DURATION)],
        },
      } as const;

    const inputs = createInputs(config);
    const charge = inputs.Charge;

    let startedCount = 0;
    let performedCount = 0;
    const unsubStarted = charge.onStarted(() => {
      startedCount++;
    });
    const unsubPerformed = charge.onPerformed(() => {
      performedCount++;
    });

    try {
      // One sample (render frame) then multiple fixed updates before next sample.
      pressKey("Space");
      emitInputFrame();

      // If edge state is frame-safe, only the first update sees wasJustPressed,
      // then the hold timer accumulates and performs once duration is reached.
      inputs.update(1 / 60);
      inputs.update(1 / 60);
      inputs.update(1 / 60);
      inputs.update(1 / 60);
      inputs.update(1 / 60);
      inputs.update(1 / 60);

      expect(startedCount).toBe(1);
      expect(performedCount).toBe(1);
    } finally {
      unsubStarted();
      unsubPerformed();
      inputs.dispose();
    }
  });

  it("hold interaction should not fire prematurely with 5+ updates per sample", () => {
    const HOLD_DURATION = 0.5; // 500ms
    const config = {
        Charge: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.hold(HOLD_DURATION)],
        },
      } as const;

    const inputs = createInputs(config);
    const charge = inputs.Charge;

    let performedCount = 0;
    const unsubscribe = charge.onPerformed(() => {
      performedCount++;
    });

    try {
      pressKey("Space");

      // Simulate 10 render frames, each with 6 fixed updates at 1/60s
      // Real time per render frame: 6 * (1/60) = 0.1s
      // Total real time: 10 * 0.1s = 1.0s (should trigger hold at frame 5)
      // But we want to check that timing is correct, not doubled
      for (let frame = 0; frame < 3; frame++) {
        emitInputFrame(6);
        for (let i = 0; i < 6; i++) {
          inputs.update(1 / 60);
        }
      }

      // After 3 frames * 6 updates * (1/60)s = 0.3s real time
      // Hold should NOT have fired yet (needs 0.5s)
      expect(performedCount).toBe(0);

      // Continue for 2 more frames (total 0.5s)
      for (let frame = 0; frame < 2; frame++) {
        emitInputFrame(6);
        for (let i = 0; i < 6; i++) {
          inputs.update(1 / 60);
        }
      }

      // After 5 frames * 6 updates * (1/60)s = 0.5s, hold should fire
      expect(performedCount).toBe(1);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("hold interaction should track real time when update() called once per render frame", () => {
    const HOLD_DURATION = 0.2;
    const config = {
        Charge: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.hold(HOLD_DURATION)],
        },
      } as const;

    const inputs = createInputs(config);
    const charge = inputs.Charge;

    let performedCount = 0;
    const unsubscribe = charge.onPerformed(() => {
      performedCount++;
    });

    try {
      pressKey("Space");

      // Simulate 10 render frames at 60fps with 1:1 ratio
      // Each frame: 1/60s ≈ 0.0167s
      // After 10 frames: ~0.167s (not yet 0.2s threshold)
      for (let i = 0; i < 10; i++) {
        emitInputFrame(1);
        inputs.update(1 / 60);
      }
      expect(performedCount).toBe(0);

      // 2 more frames should push past the 0.2s threshold
      for (let i = 0; i < 2; i++) {
        emitInputFrame(1);
        inputs.update(1 / 60);
      }
      expect(performedCount).toBe(1);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("hold interaction should preserve accumulated time when 0 updates occur", () => {
    const HOLD_DURATION = 0.3;
    const config = {
        Charge: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.hold(HOLD_DURATION)],
        },
      } as const;

    const inputs = createInputs(config);
    const charge = inputs.Charge;

    let performedCount = 0;
    const unsubscribe = charge.onPerformed(() => {
      performedCount++;
    });

    try {
      pressKey("Space");

      // Accumulate 0.1s
      emitInputFrame(2);
      inputs.update(1 / 60);
      inputs.update(1 / 60);
      inputs.update(1 / 60);
      inputs.update(1 / 60);
      inputs.update(1 / 60);
      inputs.update(1 / 60); // 6 * 1/60 = 0.1s

      expect(performedCount).toBe(0);

      // Frame with 0 updates (render faster than fixed)
      emitInputFrame(0);
      // No update() call

      // Another frame with 0 updates
      emitInputFrame(0);
      // No update() call

      // Resume updates - accumulated time should be preserved
      emitInputFrame(2);
      for (let i = 0; i < 12; i++) {
        inputs.update(1 / 60); // 12 * 1/60 = 0.2s more
      }

      // Total: 0.1s + 0.2s = 0.3s, should trigger hold
      expect(performedCount).toBe(1);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("multiTap should track inter-tap spacing correctly with irregular updates", () => {
    const TAP_SPACING = 0.5;
    const config = {
        DoubleTap: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.multiTap(2, TAP_SPACING)],
        },
      } as const;

    const inputs = createInputs(config);
    const doubleTap = inputs.DoubleTap;

    let performedCount = 0;
    let canceledCount = 0;
    const unsubPerformed = doubleTap.onPerformed(() => {
      performedCount++;
    });
    const unsubCanceled = doubleTap.onCanceled(() => {
      canceledCount++;
    });

    try {
      // First tap
      pressKey("Space");
      emitInputFrame(1);
      inputs.update(1 / 60);

      releaseKey("Space");
      emitInputFrame(1);
      inputs.update(1 / 60);

      // Wait 0.3s (within spacing threshold) with varying update counts
      // Frame with 0 updates
      emitInputFrame(0);

      // Frame with 3 updates (0.05s)
      emitInputFrame(3);
      inputs.update(1 / 60);
      inputs.update(1 / 60);
      inputs.update(1 / 60);

      // Frame with 0 updates
      emitInputFrame(0);

      // Frame with 6 updates (0.1s)
      emitInputFrame(6);
      for (let i = 0; i < 6; i++) {
        inputs.update(1 / 60);
      }

      // Frame with 9 updates (0.15s)
      emitInputFrame(9);
      for (let i = 0; i < 9; i++) {
        inputs.update(1 / 60);
      }

      // Total wait: ~0.3s (still within 0.5s threshold)

      // Second tap
      pressKey("Space");
      emitInputFrame(1);
      inputs.update(1 / 60);

      releaseKey("Space");
      emitInputFrame(1);
      inputs.update(1 / 60);

      expect(performedCount).toBe(1);
      expect(canceledCount).toBe(0);
    } finally {
      unsubPerformed();
      unsubCanceled();
      inputs.dispose();
    }
  });

  it("tap should complete correctly when release happens in different render frame than press", () => {
    const TAP_MAX_DURATION = 0.3;
    const config = {
        QuickTap: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.tap(TAP_MAX_DURATION)],
        },
      } as const;

    const inputs = createInputs(config);
    const quickTap = inputs.QuickTap;

    let performedCount = 0;
    let canceledCount = 0;
    const unsubPerformed = quickTap.onPerformed(() => {
      performedCount++;
    });
    const unsubCanceled = quickTap.onCanceled(() => {
      canceledCount++;
    });

    try {
      // Frame 1: Press (multiple fixed updates)
      pressKey("Space");
      emitInputFrame(3);
      inputs.update(1 / 60);
      inputs.update(1 / 60);
      inputs.update(1 / 60);

      // Frame 2: Still held (0 fixed updates - render faster)
      emitInputFrame(0);

      // Frame 3: Still held (1 fixed update)
      emitInputFrame(1);
      inputs.update(1 / 60);

      // Frame 4: Release (2 fixed updates)
      releaseKey("Space");
      emitInputFrame(2);
      inputs.update(1 / 60);
      inputs.update(1 / 60);

      // Total hold time: ~0.1s (well within 0.3s threshold)
      expect(performedCount).toBe(1);
      expect(canceledCount).toBe(0);
    } finally {
      unsubPerformed();
      unsubCanceled();
      inputs.dispose();
    }
  });

  it("interaction reset should clear all timing state", () => {
    const HOLD_DURATION = 0.2;
    const config = {
        Charge: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.hold(HOLD_DURATION)],
        },
      } as const;

    const inputs = createInputs(config);
    const charge = inputs.Charge;

    let performedCount = 0;
    const unsubscribe = charge.onPerformed(() => {
      performedCount++;
    });

    try {
      // Start holding
      pressKey("Space");
      emitInputFrame(1);
      inputs.update(1 / 60);
      inputs.update(1 / 60);
      inputs.update(1 / 60); // 0.05s accumulated

      // Release early (cancels the interaction)
      releaseKey("Space");
      emitInputFrame(1);
      inputs.update(1 / 60);

      expect(performedCount).toBe(0);

      // Start a new hold - timing should start fresh
      pressKey("Space");
      emitInputFrame(1);

      // Need full 0.2s (12 updates at 1/60)
      for (let i = 0; i < 12; i++) {
        inputs.update(1 / 60);
      }

      expect(performedCount).toBe(1);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });
});
