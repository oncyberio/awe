import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { BatchComponent } from "./batch-component";
// import { BirdFactory } from "../../../internal/bird";

// import { DefaultComponentFactory } from "../../abstract/default-component-factory";
// import { PlatformComponent } from "./platformcomponent";
// import { PlatformFactory } from "engine/internal/platform";

/**
 * @internal
 */
export class BatchComponentFactory extends DefaultComponentFactory<BatchComponent> {
    /** @internal */
    Type = BatchComponent;

    /** @internal */
    static info = {
        type: "batch",
        title: "Batch",
        image: "https://cyber.mypinata.cloud/ipfs/QmNXXDpHzigkpD9vwPYDcF8mi7zvY4z953mC92ak2aVmec?filename=batch.png",
        description: "Groups rendering tasks to boost performances",
        studioTab: "worldSettings",
        tipNeeded: true,
        batchDraw: false,
    };

    static {
        //
        const defaultData = {
            kit: "cyber",
            type: "batch",
            name: "",
            positions: [],
            rotations: [],
            scales: [],
            useOctreeSorting: true,
            useTransparency: false,
            preset: null,
            debug: false,
        };

        this.setDataConfig({
            defaultData,
            valuePaths: ["positions", "rotations", "scales", "preset"],
        });
    }

    /** @internal */
    async init(opts) {
        return super.init(opts);
    }

    /** @internal */
    async createInstance(data) {
        //
        if (this.Type == null) {
            throw new Error(
                "Type not set for default component factory " + this.info.type
            );
        }

        const instance = new BatchComponent({
            space: this.space,
            container: this.container,
            info: this.info,
            data,
        });

        await instance.onInit();

        return instance;
    }

    /** @internal */
    dispose() {
        super.dispose();
    }
}
