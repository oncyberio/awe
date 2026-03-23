import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { GodrayComponent } from "./godray-component";
import { GodrayFactory } from "../../../internal/godray";

// import { DefaultComponentFactory } from "../../abstract/default-component-factory";
// import { PlatformComponent } from "./platformcomponent";
// import { PlatformFactory } from "engine/internal/platform";

/** @internal */
export class GodrayComponentFactory extends DefaultComponentFactory<GodrayComponent> {
    //
    /** @internal */
    Type = GodrayComponent;

    /** @internal */

    /** @internal */
    static info = {
        type: "godray",
        title: "Godray",
        image: "https://cyber.mypinata.cloud/ipfs/QmYCMkRiYvwEHW2SSLgmASSxP8FpGRZ8hep5dEUDGecqeV?filename=godray.png",
        draggable: true,
        transform: true,
        studioTab: "worldSettings",
    };

    static {
        // debugger;

        const defaultData = {
            kit: "cyber",
            type: "godray",
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
                y: 10,
                z: 1,
            },
            opacity: 1,

            color: 0xffffff,
        };

        this.setDataConfig({
            defaultData,
        });
    }

    private godrayFactory: GodrayFactory = null;

    /** @internal */
    async init(opts) {
        this.godrayFactory = new GodrayFactory();

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

        const instance = new GodrayComponent({
            space: this.space,
            container: this.container,
            info: this.info,
            data,
            godrayFactory: this.godrayFactory,
        });

        await instance.onInit();

        return instance;
    }

    /** @internal */
    dispose() {
        //
        super.dispose();

        this.godrayFactory = null;
    }
}
