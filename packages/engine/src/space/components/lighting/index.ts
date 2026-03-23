import { LightingComponent } from "./lighting-component";
import { DefaultComponentFactory } from "../../abstract/default-component-factory";

export type { LightingComponentData } from "./lighting-data";

/** @internal */
export class LightingComponentFactory extends DefaultComponentFactory<LightingComponent> {
  //
  Type = LightingComponent;

  static info = {
    type: "lighting",
    title: "Lighting",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmS5LxCrxXFhbCzi9Ena9fKHTjV18mri9TJ81NZrg3MMvv?filename=lighting.png",
    help: {
      desc: "Adjust the light to change shadows in your world",
    },
    description: "Adjust the light to change shadows in your world",
    tipNeeded: true,
    singleton: true,
    required: true,
  };

  static {
    //
    const defaultData = {
      id: "lighting",
      kit: "cyber",
      type: "lighting",

      enabled: true,
      lightDirection: { x: -1, y: -1, z: -1 },
      lightPosition: { x: 200, y: 200, z: 200 },
      bias: -0.002,
      near: 139.4,
      far: 513,
      intensity: 1,
      size: 100,
    };

    this.setDataConfig({
      defaultData,
    });
  }
}
