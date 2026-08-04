import { SnapshotBuffer } from "../../shared/snapshot-interpolation";
import {
  INTERPOLATION_BUFFER_MS,
  MAX_EXTRAPOLATION_MS,
  OFFSET_SMOOTHING,
  OFFSET_SNAP_THRESHOLD_MS,
  POSITION_SMOOTHING_SPEED,
  ROTATION_SMOOTHING_SPEED,
} from "../../shared/network-constants";

type Axis = "x" | "y" | "z";
type LockedAxes = Partial<Record<Axis, true>>;

interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface TransformSyncState {
  position: Vector3Like;
  rotation: Vector3Like;
  updatedAt: number;
}

export interface TransformSyncTarget {
  position: Vector3Like & {
    set?: (x: number, y: number, z: number) => void;
  };
  rotation: Vector3Like;
}

export interface TransformSyncConfig {
  lockPosition?: LockedAxes;
  lockRotation?: LockedAxes;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}

function angleDelta(a: number, b: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

function isLocked(locks: LockedAxes | undefined, axis: Axis): boolean {
  return locks?.[axis] === true;
}

function setPosition(
  target: TransformSyncTarget["position"],
  next: Vector3Like,
): void {
  if (target.set) {
    target.set(next.x, next.y, next.z);
    return;
  }

  target.x = next.x;
  target.y = next.y;
  target.z = next.z;
}

export class TransformSync {
  private buffer = new SnapshotBuffer<TransformSyncState>();
  private timeOffset = -1;
  private lockPosition: LockedAxes;
  private lockRotation: LockedAxes;

  constructor(config: TransformSyncConfig = {}) {
    this.lockPosition = config.lockPosition ?? {};
    this.lockRotation = config.lockRotation ?? {};
  }

  push(state: TransformSyncState): void {
    this.syncTimeOffset(state.updatedAt || Date.now());
    this.buffer.push(state, state.updatedAt || Date.now());
  }

  update(
    target: TransformSyncTarget,
    dt: number,
  ): TransformSyncState | null {
    if (this.timeOffset === -1) return null;

    const renderTime = Date.now() - this.timeOffset - INTERPOLATION_BUFFER_MS;
    const result = this.buffer.sample(renderTime);
    if (!result) return null;

    const next = this.sample(renderTime, result);
    const positionAlpha = 1 - Math.exp(-POSITION_SMOOTHING_SPEED * dt);
    const rotationAlpha = 1 - Math.exp(-ROTATION_SMOOTHING_SPEED * dt);

    const dx = isLocked(this.lockPosition, "x")
      ? 0
      : next.position.x - target.position.x;
    const dy = isLocked(this.lockPosition, "y")
      ? 0
      : next.position.y - target.position.y;
    const dz = isLocked(this.lockPosition, "z")
      ? 0
      : next.position.z - target.position.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq > 100) {
      setPosition(target.position, {
        x: isLocked(this.lockPosition, "x")
          ? target.position.x
          : next.position.x,
        y: isLocked(this.lockPosition, "y")
          ? target.position.y
          : next.position.y,
        z: isLocked(this.lockPosition, "z")
          ? target.position.z
          : next.position.z,
      });
      this.applyRotation(target.rotation, next.rotation, 1);
    } else {
      if (!isLocked(this.lockPosition, "x")) {
        target.position.x += dx * positionAlpha;
      }
      if (!isLocked(this.lockPosition, "y")) {
        target.position.y += dy * positionAlpha;
      }
      if (!isLocked(this.lockPosition, "z")) {
        target.position.z += dz * positionAlpha;
      }
      this.applyRotation(target.rotation, next.rotation, rotationAlpha);
    }

    return next;
  }

  reset(): void {
    this.buffer.clear();
    this.timeOffset = -1;
  }

  private applyRotation(
    target: TransformSyncTarget["rotation"],
    next: Vector3Like,
    alpha: number,
  ): void {
    if (!isLocked(this.lockRotation, "x")) {
      target.x = lerpAngle(target.x, next.x, alpha);
    }
    if (!isLocked(this.lockRotation, "y")) {
      target.y = lerpAngle(target.y, next.y, alpha);
    }
    if (!isLocked(this.lockRotation, "z")) {
      target.z = lerpAngle(target.z, next.z, alpha);
    }
  }

  private sample(
    renderTime: number,
    result: {
      prev: { time: number; state: TransformSyncState };
      next: { time: number; state: TransformSyncState };
      t: number;
    },
  ): TransformSyncState {
    const { prev, next, t } = result;

    if (prev.time === next.time) {
      const extrapolated = this.extrapolate(renderTime);
      if (extrapolated) return extrapolated;
    }

    return {
      position: {
        x:
          prev.state.position.x +
          (next.state.position.x - prev.state.position.x) * t,
        y:
          prev.state.position.y +
          (next.state.position.y - prev.state.position.y) * t,
        z:
          prev.state.position.z +
          (next.state.position.z - prev.state.position.z) * t,
      },
      rotation: {
        x: lerpAngle(prev.state.rotation.x, next.state.rotation.x, t),
        y: lerpAngle(prev.state.rotation.y, next.state.rotation.y, t),
        z: lerpAngle(prev.state.rotation.z, next.state.rotation.z, t),
      },
      updatedAt: next.state.updatedAt,
    };
  }

  private extrapolate(renderTime: number): TransformSyncState | null {
    const pair = this.buffer.latestPair();
    if (!pair) return null;

    const span = pair.next.time - pair.prev.time;
    if (span <= 0) return pair.next.state;

    const extraTime = Math.min(
      Math.max(renderTime - pair.next.time, 0),
      MAX_EXTRAPOLATION_MS,
    );

    return {
      position: {
        x:
          pair.next.state.position.x +
          ((pair.next.state.position.x - pair.prev.state.position.x) / span) *
            extraTime,
        y:
          pair.next.state.position.y +
          ((pair.next.state.position.y - pair.prev.state.position.y) / span) *
            extraTime,
        z:
          pair.next.state.position.z +
          ((pair.next.state.position.z - pair.prev.state.position.z) / span) *
            extraTime,
      },
      rotation: {
        x:
          pair.next.state.rotation.x +
          (angleDelta(pair.prev.state.rotation.x, pair.next.state.rotation.x) /
            span) *
            extraTime,
        y:
          pair.next.state.rotation.y +
          (angleDelta(pair.prev.state.rotation.y, pair.next.state.rotation.y) /
            span) *
            extraTime,
        z:
          pair.next.state.rotation.z +
          (angleDelta(pair.prev.state.rotation.z, pair.next.state.rotation.z) /
            span) *
            extraTime,
      },
      updatedAt: pair.next.state.updatedAt,
    };
  }

  private syncTimeOffset(serverTime: number): void {
    const measuredOffset = Date.now() - serverTime;

    if (this.timeOffset === -1) {
      this.timeOffset = measuredOffset;
      return;
    }

    const offsetDelta = measuredOffset - this.timeOffset;
    if (Math.abs(offsetDelta) > OFFSET_SNAP_THRESHOLD_MS) {
      this.timeOffset = measuredOffset;
    } else {
      this.timeOffset += offsetDelta * OFFSET_SMOOTHING;
    }
  }
}
