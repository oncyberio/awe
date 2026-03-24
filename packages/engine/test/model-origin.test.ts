import {
  Box3,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Sphere,
  Vector3,
} from "three";
import { describe, expect, it, vi } from "vitest";

import { SET_EDIT_MODE } from "../src/internal/constants";
import { ModelFactory } from "../src/internal/media/model/index.js";
import GeometryInstancer from "../src/internal/pipeline/instanced-geometry.js";

function makeScene(offset = new Vector3(0, 15, 0)) {
  const scene = new Object3D();
  const mesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
  mesh.position.copy(offset);
  scene.add(mesh);
  return scene;
}

function getObjectCenter(object: Object3D) {
  return new Box3().setFromObject(object).getCenter(new Vector3());
}

describe("Model origin semantics", () => {
  it("preserves the authored pivot for instanced geometry when center is disabled", () => {
    const factory = new ModelFactory();
    const res = { scene: makeScene() };

    factory.flattenSceneHierarchy(res, { center: false }, []);

    const center = getObjectCenter(res.scene);

    expect(center.y).toBeCloseTo(15, 10);
  });

  it("still supports explicit centering when requested", () => {
    const factory = new ModelFactory();
    const res = { scene: makeScene() };

    factory.flattenSceneHierarchy(res, { center: true }, []);

    const center = getObjectCenter(res.scene);

    expect(center.y).toBeCloseTo(0, 10);
  });

  it("preserves distinct placements for meshes sharing the same geometry", () => {
    const factory = new ModelFactory();
    const scene = new Object3D();
    const geometry = new BoxGeometry(2, 2, 2);
    const material = new MeshBasicMaterial();

    const lower = new Mesh(geometry, material);
    lower.name = "lower";
    lower.position.y = 15;

    const upper = new Mesh(geometry, material);
    upper.name = "upper";
    upper.position.y = 30;

    scene.add(lower, upper);

    const res = { scene };

    factory.flattenSceneHierarchy(res, { center: false }, []);

    const lowerMesh = res.scene.children.find((child) => child.name === "lower");
    const upperMesh = res.scene.children.find((child) => child.name === "upper");

    expect(lowerMesh).toBeTruthy();
    expect(upperMesh).toBeTruthy();
    expect(getObjectCenter(lowerMesh).y).toBeCloseTo(15, 10);
    expect(getObjectCenter(upperMesh).y).toBeCloseTo(30, 10);
  });

  it("ignores lod-only meshes when computing the explicit centering offset", () => {
    const factory = new ModelFactory();
    const scene = new Object3D();

    const renderMesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    renderMesh.name = "render";
    renderMesh.position.y = 15;

    const lodMesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    lodMesh.name = "renderLOD01";
    lodMesh.position.y = 200;

    scene.add(renderMesh, lodMesh);

    const res = { scene };

    factory.flattenSceneHierarchy(res, { center: true }, [lodMesh]);

    const flattenedRenderMesh = res.scene.children.find(
      (child) => child.name === "render",
    );
    const flattenedLodMesh = res.scene.children.find(
      (child) => child.name === "renderLOD01",
    );

    expect(flattenedRenderMesh).toBeTruthy();
    expect(flattenedLodMesh).toBeTruthy();
    expect(getObjectCenter(flattenedRenderMesh).y).toBeCloseTo(0, 10);
    expect(getObjectCenter(flattenedLodMesh).y).toBeCloseTo(185, 10);
  });

  it("uses the transformed local sphere center for instanced bounds", () => {
    const geometry = new BoxGeometry(2, 2, 2);
    geometry.translate(0, 15, 0);

    const instanced = new GeometryInstancer(geometry, {
      rotation: true,
      scale: true,
    });

    const rotation = new Quaternion().setFromAxisAngle(
      new Vector3(0, 0, 1),
      Math.PI / 2,
    );

    const wrapper = {
      position: new Vector3(10, 0, 0),
      rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
      scale: new Vector3(1, 1, 1),
    };

    const sphere = instanced.getWrapperWorldSphere(new Sphere(), wrapper);

    expect(sphere.center.x).toBeCloseTo(-5, 10);
    expect(sphere.center.y).toBeCloseTo(0, 10);
    expect(sphere.center.z).toBeCloseTo(0, 10);
  });

  it("uses the largest absolute wrapper scale when expanding instanced bounds", () => {
    const geometry = new BoxGeometry(2, 2, 2);
    geometry.translate(4, 0, 0);
    geometry.computeBoundingSphere();

    const instanced = new GeometryInstancer(geometry, {
      scale: true,
    });

    const wrapper = {
      position: new Vector3(1, 2, 3),
      scale: new Vector3(-2, 3, 1),
    };

    const sphere = instanced.getWrapperWorldSphere(new Sphere(), wrapper);

    expect(sphere.center.x).toBeCloseTo(-7, 10);
    expect(sphere.center.y).toBeCloseTo(2, 10);
    expect(sphere.center.z).toBeCloseTo(3, 10);
    expect(sphere.radius).toBeCloseTo(geometry.boundingSphere.radius * 3, 10);
  });

  it("reuses cached world spheres when an instance transform is unchanged", () => {
    const geometry = new BoxGeometry(2, 2, 2);
    const instanced = new GeometryInstancer(geometry, {
      rotation: true,
      scale: true,
    });

    const wrapper = {
      position: new Vector3(1, 2, 3),
      rotation: [0, 0, 0, 1],
      scale: new Vector3(1, 1, 1),
    };

    const computeSpy = vi.spyOn(instanced, "computeWrapperWorldSphere");

    instanced.getWrapperWorldSphere(new Sphere(), wrapper);
    instanced.getWrapperWorldSphere(new Sphere(), wrapper);

    expect(computeSpy).toHaveBeenCalledTimes(1);
  });

  it("invalidates the cached world sphere when an instance transform changes", () => {
    const geometry = new BoxGeometry(2, 2, 2);
    geometry.translate(0, 15, 0);

    const instanced = new GeometryInstancer(geometry, {
      rotation: true,
      scale: true,
    });

    const wrapper = {
      position: new Vector3(1, 2, 3),
      rotation: [0, 0, 0, 1],
      scale: new Vector3(1, 1, 1),
    };

    const computeSpy = vi.spyOn(instanced, "computeWrapperWorldSphere");

    instanced.getWrapperWorldSphere(new Sphere(), wrapper);

    wrapper.position.y = 20;

    const sphere = instanced.getWrapperWorldSphere(new Sphere(), wrapper);

    expect(computeSpy).toHaveBeenCalledTimes(2);
    expect(sphere.center.x).toBeCloseTo(1, 10);
    expect(sphere.center.y).toBeCloseTo(35, 10);
    expect(sphere.center.z).toBeCloseTo(3, 10);
  });

  it("threads fixedTransform into the instanced model cache key and geometry options", () => {
    const factory = new ModelFactory();
    const res = { scene: makeScene() };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const dynamicKey = factory.getPluginString({
      useTransparency: false,
      fixedTransform: false,
    });
    const fixedKey = factory.getPluginString({
      useTransparency: false,
      fixedTransform: true,
    });

    try {
      const { instancedMeshes } = factory.updateToInstance(res, {
        useTransparency: false,
        fixedTransform: true,
      });

      expect(dynamicKey).not.toBe(fixedKey);
      expect(fixedKey).toContain("fixedTransform");
      expect(instancedMeshes[0].geometry.isStatic).toBe(true);
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it("does not force instanced models into static bounds mode while editing", () => {
    const factory = new ModelFactory();
    const res = { scene: makeScene() };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    SET_EDIT_MODE(true);

    try {
      const { instancedMeshes } = factory.updateToInstance(res, {
        useTransparency: false,
        fixedTransform: true,
      });

      expect(instancedMeshes[0].geometry.isStatic).toBe(false);
    } finally {
      SET_EDIT_MODE(false);
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
