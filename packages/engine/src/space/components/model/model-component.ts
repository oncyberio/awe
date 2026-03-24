// @ts-check

import { Component3D } from "../../abstract/component-3d";
import { ModelFactory } from "../../../internal/media/model";
import { ModelComponentData } from "./model-data";
import {
  IS_EDIT_MODE,
  SET_SHADOW_NEEDS_UPDATE,
} from "../../../internal/constants";
import { RenderMode } from "../../../@types/types";
import { Box3, Color } from "three";
import { VisualPluginRegistry } from "../visual-plugin-registry";
export type { ModelComponentData } from "./model-data";

/**
 * @public
 *
 * Component for loading and displaying glTF/GLB 3D models in a space. Supports animation playback
 * (play, stop, seek), multiple render modes (default, toon, glitch, ghost, error), transparency
 * and opacity control, real-time dynamic shadows, and built-in visual plugins
 * (e.g. rainbow, damage) via {@link ModelComponentData.plugins}.
 *
 * Models that share the same source URL may be automatically instanced for better performance
 * unless {@link ModelComponentData.forceUnique} is set to `true`.
 *
 * See {@link ModelComponentData} for the data schema used to create a model component.
 *
 * @example
 * ```ts
 * // Create a basic 3D model component
 * const model = await space.components.create({
 *   type: "model",
 *   url: "https://example.com/assets/tree.glb",
 *   position: { x: 0, y: 0, z: 5 },
 *   rotation: { x: 0, y: 0, z: 0 },
 *   scale: { x: 1, y: 1, z: 1 },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Create an animated model with transparency
 * const character = await space.components.create({
 *   type: "model",
 *   url: "https://example.com/assets/robot.glb",
 *   position: { x: 3, y: 0, z: 0 },
 *   enableAnimation: true,
 *   animations: { "Idle": true, "Wave": true },
 *   useTransparency: true,
 *   opacity: 0.8,
 *   renderMode: "default",
 * });
 *
 * // Play a specific animation with options
 * character.play("Walk", { loop: "repeat", fadeIn: 0.3, stopAll: true });
 *
 * // Stop a specific animation with fade out
 * character.stop("Walk", { fadeOut: 0.5 });
 *
 * // Stop all animations
 * character.stopAll();
 * ```
 */
export class ModelComponent extends Component3D<ModelComponentData> {
  //
  private _modelFactory: ModelFactory = null;

  private _model = null;

  /**
   * @internal
   */
  constructor(opts) {
    //

    super(opts);

    this._modelFactory = opts.modelFactory;
  }

  /** @internal */
  protected async init() {
    //
    const data = structuredClone(this.data) as any;

    const runtime = this.space.options?.runtime ?? "web";
    if (runtime === "web") {
      const { resolvePlugins } =
        await import("../../../internal/rendering/libraries/resolve-plugins");
      data.plugins = resolvePlugins(data.plugins);
    } else {
      data.plugins = [];
    }

    data.type = "cyber/model";

    if (this.data.optimized?.high) {
      data.url = this.data.optimized.high;
    } else {
      data.url = this.data.url;
    }

    this._model = await this._modelFactory.get(this.opts.space, data);

    // never been set

    if (this.data.useTransparency == null) {
      // checking original detection if the useTransparency is null at first

      // disable the notification 3rd parameter
      this.setData(
        { useTransparency: this._model.useTransparency } as any,
        false,
      );
    }

    // console.log('useTransparency', this.data.useTransparency)

    if (this._model.isClassic) {
      //
      this._model.position.set(0, 0, 0);

      this._model.quaternion.set(0, 0, 0, 1);

      this._model.scale.set(1, 1, 1);

      this.add(this._model);
      //
    } else {
      //
      this._model.attachTo(this);
    }

    this._update3D();
  }

  /**
   * @internal
   */
  updateFromSource() {
    if (this._model.isClassic != true) {
      this._model.updateFromSource();
    }
  }

  /**
   * The Three.js `AnimationMixer` for this model, if available. Can be used for advanced
   * animation control beyond the built-in {@link play}/{@link stop} methods.
   * Returns `null` if the model has no mixer or hasn't been initialized.
   */
  get mixer() {
    return this._model.mixer;
  }

  /**
   * @internal
   */
  getInstanceWrapper() {
    if (this._model.isClassic != true) {
      return this._model;
    } else {
      return null;
    }
  }

  private _collision = null;

  /**
   * @internal
   */
  getCollisionMesh() {
    //
    if (this._collision == null) {
      //
      if (!this._model) return null;

      this._collision = this._model.buildCollisionMesh();

      this._collision.visible = false;

      this.add(this._collision);
    }

    return this._collision;
  }

  protected _getBBoxImp(target: Box3) {
    //
    const mesh = this.getCollisionMesh();
    target.setFromObject(mesh);
    return target;
  }

  /** @internal */
  private _update3D() {
    //
    if (this._model.isClassic) {
      let animations = { ...this.data.animations };

      if (this.data.enableAnimation != true) {
        animations = {};
      }

      console.log("animations", animations);

      let i = 0;

      while (i < this._model.animations.length) {
        const name = this._model.animations[i].name;

        if (animations[name]) {
          this._model.play(name);
        } else if (this._model.activeAnimations[name]) {
          // Only stop animations that are currently active
          this._model.stop(name);
        }

        i++;
      }
    }

    this._model.opacity =
      this.data.useTransparency == true ? this.data.opacity : 1;
  }

  /**
   * @internal
   */
  async onDataChange(opts) {
    // need to respawn the model
    if (
      opts.prev?.renderMode != this.data.renderMode ||
      opts.prev?.enableRealTimeShadow != this.data.enableRealTimeShadow ||
      opts.prev?.useTransparency != this.data.useTransparency ||
      opts.prev?.fixedTransform != this.data.fixedTransform ||
      opts.prev?.plugins !== this.data.plugins
    ) {
      // If only plugin parameters changed (same plugin ids, same order),
      // update uniforms in-place without rebuilding the model.
      if (
        opts.prev?.plugins !== this.data.plugins &&
        opts.prev?.renderMode == this.data.renderMode &&
        opts.prev?.enableRealTimeShadow == this.data.enableRealTimeShadow &&
        opts.prev?.useTransparency == this.data.useTransparency &&
        opts.prev?.fixedTransform == this.data.fixedTransform &&
        this._isSamePluginStructure(opts.prev?.plugins, this.data.plugins)
      ) {
        this._liveUpdatePluginUniforms();
        return;
      }

      // skip full rebuild during in-progress edits for non-parameter changes
      if (opts.isProgress) return;

      this.stop();

      this.dispose();

      await this.init();

      SET_SHADOW_NEEDS_UPDATE(true);
    } else {
      if (
        opts.prev?.opacity != this.data.opacity ||
        opts.prev?.animations != this.data.animations
      ) {
        this._update3D();
      }
      //
    }

    if (
      IS_EDIT_MODE &&
      opts?.isProgress != true &&
      this.data.enableRealTimeShadow != true
    ) {
      SET_SHADOW_NEEDS_UPDATE(true);
      // console.log('the fuck')
    }
  }

  /**
   * @internal
   * Check if two plugin descriptor arrays have the same plugin ids in the same order.
   */
  private _isSamePluginStructure(prev: any, current: any): boolean {
    if (!prev || !current) return false;
    if (!Array.isArray(prev) || !Array.isArray(current)) return false;
    if (prev.length !== current.length) return false;
    for (let i = 0; i < prev.length; i++) {
      if (prev[i]?.id !== current[i]?.id) return false;
    }
    return true;
  }

  /**
   * @internal
   * Update plugin uniforms in-place on existing materials without rebuilding.
   */
  private _liveUpdatePluginUniforms() {
    if (!this._model || !this.data.plugins) return;

    // Instantiate plugins from descriptors to get updated uniform values
    const uniformUpdates: Record<string, any> = {};
    for (const descriptor of this.data.plugins as any[]) {
      const Cls = VisualPluginRegistry.get(descriptor.id);
      if (!Cls) continue;

      const plugin = new Cls(descriptor);
      if (!plugin.uniforms) continue;

      for (const [name, uniform] of Object.entries(plugin.uniforms)) {
        uniformUpdates[name] = (uniform as any).value;
      }
    }

    // Find the root to traverse: classic models are children of this component,
    // instanced models live in the factory wrapper
    let root: any = null;
    if (this._model.isClassic) {
      root = this;
    } else {
      const cacheKey = this._model.__cacheKey;
      if (cacheKey) {
        root = (this._modelFactory as any).instances[cacheKey];
      }
    }
    if (!root) return;

    // Walk meshes and update matching uniforms
    root.traverse((child: any) => {
      if (!child.isMesh || !child.material?.uniforms) return;

      for (const [name, value] of Object.entries(uniformUpdates)) {
        const existing = child.material.uniforms[name];
        if (!existing) continue;

        if (value instanceof Color && existing.value instanceof Color) {
          existing.value.copy(value);
        } else {
          existing.value = value;
        }
      }
    });
  }

  /**
   * @internal
   */
  async updateRenderMode(mode) {
    //
    if (mode != this.data.renderMode) {
      // with public api, maybe we can just set model.renderMode
      // make sure this is set, since I can call it from outside

      this.setData({ renderMode: mode });

      this.stop();

      this.dispose();

      await this.init();
    }
  }

  /** @internal */
  protected dispose() {
    //
    this._modelFactory.removeInstance(this._model);

    this._model = null;

    this._collision = null;

    if (this.data.enableRealTimeShadow == false) {
      SET_SHADOW_NEEDS_UPDATE(true);
    }
  }

  /**
   * Play an animation clip on the 3D model. Only works on glTF models that contain embedded animation clips.
   *
   * @param name - The name of the animation clip to play. Matching is case-insensitive.
   * @param opts - Playback options.
   * @param opts.reset - If `true`, restarts the animation even if it is already playing. Defaults to `false`.
   * @param opts.stopAll - If `true`, stops all other currently playing animations before starting this one.
   * @param opts.loop - Loop mode: `"once"` plays the animation a single time, `"repeat"` loops it continuously,
   *   `"pingpong"` alternates forward and backward. Defaults to `"repeat"`.
   * @param opts.repetitions - Number of times to repeat the animation. Defaults to `Infinity`.
   * @param opts.clampWhenFinished - If `true`, the animation is paused on its last frame when it finishes. Defaults to `false`.
   * @param opts.timeScale - Playback speed multiplier. `1` is normal speed, `0.5` is half speed, `2` is double speed. Defaults to `1`.
   * @param opts.weight - Blend weight of the animation, from `0` to `1`. Defaults to `1`.
   * @param opts.fadeIn - Duration in seconds to fade in the animation. Defaults to `0` (instant).
   * @param opts.fadeOut - Duration in seconds for fade-out when stopping other animations (used with `stopAll`).
   * @param opts.callback - Callback function invoked on animation loop and finish events. Receives the Three.js event object.
   */
  play(name: string, opts) {
    if (!this._model.isClassic) return;

    this._model.play?.(name, opts);
  }

  /**
   * Stop a playing animation on the 3D model.
   *
   * @param name - The name of the animation clip to stop.
   * @param opts - Stop options.
   * @param opts.fadeOut - Duration in seconds to fade out the animation. If not provided, the animation stops immediately.
   */
  stop(
    name?: string,
    opts?: {
      fadeOut?: number;
    },
  ) {
    if (!this._model.isClassic) return;

    this._model.stop?.(name, opts);
  }

  /**
   * Stop all currently playing animations on the 3D model and reset the mixer time to `0`.
   */
  stopAll() {
    if (!this._model.isClassic) return;

    this._model.stopAll?.();
  }

  /**
   * A record of currently playing animations. Keys are animation clip names and
   * values are `true` for each active animation. Returns an empty object if no
   * animations are playing.
   */
  get activeAnimations() {
    return this._model.activeAnimations || {};
  }

  /**
   * Seek an animation to a specific time on the 3D model. If the animation is not
   * already playing, it will be started.
   *
   * @param animation - The name of the animation clip to seek.
   * @param val - The time in seconds to seek to within the animation clip.
   */
  setAnimationAtTime(animation: string, val: number) {
    if (!this._model.isClassic) return;

    return this._model.setAnimationAtTime?.(animation, val);
  }

  /**
   * Get the animation clip data embedded in the 3D model.
   *
   * @returns A record mapping animation clip names to their Three.js `AnimationClip` objects,
   * or `undefined` if the model has no animations.
   */
  getAnimationData() {
    if (!this._model.isClassic) return;

    return this._model.getAnimationData?.(name);
  }
}
