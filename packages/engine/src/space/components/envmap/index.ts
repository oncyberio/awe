import { COMPONENT_PRIORITY } from "../../abstract/component-factory";
import { EnvmapComponent } from "./envmap-component";
import { envmaps } from "./data";
import { DefaultComponentFactory } from "../../abstract/default-component-factory";

export type { EnvmapComponentData, EnvmapOptions } from "./envmap-data";

/** @internal */
export class EnvmapComponentFactory extends DefaultComponentFactory<EnvmapComponent> {
    //
    Type = EnvmapComponent;


    static info = {
        type: "envmap",
        title: "Envmap",
        image: "https://cyber.mypinata.cloud/ipfs/QmNtLjmgPjgEXcoEAzyxGv5qH6K6Q38EMDGceR5PTT91HN?filename=envmap.png",
        description: "Simulates realistic backgrounds and surroundings",
        tipNeeded: true,
        singleton: true,
        required: true,
        draggable: false,
        priority: COMPONENT_PRIORITY.LOW,
    };

    static {
        //
        const defaultData = {
            id: "envmap",
            kit: "cyber",
            type: "envmap",
            options: {
                type: "scene",
            },
        };

        this.setDataConfig({
            defaultData,
        });
    }
}
