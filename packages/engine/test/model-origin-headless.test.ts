import { Box3, BoxGeometry, Mesh, MeshBasicMaterial, Object3D, Vector3 } from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EngineHeadless } from "../src/engine-headless";
import { Subsystems } from "../src/internal/subsystems";

function makeGame(components: Record<string, any>) {
  return {
    id: "model-origin-headless-test",
    creatorId: "test",
    editors: ["test"],
    components,
  };
}

function makeNestedPivotScene() {
  const scene = new Object3D();
  const group = new Object3D();
  const mesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());

  group.position.y = 5;
  mesh.position.y = 7;

  group.add(mesh);
  scene.add(group);

  return scene;
}

function getBoxCenterY(box: Box3) {
  return box.getCenter(new Vector3()).y;
}

describe("Model origin semantics in headless mode", () => {
  let engine: EngineHeadless;
  let originalGltf: typeof Subsystems.gltf;

  beforeEach(() => {
    engine = EngineHeadless.getInstance();
    originalGltf = null;
  });

  afterEach(async () => {
    if (originalGltf) {
      Subsystems.gltf = originalGltf;
    }

    for (let i = 0; i < 20 && engine.sessionState !== "void"; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });

  async function createModelSpace(
    scene: Object3D,
    componentData: Record<string, any> = {},
  ) {
    await (engine as any)._ensureWorld("headless");

    if (!originalGltf) {
      originalGltf = Subsystems.gltf;
    }

    Subsystems.gltf = {
      loadGLTF: vi.fn(async () => ({ scene: scene.clone(true) })),
      parseGLTF: vi.fn(),
    } as any;

    return engine.createSpace({
      runtime: "headless",
      game: makeGame({
        "model-origin": {
          type: "model",
          id: "model-origin",
          kit: "cyber",
          url: "mock://pivot.glb",
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          ...componentData,
        },
      }),
    });
  }

  it("preserves the authored pivot by default in headless mode", async () => {
    const { space } = await createModelSpace(makeNestedPivotScene());

    try {
      const model = space.components.byType("model")[0];
      const box = model.getBBox(new Box3());

      expect(getBoxCenterY(box)).toBeCloseTo(12, 10);
    } finally {
      space.destroy();
    }
  });

  it("recenters the collision mesh when center is explicitly enabled in headless mode", async () => {
    const { space } = await createModelSpace(makeNestedPivotScene(), {
      center: true,
    });

    try {
      const model = space.components.byType("model")[0];
      const box = model.getBBox(new Box3());

      expect(getBoxCenterY(box)).toBeCloseTo(0, 10);
    } finally {
      space.destroy();
    }
  });
});
