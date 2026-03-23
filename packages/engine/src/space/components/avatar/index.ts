import { AvatarComponent } from "./avatar-component";
import { AvatarFactory } from "../../../internal/avatar";
import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import VRMAnimation from "../../../internal/avatar/vrm/animations";
import { Assets } from "../../../internal/resources/assets";
import { IS_EDIT_MODE } from "../../../internal/constants";

/** @internal */
export class AvatarComponentFactory extends DefaultComponentFactory<AvatarComponent> {
    //
    static getTitle(data: any) {
        let title = data.name;
        if (!title) {
            // strip name from url
            const idx = data.url.lastIndexOf("/");
            title = data.url.substring(idx + 1);
        }
        return title;
    }

    Type = AvatarComponent;


    private avatarFactory: AvatarFactory = null;

    static info = {
        type: "avatar",
        title: "Avatar",
        image: "https://cyber.mypinata.cloud/ipfs/QmckGHe9wkas8fid4weNqL8kpSviW3Q8emeQtwJoVbWFzj?filename=avatar.png",
        draggable: true,
        transform: true,
        //batchDraw: false,
    } as const;

    static {
        const defaultData = {
            id: "",
            kit: "cyber",
            type: "avatar",
            name: "",

            url: Assets.vrms.sunshine,

            picture: "",

            awaitAvatarLoading: true,
            awaitPictureLoading: true,
            awaitLoaderThrottle: 0,

            text: "",
            nameDisplayWithPicture: true,
            animation: "IDLE",
            // avatarScale: 1,

            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            plugins: [],
            renderMode: "default",
            useCpuAnimation: false,
            opacity: 1,
            ignoreLOD: false,
        };

        this.setDataConfig({
            defaultData,
            valuePaths: ["plugins"],
        });
    }

    // async init(opts) {
    //     this.modelFactory = new ModelFactory();

    //     return super.init(opts);
    // }

    async createInstance(data) {
        if (this.Type == null) {
            throw new Error(
                "Type not set for default component factory " + this.info.type
            );
        }

        const runtime = this.space.options?.runtime ?? "web";
        if (runtime === "headless") {
            data.useCpuAnimation = true;
        }

        const instance = new AvatarComponent({
            space: this.space,
            container: this.container,
            info: this.info,
            data,
            avatarFactory: this.avatarFactory,
        });

        await instance.onInit();

        return instance;
    }


    async init(opts) {
        // debugger;

        this.space = opts.space;

        this.avatarFactory = new AvatarFactory();

        this.space.add(this.avatarFactory);

        // if there's no custom animation, load the default one
        if (!VRMAnimation.hasAnimations) {
            //
            const defaultAnims = await VRMAnimation.loadDefault();

            VRMAnimation.setAnimationJSON(defaultAnims.anims);
        }
    }

    dispose() {
        this.avatarFactory.dispose();
    }
}
