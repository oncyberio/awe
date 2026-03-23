import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { VRMAnimsComponent } from "./vrm-anims-component";

/** @internal */
export class VRMAnimsComponentFactory extends DefaultComponentFactory<VRMAnimsComponent> {
    //
    Type = VRMAnimsComponent;


    static info = {
        type: "vrm-anims",
        title: "Avatar animations",
        image: "https://cyber.mypinata.cloud/ipfs/QmNz4BsKXy37omp8tpvmdZFANsw5d98K3S5nes16HHkYi5?filename=avatar-animation.png",
        help: {
            desc: "A tool to customize avatar animations",
        },
        description: "A tool to customize avatar animations",
        tipNeeded: true,
        singleton: true,
        required: false,
        priority: 1,
        disableLock: true,
    };

    static {
        // const pos  = Component3D.getInitDefaultPosition()

        const defaultData = {
            id: "vrm-anims",
            kit: "cyber",
            type: "vrm-anims",
            anims: {}, // { [id] : { fileName: string, name: string, loop: boolean, timeScale: number } }
            url: null,
        };

        this.setDataConfig({
            defaultData,
            valuePaths: ["anims"],
        });
    }
}
