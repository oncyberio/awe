import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { Assets } from "../../../internal/resources/assets";
import {
  AvatarComponentHeadless,
  type AvatarBBoxCache,
} from "./avatar-component-headless";

/** @internal */
export class AvatarComponentFactoryHeadless extends DefaultComponentFactory<AvatarComponentHeadless> {
  static info = {
    type: "avatar",
    title: "Avatar",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmckGHe9wkas8fid4weNqL8kpSviW3Q8emeQtwJoVbWFzj?filename=avatar.png",
    draggable: true,
    transform: true,
  } as const;

  static {
    const defaultData = {
      id: "",
      kit: "cyber",
      type: "avatar",
      name: "",

      url: Assets.vrms.sunshine,

      picture: "",

      awaitAvatarLoading: true,
      awaitPictureLoading: true,
      awaitLoaderThrottle: 0,

      text: "",
      nameDisplayWithPicture: true,
      animation: "IDLE",

      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      plugins: [],
      renderMode: "default",
      useCpuAnimation: false,
      opacity: 1,
      ignoreLOD: false,
    };

    this.setDataConfig({
      defaultData,
      valuePaths: ["plugins"],
    });
  }

  private _bboxCache: Map<string, AvatarBBoxCache> = new Map();

  async init(opts: any) {
    this.space = opts.space;
  }

  async createInstance(data: any) {
    const instance = new AvatarComponentHeadless({
      space: this.space,
      container: this.container,
      info: this.info,
      data,
      bboxCache: this._bboxCache,
    });

    await instance.onInit();

    return instance;
  }

  dispose() {
    this._bboxCache.clear();
  }
}
