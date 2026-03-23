import type { ComponentFactory } from "../abstract/component-factory";

import type { AudioComponent } from "./audio/audio-component";
import type { AvatarComponent } from "./avatar/avatar-component";
import type { BackgroundComponent } from "./background/background-component";
import type { EnvmapComponent } from "./envmap/envmap-component";
import type { FogComponent } from "./fog/fog-component";
import type { ImageComponent } from "./image/image-component";
import type { LightingComponent } from "./lighting/lighting-component";
import type { MeshComponent } from "./mesh/mesh-component";
import type { ModelComponent } from "./model/model-component";
import type { RainComponent } from "./rain/rain-component";
import type { ReflectorComponent } from "./reflector/reflector-component";
import type { TerrainComponent } from "./terrain/terrain-component";
import type { TextComponent } from "./text/text-component";
import type { WaterComponent } from "./water/water-component";
import type { PostProcessingComponent } from "./postprocessing/post-pro-component";
import type { WaveComponent } from "./wave/wave-component";
import type { CloudComponent } from "./cloud/cloud-component";
import type { DustComponent } from "./dust/dust-component";
import type { VideoComponent } from "./video/video-component";
import type { GodrayComponent } from "./godray/godray-component";
import type { BirdComponent } from "./bird/bird-component";
import type { GrassComponent } from "./grass/grass-component";
import type { ImpactComponent } from "./impact/impact-component";
import type { VRMAnimsComponent } from "./vrmanims/vrm-anims-component";
import type { DestinationComponent } from "./destination/destination-component";
import type { DialogComponent } from "./dialog/dialog-component";
import type { InteractionComponent } from "./interaction/interaction-component";
import type { InstancedMeshComponent } from "./instancedmesh/instanced-mesh-component";
import type { CameraComponent } from "./camera/camera-component";
import type { SplineComponent } from "./spline/spline-component";
import type { BatchComponent } from "./batch/batch-component";
import type { GroupComponent } from "./group/group-component";
import type { IframeComponent } from "./iframe/iframe-component";
import type { ParticlesComponent } from "./particles/particles-component";
import type { QuarksComponent } from "./quarks/quarks-component";
import type { NavmeshComponent } from "./navmesh/navmesh-component";
import type { ObjectComponent } from "./object/object-component";

/**
 * @public
 */
export type ComponentTypeMap = {
  background: BackgroundComponent;
  lighting: LightingComponent;
  water: WaterComponent;
  fog: FogComponent;
  terrain: TerrainComponent;
  postprocessing: PostProcessingComponent;
  reflector: ReflectorComponent;
  rain: RainComponent;
  envmap: EnvmapComponent;
  "vrm-anims": VRMAnimsComponent;
  mesh: MeshComponent;
  model: ModelComponent;
  text: TextComponent;
  audio: AudioComponent;
  image: ImageComponent;
  video: VideoComponent;
  avatar: AvatarComponent;
  wave: WaveComponent;
  cloud: CloudComponent;
  godray: GodrayComponent;
  bird: BirdComponent;
  grass: GrassComponent;
  dust: DustComponent;
  impact: ImpactComponent;
  destination: DestinationComponent;
  dialog: DialogComponent;
  interaction: InteractionComponent;
  instancedmesh: InstancedMeshComponent;
  camera: CameraComponent;
  spline: SplineComponent;
  batch: BatchComponent;
  group: GroupComponent;
  iframe: IframeComponent;
  particles: ParticlesComponent;
  quarks: QuarksComponent;
  navmesh: NavmeshComponent;
  object: ObjectComponent;
};

export type CType = keyof ComponentTypeMap;

export type ComponentDataMap = {
  [T in CType]: ComponentTypeMap[T]["data"];
};

/**
 * @public
 */
export type CreateComponentArg<T extends CType = CType> = {
  [K in T]: { type: K } & Omit<ComponentDataMap[K], "type">;
}[T];

export interface ComponentMeta {
  Factory: typeof ComponentFactory;
}
