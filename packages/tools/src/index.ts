// Types
export type { OptimizedFiles, OOAsset } from "./types";

// GLTF Optimization
export { optimizeGLTF } from "./gltf";
export type { CompressionOptions, OptimizedVariant } from "./gltf";

// VRM Processing
export { processVRMBuffer } from "./vrm";
export {
  VRMExtension,
  VRMC_Extension,
  VRMC_materials_mtoon,
  VRMC_springBone,
  VRMC_node_constraint,
} from "./vrm";

// Texture Processing
// toktx disabled due to cpu-features native module build issue on macOS ARM64
export { textureCompress, textureResize } from "./texture";
export { TextureResizeFilter, Mode, Filter } from "./texture";

// MIME Utilities
export {
  extToMime,
  mimetoExt,
  supportedMimes,
  isUploadable,
  withCover,
} from "./utils";

// Optimize Service
export { OptimizeService } from "./optimize-service";
export type { OptimizeAssetResult } from "./optimize-service";

// Scene Validation
export { validateScene, readScene } from "./scene/validate-scene";
export type { ValidationResult } from "./scene/validate-scene";
export type { SceneComponent, SceneData, ColliderConfig } from "./scene/types";

// Upload
export { uploadAsset } from "./upload/upload-asset";
export type { UploadedAsset, UploadAssetOptions } from "./upload/upload-asset";

// Bake Animation
export { bakeAnimation } from "./bake/bake-animation";
export type { BakeResult, BakeAnimationOptions } from "./bake/bake-animation";

// Inspect
export { inspectGltf } from "./inspect/inspect-gltf";
export type { InspectionResult } from "./inspect/inspect-gltf";

// File Utilities
export { readJsonFile, writeJsonFile, fileExists, resolveProjectPath, getScenePath, getUploadedAssetsPath, getUploadedAvatarsPath } from "./file-utils";
