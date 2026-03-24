import { Box3, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { Component3D } from "../../abstract/component-3d";
import { Subsystems } from "../../../internal/subsystems";
import { buildCollisionMeshFromScene } from "../../../internal/media/model/build-collision-mesh";
import type { ModelComponentData } from "./model-data";

export type { ModelComponentData } from "./model-data";

/**
 * @internal
 *
 * Headless model component — geometry and collision only, no rendering.
 */
export class ModelComponentHeadless extends Component3D<ModelComponentData> {
  private _collision: Mesh = null;
  private _center = new Vector3();
  private _centerBox = new Box3();

  /** @internal */
  protected async init() {
    const url = this._resolveUrl();
    const gltf = await Subsystems.gltf.loadGLTF(url);

    const mesh = buildCollisionMeshFromScene(gltf.scene);

    if (mesh) {
      if (this.data.center === true) {
        this._centerBox.setFromObject(mesh);
        this._centerBox.getCenter(this._center);
        mesh.position.sub(this._center);
      }

      mesh.visible = false;
      this.add(mesh);
      this._collision = mesh;
    }
  }

  private _resolveUrl(): string {
    if (this.data.optimized?.high) {
      return this.data.optimized.high;
    }
    return this.data.url;
  }

  /** @internal */
  getCollisionMesh() {
    return this._collision;
  }

  /** @internal */
  protected _getBBoxImp(target: Box3) {
    if (this._collision) {
      target.setFromObject(this._collision);
    }
    return target;
  }

  /** @internal */
  protected dispose() {
    if (this._collision) {
      this._collision.geometry?.dispose();
      (this._collision.material as MeshBasicMaterial)?.dispose();
      this._collision = null;
    }
  }
}
