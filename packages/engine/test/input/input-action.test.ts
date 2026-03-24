import { createInputs } from "../../src/input/input-map";
import { Composite, Custom, Keyboard, Mouse } from "../../src/input/bindings";
import { Interactions } from "../../src/input/interactions";
import { sharedControlState } from "../../src/input/shared-control-state";
import {
  emitInputFrame,
  pressKey,
  pressMouseButton,
  pressCustomButton,
  releaseCustomButton,
  releaseKey,
  releaseMouseButton,
  setupNavigatorMock,
} from "./input-test-utils";

describe("Inputs action frame safety (button edges and callbacks)", () => {
  beforeAll(() => {
    setupNavigatorMock();
  });

  beforeEach(() => {
    sharedControlState.reset();
  });

  afterEach(() => {
    sharedControlState.reset();
  });

  it("should not fire press callbacks more than once when update() runs multiple times between INPUT_STATE_READY samples", () => {
    const config = {
        Jump: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("pressOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const jump = inputs.Jump;

    let performedCount = 0;
    const unsubscribe = jump.onPerformed(() => {
      performedCount++;
    });

    try {
      // One render input frame samples the edge (JustPressed) once.
      pressKey("Space");
      emitInputFrame();

      // Simulate multiple fixed updates in the same render frame.
      inputs.update(1 / 60);
      inputs.update(1 / 60);

      // Expected invariant: press edge triggers at most once per sampled input frame.
      expect(performedCount).toBe(1);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("should not fire release-only callbacks more than once when update() runs multiple times between INPUT_STATE_READY samples", () => {
    const config = {
        Fire: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("releaseOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const fire = inputs.Fire;

    let performedCount = 0;
    const unsubscribe = fire.onPerformed(() => {
      performedCount++;
    });

    try {
      // Press (no callback expected for releaseOnly)
      pressKey("Space");
      emitInputFrame();
      inputs.update(1 / 60);
      inputs.update(1 / 60);

      // Release edge sampled once.
      releaseKey("Space");
      emitInputFrame();

      // Multiple fixed updates in the same render frame should not duplicate the release callback.
      inputs.update(1 / 60);
      inputs.update(1 / 60);

      // Expected invariant: release edge triggers at most once per sampled input frame.
      expect(performedCount).toBe(1);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("should not miss release-only when press+release happen between fixed updates (0 updates between samples)", () => {
    const config = {
        Fire: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("releaseOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const fire = inputs.Fire;

    let performedCount = 0;
    const unsubscribe = fire.onPerformed(() => {
      performedCount++;
    });

    try {
      // Render frame 1: press sampled
      pressKey("Space");
      emitInputFrame();

      // 0 fixed updates happened this render frame => no inputs.update()

      // Render frame 2: release sampled
      releaseKey("Space");
      emitInputFrame();

      // Next fixed update processes the most recent sampled state.
      inputs.update(1 / 60);

      // Expected invariant: release-only should still be observed once.
      expect(performedCount).toBe(1);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("should not get stuck for pressAndRelease when press+release happen between fixed updates (0 updates between samples)", () => {
    const config = {
        Interact: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("pressAndRelease")],
        },
      } as const;

    const inputs = createInputs(config);
    const interact = inputs.Interact;

    let startedCount = 0;
    let performedCount = 0;
    const unsubscribeStarted = interact.onStarted(() => {
      startedCount++;
    });
    const unsubscribePerformed = interact.onPerformed(() => {
      performedCount++;
    });

    try {
      // Render frame 1: press sampled
      pressKey("Space");
      emitInputFrame();

      // 0 fixed updates => no update()

      // Render frame 2: release sampled
      releaseKey("Space");
      emitInputFrame();

      // Next fixed update should be able to observe both edges and complete the interaction.
      inputs.update(1 / 60);

      // Expected invariant: both started and performed should happen exactly once.
      expect(startedCount).toBe(1);
      expect(performedCount).toBe(1);
    } finally {
      unsubscribeStarted();
      unsubscribePerformed();
      inputs.dispose();
    }
  });

  it("pressAndRelease should not repeat started/performed when multiple updates happen between press and release samples", () => {
    const config = {
        Interact: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("pressAndRelease")],
        },
      } as const;

    const inputs = createInputs(config);
    const interact = inputs.Interact;

    let startedCount = 0;
    let performedCount = 0;
    const unsubStarted = interact.onStarted(() => {
      startedCount++;
    });
    const unsubPerformed = interact.onPerformed(() => {
      performedCount++;
    });

    try {
      // Press sampled
      pressKey("Space");
      emitInputFrame();

      // Multiple fixed updates before release sample
      inputs.update(1 / 60);
      inputs.update(1 / 60);

      // Release sampled
      releaseKey("Space");
      emitInputFrame();

      // Multiple fixed updates after release sample
      inputs.update(1 / 60);
      inputs.update(1 / 60);

      // Expected: started once (press), performed once (release)
      expect(startedCount).toBe(1);
      expect(performedCount).toBe(1);
    } finally {
      unsubStarted();
      unsubPerformed();
      inputs.dispose();
    }
  });

  it("wasJustPressed should not return true on second update() call", () => {
    const config = {
        Jump: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("pressOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const jump = inputs.Jump;

    try {
      pressKey("Space");
      emitInputFrame();

      // First update - wasJustPressed should be true
      inputs.update(1 / 60);
      const afterFirstUpdate = jump.wasJustPressed;

      // Second update - wasJustPressed should be false (edge consumed)
      inputs.update(1 / 60);
      const afterSecondUpdate = jump.wasJustPressed;

      // Expected: true then false
      expect(afterFirstUpdate).toBe(true);
      expect(afterSecondUpdate).toBe(false);
    } finally {
      inputs.dispose();
    }
  });

  it("wasJustReleased should not return true on second update() call", () => {
    const config = {
        Jump: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("releaseOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const jump = inputs.Jump;

    try {
      // Press first
      pressKey("Space");
      emitInputFrame();
      inputs.update(1 / 60);

      // Release
      releaseKey("Space");
      emitInputFrame();

      // First update - wasJustReleased should be true
      inputs.update(1 / 60);
      const afterFirstUpdate = jump.wasJustReleased;

      // Second update - wasJustReleased should be false (edge consumed)
      inputs.update(1 / 60);
      const afterSecondUpdate = jump.wasJustReleased;

      // Expected: true then false
      expect(afterFirstUpdate).toBe(true);
      expect(afterSecondUpdate).toBe(false);
    } finally {
      inputs.dispose();
    }
  });

  it("should handle zero updates in frame 1 then multiple updates in frame 2", () => {
    const config = {
        Jump: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("pressOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const jump = inputs.Jump;

    let performedCount = 0;
    const unsubscribe = jump.onPerformed(() => {
      performedCount++;
    });

    try {
      // Frame 1: press sampled, no update
      pressKey("Space");
      emitInputFrame();
      // No update() - simulating 0 fixed updates this frame

      // Frame 2: still held, sample again, then multiple updates
      emitInputFrame();
      inputs.update(1 / 60);
      inputs.update(1 / 60);

      // Expected: JustPressed from frame 1 should fire exactly once
      // The re-sample in frame 2 should not create a new edge (button still held)
      expect(performedCount).toBe(1);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("should not fire callbacks when action is disabled between sample and update", () => {
    const config = {
        Jump: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("pressOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const jump = inputs.Jump;

    let performedCount = 0;
    const unsubscribe = jump.onPerformed(() => {
      performedCount++;
    });

    // Press and sample
    pressKey("Space");
    emitInputFrame();

    // Disable action after sample but before update
    jump.enabled = false;

    // Update should not fire callback
    inputs.update(1 / 60);

    expect(performedCount).toBe(0);

    unsubscribe();
    inputs.dispose();
  });

  it("should fire callback only once when action is re-enabled mid-frame", () => {
    const config = {
        Jump: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("pressOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const jump = inputs.Jump;

    let performedCount = 0;
    const unsubscribe = jump.onPerformed(() => {
      performedCount++;
    });

    // Start disabled
    jump.enabled = false;

    // Press and sample (while disabled - sample is skipped)
    pressKey("Space");
    emitInputFrame();

    // First update while disabled
    inputs.update(1 / 60);

    // Re-enable and update again (same frame, no new sample)
    jump.enabled = true;
    inputs.update(1 / 60);

    // Expected: no callback (edge was not sampled while disabled)
    expect(performedCount).toBe(0);

    unsubscribe();
    inputs.dispose();
  });

  it("disabling a map after sample should not replay a stale press edge when re-enabled", () => {
    const config = {
        Jump: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("pressOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const jump = inputs.Jump;

    let performedCount = 0;
    const unsubscribe = jump.onPerformed(() => {
      performedCount++;
    });

    try {
      // Press and sample, then disable before update() (edge should be dropped).
      pressKey("Space");
      emitInputFrame();
      inputs.disable();

      // No update() while disabled.

      // Re-enable, resample while still held.
      inputs.enable();
      emitInputFrame();
      inputs.update(1 / 60);

      // Press edge happened in the disabled window; re-enabling should not "replay" it.
      expect(performedCount).toBe(0);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("button edges should work correctly when consumed only in render loop (1:1 ratio)", () => {
    const config = {
        Jump: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("pressAndRelease")],
        },
      } as const;

    const inputs = createInputs(config);
    const jump = inputs.Jump;

    let startedCount = 0;
    let performedCount = 0;
    const unsubStarted = jump.onStarted(() => {
      startedCount++;
    });
    const unsubPerformed = jump.onPerformed(() => {
      performedCount++;
    });

    try {
      // Simulate dynamic loop: exactly 1 update per render frame (no fixed updates)
      // Frame 1: Press
      pressKey("Space");
      emitInputFrame(1);
      inputs.update(1 / 60);

      expect(startedCount).toBe(1);
      expect(performedCount).toBe(0);

      // Frame 2: Still held
      emitInputFrame(1);
      inputs.update(1 / 60);

      expect(startedCount).toBe(1);
      expect(performedCount).toBe(0);

      // Frame 3: Release
      releaseKey("Space");
      emitInputFrame(1);
      inputs.update(1 / 60);

      expect(startedCount).toBe(1);
      expect(performedCount).toBe(1);
    } finally {
      unsubStarted();
      unsubPerformed();
      inputs.dispose();
    }
  });

  it("should handle 5+ fixed updates in single render frame without duplicate press edges", () => {
    const config = {
        Jump: {
          type: "button",
          bindings: [Keyboard.button("Space")],
          interactions: [Interactions.press("pressOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const jump = inputs.Jump;

    let performedCount = 0;
    const unsubscribe = jump.onPerformed(() => {
      performedCount++;
    });

    try {
      pressKey("Space");
      emitInputFrame(6); // Expect 6 fixed updates

      // 6 fixed updates in one render frame
      for (let i = 0; i < 6; i++) {
        inputs.update(1 / 60);
      }

      // Press should fire exactly once despite 6 updates
      expect(performedCount).toBe(1);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("Keyboard.any should treat either modifier key as the same button intent", () => {
    const config = {
        Sprint: {
          type: "button",
          bindings: [Keyboard.any("ControlLeft", "ControlRight")],
          interactions: [Interactions.press("pressOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const sprint = inputs.Sprint;

    let performedCount = 0;
    const unsubscribe = sprint.onPerformed(() => {
      performedCount++;
    });

    try {
      pressKey("ControlLeft");
      emitInputFrame();
      inputs.update(1 / 60);

      releaseKey("ControlLeft");
      emitInputFrame();
      inputs.update(1 / 60);

      pressKey("ControlRight");
      emitInputFrame();
      inputs.update(1 / 60);

      expect(performedCount).toBe(2);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("Composite.any should preserve OR semantics for alternative button bindings", () => {
    const config = {
        Interact: {
          type: "button",
          bindings: [Composite.any(Keyboard.button("KeyE"), Mouse.button(0))],
          interactions: [Interactions.press("pressOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const interact = inputs.Interact;

    let performedCount = 0;
    const unsubscribe = interact.onPerformed(() => {
      performedCount++;
    });

    try {
      pressKey("KeyE");
      emitInputFrame();
      inputs.update(1 / 60);

      releaseKey("KeyE");
      emitInputFrame();
      inputs.update(1 / 60);

      pressMouseButton(0);
      emitInputFrame();
      inputs.update(1 / 60);

      expect(performedCount).toBe(2);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("Composite.all should support chords like ctrl plus click without leaking raw checks", () => {
    const config = {
        Attack: {
          type: "button",
          bindings: [
            Composite.all(
              Keyboard.any("ControlLeft", "ControlRight"),
              Mouse.button(0),
            ),
          ],
          interactions: [Interactions.press("pressAndRelease")],
        },
      } as const;

    const inputs = createInputs(config);
    const attack = inputs.Attack;

    let startedCount = 0;
    let performedCount = 0;
    const unsubscribeStarted = attack.onStarted(() => {
      startedCount++;
    });
    const unsubscribePerformed = attack.onPerformed(() => {
      performedCount++;
    });

    try {
      pressKey("ControlLeft");
      emitInputFrame();
      inputs.update(1 / 60);

      expect(startedCount).toBe(0);
      expect(attack.isPressed).toBe(false);

      pressMouseButton(0);
      emitInputFrame();
      inputs.update(1 / 60);

      expect(startedCount).toBe(1);
      expect(attack.isPressed).toBe(true);

      releaseMouseButton(0);
      emitInputFrame();
      inputs.update(1 / 60);

      expect(performedCount).toBe(1);
      expect(attack.isPressed).toBe(false);
      expect(attack.wasJustReleased).toBe(true);
    } finally {
      unsubscribeStarted();
      unsubscribePerformed();
      inputs.dispose();
    }
  });

  it("should expose source metadata for custom and keyboard callbacks", () => {
    const config = {
        Jump: {
          type: "button",
          bindings: [Custom.button("jump"), Keyboard.button("Space")],
          interactions: [Interactions.press("pressOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const jump = inputs.Jump;

    const contexts: Array<{
      device: string | undefined;
      bindingType: string | undefined;
      control: string | number | undefined;
    }> = [];

    const unsubscribe = jump.onPerformed((ctx) => {
      contexts.push({
        device: ctx.source?.device,
        bindingType: ctx.source?.bindingType,
        control: ctx.source?.control,
      });
    });

    try {
      pressCustomButton("jump");
      emitInputFrame();
      inputs.update(1 / 60);

      releaseCustomButton("jump");
      emitInputFrame();
      inputs.update(1 / 60);

      pressKey("Space");
      emitInputFrame();
      inputs.update(1 / 60);

      expect(contexts).toEqual([
        {
          device: "custom",
          bindingType: "customButton",
          control: "jump",
        },
        {
          device: "keyboard",
          bindingType: "keyButton",
          control: "Space",
        },
      ]);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("should expose just-released mouse metadata for release callbacks", () => {
    const config = {
        Fire: {
          type: "button",
          bindings: [Mouse.button(0)],
          interactions: [Interactions.press("releaseOnly")],
        },
      } as const;

    const inputs = createInputs(config);
    const fire = inputs.Fire;

    let releaseCtx:
      | {
          value: number;
          device: string | undefined;
          bindingType: string | undefined;
          control: string | number | undefined;
        }
      | undefined;

    const unsubscribe = fire.onPerformed((ctx) => {
      releaseCtx = {
        value: ctx.value,
        device: ctx.source?.device,
        bindingType: ctx.source?.bindingType,
        control: ctx.source?.control,
      };
    });

    try {
      pressMouseButton(0);
      emitInputFrame();
      inputs.update(1 / 60);

      releaseMouseButton(0);
      emitInputFrame();
      inputs.update(1 / 60);

      expect(releaseCtx).toEqual({
        value: 0,
        device: "mouse",
        bindingType: "mouseButton",
        control: 0,
      });
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("should flatten composite bindings into leaf callback sources", () => {
    const config = {
        Attack: {
          type: "button",
          bindings: [
            Composite.all(
              Keyboard.any("ControlLeft", "ControlRight"),
              Mouse.button(0),
            ),
          ],
          interactions: [Interactions.press("pressAndRelease")],
        },
      } as const;

    const inputs = createInputs(config);
    const attack = inputs.Attack;

    let startedSources: Array<{ device: string; control: string | number }> = [];

    const unsubscribeStarted = attack.onStarted((ctx) => {
      startedSources = ctx.sources.map((source) => ({
        device: source.device,
        control: source.control,
      }));
    });

    try {
      pressKey("ControlLeft");
      emitInputFrame();
      inputs.update(1 / 60);

      pressMouseButton(0);
      emitInputFrame();
      inputs.update(1 / 60);

      expect(startedSources).toEqual([
        { device: "keyboard", control: "ControlLeft" },
        { device: "mouse", control: 0 },
      ]);
    } finally {
      unsubscribeStarted();
      inputs.dispose();
    }
  });
});
