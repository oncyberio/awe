import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { CameraComponent } from "./camera-component";
import { CameraFactory } from "../../../internal/camera";

// import { DefaultComponentFactory } from "../../abstract/default-component-factory";
// import { PlatformComponent } from "./platformcomponent";
// import { PlatformFactory } from "engine/internal/platform";

/** @internal */
export class CameraComponentFactory extends DefaultComponentFactory<CameraComponent> {
    Type = CameraComponent;

    static info = {
        type: "camera",
        title: "Camera",
        image: "https://cyber.mypinata.cloud/ipfs/QmSTnsJqN5NdX3UBic6mGeubtkEEnTeNhauVtfqUWUyYh4?filename=camera.png",
        studioTab: "worldSettings",
        description: "Fixed-position or spline-following camera",
        tipNeeded: true,
        singleton: false,
        draggable: true,
        required: false,
        priority: 11,
    };

    static {
        //
        const defaultData = {
            kit: "cyber",
            type: "camera",
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
            previewSize: 256,
            toggleHelper: false,
            togglePreview: false,
            previewRatio: 4 / 3,
            splineDuration: 5,
            splineProgression: 0,
            behavior: "free",
            naturalMovement: false,
            naturalMovementForce: 0.5,
            fov: 60,
        };

        this.setDataConfig({
            defaultData,
        });
    }

    private cameraFactory: CameraFactory = null;

    async init(opts) {
        this.cameraFactory = new CameraFactory();

        return super.init(opts);
    }

    async createInstance(data) {
        //
        if (this.Type == null) {
            throw new Error(
                "Type not set for default component factory " + this.info.type
            );
        }

        const instance = new CameraComponent({
            space: this.space,
            container: this.container,
            info: this.info,
            data,
            cameraFactory: this.cameraFactory,
        });

        await instance.onInit();

        return instance;
    }

    dispose() {
        //
        super.dispose();

        this.cameraFactory = null;
    }
}
