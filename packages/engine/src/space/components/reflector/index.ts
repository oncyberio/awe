import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { ReflectorComponent } from "./reflector-component";
import { normalMaps } from "./data";

export type { ReflectorComponentData } from "./reflector-data";

/** @internal */
export class ReflectorComponentFactory extends DefaultComponentFactory<ReflectorComponent> {
    //
    Type = ReflectorComponent;


    static info = {
        type: "reflector",
        title: "Reflector",
        image: "https://cyber.mypinata.cloud/ipfs/QmdPukshr3Xwe2vuNkaQYFt46LxLSpDnn2LKYF1Nxiiz36?filename=reflector.png",
        singleton: true,
        required: false,
        transform: {
            position: true,
            rotation: true,
        },
    };

    static {
        //
        const defaultData = {
            id: "reflector",
            kit: "cyber",
            type: "reflector",
            color: "#9fbada",
            position: { x: 0, y: 0.01, z: 0 },
            scale: { x: 1000, z: 1000 },
            opacity: 1,
            blur: true,
            normalmap: {
                enabled: false,
                strength: 0.5,
                tiles: 0.3,
                images: normalMaps.bump,
                customImage: null,
            },
            collider: {
                enabled: true,
                rigidbodyType: "FIXED",
                colliderType: "MESH",
            },
        };

        this.setDataConfig({
            defaultData,
        });
    }

    /** @internal */
    static validateCreation(config) {
        if (config.water != null) {
            return {
                success: false,
                message:
                    "You have already selected a water surface for your world.",
            };
        }

        return { success: true };
    }
}
