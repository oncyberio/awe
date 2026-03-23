import { FogComponent } from "./fog-component";
import { DefaultComponentFactory } from "../../abstract/default-component-factory";

export type { FogComponentData } from "./fog-data";

/** @internal */
export class FogComponentFactory extends DefaultComponentFactory<FogComponent> {
    //
    Type = FogComponent;


    static info = {
        type: "fog",
        title: "Fog",
        image: "https://cyber.mypinata.cloud/ipfs/QmWrn71XnFAnNSfiAZvR2yWuHmzWRnuWvzkBzbQqWi5KLE?filename=fog.png",
        help: {
            tip: "Tip: Fog can soften the hard edge of your World",
        },
        singleton: true,
        priority: 6,
        disableLock: true,
    };

    static {
        //
        const defaultData = {
            id: "fog",
            kit: "cyber",
            type: "fog",
            enabled: true,
            near: 300,
            far: 500,
            fadeColor: "#054d73",
        };

        this.setDataConfig({
            defaultData,
        });
    }
}
