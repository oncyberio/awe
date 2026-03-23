import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { ObjectComponent } from "./object-component";

/** @internal */
export class ObjectComponentFactory extends DefaultComponentFactory<ObjectComponent> {
    //
    Type = ObjectComponent;

    static info = {
        type: "object",
        title: "Game Object",
        image: "/components/mesh.png",
        help: {
            desc: "Add an empty game object to the scene. You can attach a script to it to add behavior.",
        },
        transform: true,
    };

    static getTitle(data: any) {
        return data.name;
    }

    static {
        //
        const defaultData = {
            kit: "cyber",
            type: "object",
        };

        this.setDataConfig({
            defaultData,
        });
    }
}
