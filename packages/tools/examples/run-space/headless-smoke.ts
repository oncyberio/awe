import { defineSpaceProgram } from "@oncyberio/tools/space";

export default defineSpaceProgram(async ({ snapshot, space }) => {
  const requestedIds = Object.keys(snapshot.components).sort();
  const loadedIds = requestedIds.filter((id) => Boolean(space.components.byId(id)));
  const loadedIdSet = new Set(loadedIds);
  const requestedTypes = Array.from(
    new Set(
      requestedIds
        .map((id) => snapshot.components[id]?.type)
        .filter((type): type is string => typeof type === "string"),
    ),
  ).sort();

  return {
    sceneId: snapshot.id,
    requestedCount: requestedIds.length,
    loadedCount: loadedIds.length,
    loadedIds,
    skippedIds: requestedIds.filter((id) => !loadedIdSet.has(id)),
    loadedCounts: Object.fromEntries(
      requestedTypes.map((type) => [type, space.components.byType(type).length]),
    ),
  };
});
