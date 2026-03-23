import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { ParticlesComponent } from "./particles-component";


// Register all built-in particle behaviors
import "./behaviors";

/** @internal */
export class ParticlesComponentFactory extends DefaultComponentFactory<ParticlesComponent> {
  //
  Type = ParticlesComponent;


  static info = {
    type: "particles",
    title: "particles",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmYzQWNkreX2MrypGBWPEUzWLxA2BLjGhegxvZrAq9CLUC",
    hidden: true,
    draggable: true,
    transform: true,
    studioTab: "worldSettings",
  };

  static {
    const defaultData = {
      id: "",
      kit: "cyber",
      type: "particles",
      name: "",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      primitive: "plane",
      billboard: true,
      lifeSpan: 5,
      autoSpawn: true,
      autoSpawnRate: 10,
      perpetualLife: false,
      instantSpawn: false,
      maximumSpawn: 100,
      attachToSource: false,
      useSourceRotation: false,
      useSourceScale: false,
      shadowCast: false,
      receiveShadow: false,
      source: null,
      behaviors: [],
    };

    this.setDataConfig({
      defaultData,
      valuePaths: ["behaviors"],
    });
  }

  async init(opts) {
    //
    return super.init(opts);
  }

  async createInstance(data) {
    //
    if (this.Type == null) {
      throw new Error(
        "Type not set for default component factory " + this.info.type,
      );
    }

    const instance = new ParticlesComponent({
      space: this.space,
      container: this.container,
      info: this.info,
      data,
    });

    await instance.onInit();

    return instance;
  }

  dispose() {
    //
    super.dispose();
  }
}
