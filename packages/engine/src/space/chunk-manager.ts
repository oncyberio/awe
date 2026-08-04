import { Vector3 } from "three";
import Camera from "../camera";

const CHUNK_SIZE = 10_000;

const _chunkKey = { x: 0, y: 0, z: 0 };

/** Always in static file, never unloaded */
const GLOBAL_TYPES = new Set([
	"avatar", "vrm-anims",
]);

/** Singletons configured per-chunk via presets (not created/destroyed) */
const PRESET_TYPES = new Set([
	"water", "reflector", "background", "envmap",
	"lighting", "fog", "postprocessing",
]);

function posToChunkCoords(position: Vector3) {
	_chunkKey.x = Math.floor((position.x + CHUNK_SIZE / 2) / CHUNK_SIZE);
	_chunkKey.y = Math.floor((position.y + CHUNK_SIZE / 2) / CHUNK_SIZE);
	_chunkKey.z = Math.floor((position.z + CHUNK_SIZE / 2) / CHUNK_SIZE);
	return _chunkKey;
}

function chunkCoordsToKey(coords: { x: number; y: number; z: number }) {
	return `${coords.x}_${coords.y}_${coords.z}`;
}

function posToChunkKey(position: Vector3) {
	return chunkCoordsToKey(posToChunkCoords(position));
}

export class ChunkManager {

	private _space: any = null;
	private _currentKey: string | null = null;
	private _currentInfo: Record<string, any> | null = null;
	private _chunkComponents: any[] = [];
	private _loading = false;
	private _cleanup: (() => void) | null = null;
	private _onTransitionStart: (() => Promise<void>) | null = null;
	private _onTransitionEnd: (() => void) | null = null;
	private _pendingRestore: { pos: Vector3; avatar: any } | null = null;

	get currentKey() { return this._currentKey; }
	get currentInfo() { return this._currentInfo; }
	get isLoading() { return this._loading; }
	get chunkSize() { return CHUNK_SIZE; }

	private _saveInterval: ReturnType<typeof setInterval> | null = null;

	init(space: any, opts?: {
		onTransitionStart?: () => Promise<void>;
		onTransitionEnd?: () => void;
	}) {
		this._space = space;
		this._onTransitionStart = opts?.onTransitionStart ?? null;
		this._onTransitionEnd = opts?.onTransitionEnd ?? null;

		// Restore saved position before boundary detection starts
		const saved = ChunkManager.restorePosition();
		if (saved) {
			const avatar = space.components?.byType?.("avatar")?.[0];
			if (avatar) {
				const pos = new Vector3(saved.x, saved.y, saved.z);
				avatar.position.copy(pos);
				if (avatar.rigidBody) {
					avatar.rigidBody.enabled = false;
					this._pendingRestore = { pos, avatar };
				}
			}
			// Load saved chunk directly
			if (saved.chunk) {
				this._transition(saved.chunk);
			}
		}

		this._cleanup = space.use({
			onFrame: () => this._checkBoundary(),
		});

		// Save position every 2 seconds
		this._saveInterval = setInterval(() => this._savePosition(), 2000);
	}

	dispose() {
		if (this._saveInterval) {
			clearInterval(this._saveInterval);
			this._saveInterval = null;
		}
		this._cleanup?.();
		this._cleanup = null;
		this._unloadChunk();
		this._space = null;
	}

	/**
	 * Force-load a specific chunk by key.
	 * Returns a promise that resolves when the chunk is fully loaded.
	 */
	async loadChunk(targetKey: string) {
		if (this._loading) return;
		if (targetKey === this._currentKey) return;

		await this._transition(targetKey);
	}

	/**
	 * Force reload the current chunk.
	 */
	async reload() {
		if (this._loading || !this._currentKey) return;
		await this._transition(this._currentKey);
	}

	/**
	 * Teleport the avatar to a world position, loading the destination chunk
	 * if it differs from the current one. Disables physics during the move so
	 * the avatar doesn't fall while the chunk streams in.
	 *
	 * This is the shared "travel" primitive used by the portal directory UI.
	 */
	async travelTo(position: Vector3, avatar?: any) {
		const target = avatar ?? this._space?.components?.byType?.("avatar")?.[0];
		if (!target?.rigidBody) return;

		target.rigidBody.resetVelocities();
		target.rigidBody.enabled = false;
		target.position.copy(position);

		const targetKey = posToChunkKey(position);
		if (targetKey !== this._currentKey) {
			await this.loadChunk(targetKey);
		}

		target.rigidBody.enabled = true;
		target.rigidBody.teleport(position, target.quaternion);
	}

	private _checkBoundary() {
		if (this._loading || !this._space) return;

		const cam = Camera.current;
		if (!cam) return;

		const key = posToChunkKey(cam.position);
		if (key !== this._currentKey) {
			this._transition(key);
		}
	}

	private async _transition(targetKey: string) {
		this._loading = true;

		try {
			if (this._onTransitionStart) {
				await this._onTransitionStart();
			}

			this._unloadChunk();

			const data = await this._fetchChunk(targetKey);

			if (data) {
				await this._loadChunk(targetKey, data);
			}
			else {
				this._currentKey = targetKey;
				this._currentInfo = null;
				console.log(`Chunk ${targetKey}: empty (no file)`);
			}

			this._updateURL(targetKey);
		}
		catch (err) {
			console.error(`Chunk transition failed:`, err);
		}
		finally {
			this._loading = false;

			// Complete session restore after chunk is loaded
			if (this._pendingRestore) {
				const { pos, avatar } = this._pendingRestore;
				this._pendingRestore = null;
				avatar.rigidBody.enabled = true;
				avatar.rigidBody.teleport(pos, avatar.quaternion);
			}

			if (this._onTransitionEnd) {
				this._onTransitionEnd();
			}
		}
	}

	private async _fetchChunk(key: string): Promise<any | null> {
		try {
			const res = await fetch(`/data/chunks/${key}.json`);
			if (!res.ok) return null;
			return await res.json();
		}
		catch {
			return null;
		}
	}

	private async _loadChunk(key: string, data: any) {
		this._currentKey = key;
		this._currentInfo = data.info ?? null;

		// Apply presets to existing singletons
		const presets = data.presets ?? {};
		for (const [type, preset] of Object.entries(presets)) {
			const singleton = this._space.components.byType(type)?.[0];
			if (singleton) {
				singleton.setData(preset);
			}
		}

		// Create chunk assets (back-compat: older files used `components`)
		const assets = data.assets ?? data.components ?? {};
		const entries = Object.values(assets) as any[];

		for (const entry of entries) {
			try {
				const comp = await this._space.components.create(entry);
				if (comp) {
					this._chunkComponents.push(comp);
				}
			}
			catch (err) {
				console.error(`Failed to create component ${entry.id}:`, err);
			}
		}

		console.log(
			`Chunk ${key}: ${Object.keys(presets).length} presets, ` +
			`${this._chunkComponents.length} assets`
		);
	}

	private _unloadChunk() {
		for (const comp of this._chunkComponents) {
			try {
				comp.destroy?.();
			}
			catch (err) {
				console.error(`Failed to destroy component:`, err);
			}
		}
		this._chunkComponents = [];
	}

	private _updateURL(key: string) {
		try {
			const params = new URLSearchParams(window.location.search);
			params.set("chunk", key);
			window.history.replaceState(null, "", `?${params.toString()}`);
		}
		catch {
			// SSR or no window
		}
	}

	// ── Session persistence ──

	private _savePosition() {
		const cam = Camera.current;
		if (!cam) return;
		try {
			const data = {
				x: cam.position.x,
				y: cam.position.y,
				z: cam.position.z,
				chunk: this._currentKey,
				ts: Date.now(),
			};
			localStorage.setItem("awe_session_pos", JSON.stringify(data));
		}
		catch {
			// localStorage unavailable
		}
	}

	/**
	 * Restore saved position. Returns the saved position or null.
	 * Call after space is ready to teleport the avatar.
	 */
	static restorePosition(): { x: number; y: number; z: number; chunk: string | null } | null {
		try {
			const raw = localStorage.getItem("awe_session_pos");
			if (!raw) return null;
			const data = JSON.parse(raw);
			// Expire after 24h
			if (Date.now() - data.ts > 86_400_000) {
				localStorage.removeItem("awe_session_pos");
				return null;
			}
			return { x: data.x, y: data.y, z: data.z, chunk: data.chunk ?? null };
		}
		catch {
			return null;
		}
	}

	/**
	 * Clear saved position.
	 */
	static clearPosition() {
		try { localStorage.removeItem("awe_session_pos"); }
		catch {}
	}

	// ── Static helpers ──

	static readURL(): string | null {
		try {
			return new URLSearchParams(window.location.search).get("chunk") ?? null;
		}
		catch {
			return null;
		}
	}

	static posToKey(position: Vector3) {
		return posToChunkKey(position);
	}

	/**
	 * Check if a component belongs in the static/global file.
	 * Globals + presets stay in static; they're never chunk-loaded/unloaded.
	 */
	static isGlobal(comp: any): boolean {
		if (GLOBAL_TYPES.has(comp.type)) return true;
		if (PRESET_TYPES.has(comp.type)) return true;
		if (!comp.position || typeof comp.position?.x !== "number") return true;
		return false;
	}

	/**
	 * Check if a component type is a preset singleton.
	 */
	static isPreset(comp: any): boolean {
		return PRESET_TYPES.has(comp.type);
	}

	/**
	 * Filter components down to globals + presets (for initial load).
	 */
	static filterGlobals(components: Record<string, any>): Record<string, any> {
		const globals: Record<string, any> = {};
		for (const [id, comp] of Object.entries(components)) {
			if (ChunkManager.isGlobal(comp)) {
				globals[id] = comp;
			}
		}
		return globals;
	}

	static get CHUNK_SIZE() { return CHUNK_SIZE; }
	static get GLOBAL_TYPES() { return GLOBAL_TYPES; }
	static get PRESET_TYPES() { return PRESET_TYPES; }
}
