import { afterEach, describe, expect, it, vi } from "vitest";
import { Object3D, PerspectiveCamera, Vector3 } from "three";

import { Physics } from "../../src/physics";
import { CameraRig } from "../../src/controls/camera-rig";
import { ThirdPersonCameraRig } from "../../src/controls/camera-rigs/third-person-camera-rig";

function roundOrigins(origins: Array<{ x: number; y: number; z: number }>) {
  return origins.map(({ x, y, z }) => [
    Number(x.toFixed(6)),
    Number(y.toFixed(6)),
    Number(z.toFixed(6)),
  ]);
}

function makeTarget() {
  const target = new Object3D() as Object3D & {
    getDimensions: () => { y: number };
  };

  target.position.set(7, 0, -11);
  target.getDimensions = () => ({ y: 2 });

  return target;
}

function captureRepeatedCollisionOrigins(
  createRig: (
    camera: PerspectiveCamera,
    target: ReturnType<typeof makeTarget>,
  ) => { dispose: () => void },
) {
  const origins: Array<{ x: number; y: number; z: number }> = [];
  const engine = {
    physicsRaycast: vi.fn(
      ({ origin }: { origin: { x: number; y: number; z: number } }) => {
        origins.push({ x: origin.x, y: origin.y, z: origin.z });
        return null;
      },
    ),
  };

  vi.spyOn(Physics, "get").mockReturnValue(engine as any);

  const camera = new PerspectiveCamera(75, 16 / 9, 0.1, 1000);
  const target = makeTarget();
  const rig = createRig(camera, target);

  try {
    (rig as any)._checkCollision(5);
    const firstPassOrigins = roundOrigins(origins.splice(0));

    (rig as any)._checkCollision(5);
    const secondPassOrigins = roundOrigins(origins.splice(0));

    expect(firstPassOrigins).toHaveLength(4);
    expect(secondPassOrigins).toEqual(firstPassOrigins);
  } finally {
    rig.dispose();
  }
}

describe("Camera collision origins", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps legacy CameraRig near-plane ray origins stable across repeated checks", () => {
    captureRepeatedCollisionOrigins(
      (camera, target) =>
        new CameraRig({
          camera,
          target,
          mode: "orbit",
          distance: 5,
          height: 0,
          collision: true,
          usePointerLock: false,
        }),
    );
  });

  it("keeps ThirdPersonCameraRig near-plane ray origins stable across repeated checks", () => {
    captureRepeatedCollisionOrigins(
      (camera, target) =>
        new ThirdPersonCameraRig({
          camera,
          target,
          distance: 5,
          height: 0,
          collision: true,
          usePointerLock: false,
        }),
    );
  });
});
