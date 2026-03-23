import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { RainComponent } from "./rain-component";

export type { RainComponentData } from "./rain-data";

/** @internal */
export class RainComponentFactory extends DefaultComponentFactory<RainComponent> {
    //
    Type = RainComponent;

    static info = {
        type: "rain",
        title: "Rain",
        image: "https://cyber.mypinata.cloud/ipfs/QmPFNnYC2jXH1BQubSoremAJhwhSxwJ5vpAEFjEPLF18Ps?filename=rain.png",
        singleton: true,
        disableLock: true,
    };

    static {
        //
        const defaultData = {
            id: "rain",
            kit: "cyber",
            type: "rain",
            intensity: 0.5,
        };

        this.setDataConfig({
            defaultData,
        });
    }
}
