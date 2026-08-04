import type { Room } from "@colyseus/sdk";
import { getStateCallbacks } from "@colyseus/sdk";
import type { Space } from "@oncyberio/engine";
import { deferred, type Deferred } from "../lib/deferred";
import {
  TransformSync,
  type TransformSyncConfig,
  type TransformSyncState,
} from "./transform-sync";

type DestroyableComponent = {
  destroy(): void;
};

interface ReplicaEntry<TModel, TComponent extends DestroyableComponent> {
  model: TModel;
  component: TComponent | null;
  destroyed: boolean;
  isLocal: boolean;
  transformSync: TransformSync | null;
}

/**
 * Client-side replica contract.
 * The spec owns component creation/destruction and reacts to model changes.
 * ComponentReplica handles state tracking, entry lifecycle, and transform sync.
 */
export interface ComponentReplicaSpec<
  TState,
  TModel,
  TComponent extends DestroyableComponent,
> {
  /**
   * Return true when this model represents the local player.
   * Local replicas skip transform sync and resolve whenLocalComponentReady().
   * Defaults to false if not provided.
   */
  isLocal?(model: TModel, room: Room<any, TState>): boolean;

  /**
   * Create and return the engine component for this model.
   * Called once when the model is added to the collection.
   * Attach sensors, listeners, etc. here.
   */
  createComponent(input: {
    model: TModel;
    isLocal: boolean;
    space: Space;
  }): Promise<TComponent>;

  /**
   * Destroy the engine component.
   * Called when the model is removed from the collection or on dispose.
   * Defaults to component.destroy() if not provided.
   */
  destroyComponent?(component: TComponent): void;

  /**
   * Extract the transform from the model for server -> client interpolation.
   * Omit to disable transform sync entirely.
   */
  getTransform?(model: TModel): TransformSyncState | null;

  /**
   * Called on every schema change (NOT after initial creation).
   * Use for non-transform state like animation, visibility, VFX, etc.
   */
  onModelChange?(input: {
    model: TModel;
    component: TComponent | null;
    isLocal: boolean;
  }): void;
}

export interface ComponentReplicaOptions<
  TState,
  TModel,
  TComponent extends DestroyableComponent,
> {
  room: Room<any, TState>;
  stateKey: keyof TState & string;
  space: Space;
  spec: ComponentReplicaSpec<TState, TModel, TComponent>;
  transformSync?: TransformSyncConfig | null;
}

export class ComponentReplica<
  TState,
  TModel,
  TComponent extends DestroyableComponent,
> {
  private room: Room<any, TState>;
  private stateKey: keyof TState & string;
  private space: Space;
  private spec: ComponentReplicaSpec<TState, TModel, TComponent>;
  private transformSyncConfig: TransformSyncConfig | null;
  private entries = new Map<string, ReplicaEntry<TModel, TComponent>>();
  private cleanupCallbacks: (() => void)[] = [];
  private entryCleanupCallbacks = new Map<string, (() => void)[]>();
  private initialized = false;
  private localComponentReady: Deferred<TComponent> =
    this.createLocalComponentDeferred();

  constructor(
    options: ComponentReplicaOptions<TState, TModel, TComponent>,
  ) {
    this.room = options.room;
    this.stateKey = options.stateKey;
    this.space = options.space;
    this.spec = options.spec;
    this.transformSyncConfig = options.transformSync ?? null;
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const $ = getStateCallbacks(this.room);
    const state = this.room.state as Record<string, unknown>;
    const state$ = $(state as any) as Record<string, any>;
    const collection$ = state$[this.stateKey];

    this.cleanupCallbacks.push(
      collection$.onAdd((model: TModel, key: string) => {
        this.addEntry(model, key, $);
      }),
    );

    this.cleanupCallbacks.push(
      collection$.onRemove((_model: TModel, key: string) => {
        this.removeEntry(key);
      }),
    );

    this.hydrateExistingEntries(state[this.stateKey], $);
  }

  update(dt: number): void {
    for (const entry of this.entries.values()) {
      if (entry.isLocal || !entry.component || !entry.transformSync) continue;
      entry.transformSync.update(entry.component as any, dt);
    }
  }

  getLocalComponent(): TComponent | null {
    for (const entry of this.entries.values()) {
      if (entry.isLocal) return entry.component;
    }

    return null;
  }

  whenLocalComponentReady(): Promise<TComponent> {
    const component = this.getLocalComponent();
    if (component) {
      return Promise.resolve(component);
    }

    return this.localComponentReady.promise;
  }

  dispose(): void {
    for (const key of this.entries.keys()) {
      this.teardownEntry(key);
    }

    for (const entry of this.entries.values()) {
      entry.destroyed = true;
      if (entry.component) {
        this.destroyComponent(entry.component);
      }
      entry.transformSync?.reset();
    }

    for (const cleanup of this.cleanupCallbacks) {
      cleanup();
    }

    this.entries.clear();
    this.cleanupCallbacks = [];
    this.localComponentReady.reject(new Error("[ComponentReplica] Disposed"));
    this.localComponentReady = this.createLocalComponentDeferred();
    this.initialized = false;
  }

  private addEntry(
    model: TModel,
    key: string,
    $: ReturnType<typeof getStateCallbacks>,
  ): void {
    if (this.entries.has(key)) return;

    const isLocal = this.spec.isLocal?.(model, this.room) ?? false;
    const transformSync =
      !isLocal && this.transformSyncConfig && this.spec.getTransform
        ? new TransformSync(this.transformSyncConfig)
        : null;
    const entry: ReplicaEntry<TModel, TComponent> = {
      model,
      component: null,
      destroyed: false,
      isLocal,
      transformSync,
    };

    if (transformSync) {
      const initialTransform = this.spec.getTransform?.(model);
      if (initialTransform) {
        transformSync.push(initialTransform);
      }
    }

    this.entries.set(key, entry);

    const offChange = $(model as any).onChange(() => {
      this.onEntryChange(key);
    });
    this.entryCleanupCallbacks.set(key, [offChange]);

    void this.spawnComponent(entry);
  }

  private hydrateExistingEntries(
    collection: unknown,
    $: ReturnType<typeof getStateCallbacks>,
  ): void {
    if (!collection || typeof collection !== "object") return;

    if ("forEach" in collection && typeof collection.forEach === "function") {
      collection.forEach((model: TModel, key: string) => {
        this.addEntry(model, key, $);
      });
      return;
    }

    for (const [key, model] of Object.entries(collection as Record<string, TModel>)) {
      this.addEntry(model, key, $);
    }
  }

  private createLocalComponentDeferred(): Deferred<TComponent> {
    const deferredValue = deferred<TComponent>();
    deferredValue.promise.catch(() => {});
    return deferredValue;
  }

  private onEntryChange(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;

    if (!entry.isLocal && entry.transformSync && this.spec.getTransform) {
      const nextTransform = this.spec.getTransform(entry.model);
      if (nextTransform) {
        entry.transformSync.push(nextTransform);
      }
    }

    this.spec.onModelChange?.({
      model: entry.model,
      component: entry.component,
      isLocal: entry.isLocal,
    });
  }

  private async spawnComponent(
    entry: ReplicaEntry<TModel, TComponent>,
  ): Promise<void> {
    const component = await this.spec.createComponent({
      model: entry.model,
      isLocal: entry.isLocal,
      space: this.space,
    });

    if (entry.destroyed) {
      this.destroyComponent(component);
      return;
    }

    entry.component = component;

    if (entry.isLocal) {
      this.localComponentReady.resolve(component);
    }
  }

  private removeEntry(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;

    entry.destroyed = true;
    this.teardownEntry(key);
    if (entry.component) {
      this.destroyComponent(entry.component);
    }
    entry.component = null;
    entry.transformSync?.reset();
    entry.transformSync = null;
    this.entries.delete(key);
  }

  private destroyComponent(component: TComponent): void {
    if (this.spec.destroyComponent) {
      this.spec.destroyComponent(component);
    } else {
      component.destroy();
    }
  }

  private teardownEntry(key: string): void {
    const cleanupCallbacks = this.entryCleanupCallbacks.get(key);
    if (!cleanupCallbacks) return;

    for (const cleanup of cleanupCallbacks) {
      cleanup();
    }

    this.entryCleanupCallbacks.delete(key);
  }
}
