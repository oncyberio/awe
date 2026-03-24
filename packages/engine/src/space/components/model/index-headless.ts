import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { ModelComponentHeadless } from "./model-component-headless";

/** @internal */
export class ModelComponentFactoryHeadless extends DefaultComponentFactory<ModelComponentHeadless> {
  Type = ModelComponentHeadless;

  static info = {
    type: "model",
    title: "Model",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmdMuK7WHQtmhRWK5weDfdptXg6iSnu9Rox2wfYqGkFNBd",
    transform: true,
    draggable: true,
  };

  static getTitle(data: any) {
    let title = data.name;
    if (!title && data.url) {
      const idx = data.url.lastIndexOf("/");
      title = data.url.substring(idx + 1);
    }
    return title || "Model";
  }

  static {
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

  upgradeData(data) {
    if (data.enableAnimation == null) {
      data.enableAnimation = Object.keys(data.animations || {}).length > 0;
    }
    return super.upgradeData(data);
  }
}
