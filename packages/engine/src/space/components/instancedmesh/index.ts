import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { InstancedMeshComponent } from "./instanced-mesh-component";
import { InstancedMeshFactory } from "../../../internal/instancedmesh";

// import { DefaultComponentFactory } from "../../abstract/default-component-factory";
// import { PlatformComponent } from "./platformcomponent";
// import { PlatformFactory } from "engine/internal/platform";

/**
 * @internal
 */
export class InstancedMeshComponentFactory extends DefaultComponentFactory<InstancedMeshComponent> {
    Type = InstancedMeshComponent;

    instancedMeshFactory: InstancedMeshFactory = null;

    static info = {
        type: "instancedmesh",
        title: "instancedmesh",
        image: "/components/model.png",
    };

    static {
        // debugger;

        const defaultData = {
            kit: "cyber",
            type: "instancedmesh",
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
                y: 1,
                z: 1,
            },
            useFrustumCulling: true,

            useSorting: true
        };

        this.setDataConfig({
            defaultData,
        });
    }

    async init(opts) {
        this.instancedMeshFactory = new InstancedMeshFactory();

        return super.init(opts);
    }

    async createInstance(data) {
        //
        if (this.Type == null) {
            throw new Error(
                "Type not set for default component factory " + this.info.type
            );
        }

        const instance = new InstancedMeshComponent({
            space: this.space,
            container: this.container,
            info: this.info,
            data,
            instancedMeshFactory: this.instancedMeshFactory,
        });

        await instance.onInit();

        return instance;
    }

    dispose() {
        //
        super.dispose();
    }
}
