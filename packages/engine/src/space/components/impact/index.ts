import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { ImpactComponent } from "./impact-component";
import { ImpactFactory } from "../../../internal/impact";

/** @internal */
export class ImpactComponentFactory extends DefaultComponentFactory<ImpactComponent> {
  //
  Type = ImpactComponent;

  private impactFactory: ImpactFactory = null;

  static info = {
    type: "impact",
    title: "Impact",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmeHbpcFbaNChzbYFY8xvJRETCmQtWe4oUQrmFkG7hqt3w",
  };

  async init(opts) {
    this.impactFactory = new ImpactFactory();

    return super.init(opts);
  }

  async createInstance(data) {
    //
    if (this.Type == null) {
      throw new Error(
        "Type not set for default component factory " + this.info.type,
      );
    }

    const instance = new ImpactComponent({
      space: this.space,
      container: this.container,
      info: this.info,
      data,
      impactFactory: this.impactFactory,
    });

    await instance.onInit();

    return instance;
  }

  async addInstance(data) {
    const instance = await this.createInstance(data);

    //this.container.add(instance);

    return instance;
  }

  static {
    const defaultData = {
      id: "",
      kit: "cyber",
      type: "impact",
    };

    this.setDataConfig({
      defaultData,
    });
  }
}
