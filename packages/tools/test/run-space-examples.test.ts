import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractLastJson,
  makeTempProjectDir,
  packageDir,
  runCli,
  writeJson,
} from "./support/cli-test-helpers";

const exampleDir = path.join(packageDir, "examples", "run-space");

const exampleScene = {
  id: "run-space-example-scene",
  creatorId: "test",
  editors: ["test"],
  components: {
    "platform-template": {
      id: "platform-template",
      name: "Platform Template",
      type: "mesh",
      kit: "cyber",
      position: { x: 2, y: 1, z: -3 },
      scale: { x: 2, y: 1, z: 1 },
      geometry: {
        type: "box",
        boxParams: {
          width: 1,
          height: 1,
          depth: 1,
        },
        sphereParams: {
          radius: 1,
          widthSegments: 8,
          heightSegments: 8,
        },
        cylinderParams: {
          radiusTop: 1,
          radiusBottom: 1,
          height: 1,
          radialSegments: 8,
          heightSegments: 1,
          openEnded: false,
        },
      },
    },
    "fog-1": {
      id: "fog-1",
      name: "Fog",
      type: "fog",
      kit: "cyber",
      enabled: true,
      near: 10,
      far: 200,
    },
  },
};

function runExample(programName: string, scenePath: string) {
  return runCli([
    "run-space",
    `--scene=${scenePath}`,
    `--file=${path.join(exampleDir, programName)}`,
  ]);
}

describe("run-space examples", () => {
  it("executes the headless smoke example", () => {
    const projectDir = makeTempProjectDir();
    const scenePath = path.join(projectDir, "public", "data", "static-scene.json");

    writeJson(scenePath, exampleScene);

    const { stdout, exitCode } = runExample("headless-smoke.ts", scenePath);

    expect(exitCode).toBe(0);
    expect(
      extractLastJson<{
        loadedCount: number;
        loadedCounts: Record<string, number>;
        loadedIds: string[];
        requestedCount: number;
        sceneId: string;
        skippedIds: string[];
      }>(stdout),
    ).toEqual({
      sceneId: "run-space-example-scene",
      requestedCount: 2,
      loadedCount: 1,
      loadedIds: ["platform-template"],
      skippedIds: ["fog-1"],
      loadedCounts: {
        fog: 0,
        mesh: 1,
      },
    });
  });

  it("executes the procedural placement example", () => {
    const projectDir = makeTempProjectDir();
    const scenePath = path.join(projectDir, "public", "data", "static-scene.json");

    writeJson(scenePath, exampleScene);

    const { stdout, exitCode } = runExample(
      "procedural-placement.ts",
      scenePath,
    );

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      gapX: number;
      generated: Array<{
        bbox: {
          max: { x: number; y: number; z: number };
          min: { x: number; y: number; z: number };
        };
        dimensions: { x: number; y: number; z: number };
        gapFromPrevious: number;
        id: string;
        position: { x: number; y: number; z: number };
        scale: { x: number; y: number; z: number };
        scaleMultiplier: number;
      }>;
      note: string;
      templateBBox: {
        max: { x: number; y: number; z: number };
        min: { x: number; y: number; z: number };
      };
      templateDimensions: { x: number; y: number; z: number };
      templateId: string;
      templateScale: { x: number; y: number; z: number };
    }>(stdout);

    expect(result.templateId).toBe("platform-template");
    expect(result.templateScale).toEqual({ x: 2, y: 1, z: 1 });
    expect(result.templateDimensions).toEqual({ x: 2, y: 1, z: 1 });
    expect(result.templateBBox.min.x).toBeCloseTo(1);
    expect(result.templateBBox.max.x).toBeCloseTo(3);
    expect(result.gapX).toBe(1.5);
    expect(result.note).toMatch(/bbox/i);
    expect(result.generated).toHaveLength(4);
    expect(result.generated.map((component) => component.id)).toEqual([
      "platform-generated-1",
      "platform-generated-2",
      "platform-generated-3",
      "platform-generated-4",
    ]);
    expect(
      result.generated.map((component) => component.scaleMultiplier),
    ).toEqual([1, 1.25, 0.75, 1.5]);
    expect(result.generated[0].position.x).toBeCloseTo(5.5);
    expect(result.generated[1].position.x).toBeCloseTo(10.25);
    expect(result.generated[2].position.x).toBeCloseTo(14.5);
    expect(result.generated[3].position.x).toBeCloseTo(19.5);
    expect(result.generated[0].bbox.min.x).toBeCloseTo(4.5);
    expect(result.generated[0].bbox.max.x).toBeCloseTo(7.5);
    expect(result.generated[1].bbox.min.x).toBeCloseTo(9);
    expect(result.generated[1].bbox.max.x).toBeCloseTo(12.25);
    expect(result.generated[2].bbox.min.x).toBeCloseTo(13.75);
    expect(result.generated[2].bbox.max.x).toBeCloseTo(16.5);
    expect(result.generated[3].bbox.min.x).toBeCloseTo(18);
    expect(result.generated[3].bbox.max.x).toBeCloseTo(21.5);
    expect(result.generated[0].dimensions.x).toBeCloseTo(3);
    expect(result.generated[1].dimensions.x).toBeCloseTo(3.25);
    expect(result.generated[2].dimensions.x).toBeCloseTo(2.75);
    expect(result.generated[3].dimensions.x).toBeCloseTo(3.5);
    expect(result.generated[0].dimensions.x).toBeGreaterThan(
      result.templateDimensions.x,
    );
    expect(
      result.generated.every((component) =>
        Math.abs(component.gapFromPrevious - 1.5) < 1e-6,
      ),
    ).toBe(true);
  });

  it("executes the input smoke example", () => {
    const projectDir = makeTempProjectDir();
    const scenePath = path.join(projectDir, "public", "data", "static-scene.json");

    writeJson(scenePath, exampleScene);

    const { stdout, exitCode } = runExample("input-smoke.ts", scenePath);

    expect(exitCode).toBe(0);
    expect(
      extractLastJson<{
        afterCustom: {
          confirmPerformed: number;
          confirmPressed: boolean;
          move: { x: number; y: number };
          wasJustPressed: boolean;
        };
        afterKeyboard: {
          confirmPerformed: number;
          confirmPressed: boolean;
          move: { x: number; y: number };
          wasJustPressed: boolean;
        };
        afterRelease: {
          confirmPerformed: number;
          confirmPressed: boolean;
          wasJustReleased: boolean;
        };
      }>(stdout),
    ).toEqual({
      afterKeyboard: {
        confirmPerformed: 0,
        confirmPressed: false,
        move: { x: 0, y: 1 },
        wasJustPressed: false,
      },
      afterCustom: {
        confirmPerformed: 1,
        confirmPressed: true,
        move: { x: 0, y: 0 },
        wasJustPressed: true,
      },
      afterRelease: {
        confirmPerformed: 1,
        confirmPressed: false,
        wasJustReleased: true,
      },
    });
  });
});
