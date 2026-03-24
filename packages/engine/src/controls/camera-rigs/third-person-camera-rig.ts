import { Object3D, Vector3, Spherical, MathUtils, Matrix4 } from "three";
import emitter from "../../internal/engine-emitter";
import { EngineEvents } from "../../internal/engine-events";
import { Physics } from "../../physics";
import type { PhysicsEngine } from "../../physics/types";
import {
  BaseCameraRig,
  BaseCameraRigConfig,
  MIN_POLAR_ANGLE,
  MAX_POLAR_ANGLE,
  SENSITIVITY_DIVISOR,
  applyAxisDampening,
} from "./base-camera-rig";

const TWO_PI = Math.PI * 2;
const _cartesian = new Vector3();
const _direction = new Vector3();
const _origin = new Vector3();
const _rayOrigin = new Vector3();
const _rotationMatrix = new Matrix4();

/**
 * Third-person camera rig configuration
 */
export interface ThirdPersonCameraRigConfig extends BaseCameraRigConfig {
  /** The target to orbit around */
  target: Object3D;
  /** Distance from target (default: 5) */
  distance?: number;
  /** Height offset from target (default: 0) */
  height?: number;
  /** Whether to check for collisions (default: true) */
  collision?: boolean;
  /** Smoothing method (default: "orbit") */
  smoothMethod?: "orbit" | "position";
  /** Smoothing factor 0-1 (default: 0.2) */
  smoothing?: number;
  /** Altitude (Y-axis) specific smoothing (default: 0.17) */
  altitudeSmoothing?: number;
  /** Maximum distance before altitude smoothing accelerates (default: 25) */
  altitudeMaxDistance?: number;
  /** Smoothing for camera lookAt target (default: 0.08) */
  lookAtSmoothing?: number;
  /** Pitch (vertical) limits [min, max] in radians (default: [0, π*0.8]) */
  pitchLimits?: [number, number];
  /** Whether zooming is enabled (default: true) */
  canZoom?: boolean;
  /** Minimum zoom distance (default: 0.1) */
  minZoom?: number;
  /** Maximum zoom distance (default: distance) */
  maxZoom?: number;
  /** Invert Y axis (default: false) */
  invertY?: boolean;
  /** Axis-specific rotation lock */
  lockAxis?: { x?: boolean; y?: boolean };
}

/**
 * Third-person camera rig state for save/restore
 */
export interface ThirdPersonCameraRigState {
  spherical: { radius: number; theta: number; phi: number };
  targetSpherical: { radius: number; theta: number; phi: number };
  currentZoom: number;
  cameraHeight: number;
  virtualTarget: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  idealCameraTarget: { x: number; y: number; z: number };
  locked: boolean;
  lockAxis: { x: boolean; y: boolean };
}

/**
 * Third-person camera rig that orbits around a target.
 * Features collision detection, altitude smoothing, and zoom support.
 *
 * @example
 * ```ts
 * const cameraRig = new ThirdPersonCameraRig({
 *   camera: Camera.current,
 *   target: avatar,
 *   distance: 8,
 *   height: 2,
 *   collision: true,
 *   smoothing: 0.15,
 * });
 *
 * // Rotation is handled via pointer lock or manual rotate() calls
 * cameraRig.zoom(delta); // Adjust distance
 * ```
 */
export class ThirdPersonCameraRig extends BaseCameraRig {
  private _target: Object3D & {
    collider?: any;
    getDimensions?: () => { y: number };
  };
  private _distance: number;
  private _height: number;
  private _collision: boolean;
  private _smoothMethod: "orbit" | "position";
  private _smoothing: number;
  private _altitudeSmoothing: number;
  private _altitudeMaxDistance: number;
  private _lookAtSmoothing: number;
  private _pitchLimits: [number, number];
  private _canZoom: boolean;
  private _minZoom: number;
  private _maxZoom: number;
  private _invertY: boolean;
  private _locked = false;
  private _lockAxis: { x: boolean; y: boolean };

  // Internal state
  private _spherical = new Spherical();
  private _targetSpherical = new Spherical();
  private _currentZoom: number;
  private _cameraTarget = new Vector3();
  private _virtualTarget = new Vector3();
  private _cameraHeight = 0;
  private _idealCameraTarget = new Vector3();

  // Physics raycast
  private _engine: PhysicsEngine | null = null;
  private _nearPlaneCorners: Vector3[] = [
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
  ];

  constructor(config: ThirdPersonCameraRigConfig) {
    super(config);

    this._target = config.target;
    this._distance = config.distance ?? 5;
    this._height = config.height ?? 0;
    this._collision = config.collision ?? true;
    this._smoothMethod = config.smoothMethod ?? "orbit";
    this._smoothing = config.smoothing ?? 0.2;
    this._altitudeSmoothing = config.altitudeSmoothing ?? 0.17;
    this._altitudeMaxDistance = config.altitudeMaxDistance ?? 25;
    this._lookAtSmoothing = config.lookAtSmoothing ?? 0.08;
    this._pitchLimits = config.pitchLimits ?? [
      MIN_POLAR_ANGLE,
      MAX_POLAR_ANGLE,
    ];
    this._canZoom = config.canZoom ?? true;
    this._minZoom = config.minZoom ?? 0.1;
    this._maxZoom = config.maxZoom ?? this._distance;
    this._invertY = config.invertY ?? false;
    this._currentZoom = this._distance;

    this._lockAxis = {
      x: config.lockAxis?.x ?? false,
      y: config.lockAxis?.y ?? false,
    };

    // Initialize physics
    try {
      this._engine = Physics.get({ type: "rapier", debug: false });
    } catch {
      // Physics not available
    }

    this._init();
    this._setupPointerLock();
    this.active = true;
  }

  // --- Getters and Setters ---

  /** Distance from target */
  get distance(): number {
    return this._distance;
  }

  set distance(value: number) {
    this._distance = value;
    this._currentZoom = value;
  }

  /** Height offset */
  get height(): number {
    return this._height;
  }

  set height(value: number) {
    this._height = value;
  }

  /** Whether rotation is locked */
  get isLocked(): boolean {
    return this._locked;
  }

  /** Axis-specific lock settings */
  get lockAxis(): { x: boolean; y: boolean } {
    return { ...this._lockAxis };
  }

  /** Whether zooming is enabled */
  get canZoom(): boolean {
    return this._canZoom;
  }

  set canZoom(value: boolean) {
    this._canZoom = value;
  }

  /** Minimum zoom distance */
  get minZoom(): number {
    return this._minZoom;
  }

  set minZoom(value: number) {
    this._minZoom = value;
  }

  /** Maximum zoom distance */
  get maxZoom(): number {
    return this._maxZoom;
  }

  set maxZoom(value: number) {
    this._maxZoom = value;
  }

  /** Current zoom level */
  get currentZoom(): number {
    return this._currentZoom;
  }

  /** Smoothing method */
  get smoothMethod(): "orbit" | "position" {
    return this._smoothMethod;
  }

  set smoothMethod(value: "orbit" | "position") {
    this._smoothMethod = value;
  }

  /** Smoothing factor */
  get smoothing(): number {
    return this._smoothing;
  }

  set smoothing(value: number) {
    this._smoothing = value;
  }

  /** Altitude smoothing */
  get altitudeSmoothing(): number {
    return this._altitudeSmoothing;
  }

  set altitudeSmoothing(value: number) {
    this._altitudeSmoothing = value;
  }

  /** Altitude max distance */
  get altitudeMaxDistance(): number {
    return this._altitudeMaxDistance;
  }

  set altitudeMaxDistance(value: number) {
    this._altitudeMaxDistance = value;
  }

  /** LookAt smoothing */
  get lookAtSmoothing(): number {
    return this._lookAtSmoothing;
  }

  set lookAtSmoothing(value: number) {
    this._lookAtSmoothing = value;
  }

  // --- Methods ---

  /** Set axis-specific rotation lock */
  setLockAxis(axis: { x?: boolean; y?: boolean }): void {
    if (axis.x !== undefined) this._lockAxis.x = axis.x;
    if (axis.y !== undefined) this._lockAxis.y = axis.y;
  }

  /** Lock camera rotation */
  lockRotation(): void {
    this._locked = true;
  }

  /** Unlock camera rotation */
  unlockRotation(): void {
    this._locked = false;
  }

  /**
   * Rotate the camera using fixed divisor sensitivity (matches old ThirdPersonCameraControls).
   */
  rotate(deltaX: number, deltaY: number): void {
    if (this._locked) return;

    if (deltaX === 0 && deltaY === 0) return;

    // Apply axis locks
    let effectiveDeltaX = this._lockAxis.y ? 0 : deltaX;
    let effectiveDeltaY = this._lockAxis.x ? 0 : deltaY;

    // Apply ratio-based axis dampening
    const { dx, dy } = applyAxisDampening(effectiveDeltaX, effectiveDeltaY);

    const yMultiplier = this._invertY ? -1 : 1;

    // Use fixed sensitivity divisor (matches old ThirdPersonCameraControls)
    this._targetSpherical.theta -=
      dx * (this._sensitivity.x / SENSITIVITY_DIVISOR);
    this._targetSpherical.phi -=
      dy * yMultiplier * (this._sensitivity.y / SENSITIVITY_DIVISOR);

    this._restrictSpherical(this._targetSpherical);
  }

  /**
   * Zoom in/out
   * @param delta - Zoom delta (positive = zoom out)
   */
  zoom(delta: number): void {
    if (!this._canZoom) return;

    if (delta === 0) return;

    this._currentZoom = MathUtils.clamp(
      this._currentZoom + delta * 0.1,
      this._minZoom,
      this._maxZoom,
    );
  }

  /**
   * Set zoom to a specific distance
   */
  setZoom(distance: number): void {
    this._currentZoom = MathUtils.clamp(distance, this._minZoom, this._maxZoom);
  }

  /** Set the camera to look at a specific point */
  lookAt(point: Vector3): void {
    this._camera.lookAt(point);
  }

  /** Reset to default position */
  reset(): void {
    this._init();
  }

  /** Save current state */
  saveState(): ThirdPersonCameraRigState {
    return {
      spherical: {
        radius: this._spherical.radius,
        theta: this._spherical.theta,
        phi: this._spherical.phi,
      },
      targetSpherical: {
        radius: this._targetSpherical.radius,
        theta: this._targetSpherical.theta,
        phi: this._targetSpherical.phi,
      },
      currentZoom: this._currentZoom,
      cameraHeight: this._cameraHeight,
      virtualTarget: {
        x: this._virtualTarget.x,
        y: this._virtualTarget.y,
        z: this._virtualTarget.z,
      },
      cameraTarget: {
        x: this._cameraTarget.x,
        y: this._cameraTarget.y,
        z: this._cameraTarget.z,
      },
      idealCameraTarget: {
        x: this._idealCameraTarget.x,
        y: this._idealCameraTarget.y,
        z: this._idealCameraTarget.z,
      },
      locked: this._locked,
      lockAxis: { ...this._lockAxis },
    };
  }

  /** Restore a previously saved state */
  loadState(state: ThirdPersonCameraRigState): void {
    this._spherical.set(
      state.spherical.radius,
      state.spherical.phi,
      state.spherical.theta,
    );
    this._targetSpherical.set(
      state.targetSpherical.radius,
      state.targetSpherical.phi,
      state.targetSpherical.theta,
    );
    this._currentZoom = state.currentZoom;
    this._cameraHeight = state.cameraHeight;
    this._virtualTarget.set(
      state.virtualTarget.x,
      state.virtualTarget.y,
      state.virtualTarget.z,
    );
    this._cameraTarget.set(
      state.cameraTarget.x,
      state.cameraTarget.y,
      state.cameraTarget.z,
    );
    this._idealCameraTarget.set(
      state.idealCameraTarget.x,
      state.idealCameraTarget.y,
      state.idealCameraTarget.z,
    );
    this._locked = state.locked;
    this._lockAxis = { ...state.lockAxis };
  }

  dispose(): void {
    if (this._disposed) return;
    emitter.off(EngineEvents.LATE_UPDATE, this._update);
    super.dispose();
  }

  protected _addEvents(): void {
    // Re-sync virtual target and spherical to current state to avoid camera jump
    this._virtualTarget.copy(this._target.position);

    // Recalculate spherical from current camera position relative to target
    // This preserves the current camera view when becoming active
    const targetWithHeight = this._virtualTarget.clone();
    targetWithHeight.y += this._getTargetHeight() + this._height;
    _cartesian.subVectors(this._camera.position, targetWithHeight);
    this._spherical.setFromVector3(_cartesian);
    this._targetSpherical.copy(this._spherical);
    this._currentZoom = this._spherical.radius;

    emitter.on(EngineEvents.LATE_UPDATE, this._update);
    this._setupPointerLock();
  }

  protected _removeEvents(): void {
    emitter.off(EngineEvents.LATE_UPDATE, this._update);
  }

  private _init(): void {
    const targetDir = new Vector3(0, 0, 1);
    this._target.getWorldDirection?.(targetDir);

    this._cameraHeight = this._getTargetHeight() + this._height;
    this._virtualTarget.copy(this._target.position);

    const offset = targetDir.clone().multiplyScalar(this._currentZoom);
    this._targetSpherical.setFromVector3(offset);
    this._restrictSpherical(this._targetSpherical);
    this._targetSpherical.radius = this._currentZoom;

    offset.setFromSpherical(this._targetSpherical);
    this._spherical.copy(this._targetSpherical);

    this._camera.position.copy(this._target.position).add(offset);
    this._camera.position.y += this._cameraHeight;
    // Look at same point as _updateOrbit uses (target + height offset)
    this._camera.lookAt(
      this._virtualTarget.x,
      this._virtualTarget.y + this._cameraHeight - this._height,
      this._virtualTarget.z,
    );
    this._camera.updateMatrix();
  }

  private _getTargetHeight(): number {
    if (!this._target.getDimensions) return 1;
    return this._target.getDimensions().y;
  }

  private _restrictSpherical(spherical: Spherical): void {
    spherical.phi = MathUtils.clamp(
      spherical.phi,
      this._pitchLimits[0],
      this._pitchLimits[1],
    );
    spherical.makeSafe();
  }

  private _lerpSpherical(
    spherical: Spherical,
    target: Spherical,
    alpha: number,
  ): void {
    spherical.radius = MathUtils.lerp(spherical.radius, target.radius, alpha);
    spherical.theta = MathUtils.lerp(spherical.theta, target.theta, alpha);
    spherical.phi = MathUtils.lerp(spherical.phi, target.phi, alpha);
    this._restrictSpherical(spherical);
  }

  private _update = (dt: number): void => {
    if (this._disposed || !this._active) return;

    this._cameraHeight = this._getTargetHeight() + this._height;

    // Smooth virtual target position with altitude-specific smoothing
    const targetAltitude = this._target.position.y;
    const altitudeSmoothing = this._altitudeSmoothing || 0.01;
    const maxDistance = this._altitudeMaxDistance;

    // Reduction factor accelerates smoothing when target is far from camera
    const altitudeDiff = Math.abs(this._virtualTarget.y - targetAltitude);
    const reduction = Math.min(1, altitudeDiff / maxDistance) ** 1.8;

    // Double-lerp for Y: base smoothing + reduction acceleration
    const baseYLerp = MathUtils.lerp(
      this._virtualTarget.y,
      targetAltitude,
      Math.min(1, dt / altitudeSmoothing),
    );
    this._virtualTarget.y = MathUtils.lerp(
      baseYLerp,
      targetAltitude,
      reduction,
    );

    // X and Z follow instantly
    this._virtualTarget.x = this._target.position.x;
    this._virtualTarget.z = this._target.position.z;

    this._updateOrbit(dt);
  };

  private _updateOrbit(dt: number): void {
    const baseLerp = 1.0 - Math.pow(0.001, dt);
    const lerpAlpha = 1 - this._smoothing * (1 - baseLerp);

    // Check for camera collision
    let distance = this._currentZoom;
    if (this._collision) {
      distance = this._checkCollision(distance);
    }

    const isClipped = distance < this._currentZoom;
    this._targetSpherical.radius = Math.min(distance, this._currentZoom);

    // Lerp spherical coords (for "orbit" smoothMethod or collision)
    if (this._smoothMethod === "orbit" || isClipped) {
      this._lerpSpherical(
        this._spherical,
        this._targetSpherical,
        isClipped ? baseLerp : lerpAlpha,
      );
    } else {
      this._spherical.copy(this._targetSpherical);
    }

    // Calculate camera position
    _cartesian.setFromSpherical(this._spherical);

    const idealPosition = new Vector3(
      this._virtualTarget.x + _cartesian.x,
      this._virtualTarget.y + this._cameraHeight + _cartesian.y,
      this._virtualTarget.z + _cartesian.z,
    );

    // Calculate ideal camera target (what camera should look at)
    this._idealCameraTarget.set(
      this._virtualTarget.x,
      this._virtualTarget.y + this._cameraHeight - this._height,
      this._virtualTarget.z,
    );

    // Keep _cameraTarget in sync for save/load state compatibility
    this._cameraTarget.copy(this._idealCameraTarget);

    // Apply position with smoothing based on smoothMethod
    if (this._smoothMethod === "position") {
      this._camera.position.lerp(idealPosition, lerpAlpha);
    } else {
      this._camera.position.copy(idealPosition);
    }

    // LookAt behavior matching original ThirdPersonCameraControls:
    // - When target is visible: direct lookAt (no smoothing) for immediate response
    // - When target is not visible: use direct rotation values
    if (!this._target.visible) {
      this._camera.rotation.y = MathUtils.degToRad(this._spherical.theta);
      this._camera.rotation.x = -MathUtils.degToRad(this._spherical.phi);
    } else {
      this._camera.lookAt(this._idealCameraTarget);
    }
    this._camera.updateMatrix();
  }

  private _checkCollision(maxDistance: number): number {
    if (!this._engine) return maxDistance;

    const previousRad = this._targetSpherical.radius;
    this._targetSpherical.radius = maxDistance;

    _cartesian.setFromSpherical(this._targetSpherical);

    const cameraPos = new Vector3(
      this._virtualTarget.x + _cartesian.x,
      this._virtualTarget.y + this._cameraHeight + _cartesian.y,
      this._virtualTarget.z + _cartesian.z,
    );

    let distance = maxDistance;
    const playerCenter = this._virtualTarget.clone();
    playerCenter.y += this._cameraHeight - this._height;

    _direction.subVectors(cameraPos, playerCenter).normalize();
    _origin.set(0, 0, 0);
    _rotationMatrix.lookAt(_origin, _direction, this._camera.up);

    // Initialize near plane corners
    const near = (this._camera as any).near ?? 0.1;
    const fov = (this._camera as any).getEffectiveFOV?.() ?? 75;
    const fovRad = fov * MathUtils.DEG2RAD;
    const heightHalf = Math.tan(fovRad * 0.5) * near;
    const widthHalf = heightHalf * ((this._camera as any).aspect ?? 1);

    this._nearPlaneCorners[0].set(-widthHalf, -heightHalf, 0);
    this._nearPlaneCorners[1].set(widthHalf, -heightHalf, 0);
    this._nearPlaneCorners[2].set(widthHalf, heightHalf, 0);
    this._nearPlaneCorners[3].set(-widthHalf, heightHalf, 0);

    for (const corner of this._nearPlaneCorners) {
      corner.applyMatrix4(_rotationMatrix);
      const origin = _rayOrigin.addVectors(playerCenter, corner);

      const result = this._raycast(origin, _direction, distance);
      if (result && result.distance < distance && result.distance > 0) {
        distance = result.distance;
      }
    }

    this._targetSpherical.radius = previousRad;
    this._targetSpherical.makeSafe();

    return distance < 0 ? 0.01 : distance;
  }

  private _raycast(
    origin: any,
    direction: any,
    maxDistance: number,
  ): { distance: number } | null {
    if (!this._engine) return null;

    const result = this._engine.physicsRaycast({
      origin,
      direction,
      maxDistance,
      solid: false,
      shouldRaycast: (collider) => {
        if (collider.isSensor) return false;
        if (collider.component === this._target) return false;
        if (collider.parent?.options?.type === "PLAYER") return false;
        return true;
      },
    });

    return result ? { distance: result.distance } : null;
  }
}
