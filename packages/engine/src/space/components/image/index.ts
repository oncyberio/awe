import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { ImageFactory } from "../../../internal/media/image";
import { ImageComponent } from "./image-component";

/** @internal */
export class ImageComponentFactory extends DefaultComponentFactory<ImageComponent> {
    //
    Type = ImageComponent;


    static info = {
        type: "image",
        title: "Image",
        image: "https://cyber.mypinata.cloud/ipfs/QmRMDB3BLksFgLoiM1mWsvPiP1y3HTTFa9aGzVgL9MP9Fd",
        draggable: true,
        transform: true,
        is2D: true,
    };

    static {
        // debugger;

        const defaultData = {
            id: "",
            kit: "cyber",
            type: "image",
            name: "",
            url: "",
            mime_type: "",
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },

            hd: false,
            useMipMap: true,
            minFilter: "LinearMipmapLinearFilter",
            magFilter: "LinearFilter",
            opacity: 1,
            // border
            borderColor: "#000000",
            borderSize: 0.05,
            borderDepth: 0.1,
            borderOpacity: 1,
            hasBorder: false,

            meta: {
                addedBy: "",
                placeholder: "",
            },
        };

        this.setDataConfig({
            defaultData,
        });
    }

    private imageFactory: ImageFactory = null;

    async init(opts) {
        //
        this.imageFactory = new ImageFactory();

        return super.init(opts);
    }

    async createInstance(data) {
        //
        if (this.Type == null) {
            throw new Error(
                "Type not set for default component factory " + this.info.type
            );
        }

        const instance = new ImageComponent({
            space: this.space,
            container: this.container,
            info: this.info,
            data,
            imageFactory: this.imageFactory,
        });

        await instance.onInit();

        return instance;
    }

    dispose() {
        //
        super.dispose();

        this.imageFactory.disposeAll();

        this.imageFactory = null;
    }
}
