import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { DestinationComponent } from "./destination-component";

export type { DestinationComponentData } from "./destination-data";

/** @internal */
export class DestinationComponentFactory extends DefaultComponentFactory<DestinationComponent> {
  //
  Type = DestinationComponent;

  static info = {
    type: "destination",
    title: "Exhibition",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmPYmyzsMZdiYFVVLAAgoUTH3E5epD6pvaMtHa6ezmqfNu",
    singleton: true,
    hidden: false,
  };

  static {
    //[]
    const defaultData = {
      id: "destination",
      kit: "cyber",
      type: "destination",
      paths: {
        high: "",
        mid: "",
        low: "",
      },
      params: {
        artworkScale: 15,
      },
    };

    this.setDataConfig({
      defaultData,
    });
  }
}
