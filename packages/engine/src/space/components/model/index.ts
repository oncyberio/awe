import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { ModelFactory } from "../../../internal/media/model";
import { ModelComponent } from "./model-component";
import SpaceFactory from "../..";

/** @internal */
export class ModelComponentFactory extends DefaultComponentFactory<ModelComponent> {
  Type = ModelComponent;

  static info = {
    type: "model",
    title: "Model",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmdMuK7WHQtmhRWK5weDfdptXg6iSnu9Rox2wfYqGkFNBd",
    transform: true,
    draggable: true,
  };

  static getTitle(data: any) {
    //
    const instance = SpaceFactory.current?.components?.byInternalId(data.id);

    let title = instance.data.name;

    let url = (instance.data as any).url;

    if (!title) {
      // strip name from url
      if (url) {
        //
        const idx = data.url.lastIndexOf("/");

        title = data.url.substring(idx + 1);
      } else {
        //
        title = "Model";
      }
    }

    return title;
  }

  static {
    // debugger;

    const defaultData = {
      kit: "cyber",
      type: "model",
      name: "",
      url: "",
      optimized: {
        high: "",
        low: "",
        low_compressed: "",
      },
      mime_type: "model/gltf-binary",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      envmap: "scene",
      envmapIntensity: 1,
      animations: {},
      meta: {
        addedBy: "",
        placeholder: "",
      },
      renderMode: "default",
      plugins: [],
      enableAnimation: false,
      opacity: 1,
      enableRealTimeShadow: false,
      useTransparency: false,
      center: false,
      fixedTransform: false,
    };

    this.setDataConfig({
      defaultData,
      valuePaths: ["animations", "optimized", "plugins"],
    });
  }

  private modelFactory: ModelFactory = null;

  async init(opts) {
    //
    this.modelFactory = new ModelFactory();

    return super.init(opts);
  }

  async createInstance(data) {
    if (this.Type == null) {
      throw new Error(
        "Type not set for default component factory " + this.info.type,
      );
    }

    const instance = new ModelComponent({
      space: this.space,
      container: this.container,
      info: this.info,
      data,
      modelFactory: this.modelFactory,
    });

    await instance.onInit();

    return instance;
  }

  upgradeData(data) {
    // @ts-ignore

    // to do // sync in database
    // @TODO: we need a more general solution to upgrade data
    if (data.enableAnimation == null) {
      data.enableAnimation = Object.keys(data.animations || {}).length > 0;
    }

    return super.upgradeData(data);
  }

  protected validate(data: any): void {
    // if (this.modelFactory.isValid(data) === false) {
    //     throw new Error("Invalid model config");
    // }
  }

  dispose() {
    super.dispose();

    this.modelFactory.disposeAll();

    this.modelFactory = null;
  }
}
