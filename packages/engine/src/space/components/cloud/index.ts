import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { CloudComponent } from "./cloud-component";
import { CloudFactory } from "../../../internal/cloud";

/**
 * @internal
 */
export class CloudComponentFactory extends DefaultComponentFactory<CloudComponent> {
  Type = CloudComponent;

  static info = {
    type: "cloud",
    title: "Cloud",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmWCyBSPXH34DmRedQUuGvUENtfABu6dc8KmcXDmq1Gpbq",
    singleton: false,
    required: false,
    priority: 11,
    transform: true,
  };

  static {
    // debugger;

    const defaultData = {
      kit: "cyber",
      type: "cloud",
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

      opacity: 1,

      scale: {
        x: 1,
        y: 1,
        z: 1,
      },
      atlas: 0,
    };

    this.setDataConfig({
      defaultData,
    });
  }

  private cloudFactory: CloudFactory = null;

  async init(opts) {
    this.cloudFactory = new CloudFactory();

    return super.init(opts);
  }

  async createInstance(data) {
    //
    if (this.Type == null) {
      throw new Error(
        "Type not set for default component factory " + this.info.type,
      );
    }

    const instance = new CloudComponent({
      space: this.space,
      container: this.container,
      info: this.info,
      data,
      cloudFactory: this.cloudFactory,
    });

    await instance.onInit();

    return instance;
  }

  dispose() {
    //
    super.dispose();

    this.cloudFactory = null;
  }
}
