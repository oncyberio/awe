import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { ImageFactory } from "../../../internal/media/image";
import { IframeComponent } from "./iframe-component";


/** @internal */
export class IframeComponentFactory extends DefaultComponentFactory<IframeComponent> {
    //
    Type = IframeComponent;


    static info = {
        type: "iframe",
        title: "Iframe",
        image: "https://cyber.mypinata.cloud/ipfs/Qmc4CdgczeQ7hAj8dAtFiFgPUuDE2zntmoRC2TvWuiDLCm?filename=iframe.png",
        draggable: true,
        transform: true,
        is2D: true,
        studioTab: "worldSettings",
    };

    static {
        // debugger;

        const defaultData = {
            id: "",
            kit: "cyber",
            type: "iframe",
            name: "",
            url: "https://docs.oncyber.io/",
            mime_type: "",
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 16, y: 9, z: 1 },
            opacity: 1,

            // border
            borderColor: "#000000",
            borderSize: 0.05,
            borderDepth: 0.1,
            borderOpacity: 1,
            hasBorder: false,

            youtubeOpts: {
                autoPlay: true,
                audioType: "ambient",
                audioRange: 3,
                volume: 1,
            },
            display: true,
            meta: {
                addedBy: "",
                placeholder: "",
            },
            collider: {
                enabled: true,
                sensor: true,
                rigidbodyType: "KINEMATIC",
                colliderType: "CUBE",
            },
        };

        this.setDataConfig({
            defaultData,
        });
    }

    //private imageFactory: ImageFactory = null;

    async init(opts) {
        //
        // this.imageFactory = new ImageFactory();

        return super.init(opts);
    }

    async createInstance(data) {
        //
        if (this.Type == null) {
            throw new Error(
                "Type not set for default component factory " + this.info.type
            );
        }

        const instance = new IframeComponent({
            space: this.space,
            container: this.container,
            info: this.info,
            data,
            // imageFactory: this.imageFactory,
        });

        await instance.onInit();

        return instance;
    }

    dispose() {
        //
        super.dispose();
    }
}
