import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { NavmeshComponent } from "./navmesh-component";
import { getDefaultParams } from "./data";

export type { NavmeshComponentData, NavmeshParams } from "./navmesh-data";

/** @internal */
export class NavmeshComponentFactory extends DefaultComponentFactory<NavmeshComponent> {
    //
    Type = NavmeshComponent;


    static info = {
        type: "navmesh",
        title: "Navmesh",
        image: "https://cyber.mypinata.cloud/ipfs/QmUvrG68Hf3FYXfPXcWtsAN27B4k9EJoXeaxvMhdbRckRU?filename=navmesh.png",
        transform: true,
        disableLock: true,
        studioTab: "worldSettings",
    };

    static {
        //
        const defaultData = {
            id: "navmesh",
            kit: "cyber",
            type: "navmesh",
            position: { x: 0, y: 0, z: 0 },
            scale: { x: 10, y: 10, z: 10 },
            params: getDefaultParams(),
            exclude: "",
            include: "",
            url: "",
        };

        this.setDataConfig({
            defaultData,
        });
    }
}
