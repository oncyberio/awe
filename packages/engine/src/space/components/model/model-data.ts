import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ, PluginData } from "../types";
import { RenderMode } from "../../../@types/types";

/**
 * @public
 *
 * Configuration data for {@link ModelComponent}. Defines the configuration for loading and displaying
 * a 3D model (glTF/GLB) in a space, including its source URL, transform, animation settings,
 * render mode, transparency options, and built-in visual plugins.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface ModelComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /**
   * The component type identifier. Must be `"model"`.
   */
  type: "model";

  /**
   * Unique identifier for the component. If not provided, an auto-generated id will be assigned.
   */
  id?: string;

  /**
   * Display name for the component. Defaults to `""`.
   */
  name?: string;

  /**
   * URL of the 3D model file to load. Supports `.gltf` and `.glb` formats. Required.
   */
  url: string;

  /**
   * @internal
   */
  optimized?: {
    high: string;
    low: string;
    low_compressed: string;
  };

  /**
   * @internal
   */
  mime_type?: "model/gltf-binary";

  /**
   * Position of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`.
   */
  position?: XYZ;

  /**
   * Rotation of the component in the space, in radians. Defaults to `{x: 0, y: 0, z: 0}`.
   */
  rotation?: XYZ;

  /**
   * Scale of the component in the space. Defaults to `{x: 1, y: 1, z: 1}`.
   */
  scale?: XYZ;

  /**
   * A record of animation clip names to play automatically when the component is initialized.
   * Keys are animation clip names embedded in the model file; values should be `true` to activate that animation.
   * Only effective when {@link enableAnimation} is set to `true`. Defaults to `{}`.
   */
  animations?: Record<string, boolean>;

  /**
   * @internal
   */
  envmap?: string;

  /**
   * @internal
   */
  envmapIntensity?: number;

  /**
   * Render mode for the model, controlling its visual style.
   * Changing this value causes the model to be re-initialized.
   * Defaults to `"default"`.
   *
   * @see {@link RenderMode} for the full list of allowed values (`"default"`, `"toon"`, `"glitch"`, `"ghost"`, `"error"`).
   */
  renderMode?: RenderMode;

  /**
   * Whether the animation system is enabled for this model. When `false`, no animations will play
   * even if {@link animations} is configured. Only works on models that embed animation clips.
   * Defaults to `false`.
   */
  enableAnimation?: boolean;

  /**
   * Opacity of the model, from `0` (fully transparent) to `1` (fully opaque).
   * Only takes effect when {@link useTransparency} is set to `true`; otherwise the model
   * is rendered fully opaque regardless of this value. Defaults to `1`.
   */
  opacity?: number;

  /**
   * Whether real-time dynamic shadows are enabled for this model.
   * Changing this value causes the model to be re-initialized.
   * Defaults to `false`.
   */
  enableRealTimeShadow?: boolean;

  /**
   * Whether transparency is enabled on the model's materials. When `false`, the model is always
   * rendered fully opaque regardless of the {@link opacity} value.
   * Changing this value causes the model to be re-initialized.
   * Defaults to `false`.
   */
  useTransparency?: boolean;

  /**
   * When `true`, forces the engine to load a unique (non-instanced) copy of this model.
   * By default, the engine may use GPU instancing for models that share the same source URL
   * to improve rendering performance. Set this to `true` if the model needs independent
   * material or geometry modifications. Defaults to `false`.
   */
  forceUnique?: boolean;

  /**
   * Optional list of built-in visual plugins to apply to this model (e.g. rainbow effect, damage flash).
   * Each entry references a plugin by its string ID with optional configuration.
   */
  plugins?: PluginData[];

  /**
   * @internal
   *
   * When `true`, recenters the loaded model around its bounding-box center.
   * When `false`, preserves the asset's authored pivot. Defaults to `false`.
   */
  center?: boolean;

  /**
   * Hint that this model's transform will remain fixed at runtime.
   *
   * When `true`, the engine may opt into caching or other static-instance
   * optimizations for instanced models. Defaults to `false`.
   */
  fixedTransform?: boolean;
}
