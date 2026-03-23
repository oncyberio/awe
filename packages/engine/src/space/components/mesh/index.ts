import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { MeshComponent } from "./mesh-component";

/** @internal */
export class MeshComponentFactory extends DefaultComponentFactory<MeshComponent> {
  //
  Type = MeshComponent;


  static info = {
    type: "mesh",
    title: "Mesh",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmUvrG68Hf3FYXfPXcWtsAN27B4k9EJoXeaxvMhdbRckRU?filename=navmesh.png",
    help: {
      desc: "A utility primitive shape mesh",
    },
    description: "A utility primitive shape mesh",
    tipNeeded: true,
    draggable: true,
    transform: true,
  };

  static {
    //
    const defaultData = {
      kit: "cyber",
      name: "",
      comment: "",
      type: "mesh",
      renderMode: "default",
      wireframe: false,
      castShadow: true,
      receiveShadow: true,
      geometry: {
        type: "box",
        boxParams: {},
        sphereParams: {
          radius: 1,
          widthSegments: 32,
          heightSegments: 32,
        },
        cylinderParams: {
          radiusTop: 1,
          radiusBottom: 1,
          height: 1,
          radialSegments: 32,
          heightSegments: 1,
          openEnded: false,
        },
      },
      color: "#ffffff",
      image: "",
      opacity: 1,
      plugins: [],
      scale: { x: 1, y: 1, z: 1 },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      display: true,
      displayInEditor: true,
    };

    this.setDataConfig({
      defaultData,
      valuePaths: ["plugins"],
    });
  }

  static getTitle(data: any) {
    return data.name || data.geometry?.type;
  }
}
