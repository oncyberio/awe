import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  copyFixture,
  extractLastJson,
  makeTempProjectDir,
  runCli,
  soccerFieldFixture,
  writeJson,
} from "./support/cli-test-helpers";

const meshScene = {
  id: "run-space-scene",
  creatorId: "test",
  editors: ["test"],
  components: {
    "box-1": {
      id: "box-1",
      name: "Box",
      type: "mesh",
      kit: "cyber",
      position: { x: 1, y: 2, z: 3 },
      scale: { x: 2, y: 4, z: 6 },
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
  },
};

describe("run-space CLI", () => {
  it("runs a file-backed space program against a scene snapshot", () => {
    const projectDir = makeTempProjectDir();
    const scenePath = path.join(projectDir, "public", "data", "static-scene.json");
    const programPath = path.join(projectDir, "box-program.ts");

    writeJson(scenePath, meshScene);
    fs.writeFileSync(
      programPath,
      `
import { defineSpaceProgram } from "@oncyberio/tools/space";

export default defineSpaceProgram(async ({ space, snapshot }) => {
  const box = space.components.byId("box-1");
  return {
    sceneId: snapshot.id,
    meshCount: space.components.byType("mesh").length,
    dimensions: box.getDimensions(),
  };
});
`,
      "utf-8",
    );

    const { stdout, exitCode } = runCli([
      "run-space",
      `--scene=${scenePath}`,
      `--file=${programPath}`,
    ]);

    expect(exitCode).toBe(0);
    expect(
      extractLastJson<{
        dimensions: { x: number; y: number; z: number };
        meshCount: number;
        sceneId: string;
      }>(stdout),
    ).toEqual({
      sceneId: "run-space-scene",
      meshCount: 1,
      dimensions: {
        x: 2,
        y: 4,
        z: 6,
      },
    });
  });

  it("runs a stdin-backed space program", () => {
    const projectDir = makeTempProjectDir();
    const scenePath = path.join(projectDir, "public", "data", "static-scene.json");

    writeJson(scenePath, meshScene);

    const { stdout, exitCode } = runCli(
      [
        "run-space",
        `--scene=${scenePath}`,
        "--stdin",
      ],
      undefined,
      `
import { defineSpaceProgram } from "@oncyberio/tools/space";

export default defineSpaceProgram(async ({ projectDir, scenePath, space }) => {
  return {
    meshIds: space.components.byType("mesh").map((component) => component.data.id),
    projectDir,
    scenePath,
  };
});
`,
    );

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      meshIds: string[];
      projectDir: string;
      scenePath: string;
    }>(stdout);

    expect(result.meshIds).toEqual(["box-1"]);
    expect(result.projectDir).toBe(projectDir);
    expect(result.scenePath).toBe(scenePath);
  });

  it("resolves local /assets model URLs when loading a scene snapshot", () => {
    const projectDir = makeTempProjectDir();
    const scenePath = path.join(projectDir, "public", "data", "static-scene.json");

    copyFixture(
      soccerFieldFixture,
      path.join(projectDir, "public", "assets", "soccer-field.glb"),
    );

    writeJson(scenePath, {
      id: "model-scene",
      creatorId: "test",
      editors: ["test"],
      components: {
        "field-model": {
          id: "field-model",
          name: "Field",
          type: "model",
          kit: "cyber",
          url: "/assets/soccer-field.glb",
        },
      },
    });

    const { stdout, exitCode } = runCli(
      [
        "run-space",
        `--scene=${scenePath}`,
        "--stdin",
      ],
      undefined,
      `
import { defineSpaceProgram } from "@oncyberio/tools/space";

export default defineSpaceProgram(async ({ space }) => {
  const model = space.components.byId("field-model");
  const bbox = model.getBBox();

  return {
    modelCount: space.components.byType("model").length,
    bboxMaxY: bbox.max.y,
  };
});
`,
    );

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      bboxMaxY: number;
      modelCount: number;
    }>(stdout);

    expect(result.modelCount).toBe(1);
    expect(result.bboxMaxY).toBeGreaterThan(0);
  });
});
