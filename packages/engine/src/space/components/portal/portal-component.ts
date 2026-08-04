import {
	CylinderGeometry,
	InstancedMesh,
	Mesh,
	MeshBasicMaterial,
	DoubleSide,
	Color,
	Vector3,
	Matrix4,
	Object3D,
} from "three";
import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import { PortalComponentData } from "./portal-data";
import { IS_EDIT_MODE } from "../../../internal/constants";
import emitter from "../../../internal/engine-emitter";
import { GameEvents } from "../../../internal/game-events";

export type { PortalComponentData } from "./portal-data";

// ── Shared instanced mesh pool ──

const MAX_PORTALS = 256;
let _geometry: CylinderGeometry | null = null;
let _material: MeshBasicMaterial | null = null;
let _instancedMesh: InstancedMesh | null = null;
let _instances: PortalComponent[] = [];
let _dummy = new Object3D();

function getGeometry(): CylinderGeometry {
	if (!_geometry) {
		_geometry = new CylinderGeometry(1, 1, 0.05, 32);
	}
	return _geometry;
}

function getMaterial(): MeshBasicMaterial {
	if (!_material) {
		_material = new MeshBasicMaterial({
			color: new Color("#00ffff"),
			transparent: true,
			opacity: 0.8,
			side: DoubleSide,
		});
	}
	return _material;
}

function getInstancedMesh(space: any): InstancedMesh {
	if (!_instancedMesh) {
		_instancedMesh = new InstancedMesh(getGeometry(), getMaterial(), MAX_PORTALS);
		_instancedMesh.count = 0;
		_instancedMesh.name = "portal-instances";
		_instancedMesh.frustumCulled = false;
		space.add(_instancedMesh);
	}
	return _instancedMesh;
}

function addInstance(portal: PortalComponent): number {
	const mesh = getInstancedMesh(portal.space);
	const idx = _instances.length;
	_instances.push(portal);
	mesh.count = _instances.length;
	updateInstance(portal, idx);
	return idx;
}

function removeInstance(portal: PortalComponent): void {
	const idx = _instances.indexOf(portal);
	if (idx === -1) return;

	const mesh = getInstancedMesh(portal.space);

	// Swap with last
	const last = _instances.length - 1;
	if (idx !== last) {
		_instances[idx] = _instances[last];
		_instances[idx]._instanceIndex = idx;
		// Copy last matrix into removed slot
		const mat = new Matrix4();
		mesh.getMatrixAt(last, mat);
		mesh.setMatrixAt(idx, mat);
	}

	_instances.pop();
	mesh.count = _instances.length;
	mesh.instanceMatrix.needsUpdate = true;
}

function updateInstance(portal: PortalComponent, idx: number): void {
	const mesh = getInstancedMesh(portal.space);
	const radius = portal.data.radius ?? 1;

	portal.updateWorldMatrix(true, false);
	_dummy.matrix.copy(portal.matrixWorld);
	_dummy.matrix.scale(new Vector3(radius, 1, radius));

	mesh.setMatrixAt(idx, _dummy.matrix);
	mesh.instanceMatrix.needsUpdate = true;
}

function disposePool(): void {
	_instancedMesh?.removeFromParent();
	_instancedMesh?.dispose();
	_instancedMesh = null;
	_geometry?.dispose();
	_geometry = null;
	_material?.dispose();
	_material = null;
	_instances = [];
}

/**
 * @public
 *
 * A portal acts as a named spawnpoint. Entering one (sensor enter) opens the
 * destination directory ("yellowpages") via the `PORTAL_OPEN` event, letting
 * the player travel to any other portal — a one-to-many relationship rather
 * than a hard-wired one-to-one link.
 *
 * Uses a shared InstancedMesh for all portal visuals (one draw call).
 */
export class PortalComponent extends Component3D<PortalComponentData> {

	/** @internal */
	_instanceIndex = -1;

	private _collision: Mesh = null;
	private _lastTrigger = 0;
	private _cleanup: (() => void) | null = null;

	/** @internal */
	protected async init() {
		this._instanceIndex = addInstance(this);

		// Keep instance matrix in sync with component transform
		this._cleanup = this.space.use({
			onFrame: () => {
				if (this._instanceIndex >= 0) {
					updateInstance(this, this._instanceIndex);
				}
			},
		});
	}

	/** @internal */
	async _onReady() {
		if (IS_EDIT_MODE) return;

		this.onSensorEnter((event) => {
			this._open(event.other);
		});
	}

	/**
	 * Open the destination directory for the player who entered, gated by a
	 * cooldown so it doesn't re-fire while the avatar lingers on the disc or
	 * arrives via travel.
	 */
	private _open(avatar: Component3D) {
		const cooldown = this.data.cooldown ?? 1500;
		const now = performance.now();
		if (now - this._lastTrigger < cooldown) return;
		this._lastTrigger = now;

		emitter.emit(GameEvents.PORTAL_OPEN, {
			portalId: this.data.id,
			avatar,
		});
	}

	/** @internal */
	getCollisionMesh() {
		if (this._collision == null) {
			const radius = this.data.radius ?? 1;
			const geo = new CylinderGeometry(radius, radius, 0.05, 32);
			this._collision = new Mesh(geo, getMaterial());
			this._collision.visible = false;
			this.add(this._collision);
		}
		return this._collision;
	}

	/** @internal */
	async onDataChange(opts: DataChangeOpts<PortalComponentData>) {
		// Radius changed — update collision mesh
		if (opts.prev?.radius !== this.data.radius && this._collision) {
			const radius = this.data.radius ?? 1;
			this._collision.geometry.dispose();
			this._collision.geometry = new CylinderGeometry(radius, radius, 0.05, 32);
		}

		// Instance matrix updates on next frame via onFrame
	}

	/** @internal */
	protected dispose() {
		if (this._cleanup) {
			this._cleanup();
			this._cleanup = null;
		}

		removeInstance(this);
		this._instanceIndex = -1;

		if (this._collision) {
			this._collision.geometry?.dispose();
			this._collision = null;
		}

		// If no portals left, clean up the pool
		if (_instances.length === 0) {
			disposePool();
		}
	}
}
