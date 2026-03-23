import { DefaultComponentFactory } from "../../abstract/default-component-factory";

import { VideoComponent } from "./video-component";
import { VideoFactory } from "../../../internal/media/video";

/** @internal */
export class VideoComponentFactory extends DefaultComponentFactory<VideoComponent> {
  Type = VideoComponent;

  static info = {
    type: "video",
    title: "Video",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmXTXCGaXGBxivCpdDNZQEx1qeCaTx1JmtbSUEhgCFJFCD",
    transform: true,
    draggable: true,
    is2D: true,
  };

  static {
    // debugger;
    const defaultData = {
      id: "",
      kit: "cyber",
      type: "video",
      name: "",
      url: "",
      mime_type: "",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },

      // border
      borderColor: "#000000",
      borderSize: 0.05,
      borderDepth: 0.1,
      borderOpacity: 1,
      hasBorder: false,

      opacity: 1,
      volume: 1,
      audioType: "spatial", // ambient, spatial
      audioRange: 3,
      autoPlay: false,
      displayMode: "flat",
      curvedAngle: Math.PI / 4,
      muted: false,
      meta: {
        addedBy: "",
        placeholder: "",
      },
    };

    this.setDataConfig({
      defaultData,
    });
  }

  private videoFactory: VideoFactory = null;

  async init(opts) {
    this.videoFactory = new VideoFactory();

    return super.init(opts);
  }

  async createInstance(data) {
    if (this.Type == null) {
      throw new Error(
        "Type not set for default component factory " + this.info.type,
      );
    }

    const instance = new VideoComponent({
      space: this.space,
      container: this.container,
      info: this.info,
      data,
      videoFactory: this.videoFactory,
    });

    await instance.onInit();

    return instance;
  }

  dispose() {
    super.dispose();

    this.videoFactory.disposeAll();

    this.videoFactory = null;
  }
}
