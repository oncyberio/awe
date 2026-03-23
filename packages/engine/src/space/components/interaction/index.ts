import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { InteractionComponent } from "./interaction-component";
import { InteractionFactory } from "../../../internal/interaction";

import { IS_MOBILE } from "../../../internal/constants";

/** @internal */
export class InteractionComponentFactory extends DefaultComponentFactory<InteractionComponent> {
    Type = InteractionComponent;

    static info = {
        type: "interaction",
        title: "Interaction",
        image: "/components/model.png",
    };

    static {
        // debugger;

        const defaultData = {
            kit: "cyber",
            type: "interaction",
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

            opacity: 1,

            scale: {
                x: 0.5,
                y: 0.5,
                z: 0.5,
            },
            atlas: IS_MOBILE ? "tap-outline" : "keyboard_e",
            distanceTarget: null,
            distance: 10,
            key: "KeyE",
            billboard: true,
        };

        this.setDataConfig({
            defaultData,
        });
    }

    private interactionFactory: InteractionFactory = null;

    async init(opts) {
        this.interactionFactory = InteractionFactory.instance;

        return super.init(opts);
    }

    async createInstance(data) {
        //
        if (this.Type == null) {
            throw new Error(
                "Type not set for default component factory " + this.info.type
            );
        }

        const instance = new InteractionComponent({
            space: this.space,
            container: this.container,
            info: this.info,
            data,
            interactionFactory: this.interactionFactory,
        });

        await instance.onInit();

        return instance;
    }

    dispose() {
        //
        super.dispose();

        this.interactionFactory.dispose();

        this.interactionFactory = null;
    }
}
