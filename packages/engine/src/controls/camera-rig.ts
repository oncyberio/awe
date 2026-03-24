import {
  Camera,
  Object3D,
  Vector3,
  Spherical,
  MathUtils,
  Matrix4,
  Quaternion,
} from "three";
import emitter from "../internal/engine-emitter";
import { EngineEvents, MouseEventData } from "../internal/engine-events";
import { Physics } from "../physics";
import type { PhysicsEngine } from "../physics/types";

const TWO_PI = Math.PI * 2;
const MIN_POLAR_ANGLE = 0.1;
const MAX_POLAR_ANGLE = Math.PI * 0.9;

// Detect touch/mobile for sensitivity adjustments
const IS_TOUCH = typeof window !== "undefined" && "ontouchstart" in window;
const IS_MOBILE =
  typeof navigator !== "undefined" &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

// Fixed divisor for consistent sensitivity feel (matches old ThirdPersonCameraControls)
const SENSITIVITY_DIVISOR = 80;

/**
 * Camera rig state for save/restore
 */
export interface CameraRigState {
  spherical: { radius: number; theta: number; phi: number };
  targetSpherical: { radius: number; theta: number; phi: number };
  currentZoom: number;
  cameraHeight: number;
  virtualTarget: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  idealCameraTarget: { x: number; y: number; z: number };
  fpYaw: number;
  fpPitch: number;
  locked: boolean;
  lockAxis: { x: boolean; y: boolean };
}

const _cartesian = new Vector3();
const _direction = new Vector3();
const _origin = new Vector3();
const _rayOrigin = new Vector3();
const _rotationMatrix = new Matrix4();

/**
 * Camera rig modes
 */
export type CameraRigMode = "orbit" | "follow" | "firstPerson" | "fixed";

/**
 * CameraRig configuration
 */
export interface CameraRigConfig {
  /** The camera to control */
  camera: Camera;
  /** The target to follow */
  target: Object3D;

  /** Camera mode */
  mode?: CameraRigMode;

  /** Distance from target (orbit/follow modes) */
  distance?: number;
  /** Height offset from target */
  height?: number;
  /** Smoothing factor (0 = instant, 1 = very smooth) */
  smoothing?: number;

  /** Pitch (vertical) angle limits [min, max] in radians */
  pitchLimits?: [number, number];
  /** Whether to check for collisions */
  collision?: boolean;

  /** Look sensitivity */
  sensitivity?: { x: number; y: number };
  /** Invert Y axis */
  invertY?: boolean;

  /** Axis-specific rotation lock */
  lockAxis?: { x?: boolean; y?: boolean };

  /** Whether zooming is enabled (default: true) */
  canZoom?: boolean;
  /** Minimum zoom distance (default: 0.5) */
  minZoom?: number;
  /** Maximum zoom distance (default: distance * 2) */
  maxZoom?: number;

  /** Smoothing method for camera movement */
  smoothMethod?: "orbit" | "position";

  /** Whether to use pointer lock for mouse control (default: true for orbit/firstPerson) */
  usePointerLock?: boolean;

  /** Altitude (Y-axis) specific smoothing for vertical camera following (default: 0.17) */
  altitudeSmoothing?: number;
  /** Maximum distance before altitude smoothing accelerates (default: 25) */
  altitudeMaxDistance?: number;

  /** Smoothing for camera lookAt target (default: 0.08) */
  lookAtSmoothing?: number;
}

/**
 * CameraRig primitive - positions camera relative to target.
 * Handles collision, smoothing, constraints.
 *
 * @example
 * ```ts
 * const cameraRig = new CameraRig({
 *   camera: Camera.current,
 *   target: avatar,
 *   mode: "orbit",
 *   distance: 8,
 *   height: 2,
 *   smoothing: 0.1,
 *   collision: true,
 * });
 *
 * // In update loop
 * cameraRig.rotate(input.axis("lookX"), input.axis("lookY"));
 *
 * // Or lock for auto-runner
 * cameraRig.lockRotation();
 * ```
 */
export class CameraRig {
  private _camera: Camera & {
    near?: number;
    aspect?: number;
    getEffectiveFOV?: () => number;
  };
  private _target: Object3D & {
    collider?: any;
    getDimensions?: () => { y: number };
  };
  private _mode: CameraRigMode;
  private _distance: number;
  private _height: number;
  private _smoothing: number;
  private _pitchLimits: [number, number];
  private _collision: boolean;
  private _sensitivity: { x: number; y: number };
  private _invertY: boolean;

  private _active = false;
  private _disposed = false;
  private _locked = false;
  private _lockAxis: { x: boolean; y: boolean };

  // Zoom configuration
  private _canZoom: boolean;
  private _minZoom: number;
  private _maxZoom: number;

  // Smoothing method
  private _smoothMethod: "orbit" | "position";

  // Altitude-specific smoothing
  private _altitudeSmoothing: number;
  private _altitudeMaxDistance: number;

  // LookAt target smoothing
  private _lookAtSmoothing: number;
  private _idealCameraTarget = new Vector3();

  // Pointer lock
  private _usePointerLock: boolean;
  private _canvas: HTMLCanvasElement | null = null;
  private _pointerLockBound = false;

  // Internal state
  private _spherical = new Spherical();
  private _targetSpherical = new Spherical();
  private _currentZoom: number;
  private _cameraTarget = new Vector3();
  private _virtualTarget = new Vector3();
  private _cameraHeight = 0;

  // First person state
  private _fpYaw = 0;
  private _fpPitch = 0;

  private _minRatioToRotateY = Math.tan(Math.PI / 6);

  // Physics raycast
  private _engine: PhysicsEngine | null = null;
  private _nearPlaneCorners: Vector3[] = [
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
  ];

  constructor(config: CameraRigConfig) {
    this._camera = config.camera;
    this._target = config.target;
    this._mode = config.mode ?? "orbit";
    this._distance = config.distance ?? 8;
    this._height = config.height ?? 2;
    this._smoothing = config.smoothing ?? 0.15;
    this._pitchLimits = config.pitchLimits ?? [
      MIN_POLAR_ANGLE,
      MAX_POLAR_ANGLE,
    ];
    this._collision = config.collision ?? true;
    this._sensitivity = config.sensitivity ?? { x: 0.5, y: 0.4 };
    this._invertY = config.invertY ?? false;
    this._currentZoom = this._distance;

    // Axis lock configuration
    this._lockAxis = {
      x: config.lockAxis?.x ?? false,
      y: config.lockAxis?.y ?? false,
    };

    // Zoom configuration
    this._canZoom = config.canZoom ?? true;
    this._minZoom = config.minZoom ?? 0.5;
    this._maxZoom = config.maxZoom ?? this._distance * 2;

    // Smoothing method
    this._smoothMethod = config.smoothMethod ?? "orbit";

    // Altitude-specific smoothing
    this._altitudeSmoothing = config.altitudeSmoothing ?? 0.17;
    this._altitudeMaxDistance = config.altitudeMaxDistance ?? 25;

    // LookAt target smoothing
    this._lookAtSmoothing = config.lookAtSmoothing ?? 0.08;

    // Pointer lock - default true for orbit and firstPerson modes
    this._usePointerLock =
      config.usePointerLock ??
      (this._mode === "orbit" || this._mode === "firstPerson");

    // Initialize physics
    try {
      this._engine = Physics.get({ type: "rapier", debug: false });
    } catch {
      // Physics not available
    }

    this._camera.rotation.order = "YXZ";
    this._handleResize();
    this._init();
    this._setupPointerLock();
    emitter.on(EngineEvents.RESIZE, this._handleResize);
    this.active = true;
  }

  /** Whether the camera rig is active */
  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    if (this._active === value) return;
    this._active = value;

    if (value) {
      emitter.on(EngineEvents.LATE_UPDATE, this._update);
    } else {
      emitter.off(EngineEvents.LATE_UPDATE, this._update);
    }
  }

  /** The forward direction the camera is facing (useful for movement) */
  get forward(): Vector3 {
    const forward = new Vector3(0, 0, -1);
    forward.applyQuaternion(this._camera.quaternion);
    return forward;
  }

  /** The right direction from the camera */
  get right(): Vector3 {
    const right = new Vector3(1, 0, 0);
    right.applyQuaternion(this._camera.quaternion);
    return right;
  }

  /** Current distance from target */
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

  /** Camera mode */
  get mode(): CameraRigMode {
    return this._mode;
  }

  set mode(value: CameraRigMode) {
    this._mode = value;
    this._init();
  }

  /** Whether rotation is locked */
  get isLocked(): boolean {
    return this._locked;
  }

  /** Axis-specific lock settings */
  get lockAxis(): { x: boolean; y: boolean } {
    return { ...this._lockAxis };
  }

  /** Set axis-specific rotation lock */
  setLockAxis(axis: { x?: boolean; y?: boolean }): void {
    if (axis.x !== undefined) this._lockAxis.x = axis.x;
    if (axis.y !== undefined) this._lockAxis.y = axis.y;
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

  /** Altitude (Y-axis) specific smoothing */
  get altitudeSmoothing(): number {
    return this._altitudeSmoothing;
  }

  set altitudeSmoothing(value: number) {
    this._altitudeSmoothing = value;
  }

  /** Maximum distance before altitude smoothing accelerates */
  get altitudeMaxDistance(): number {
    return this._altitudeMaxDistance;
  }

  set altitudeMaxDistance(value: number) {
    this._altitudeMaxDistance = value;
  }

  /** Smoothing for camera lookAt target */
  get lookAtSmoothing(): number {
    return this._lookAtSmoothing;
  }

  set lookAtSmoothing(value: number) {
    this._lookAtSmoothing = value;
  }

  /** Look sensitivity */
  get sensitivity(): { x: number; y: number } {
    return { ...this._sensitivity };
  }

  set sensitivity(value: { x: number; y: number }) {
    this._sensitivity = value;
  }

  /** Whether pointer lock is enabled */
  get usePointerLock(): boolean {
    return this._usePointerLock;
  }

  set usePointerLock(value: boolean) {
    this._usePointerLock = value;
    if (value) {
      this._setupPointerLock();
    } else {
      this._cleanupPointerLock();
    }
  }

  /** Whether pointer is currently locked */
  get isPointerLocked(): boolean {
    return document.pointerLockElement === this._canvas;
  }

  /** Request pointer lock */
  requestPointerLock(): void {
    if (this._usePointerLock && this._canvas) {
      this._canvas.requestPointerLock();
    }
  }

  /** Exit pointer lock */
  exitPointerLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  /**
   * Rotate the camera.
   * @param deltaX - Horizontal rotation delta (yaw)
   * @param deltaY - Vertical rotation delta (pitch)
   */
  rotate(deltaX: number, deltaY: number): void {
    if (this._locked) return;

    // Apply axis locks
    let effectiveDeltaX = this._lockAxis.y ? 0 : deltaX; // Y axis lock = no horizontal rotation
    let effectiveDeltaY = this._lockAxis.x ? 0 : deltaY; // X axis lock = no vertical rotation

    // Ratio-based axis damping for smoother diagonal movement
    // When one axis dominates, reduce the other to avoid jerky diagonal motion
    const ratioXY = Math.abs(effectiveDeltaY / (effectiveDeltaX || 0.001));
    let factorX = 1;
    let factorY = 1;
    if (ratioXY < this._minRatioToRotateY) {
      factorY = 0.5; // Reduce Y when X is dominant
    } else {
      factorX = 0.5; // Reduce X when Y is dominant
    }

    // Touch/mobile adjustments for better feel
    if (IS_TOUCH) {
      factorY *= 2;
      factorX *= 3;
    }
    if (IS_MOBILE) {
      effectiveDeltaX = -effectiveDeltaX;
      effectiveDeltaY = -effectiveDeltaY;
    }

    effectiveDeltaX *= factorX;
    effectiveDeltaY *= factorY;

    const yMultiplier = this._invertY ? 1 : -1;

    if (this._mode === "firstPerson") {
      this._fpYaw -=
        effectiveDeltaX * (this._sensitivity.x / SENSITIVITY_DIVISOR);
      this._fpPitch +=
        effectiveDeltaY *
        yMultiplier *
        (this._sensitivity.y / SENSITIVITY_DIVISOR);

      // Clamp pitch
      this._fpPitch = MathUtils.clamp(
        this._fpPitch,
        -Math.PI / 2 + 0.01,
        Math.PI / 2 - 0.01
      );
    } else {
      this._targetSpherical.theta -=
        effectiveDeltaX * (this._sensitivity.x / SENSITIVITY_DIVISOR);
      this._targetSpherical.phi -=
        effectiveDeltaY *
        yMultiplier *
        (this._sensitivity.y / SENSITIVITY_DIVISOR);

      this._restrictSpherical(this._targetSpherical);
    }
  }

  /**
   * Lock camera rotation (for auto-runners, cutscenes, etc.)
   */
  lockRotation(): void {
    this._locked = true;
  }

  /**
   * Unlock camera rotation
   */
  unlockRotation(): void {
    this._locked = false;
  }

  /**
   * Set the camera to look at a specific point
   */
  lookAt(point: Vector3): void {
    this._camera.lookAt(point);
  }

  /**
   * Zoom in/out
   * @param delta - Zoom delta (positive = zoom out)
   */
  zoom(delta: number): void {
    if (!this._canZoom) return;

    this._currentZoom = MathUtils.clamp(
      this._currentZoom + delta * 0.1,
      this._minZoom,
      this._maxZoom
    );
  }

  /**
   * Set zoom to a specific distance
   * @param distance - Target zoom distance
   */
  setZoom(distance: number): void {
    this._currentZoom = MathUtils.clamp(distance, this._minZoom, this._maxZoom);
  }

  /**
   * Reset to default position
   */
  reset(): void {
    this._init();
  }

  /**
   * Save the current camera rig state for later restoration.
   * Useful for cutscenes, transitions, or checkpoints.
   */
  saveState(): CameraRigState {
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
      fpYaw: this._fpYaw,
      fpPitch: this._fpPitch,
      locked: this._locked,
      lockAxis: { ...this._lockAxis },
    };
  }

  /**
   * Restore a previously saved camera rig state.
   */
  loadState(state: CameraRigState): void {
    this._spherical.set(
      state.spherical.radius,
      state.spherical.phi,
      state.spherical.theta
    );
    this._targetSpherical.set(
      state.targetSpherical.radius,
      state.targetSpherical.phi,
      state.targetSpherical.theta
    );
    this._currentZoom = state.currentZoom;
    this._cameraHeight = state.cameraHeight;
    this._virtualTarget.set(
      state.virtualTarget.x,
      state.virtualTarget.y,
      state.virtualTarget.z
    );
    this._cameraTarget.set(
      state.cameraTarget.x,
      state.cameraTarget.y,
      state.cameraTarget.z
    );
    this._idealCameraTarget.set(
      state.idealCameraTarget.x,
      state.idealCameraTarget.y,
      state.idealCameraTarget.z
    );
    this._fpYaw = state.fpYaw;
    this._fpPitch = state.fpPitch;
    this._locked = state.locked;
    this._lockAxis = { ...state.lockAxis };
  }

  /**
   * Dispose the camera rig
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.active = false;
    this._cleanupPointerLock();
    emitter.off(EngineEvents.RESIZE, this._handleResize);
  }

  // Private methods

  private _setupPointerLock(): void {
    if (this._pointerLockBound || !this._usePointerLock) return;

    this._canvas = document.querySelector("canvas");
    if (!this._canvas) return;

    this._canvas.addEventListener("click", this._onCanvasClick);
    emitter.on(EngineEvents.MOUSE_MOVE, this._onMouseMove);
    this._pointerLockBound = true;
  }

  private _cleanupPointerLock(): void {
    if (!this._pointerLockBound) return;

    if (this._canvas) {
      this._canvas.removeEventListener("click", this._onCanvasClick);
    }
    emitter.off(EngineEvents.MOUSE_MOVE, this._onMouseMove);
    this._pointerLockBound = false;

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  private _onCanvasClick = (): void => {
    if (this._active && this._usePointerLock && this._canvas) {
      this._canvas.requestPointerLock();
    }
  };

  private _handleResize = (): void => {
    // No longer needed with fixed sensitivity divisor
  };

  private _onMouseMove = (e: MouseEventData): void => {
    if (!this._active || !this._usePointerLock) return;
    if (document.pointerLockElement !== this._canvas) return;

    let dx = 0;
    let dy = 0;
    for (let i = 0; i < e.mousemovePackets.length; i++) {
      dx += e.mousemovePackets[i].raw.dx;
      dy += e.mousemovePackets[i].raw.dy;
    }

    this.rotate(dx, dy);
  };

  private _init(): void {
    const targetDir = new Vector3(0, 0, 1);
    this._target.getWorldDirection?.(targetDir);

    // For first-person mode, height is just the eye level offset
    this._cameraHeight =
      this._mode === "firstPerson"
        ? this._height
        : this._getTargetHeight() + this._height;
    this._virtualTarget.copy(this._target.position);

    if (this._mode === "firstPerson") {
      this._camera.position.copy(this._target.position);
      this._camera.position.y += this._cameraHeight;

      // Initialize yaw from target's facing direction
      // Camera forward with YXZ rotation is (sin(yaw), 0, -cos(yaw))
      // To match targetDir: sin(yaw) = targetDir.x, -cos(yaw) = targetDir.z
      this._fpYaw = Math.atan2(targetDir.x, -targetDir.z);

      return;
    }

    if (this._mode === "fixed") {
      // Fixed camera above target
      this._camera.position.set(
        this._target.position.x,
        this._target.position.y + this._distance,
        this._target.position.z
      );
      this._camera.lookAt(this._target.position);
      return;
    }

    // orbit/follow modes
    const offset = targetDir.clone().multiplyScalar(this._currentZoom);
    this._targetSpherical.setFromVector3(offset);
    this._restrictSpherical(this._targetSpherical);
    this._targetSpherical.radius = this._currentZoom;

    offset.setFromSpherical(this._targetSpherical);
    this._spherical.copy(this._targetSpherical);

    this._camera.position.copy(this._target.position).add(offset);
    this._camera.position.y += this._cameraHeight;
    this._camera.lookAt(this._target.position);
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
      this._pitchLimits[1]
    );
    spherical.makeSafe();
  }

  private _lerpSpherical(
    spherical: Spherical,
    target: Spherical,
    alpha: number
  ): void {
    spherical.radius = MathUtils.lerp(spherical.radius, target.radius, alpha);
    spherical.theta = MathUtils.lerp(spherical.theta, target.theta, alpha);
    spherical.phi = MathUtils.lerp(spherical.phi, target.phi, alpha);
    this._restrictSpherical(spherical);
  }

  private _update = (dt: number): void => {
    if (this._disposed) return;

    // For first-person mode, height is just the eye level offset (not avatar height + offset)
    // For other modes, we want camera to look at a point above avatar's feet
    this._cameraHeight =
      this._mode === "firstPerson"
        ? this._height
        : this._getTargetHeight() + this._height;

    // Smooth virtual target position with altitude-specific smoothing
    const targetAltitude = this._target.position.y;
    const altitudeSmoothing = this._altitudeSmoothing || 0.01;
    const maxDistance = this._altitudeMaxDistance;

    // Reduction factor accelerates smoothing when target is far from camera
    // This prevents lag during big jumps/falls while keeping small movements smooth
    const altitudeDiff = Math.abs(this._virtualTarget.y - targetAltitude);
    const reduction = Math.min(1, altitudeDiff / maxDistance) ** 1.8;

    // Double-lerp for Y: base smoothing + reduction acceleration
    const baseYLerp = MathUtils.lerp(
      this._virtualTarget.y,
      targetAltitude,
      Math.min(1, dt / altitudeSmoothing)
    );
    this._virtualTarget.y = MathUtils.lerp(
      baseYLerp,
      targetAltitude,
      reduction
    );

    // X and Z follow instantly (no smoothing needed for horizontal)
    this._virtualTarget.x = this._target.position.x;
    this._virtualTarget.z = this._target.position.z;

    if (this._mode === "firstPerson") {
      this._updateFirstPerson(dt);
    } else if (this._mode === "fixed") {
      this._updateFixed(dt);
    } else {
      this._updateOrbitFollow(dt);
    }
  };

  private _updateFirstPerson(_dt: number): void {
    // Position at target's head
    this._camera.position.copy(this._target.position);
    this._camera.position.y += this._cameraHeight;

    // Apply rotation
    this._camera.rotation.set(this._fpPitch, this._fpYaw, 0, "YXZ");
  }

  private _updateFixed(_dt: number): void {
    // Stay above target
    this._camera.position.set(
      this._virtualTarget.x,
      this._virtualTarget.y + this._distance,
      this._virtualTarget.z
    );
    this._camera.lookAt(this._virtualTarget);
  }

  private _updateOrbitFollow(dt: number): void {
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
        isClipped ? baseLerp : lerpAlpha
      );
    } else {
      // For "position" smoothMethod, update spherical immediately
      this._spherical.copy(this._targetSpherical);
    }

    // Calculate camera position
    _cartesian.setFromSpherical(this._spherical);

    const idealPosition = new Vector3(
      this._virtualTarget.x + _cartesian.x,
      this._virtualTarget.y + this._cameraHeight + _cartesian.y,
      this._virtualTarget.z + _cartesian.z
    );

    // Calculate ideal camera target (what camera should look at)
    this._idealCameraTarget.set(
      this._virtualTarget.x,
      this._virtualTarget.y + this._cameraHeight - this._height,
      this._virtualTarget.z
    );

    // Smooth the lookAt target for smoother camera behavior
    const lookAtLerp = Math.min(1, dt / (this._lookAtSmoothing || 0.01));
    this._cameraTarget.lerp(this._idealCameraTarget, lookAtLerp);

    // Apply position with smoothing based on smoothMethod
    if (this._mode === "follow" || this._smoothMethod === "position") {
      this._camera.position.lerp(idealPosition, lerpAlpha);
    } else {
      this._camera.position.copy(idealPosition);
    }

    this._camera.lookAt(this._cameraTarget);
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
      this._virtualTarget.z + _cartesian.z
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
    maxDistance: number
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
