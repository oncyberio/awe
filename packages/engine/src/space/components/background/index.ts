import { BackgroundComponent } from "./background-component";
import { presetImages } from "./data";
import { DefaultComponentFactory } from "../../abstract/default-component-factory";

/** @internal */
export class BackgroundComponentFactory extends DefaultComponentFactory<BackgroundComponent> {
  //
  Type = BackgroundComponent;


  static info = {
    type: "background",
    title: "Sky",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmZQy9vvsE1AQCVc1dUd5DgW69qpekMJt7Go1uN1gY85Yi?filename=sky.png",
    help: {
      desc: "Set the Background as one of our presets or upload your own.",
    },
    required: true,
    singleton: true,
    priority: 4,
  };

  static {
    //
    const defaultData = {
      id: "background",
      kit: "cyber",
      type: "background",
      options: {
        type: "color",
        color: "#000000",
      },
    };

    this.setDataConfig({
      defaultData,
    });
  }
}
