import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { DustComponent } from "./dust-component";

/** @internal */
export class DustComponentFactory extends DefaultComponentFactory<DustComponent> {
  //
  Type = DustComponent;

  static info = {
    type: "dust",
    title: "Dust",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmWH25ux4LFXSNiBT6n4tmRWr1ciVLUYR7stCPw51SBvEz",
  };

  static {
    //
    const defaultData = {
      id: "",
      kit: "cyber",
      type: "dust",

      spawnDistance: 2,
      decaySpeed: 1.5,
      randomXZ: 0.9,
      spawnSource: {
        x: 0,
        y: 0,
        z: 0,
      },
      scale: 1,
      condition: null,
      target: null,
    };

    this.setDataConfig({
      defaultData,
    });
  }
}
