import { DefaultComponentFactory } from "../../abstract/default-component-factory";

import { SplineFactory } from "../../../internal/spline";

import { SplineComponent } from "./spline-component";

/** @internal */
export class SplineComponentFactory extends DefaultComponentFactory<SplineComponent> {
    Type = SplineComponent;


    static info = {
        type: "spline",
        title: "Spline",
        image: "https://cyber.mypinata.cloud/ipfs/QmNd22NR8SKyVnEcsbNeiWArj8hA3r9sTtxcmVp8EF1HSE?filename=spline.png",
        description:
            "Series of points forming a smooth path for cameras, objects, and avatars",
        tipNeeded: true,
        draggable: true,
        transform: true,
    };

    static {
        //
        const defaultData = {
            id: "",
            kit: "cyber",
            type: "spline",
            name: "",
            url: "",
            mime_type: "",
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            color: "#ffffff",
            smoothness: 1000,
            points: [0, 0, 0, 3, 0, 3, -3, -3, 6, 3, 3, 9],
            closed: false,
            preset: null,
            lineWidth: 3,
            opacity: 1,
            display: false,
            followerOffsetVariation: { x: 0, y: 0, z: 0 },
            followerSpeed: 1,
            followerSpeedVariation: 0,
        };

        this.setDataConfig({
            defaultData,
        });
    }

    private splineFactory: SplineFactory = null;

    async init(opts) {
        this.splineFactory = new SplineFactory();

        return super.init(opts);
    }

    async createInstance(data) {
        if (this.Type == null) {
            throw new Error(
                "Type not set for default component factory " + this.info.type
            );
        }

        const instance = new SplineComponent({
            space: this.space,
            container: this.container,
            info: this.info,
            data,
            splineFactory: this.splineFactory,
        });

        await instance.onInit();

        return instance;
    }

    dispose() {
        super.dispose();

        this.splineFactory.disposeAll();

        this.splineFactory = null;
    }
}
