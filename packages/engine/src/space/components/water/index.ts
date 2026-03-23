import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { WaterComponent } from "./water-component";

/**
 * @internal
 */
export class WaterComponentFactory extends DefaultComponentFactory<WaterComponent> {
    //
    Type = WaterComponent;


    static info = {
        type: "water",
        title: "Water",
        image: "https://cyber.mypinata.cloud/ipfs/QmY6NtjH9oj1sJ8rSdzSDVH4R2ymadg7MLqbGrvAMbZuLa?filename=water.png",
        singleton: true,
        disableLock: true,
    };

    static {
        //
        const defaultData = {
            id: "water",
            kit: "cyber",
            type: "water",
            color: "#001E0F",
            opacity: 1,
            scale: { x: 1000, z: 1000 },
            position: { x: 0, y: 1, z: 0 },
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

    static validateCreation(config) {
        if (config.reflector != null) {
            return {
                success: false,
                message:
                    "You have already selected a reflector for your world.",
            };
        }

        return { success: true };
    }
}
