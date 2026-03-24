import { defineSpaceProgram } from "@oncyberio/tools/space";

const templateId = "platform-template";
const gapX = 1.5;
const scaleMultipliers = [1, 1.25, 0.75, 1.5];

function toVector3Like(vector: { x: number; y: number; z: number }) {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

function toBox3Like(box: {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}) {
  return {
    min: toVector3Like(box.min),
    max: toVector3Like(box.max),
  };
}

export default defineSpaceProgram(async ({ snapshot, space }) => {
  const templateData = snapshot.components[templateId];
  const templateComponent = space.components.byId(templateId);

  if (!templateData || !templateComponent) {
    throw new Error(`Missing template component: ${templateId}`);
  }

  const basePosition = templateData.position ?? { x: 0, y: 0, z: 0 };
  const baseScale = templateData.scale ?? { x: 1, y: 1, z: 1 };
  const templateBBox = templateComponent.getBBox();
  const templateDimensions = templateComponent.getDimensions();
  let previousMaxX = templateBBox.max.x;
  const generated = [];

  for (let index = 0; index < scaleMultipliers.length; index += 1) {
    const step = index + 1;
    const scaleMultiplier = scaleMultipliers[index];
    const targetScale = {
      x: baseScale.x * scaleMultiplier,
      y: baseScale.y * scaleMultiplier,
      z: baseScale.z * scaleMultiplier,
    };
    const targetMinX = previousMaxX + gapX;
    const probe = await templateComponent.duplicate({
      overrideOpts: {
        position: {
          x: previousMaxX + gapX + templateDimensions.x,
          y: basePosition.y,
          z: basePosition.z,
        },
        scale: targetScale,
      },
    });

    try {
      const initialBBox = probe.getBBox();
      const correctionX = targetMinX - initialBBox.min.x;

      probe.position.x += correctionX;
      probe.updateMatrixWorld(true);

      const resolvedBBox = probe.getBBox();

      generated.push({
        id: `platform-generated-${step}`,
        scaleMultiplier,
        scale: targetScale,
        position: toVector3Like(probe.position),
        bbox: toBox3Like(resolvedBBox),
        dimensions: toVector3Like(probe.getDimensions()),
        gapFromPrevious: resolvedBBox.min.x - previousMaxX,
      });

      previousMaxX = resolvedBBox.max.x;
    } finally {
      probe.destroy();
    }
  }

  return {
    templateId,
    templateScale: baseScale,
    templateBBox: toBox3Like(templateBBox),
    templateDimensions,
    gapX,
    note:
      "Use runtime bbox measurements for placement when origin, pivot, or scale can change the true occupied footprint.",
    generated,
  };
});
