import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { TextComponent } from "./text-component";

import FontMeshFactory from "../../../internal/font";

/** @internal */
export class TextComponentFactory extends DefaultComponentFactory<TextComponent> {
    //
    Type = TextComponent;


    static info = {
        type: "text",
        title: "Text",
        image: "https://cyber.mypinata.cloud/ipfs/QmRpqVn3VWewraxYCEUfYKqQ8tyz8C1txLx8vEp3myJRRg?filename=text.png",
        draggable: true,
        transform: true,
        is2D: true,
        studioTab: "worldSettings",
    };

    static getTitle(data: any) {
        return (
            data.name ||
            data.text.slice(0, 10) + (data.text.length > 10 ? "..." : "")
        );
    }

    static {
        //
        const defaultData = {
            kit: "cyber",
            type: "text",
            name: "",
            text: "Placeholder",
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            align: "left",
            font: "aeonik-bold",
            lineHeight: 60,
            textColor: "#ffffff",
            textTransform: "none",
            width: 500,
            opacity: 1,
            meta: {
                addedBy: "",
                placeholder: null,
            },
        };

        this.setDataConfig({
            defaultData,
        });
    }

    dispose() {
        FontMeshFactory.dispose();
    }
}
