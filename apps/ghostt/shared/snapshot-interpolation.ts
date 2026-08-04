interface Snapshot<T> {
  time: number;
  state: T;
}

export class SnapshotBuffer<T> {
  private buffer: Snapshot<T>[] = [];
  private maxSize: number;

  constructor(maxSize = 60) {
    this.maxSize = maxSize;
  }

  push(state: T, serverTime: number): void {
    const last = this.buffer[this.buffer.length - 1];
    if (last) {
      if (serverTime < last.time) {
        return;
      }

      if (serverTime === last.time) {
        last.state = state;
        return;
      }
    }

    this.buffer.push({ time: serverTime, state });
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  sample(renderTime: number): { prev: Snapshot<T>; next: Snapshot<T>; t: number } | null {
    const buf = this.buffer;

    if (buf.length === 0) return null;

    // Walk from newest to oldest to find bracketing pair
    for (let i = buf.length - 2; i >= 0; i--) {
      if (buf[i].time <= renderTime && renderTime < buf[i + 1].time) {
        const prev = buf[i];
        const next = buf[i + 1];
        const span = next.time - prev.time;
        const t = span > 0 ? (renderTime - prev.time) / span : 1;
        // Prune snapshots older than prev
        if (i > 0) {
          this.buffer.splice(0, i);
        }
        return { prev, next, t };
      }
    }

    // renderTime is past all snapshots — hold at last known state
    if (renderTime >= buf[buf.length - 1].time) {
      const last = buf[buf.length - 1];
      return { prev: last, next: last, t: 1 };
    }

    // renderTime is before all snapshots — not enough buffered yet
    return null;
  }

  clear(): void {
    this.buffer = [];
  }

  latestPair(): { prev: Snapshot<T>; next: Snapshot<T> } | null {
    if (this.buffer.length < 2) return null;

    return {
      prev: this.buffer[this.buffer.length - 2],
      next: this.buffer[this.buffer.length - 1],
    };
  }
}
