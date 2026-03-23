import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { WaveComponent } from "./wave-component";
import { WaveFactory } from "../../../internal/wave";

/**
 * @internal
 */
export class WaveComponentFactory extends DefaultComponentFactory<WaveComponent> {
  Type = WaveComponent;

  static info = {
    type: "wave",
    title: "Wave",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmWvKkHzUEX4P6WTPhY3exVyhMMz1kUJDPh19c3xyhtxJM",
    draggable: true,
  };

  static {
    // debugger;

    const defaultData = {
      kit: "cyber",
      type: "wave",
      name: "",

      position: {
        x: 0,
        y: 0,
        z: 0,
      },
      rotation: {
        x: 0,
        y: 0,
        z: 0,
      },

      height: 0.5,
      radius: 5,
      linewidth: 0.14,
      divisions: 100,
      lines: 4,
      direction: -1,
      color: "#ffffff",
      target: null,
    };

    this.setDataConfig({
      defaultData,
    });
  }

  private waveFactory: WaveFactory = null;

  async init(opts) {
    this.waveFactory = new WaveFactory();

    return super.init(opts);
  }

  async createInstance(data) {
    //
    if (this.Type == null) {
      throw new Error(
        "Type not set for default component factory " + this.info.type,
      );
    }

    const instance = new WaveComponent({
      space: this.space,
      container: this.container,
      info: this.info,
      data,
      waveFactory: this.waveFactory,
    });

    await instance.onInit();

    return instance;
  }

  dispose() {
    //
    super.dispose();

    this.waveFactory = null;
  }
}
