import { AudioComponent } from "./audio-component";
import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { AudioLoader } from "./audio-loader";

/** @internal */
export class AudioComponentFactory extends DefaultComponentFactory<AudioComponent> {
  //
  Type = AudioComponent;

  audioLoader = new AudioLoader();

  static info = {
    type: "audio",
    title: "Audio",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmbDnBLeDaUUxw25hqq3Q2eLmfr8a2qKuw3snsnLzBMnUt",
    autoPlace: true,
    draggable: true,
    transform: true,
    is2D: true,
  } as const;

  static {
    //
    const defaultData = {
      id: "",
      kit: "cyber",
      type: "audio",
      name: "",
      url: "",
      mime_type: "audio/mpeg",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      volume: 1,
      loop: false,
      audioType: "ambient",
      audioRange: 3, // only for spatial audio
      autoPlay: false,
      playbackRate: 1,
      meta: {
        addedBy: "",
        placeholder: "",
      },
    };

    this.setDataConfig({
      defaultData,
    });
  }

  async createInstance(data) {
    const instance = new AudioComponent({
      space: this.space,
      container: this.container,
      info: this.info,
      data,
    });

    // @ts-ignore
    instance._loader = this.audioLoader;

    await instance.onInit();

    return instance;
  }

  upgradeData(data: any) {
    if (data.ambient && !data.audioType) {
      data.audioType = "ambient";
      delete data.ambient;
    }

    return super.upgradeData(data);
  }

  dispose(): void {
    this.audioLoader.dispose();
  }
}
