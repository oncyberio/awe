import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { DialogComponent } from "./dialog-component";
import { DialogFactory } from "../../../internal/dialog";

/** @internal */
export class DialogComponentFactory extends DefaultComponentFactory<DialogComponent> {
    Type = DialogComponent;

    static info = {
        type: "dialog",
        title: "Dialog",
        image: "/components/model.png",
    };

    static {
        // debugger;

        const defaultData = {
            kit: "cyber",
            type: "dialog",
            name: "",
            billboard: true,
            backgroundOpacity: 1,
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
        };

        this.setDataConfig({
            defaultData,
        });
    }

    private dialogFactory: DialogFactory = null;

    async init(opts) {
        this.dialogFactory = new DialogFactory();

        return super.init(opts);
    }

    async createInstance(data) {
        //
        if (this.Type == null) {
            throw new Error(
                "Type not set for default component factory " + this.info.type
            );
        }

        const instance = new DialogComponent({
            space: this.space,
            container: this.container,
            info: this.info,
            data,
            dialogFactory: this.dialogFactory,
        });

        await instance.onInit();

        return instance;
    }

    dispose() {
        //
        super.dispose();

        this.dialogFactory.disposeAll();

        this.dialogFactory = null;
    }
}
