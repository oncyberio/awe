import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { GroupComponent } from "./group-component";

/** @internal */
export class GroupComponentFactory extends DefaultComponentFactory<GroupComponent> {
  //
  Type = GroupComponent;

  static info = {
    type: "group",
    title: "Group",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmeHbpcFbaNChzbYFY8xvJRETCmQtWe4oUQrmFkG7hqt3w",
    transform: true,
  };

  static {
    //
    const defaultData = {
      id: "",
      name: "",
      type: "group",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };

    this.setDataConfig({
      defaultData,
    });
  }
}
