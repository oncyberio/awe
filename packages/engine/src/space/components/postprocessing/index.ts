import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { POST_PROCESSINGS, POST_TYPES } from "./data";
import { PostProcessingComponent } from "./post-pro-component";

export type { PostProcessingComponentData } from "./post-pro-data";

/** @internal */
export class PostProComponentFactory extends DefaultComponentFactory<PostProcessingComponent> {
    //
    Type = PostProcessingComponent;


    static info = {
        type: "postprocessing",
        title: "Filters",
        image: "https://cyber.mypinata.cloud/ipfs/QmUngiVamm1DRTfXnLnvWVrtigSkZ8QfiQJow6xCnPvt8F?filename=filters.png",
        help: {
            desc: "Add a filter to your entire world.  Choose between one of our presets or upload your own.",
        },
        singleton: true,
        required: false,
        disableLock: true,
    };

    static {
        //
        const defaultData = {
            id: "postprocessing",
            kit: "cyber",
            type: "postprocessing",

            enabled: true,
            postProType: POST_TYPES.BLOOM,
            bloomOpts: POST_PROCESSINGS.Bloom.opts,
            lutOpts: POST_PROCESSINGS.LookUpTable.opts,
            tvOpts: POST_PROCESSINGS.TV.opts,
            trippyOpts: POST_PROCESSINGS.Trippy.opts,
        };

        this.setDataConfig({
            defaultData,
        });
    }
}
