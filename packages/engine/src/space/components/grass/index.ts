import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { GrassComponent } from "./grass-component";
import { GrassFactory } from "../../../internal/grass";

// import { DefaultComponentFactory } from "../../abstract/default-component-factory";
// import { PlatformComponent } from "./platformcomponent";
// import { PlatformFactory } from "engine/internal/platform";

/** @internal */
export class GrassComponentFactory extends DefaultComponentFactory<GrassComponent> {
    Type = GrassComponent;

    static info = {
        type: "grass",
        title: "Grass",
        draggable: true,
        image: "https://cyber.mypinata.cloud/ipfs/QmPBH7vfhVDPgRMA9yC4znQ9SKHCEYXb93pZiyQdzMAP2y?filename=iframe.png",
        studioTab: "worldSettings",
    };

    static {
        // debugger;

        const defaultData = {
            kit: "cyber",
            type: "grass",
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
                x: 5,
                y: 5,
                z: 5,
            },

            color: 0xffffff,

            uTipColor1: 0x9bd38d,
            uTipColor2: 0x1f352a,
            uBaseColor: 0x313f1b,
            uTipColor3: 0x82c2a3,
            uTipColor4: 0x1f352a,
            uBaseColor2: 0x313f1b,
            colorRepartition: 0.5,
        };

        this.setDataConfig({
            defaultData,
        });
    }

    private grassFactory: GrassFactory = null;

    async init(opts) {
        //
        this.grassFactory = new GrassFactory();

        await this.grassFactory.preload({
            parent: this.space,
        });

        return super.init(opts);
    }

    async createInstance(data) {
        //
        if (this.Type == null) {
            throw new Error(
                "Type not set for default component factory " + this.info.type
            );
        }

        const instance = new GrassComponent({
            space: this.space,
            container: this.container,
            info: this.info,
            data,
            grassFactory: this.grassFactory,
        });

        await instance.onInit();

        return instance;
    }

    dispose() {
        //
        super.dispose();

        this.grassFactory = null;
    }
}
