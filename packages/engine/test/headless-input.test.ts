import { EngineHeadless } from "../src/engine-headless";
import {
  createInputs,
  Custom,
  Interactions,
  Keyboard,
  sharedControlState,
} from "../src/input";
import {
  pressCustomButton,
  pressKey,
  releaseCustomButton,
  releaseKey,
  setupNavigatorMock,
} from "./input/input-test-utils";

const sceneData = {
  "terrain-smoke": {
    type: "terrain",
    id: "terrain-smoke",
    kit: "cyber",
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 32, y: 4, z: 32 },
    color: "#bbbbbb",
    noiseEnabled: false,
    definition: 10,
    shape: "plane",
    collider: {
      enabled: true,
      rigidbodyType: "FIXED",
      type: "MESH",
    },
  },
};

function makeGame(components: Record<string, any>) {
  return {
    id: "headless-input-test",
    creatorId: "test",
    editors: ["test"],
    components,
  };
}

describe("Headless input integration", () => {
  let engine: EngineHeadless;

  beforeAll(() => {
    setupNavigatorMock();
  });

  beforeEach(() => {
    engine = EngineHeadless.getInstance();
    sharedControlState.reset();
  });

  afterEach(async () => {
    sharedControlState.reset();

    for (let index = 0; index < 20 && engine.sessionState !== "void"; index += 1) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
    }
  });

  it("samples shared inputs from headless engine ticks", async () => {
    const { space } = await engine.createSpace({
      runtime: "headless",
      game: makeGame(sceneData),
    });

    const inputs = createInputs({
      Move: {
        type: "vector2",
        bindings: [Keyboard.wasd()],
      },
      Confirm: {
        type: "button",
        bindings: [Keyboard.button("Space"), Custom.button("confirm")],
        interactions: [Interactions.press("pressOnly")],
      },
    } as const);

    let confirmPerformed = 0;
    const unsubscribe = inputs.Confirm.onPerformed(() => {
      confirmPerformed += 1;
    });

    try {
      space.start();

      pressKey("KeyW");
      engine.tick(1 / 60);
      inputs.update(1 / 60);

      expect(inputs.Move.readValue()).toEqual({ x: 0, y: 1 });
      expect(inputs.Confirm.isPressed).toBe(false);
      expect(confirmPerformed).toBe(0);

      releaseKey("KeyW");
      pressCustomButton("confirm");
      engine.tick(1 / 60);
      inputs.update(1 / 60);

      expect(inputs.Move.readValue()).toEqual({ x: 0, y: 0 });
      expect(inputs.Confirm.isPressed).toBe(true);
      expect(inputs.Confirm.wasJustPressed).toBe(true);
      expect(confirmPerformed).toBe(1);

      inputs.update(1 / 60);
      expect(inputs.Confirm.wasJustPressed).toBe(false);

      releaseCustomButton("confirm");
      engine.tick(1 / 60);
      inputs.update(1 / 60);

      expect(inputs.Confirm.isPressed).toBe(false);
      expect(inputs.Confirm.wasJustReleased).toBe(true);
    } finally {
      unsubscribe();
      inputs.dispose();
      space.destroy();
    }
  });
});
