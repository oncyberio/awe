import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { BirdComponent } from "./bird-component";
import { BirdFactory } from "../../../internal/bird";

// import { DefaultComponentFactory } from "../../abstract/default-component-factory";
// import { PlatformComponent } from "./platformcomponent";
// import { PlatformFactory } from "engine/internal/platform";

/** @internal */
export class BirdComponentFactory extends DefaultComponentFactory<BirdComponent> {
    //
    Type = BirdComponent;


    /** @internal */
    static info = {
        type: "bird",
        title: "Bird",
        image: "https://cyber.mypinata.cloud/ipfs/QmdCDUBBPQApgDNLZHZH5BKaGoJ1zDjgC3T2V7tBhGUzsH?filename=butterfly.png",
        transform: true,
        draggable: true,
        studioTab: "worldSettings",
    };

    static {
        // debugger;

        const defaultData = {
            kit: "cyber",
            type: "bird",
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
            scale: {
                x: 1,
                y: 1,
                z: 1,
            },
            opacity: 1,

            color: 0xffffff,
        };

        this.setDataConfig({
            defaultData,
        });
    }

    private birdFactory: BirdFactory = null;

    /** @internal */
    async init(opts) {
        this.birdFactory = new BirdFactory();

        return super.init(opts);
    }

    /** @internal */
    async createInstance(data) {
        //
        if (this.Type == null) {
            throw new Error(
                "Type not set for default component factory " + this.info.type
            );
        }

        const instance = new BirdComponent({
            space: this.space,
            container: this.container,
            info: this.info,
            data,
            birdFactory: this.birdFactory,
        });

        await instance.onInit();

        return instance;
    }

    /** @internal */
    dispose() {
        //
        super.dispose();

        this.birdFactory = null;
    }
}
