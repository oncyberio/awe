// @ts-check

import { Component3D, OPTS } from "../abstract/component-3d";
// import { components, factoryOptions } from "./components"
import { removeItem } from "../../internal/utils/js";
import { EngineEvents } from "../../internal/engine-events";
import emitter from "../../internal/engine-emitter";
import { CType, ComponentTypeMap, CreateComponentArg } from "./components";
import type { ComponentsRegistry } from "../registry";
import { nanoid } from "../../internal/utils/nanoid";
import { ComponentData } from "../../@types/game";
import type { Space } from "../space";
import { COMPONENT_PRIORITY } from "../abstract/component-factory";
import AugmentedGroup from "../../internal/events/augmented-group";
import { Object3D } from "three";
import { Deferred, deferred } from "../../internal/utils/deferred";
import { IS_EDIT_MODE } from "../../internal/constants";
import { AudioManager } from "../../internal/utils/globals/audio-manager";
import type { AudioComponent } from "./audio/audio-component";
import type { FogComponent } from "./fog/fog-component";
import type { BackgroundComponent } from "./background/background-component";
import type { ImageComponent } from "./image/image-component";
import type { MeshComponent } from "./mesh/mesh-component";
import type { TextComponent } from "./text/text-component";
import type { VideoComponent } from "./video/video-component";
import type { LightingComponent } from "./lighting/lighting-component";
import type { EnvmapComponent } from "./envmap/envmap-component";
import type { ModelComponent } from "./model/model-component";
import type { TerrainComponent } from "./terrain/terrain-component";
import type { AvatarComponent } from "./avatar/avatar-component";
import type { WaterComponent } from "./water/water-component";
import type { ReflectorComponent } from "./reflector/reflector-component";
import type { BirdComponent } from "./bird/bird-component";
import type { DialogComponent } from "./dialog/dialog-component";
import type { InteractionComponent } from "./interaction/interaction-component";
import type { GrassComponent } from "./grass/grass-component";

export interface ComponentManagerOpts {
  data: Record<string, ComponentData>;
  space: Space;
  externalApi: Record<string, any>;
  loadOpts?: {
    looseMode?: boolean;
  };
}

export interface CreateComponentOpts {
  parent?: Component3D;
  abort?: AbortSignal;
  transient?: boolean;
  overrideOpts?: {};
}

interface InternalCreateComponentOpts {
  parent?: Object3D;
  abort?: AbortSignal;
  persistent?: boolean;
  overrideOpts?: {};
  duplicating?: boolean;
}

export interface ComponentsUpgrade {
  added?: Record<string, ComponentData>;
  updated?: Record<string, ComponentData>;
  removed?: Record<string, unknown>;
}

/**
 *
 *
 * A ComponentManager is a container for all the components of a space.
 * It is responsible for creating, destroying and duplicating components.
 *
 * @public
 */
export class ComponentManager extends AugmentedGroup {
  private _registry: ComponentsRegistry = null;

  /**
   * @internal
   */
  private _dataDict: Record<string, ComponentData>;

  /**
   * some scripts still use this
   */

  /*
   * @internal
   **/
  _isLoading = false;

  private _data: ComponentData[];

  private _components: Component3D[] = [];

  private _postLoadTasks: Promise<any>[] = [];

  private _componentsById: Record<string, Component3D> = {};

  private _componentsByScriptId: Record<string, Component3D> = {};

  private _componentsByScriptTag: Record<string, Component3D[]> = {};

  private _componentsByType: Record<string, Component3D[]> = {};

  private wasDisposed: boolean;

  private _spaceLoaded: Deferred<void> = deferred();

  /**
   * @internal
   */
  _audioManager: AudioManager = new AudioManager(this);

  /**
   * @internal
   */
  constructor(private _opts: ComponentManagerOpts) {
    //
    super();

    this.matrixAutoUpdate = false;

    this._registry = _opts.space.registry;

    _opts.space.add(this);

    this._dataDict = _opts.data;

    this._data = Object.values(_opts.data);

    /** @type { Component3D[] } */
    this._components = [];

    /** @type { Record<string, Component3D> } */
    this._componentsById = {};

    globalThis["ckit"] = this;

    this._addEvents();
  }

  private _hasEvents = false;

  private _addEvents() {
    if (this._hasEvents) return;
    this._hasEvents = true;
    emitter.on(EngineEvents.GAME_START, this._onGameStart);
    emitter.on(EngineEvents.GAME_STOP, this._onGameStop);
  }

  private _removeEvents() {
    if (!this._hasEvents) return;
    this._hasEvents = false;
    emitter.off(EngineEvents.GAME_START, this._onGameStart);
    emitter.off(EngineEvents.GAME_STOP, this._onGameStop);
  }

  private _onGameStart = () => {
    this.space.physics.active = true;
  };

  private _onGameStop = () => {
    this.space.physics.active = false;
  };

  get space() {
    return this._opts.space;
  }

  private _nodesPromises: Record<string, Promise<Component3D>> = {};

  private _getPriority(data: ComponentData) {
    //
    const fc = this._registry.factoryClasses[data.type];

    if (fc == null) {
      console.error("factory is null for " + data.type);
      return null;
    }

    return fc.info.priority ?? COMPONENT_PRIORITY.MEDIUM;
  }


  get components() {
    return this._components;
  }

  /**
   * @internal
   */
  async _build() {
    //await this.#buildComponentTypes();

    try {
      this._isLoading = true;

      let priorityGroups: ComponentData[][] = [];

      Object.values(this._dataDict).forEach((data) => {
        //
        const priority = this._getPriority(data);

        // unkown type
        if (priority == null) return;

        if (priorityGroups[priority] == null) {
          priorityGroups[priority] = [];
        }

        priorityGroups[priority].push(data);
      });

      await this._buildGroup(priorityGroups[0], 0);

      for (let i = 1; i < priorityGroups.length; i++) {
        await this._buildGroup(priorityGroups[i], i);
      }

      this.emit(EngineEvents.GAME_SPACE_LOADED);

      emitter.emit(EngineEvents.GAME_SPACE_LOADED, {
        space: this._opts.space,
      });

      this._spaceLoaded.resolve();

      // Wait for events to be processed, eventually pushing new tasks to the queue
      return new Promise((resolve) => {
        setTimeout(() => {
          Promise.all(this._postLoadTasks).then(resolve);
        }, 0);
      });
    } finally {
      this._isLoading = false;
    }
  }

  addLoadTask(promise: Promise<any>) {
    this._postLoadTasks.push(
      promise.catch((err) => {
        console.error("Error in post load task", err);
      }),
    );
  }

  /**
   * @internal
   */
  async _buildGroup(group: ComponentData[], priority: number, debug = false) {
    // console.log("checking priority group " + priority + " ...");

    if (group == null || group.length === 0) return;

    // console.log("starting prioty group " + priority + " ...");

    await Promise.all(
      group.map((data) => {
        if (data.__skipBuild) return;
        //
        let promise = this._getNode(data) as Promise<any>;

        if (this._opts.loadOpts?.looseMode || IS_EDIT_MODE) {
          //
          promise = promise.catch((err) => {
            console.error("Error building component " + data.id, err);
          });
        }

        return promise;
      }),
    );

    await this._resolve(priority);

    // console.log(" priority group " + priority + " done ");
  }

  private _upgrades: ComponentsUpgrade = {
    added: {},
    updated: {},
    removed: {},
  };

  /**
   * @internal
   */
  _upagrade_add(upgrade: ComponentData) {
    //
    if (this._upgrades == null) {
      console.error("Too late to push upgrade");
    }

    this._upgrades.added[upgrade.id] = upgrade;
  }

  /**
   * @internal
   */
  _upgrade_remove(id: string) {
    //
    if (this._upgrades == null) {
      console.error("Too late to push upgrade");
    }

    this._upgrades.removed[id] = true;
  }

  /**
   * @internal
   */
  _upgrade_update(upgrade: ComponentData) {
    //
    if (this._upgrades == null) {
      console.error("Too late to push upgrade");
    }

    this._upgrades.updated[upgrade.id] = upgrade;
  }

  /**
   * @internal
   */
  _flushUpgrades() {
    const upgrades = this._upgrades;
    this._upgrades = null;
    return upgrades;
  }

  private async _buildNode(data: ComponentData) {
    //
    if (data.parentId && this._componentsById[data.parentId] == null) {
      //
      let parentData = this._dataDict[data.parentId];

      let parentFix = false;

      try {
        //
        if (parentData == null) {
          //
          console.error("Can't find parent ", data.parentId, "Trying to fix");

          this._dataDict[data.parentId] = parentData = {
            id: data.parentId,
            type: "group",
          };

          parentFix = true;
        }

        const currentPriority = this._getPriority(data);

        const parentPriority = this._getPriority(parentData);

        // Right now we disallow parenting a child to a parent with a lower priority
        // Later we might want to relax this constraint; we can reparent the child
        // to the parent after the parent has been created. But this will require to
        // solve transform related issues, notably recomputing the colliders dimensions
        if (currentPriority < parentPriority) {
          //
          console.error(
            `Can't parent ${data.id} to ${parentData.id} with a lower priority`,
          );

          return;
        }

        await this._getNode(parentData);

        if (parentFix) {
          //
          const data = this._componentsById[parentData.id].data;

          this._upagrade_add(data);
        }
        //
      } catch (err) {
        //
        console.error(err.message);
      }
    }

    return this._createInternal(data, { persistent: true });
  }

  _updateComponentTag(component: Component3D, tag: string, prevTag: string) {
    //
    if (prevTag === tag) return;

    if (prevTag) {
      // remove previous tag
      const index = (this._componentsByScriptTag[prevTag] || []).indexOf(
        component,
      );

      if (index > -1) {
        this._componentsByScriptTag[prevTag].splice(index, 1);
      }
    }

    if (tag) {
      this._componentsByScriptTag[tag] ??= [];

      this._componentsByScriptTag[tag].push(component);
    }
  }

  /**
   * @internal
   */
  _updateComponentScriptId(component: Component3D, id: string, prevId: string) {
    //
    if (prevId === id) return;

    if (prevId) {
      delete this._componentsByScriptId[prevId];
    }

    if (id) {
      this._componentsByScriptId[id] = component;
    }
  }

  private async _getNode(data: ComponentData) {
    //
    if (this._nodesPromises[data.id] != null) {
      return this._nodesPromises[data.id];
    }

    const promise = this._buildNode(data);

    this._nodesPromises[data.id] = promise;

    return promise;
  }

  /**
   * @internal
   */
  async _resolve(priority: number) {
    const factories = Object.values(this._registry.componentTypes).filter(
      (f) => {
        return f.info.priority === priority;
      },
    );

    await Promise.all(
      factories.map((f) => {
        return f.onResolve();
      }),
    );
  }

  /**
   * @deprecated use {@link ComponentManager.byInternalId} instead
   * @internal
   */
  _byDataId(id: string) {
    return this._componentsById[id];
  }

  byInternalId(id: string) {
    return this._componentsById[id];
  }

  get loaded() {
    //
    return this._spaceLoaded.promise;
  }

  get background(): BackgroundComponent {
    return this.byType("background")?.[0] as BackgroundComponent;
  }

  get fog(): FogComponent {
    return this.byType("fog")?.[0] as FogComponent;
  }

  get lighting(): LightingComponent {
    return this.byType("lighting")?.[0] as LightingComponent;
  }

  get envMap(): EnvmapComponent {
    return this.byType("envmap")?.[0] as EnvmapComponent;
  }

  /**
   * Returns a component by its id.
   */
  byId<T extends Component3D = Component3D>(id: string): T | undefined {
    return (this._componentsByScriptId[id] ?? this._componentsById[id]) as
      | T
      | undefined;
  }

  /**
   * Returns all component with matching tag.
   * A tag is a string identifier that can be used to group components.
   */
  byTag(tag: string) {
    return this._componentsByScriptTag[tag] || [];
  }

  /**

     * Returns all components with matching type.
     */
  byType<T extends CType>(type: T): ComponentTypeMap[T][];
  byType(type: string): Component3D[];
  byType(type: string) {
    return (this._componentsByType?.[type] || []) as Component3D[];
  }

  /**
   * Returns all components with matching name.
   */
  byName(name: string) {
    return this._components.filter((it) => it.data.name === name);
  }

  /**
   * Returns all components satisfying the given filter function.
   */
  filter(f: (c: Component3D) => boolean) {
    return this._components.filter(f);
  }

  /**
   * Returns the first component satisfying the given filter function.
   */
  find(f: (c: Component3D) => boolean) {
    return this._components.find(f);
  }

  /**
   * Iterates over all components and calls the given function for each one.
   */
  forEach(f: (c: Component3D, i) => void) {
    return this._components.forEach((c, i) => f(c, i));
  }

  /**
   * create a new component of the given type.
   * You can pass additional data that will be used to initialize the component.
   *
   * @example
   *
   * ```ts
   *  const component = await Components.create({
   *      type: "model",
   *      url: "https://example.com/model.glb",
   *      position: { x: 0, y: 0, z: 0 }
   *      rotation: { x: 0, y: 0, z: 0 }
   *      scale: { x: 1, y: 1, z: 1 }
   *  })
   * ```
   *
   * For the data format, see the documentation of the component you want to create.
   *
   * @returns
   *
   * a promise that resolves to the created component.
   * The type of the returned component depends on the type of the component you created.
   * For example a "model" component will return a ModelComponent.
   *
   */
  create<T extends CType>(
    data: CreateComponentArg<T>,
    opts: {
      abort?: AbortSignal;
      transient?: boolean;
      parent?: Object3D;
    } = {},
  ): Promise<ComponentTypeMap[T]> {
    //
    return this._createInternal(data, {
      ...opts,
      persistent: false,
    });
  }

  private _timeout<T>(promise: Promise<T>, timeout: number, message: string) {
    return new Promise<T>((resolve, reject) => {
      let resolved = false;
      let timeoutId = setTimeout(() => {
        reject(new Error(message));
        resolved = true;
      }, timeout);
      promise.then(
        (result) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeoutId);
          resolve(result);
        },
        (error) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeoutId);
          reject(error);
        },
      );
    });
  }

  /**
   * @internal
   */
  async _createInternal<T extends CType>(
    data: CreateComponentArg<T>,
    opts: InternalCreateComponentOpts = {},
  ): Promise<ComponentTypeMap[T]> {
    // try {
    // separate children from the data if present, do not mutate
    const componentData = { ...data } as ComponentTypeMap[T]["data"];
    let children = Object.values(componentData.children ?? {});

    delete componentData.children;

    let factory = await this._registry.getOrCreateFactory(componentData.type, {
      ...this._opts,
      container: this,
    } as any);

    if (opts?.abort?.aborted) return null;

    if (factory == null) {
      console.warn("Factory is null for ", componentData.type);

      return null;
    }

    opts = { ...opts };

    if (opts.parent == null) {
      if (componentData.parentId) {
        //
        opts.parent = this.byInternalId(componentData.parentId);

        if (opts.parent == null) {
          throw new Error("Can't find parent " + componentData.parentId);
        }
      } else {
        //
        opts.parent = this;
      }
    } else {
      //
      if (opts.parent instanceof Component3D) {
        //
        componentData.parentId = opts.parent.data.id;
      }
    }

    const instance: Component3D = await this._timeout(
      factory.onAddInstance(componentData, opts),
      120000,
      "Timeout creating component " + componentData.type + " " + componentData.url,
    );

    //const instance: Component3D = await factory.onAddInstance(data, opts);

    if (opts?.abort?.aborted) {
      factory.onRemoveInstance(instance);

      return null;
    }

    instance[OPTS].persistent = !!opts.persistent;

    /**
     * We need to flag the children that were created as part
     * of this component creation process (eg scripts), so that
     * we can skip them when duplicating the component.
     * Otherwise, they would be created twice.
     */
    instance.childComponents.forEach((c) => {
      c[OPTS].createdOnInit = true;
    });

    this._components.push(instance);

    this._componentsById[componentData.id] = instance;

    this._updateComponentScriptId(instance, componentData.script?.identifier, null);

    this._updateComponentTag(instance, componentData.script?.tag, null);

    const componentType = componentData?.type;

    if (componentType) {
      this._componentsByType[componentType] ??= [];

      this._componentsByType[componentType].push(instance);
    }

    instance.userData.opts = opts;

    if (instance.isPersistent) {
      emitter.emit(EngineEvents.COMPONENT_ADDED, instance);
    }

    if (children?.length) {
      const instances = await Promise.all(
        children.map((c) => {
          return this._createInternal(c as any, {
            ...opts,
            parent: instance,
          });
        }),
      );

      instance.emit(instance.EVENTS.CHILDREN_LOADED, instances);
    }

    if (opts.duplicating != true) {
      instance._isLoading = false;
    }

    return instance as ComponentTypeMap[T];
    // } catch (err) {
    // console.error("Error creating component ", err, data);

    // return null;
    // }
  }

  /**
   * Removes the given component from the space.
   *
   * @param component
   *
   * The component to remove.
   *
   * @returns
   *
   * true if the component was successfully removed, false otherwise.
   */
  destroy(component: Component3D) {
    component._isLoading = true;
    // if(component.info.required) {

    //     throw new Error("Can't remove required component " + component.data.id)
    // }
    if (component.wasDisposed) return false;

    if (this._componentsById[component.data.id] == null) {
      console.error("Can't find component " + component.data.id);

      return false;
    }

    component.childComponents.forEach((c) => {
      //
      if (c instanceof Component3D) {
        this.destroy(c);
      }
    });

    removeItem(this._components, component);

    delete this._componentsById[component.data.id];

    if (component.data?.script?.identifier) {
      delete this._componentsByScriptId[component.data.script.identifier];
    }

    if (component.data?.script?.tag) {
      const index = (
        this._componentsByScriptTag[component.data.script.tag] || []
      ).indexOf(component);
      if (index > -1) {
        this._componentsByScriptTag[component.data.script.tag].splice(index, 1);
      }
    }

    if (component.data?.type && typeof component.data.type === "string") {
      const index = (this._componentsByType[component.data.type] || []).indexOf(
        component,
      );
      if (index > -1) {
        this._componentsByType[component.data.type].splice(index, 1);
      }
    }

    const factory = this._registry.componentTypes[component.data.type as any];

    // Emit COMPONENT_REMOVED before disposing so listeners can still access the component
    if (component.isPersistent) {
      emitter.emit(EngineEvents.COMPONENT_REMOVED, component);
    }

    factory.onRemoveInstance(component);

    component._isLoading = false;

    return true;
  }

  /**
   * Duplicates the given component.
   *
   * @returns
   *
   * a promise that resolves to the duplicated component.
   */
  async duplicate<T extends Component3D>(
    component: T,
    opts?: CreateComponentOpts,
  ): Promise<T> {
    //
    const res = await this._duplicateInternal([component], {
      ...opts,
      persistent: false,
    });
    return res[0];
  }

  /**
   * @internal
   */
  async _duplicateInternal<T extends Component3D>(
    components: T[],
    opts: InternalCreateComponentOpts = {},
  ): Promise<T[]> {
    //
    const map = {};
    const instances = await this._duplicateInternalRecursive(
      components,
      opts,
      map,
    );
    return instances;
  }

  /**
   * @internal
   */
  async _duplicateInternalRecursive<T extends Component3D>(
    components: T[],
    opts: InternalCreateComponentOpts = {},
    oldToNewIdMap = {},
  ): Promise<T[]> {
    //
    const instances = await Promise.all(
      components.map(async (component) => {
        //
        if (component.info.singleton) {
          throw new Error(
            "Can't duplicate singleton component " + component.data.id,
          );
        }

        var data = structuredClone(component.data);

        if (data.script?.identifier) {
          delete data.script.identifier;
        }

        const uid = nanoid();
        const oldId = data.id;
        data.id = `${data.type}_${uid}`;

        if (opts?.overrideOpts != null)
          data = { ...data, ...opts.overrideOpts };

        if (opts?.parent) {
          data.parentId = (opts.parent as any).data?.id;
        }

        const instance = (await this._createInternal(data as any, {
          ...opts,
          duplicating: true,
          persistent: opts.persistent,
        })) as any;

        oldToNewIdMap[oldId] = instance.componentId;

        const childs = component.childComponents.filter(
          (c) => c[OPTS].persistent,
        );
        const children = await this._duplicateInternalRecursive(
          childs,
          {
            ...opts,
            parent: instance,
          },
          oldToNewIdMap,
        );

        instance.emit(instance.EVENTS.CHILDREN_LOADED, children);

        return instance;
      }),
    );

    return instances;
  }

  onSpaceLoaded(cb: () => void) {
    //
    this.once(EngineEvents.GAME_SPACE_LOADED, cb);

    return () => {
      this.off(EngineEvents.GAME_SPACE_LOADED, cb);
    };
  }

  /**
   * @internal
   */
  dispose() {
    if (this.wasDisposed) return;

    this.wasDisposed = true;

    this._removeEvents();

    this._components.slice().forEach((c) => {
      this.destroy(c);
    });

    // =< ===

    this._components = null;

    this._opts = null;

    this._dataDict = null;
  }
}
