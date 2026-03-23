import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { QuarksComponent } from "./quarks-component";
import { BatchedRenderer } from "three.quarks";
import emitter from "../../../internal/engine-emitter";
import { EngineEvents } from "../../../internal/engine-events";
import Scene from "../../../internal/scene";

/** @internal */
export class QuarksComponentFactory extends DefaultComponentFactory<QuarksComponent> {
  //
  Type = QuarksComponent;

  static info = {
    type: "quarks",
    title: "Quarks Effect",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmWM4wvcfR9cUm9jQWyxgqmFs4Kowoud7Qow78ZLQ9P8ph",
    draggable: true,
    transform: true,
    studioTab: "worldSettings",
  };

  static {
    const defaultData = {
      id: "",
      kit: "cyber",
      type: "quarks",
      name: "",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      url: "",
      autoPlay: true,
      looping: true,
      speed: 1,
    };

    this.setDataConfig({
      defaultData,
    });
  }

  private _batchedRenderer: BatchedRenderer = null;

  private _updateEvent: ((delta: number) => void) | null = null;

  async init(opts: any) {
    this._batchedRenderer = new BatchedRenderer();
    Scene.add(this._batchedRenderer);

    this._updateEvent = (delta: number) => {
      this._batchedRenderer?.update(delta);
    };
    emitter.on(EngineEvents.LATE_UPDATE, this._updateEvent);

    return super.init(opts);
  }

  async createInstance(data: any) {
    const instance = new QuarksComponent({
      space: this.space,
      container: this.container,
      info: this.info,
      data,
      batchedRenderer: this._batchedRenderer,
    });

    await instance.onInit();

    return instance;
  }

  dispose() {
    if (this._updateEvent) {
      emitter.off(EngineEvents.LATE_UPDATE, this._updateEvent);
      this._updateEvent = null;
    }

    if (this._batchedRenderer) {
      Scene.remove(this._batchedRenderer);
      this._batchedRenderer = null;
    }

    super.dispose();
  }
}
