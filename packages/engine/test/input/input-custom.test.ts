import { createInputs } from "../../src/input/input-map";
import { Custom, Keyboard } from "../../src/input/bindings";
import { sharedControlState } from "../../src/input/shared-control-state";
import {
  emitInputFrame,
  pressCustomButton,
  pressKey,
  releaseCustomButton,
  releaseKey,
  setCustomValue,
  setCustomVector2,
  setupNavigatorMock,
} from "./input-test-utils";

describe("Inputs custom bindings", () => {
  beforeAll(() => {
    setupNavigatorMock();
  });

  beforeEach(() => {
    sharedControlState.reset();
  });

  afterEach(() => {
    sharedControlState.reset();
  });

  it("should trigger button actions from imperative custom buttons", () => {
    const inputs = createInputs({
      Jump: {
        type: "button",
        bindings: [Custom.button("jump")],
      },
    } as const);

    let performedCount = 0;
    const unsubscribe = inputs.Jump.onPerformed(() => {
      performedCount++;
    });

    try {
      pressCustomButton("jump");
      emitInputFrame();
      inputs.update(1 / 60);

      expect(inputs.Jump.isPressed).toBe(true);
      expect(inputs.Jump.wasJustPressed).toBe(true);
      expect(performedCount).toBe(1);

      releaseCustomButton("jump");
      emitInputFrame();
      inputs.update(1 / 60);

      expect(inputs.Jump.isPressed).toBe(false);
      expect(inputs.Jump.wasJustReleased).toBe(true);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("should compose custom bindings with hardware bindings", () => {
    const inputs = createInputs({
      Jump: {
        type: "button",
        bindings: [Custom.button("jump"), Keyboard.button("Space")],
      },
    } as const);

    try {
      pressCustomButton("jump");
      emitInputFrame();
      inputs.update(1 / 60);
      expect(inputs.Jump.isPressed).toBe(true);

      releaseCustomButton("jump");
      pressKey("Space");
      emitInputFrame();
      inputs.update(1 / 60);
      expect(inputs.Jump.isPressed).toBe(true);

      releaseKey("Space");
      emitInputFrame();
      inputs.update(1 / 60);
      expect(inputs.Jump.isPressed).toBe(false);
    } finally {
      inputs.dispose();
    }
  });

  it("should read scalar and Vector2 values from imperative custom controls", () => {
    const inputs = createInputs({
      Throttle: {
        type: "value",
        bindings: [Custom.value("throttle")],
      },
      Aim: {
        type: "vector2",
        bindings: [Custom.vector2("aim")],
      },
    } as const);

    try {
      setCustomValue("throttle", 0.75);
      setCustomVector2("aim", 0.2, -0.4);
      emitInputFrame();
      inputs.update(1 / 60);

      expect(inputs.Throttle.readValue()).toBe(0.75);
      expect(inputs.Aim.readValue()).toEqual({ x: 0.2, y: -0.4 });

      setCustomValue("throttle", -0.25);
      setCustomVector2("aim", -1, 0.5);
      emitInputFrame();
      inputs.update(1 / 60);

      expect(inputs.Throttle.readValue()).toBe(-0.25);
      expect(inputs.Aim.readValue()).toEqual({ x: -1, y: 0.5 });
    } finally {
      inputs.dispose();
    }
  });
});
