import fs from "fs";
import path from "path";
import { applyPatches, enablePatches, Patch } from "immer";
import { GameData } from "../types/game-data";
import { DEFAULT_SCENE } from "../lib/default-game-data";
import { resolveWorkingFolder } from "./working-folder-service";

enablePatches();

const CHUNK_SIZE = 10_000;

/** Always in static file, never unloaded */
const GLOBAL_TYPES = new Set([
  "avatar", "vrm-anims",
]);

/** Singletons — defaults in static file, per-chunk overrides in presets */
const PRESET_TYPES = new Set([
  "water", "reflector", "background", "envmap",
  "lighting", "fog", "postprocessing",
]);

function getDataFilePath(workingFolder: string): string {
  return path.join(workingFolder, "data/static-scene.json");
}

function getChunksDir(workingFolder: string): string {
  return path.join(workingFolder, "data/chunks");
}

function getPortalsIndexPath(workingFolder: string): string {
  return path.join(workingFolder, "data/portals-index.json");
}

function getChunkConfigPath(workingFolder: string): string {
  return path.join(workingFolder, "data/chunk-config.json");
}

function getRolesPath(workingFolder: string): string {
  return path.join(workingFolder, "data/roles.json");
}

/**
 * Self-describing metadata stored in each chunk file. Surfaced live in the
 * in-game info UI. Extensible — add fields here as the game grows.
 */
export interface ChunkInfo {
  title: string;
  owner?: string;
  tags?: string[];
  image?: string;
  description?: string;
  [key: string]: unknown;
}

/** Per-chunk authoring config (source of truth, embedded into chunk files). */
export interface ChunkConfig {
  info: ChunkInfo;
  /** Role ids permitted to enter this chunk. Empty = public. */
  auth: string[];
}

/** A world-global, Discord-style role. */
export interface Role {
  id: string;
  name: string;
  color: string;
  permissions: {
    administrator?: boolean;
    moderate?: boolean;
    speak?: boolean;
    build?: boolean;
  };
}

function defaultChunkInfo(): ChunkInfo {
  return { title: "Info" };
}

function defaultChunkConfig(): ChunkConfig {
  return { info: defaultChunkInfo(), auth: [] };
}

/**
 * The studio image-upload control stores an upload descriptor object
 * (`{ path, image, ... }`), while presets/manual entry may use a plain string.
 * Resolve either form down to a usable URL for the portal index.
 */
function resolveImageUrl(image: any): string {
  if (!image) return "";
  if (typeof image === "string") return image;
  return image.path ?? image.image ?? "";
}

/** One entry per portal/spawnpoint in the multiverse directory ("yellowpages"). */
export interface PortalIndexEntry {
  id: string;
  name: string;
  slug: string;
  image: string;
  position: { x: number; y: number; z: number };
  chunkKey: string;
}

function posToChunkKey(pos: { x: number; y: number; z: number }): string {
  const h = CHUNK_SIZE / 2;
  return `${Math.floor((pos.x + h) / CHUNK_SIZE)}_${Math.floor((pos.y + h) / CHUNK_SIZE)}_${Math.floor((pos.z + h) / CHUNK_SIZE)}`;
}

function splitComponents(components: Record<string, any>) {
  const globals: Record<string, any> = {};
  const presets: Record<string, any> = {};
  const chunks: Record<string, Record<string, any>> = {};

  for (const [id, comp] of Object.entries(components)) {
    // Globals: always in static file
    if (GLOBAL_TYPES.has(comp.type)) {
      globals[id] = comp;
      continue;
    }

    // Presets: singletons stay in static but also captured for chunk overrides
    if (PRESET_TYPES.has(comp.type)) {
      globals[id] = comp;
      presets[id] = comp;
      continue;
    }

    // No position = global
    const pos = comp.position;
    if (!pos || typeof pos.x !== "number") {
      globals[id] = comp;
      continue;
    }

    // Chunk asset
    const key = posToChunkKey(pos);
    if (!chunks[key]) chunks[key] = {};
    chunks[key][id] = comp;
  }

  return { globals, presets, chunks };
}

export interface GameRevision {
  mtimeMs: number;
}

export class GameService {

  private static ensureGameDataFileSync(dataFile: string): void {
    if (fs.existsSync(dataFile)) return;
    const dir = path.dirname(dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const defaultData = { ...DEFAULT_SCENE, createdAt: Date.now(), updatedAt: Date.now() } as GameData;
    fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2), "utf-8");
  }

  private static readJsonSync(filePath: string): any {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  private static writeJsonSync(filePath: string, data: any): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  private static async getDataFile(): Promise<string> {
    const workingFolder = await resolveWorkingFolder();
    const dataFile = getDataFilePath(workingFolder);
    this.ensureGameDataFileSync(dataFile);
    return dataFile;
  }

  private static readChunkSync(workingFolder: string, key: string): { presets: Record<string, any>; assets: Record<string, any>; auth: any[]; info: ChunkInfo } {
    const filePath = path.join(getChunksDir(workingFolder), `${key}.json`);
    if (!fs.existsSync(filePath)) return { presets: {}, assets: {}, auth: [], info: defaultChunkInfo() };
    try {
      const data = this.readJsonSync(filePath);
      return {
        presets: data.presets ?? {},
        // Back-compat: older chunk files used `components`
        assets: data.assets ?? data.components ?? {},
        auth: data.auth ?? [],
        info: { ...defaultChunkInfo(), ...(data.info ?? {}) },
      };
    }
    catch {
      return { presets: {}, assets: {}, auth: [], info: defaultChunkInfo() };
    }
  }

  private static writeChunkSync(
    workingFolder: string,
    key: string,
    presets: Record<string, any>,
    assets: Record<string, any>,
    config: ChunkConfig,
  ): void {
    const filePath = path.join(getChunksDir(workingFolder), `${key}.json`);
    if (Object.keys(assets).length === 0 && Object.keys(presets).length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }
    // `info` is self-describing chunk metadata; `auth` is the list of role ids
    // permitted to enter. Both are authored via the studio config panel and
    // embedded here so the runtime reads them straight from the chunk file.
    this.writeJsonSync(filePath, {
      id: key,
      presets,
      assets,
      auth: config.auth,
      info: config.info,
    });
  }

  // ── Per-chunk config (source of truth, embedded into chunk files) ──

  private static readChunkConfigMap(workingFolder: string): Record<string, ChunkConfig> {
    const filePath = getChunkConfigPath(workingFolder);
    if (!fs.existsSync(filePath)) return {};
    try {
      return this.readJsonSync(filePath) as Record<string, ChunkConfig>;
    }
    catch {
      return {};
    }
  }

  private static configForKey(map: Record<string, ChunkConfig>, key: string): ChunkConfig {
    const c = map[key];
    if (!c) return defaultChunkConfig();
    return {
      info: { ...defaultChunkInfo(), ...(c.info ?? {}) },
      auth: Array.isArray(c.auth) ? c.auth : [],
    };
  }

  /**
   * Auto-generate chunk files from the full scene data, embedding each chunk's
   * authored config (info + auth) from `chunk-config.json`.
   */
  private static generateChunkFiles(workingFolder: string, gameData: GameData): void {
    const chunksDir = getChunksDir(workingFolder);
    if (!fs.existsSync(chunksDir)) fs.mkdirSync(chunksDir, { recursive: true });

    // Clean existing
    const existing = fs.readdirSync(chunksDir);
    for (const file of existing) {
      if (file.endsWith(".json")) fs.unlinkSync(path.join(chunksDir, file));
    }

    const configMap = this.readChunkConfigMap(workingFolder);
    const { presets, chunks } = splitComponents(gameData.components ?? {});

    for (const [key, chunkComponents] of Object.entries(chunks)) {
      this.writeChunkSync(workingFolder, key, presets, chunkComponents, this.configForKey(configMap, key));
    }

    // If there are presets but no chunks with assets, still write a default chunk
    if (Object.keys(chunks).length === 0 && Object.keys(presets).length > 0) {
      this.writeChunkSync(workingFolder, "0_0_0", presets, {}, this.configForKey(configMap, "0_0_0"));
    }

    this.generatePortalsIndex(workingFolder, gameData);

    console.log(`Generated ${Object.keys(chunks).length} chunk file(s)`);
  }

  /**
   * Build the flat portal directory ("yellowpages") from the full scene.
   * Written behind {@link getPortalsIndex} so the backing store can later be
   * swapped for a database without the UI knowing.
   */
  private static generatePortalsIndex(workingFolder: string, gameData: GameData): void {
    const entries: PortalIndexEntry[] = [];

    for (const [id, comp] of Object.entries(gameData.components ?? {})) {
      if (comp.type !== "portal") continue;
      const pos = comp.position ?? { x: 0, y: 0, z: 0 };
      entries.push({
        id,
        name: comp.p_name || comp.name || "Portal",
        slug: comp.slug ?? "",
        image: resolveImageUrl(comp.image),
        position: { x: pos.x ?? 0, y: pos.y ?? 0, z: pos.z ?? 0 },
        chunkKey: posToChunkKey(pos),
      });
    }

    const filePath = getPortalsIndexPath(workingFolder);
    if (entries.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }
    this.writeJsonSync(filePath, entries);
  }

  /**
   * Read the multiverse portal directory. Returns an empty array when no
   * portals exist.
   */
  static async getPortalsIndex(): Promise<PortalIndexEntry[]> {
    const dataFile = await this.getDataFile();
    const workingFolder = path.dirname(path.dirname(dataFile));
    const filePath = getPortalsIndexPath(workingFolder);
    if (!fs.existsSync(filePath)) return [];
    try {
      return this.readJsonSync(filePath) as PortalIndexEntry[];
    }
    catch {
      return [];
    }
  }

  // ── Chunk config + roles (studio config panel) ──

  static async getChunkConfig(key: string): Promise<ChunkConfig> {
    const dataFile = await this.getDataFile();
    const workingFolder = path.dirname(path.dirname(dataFile));
    return this.configForKey(this.readChunkConfigMap(workingFolder), key);
  }

  static async setChunkConfig(key: string, config: ChunkConfig): Promise<{ success: boolean }> {
    const dataFile = await this.getDataFile();
    const workingFolder = path.dirname(path.dirname(dataFile));

    const map = this.readChunkConfigMap(workingFolder);
    map[key] = {
      info: { ...defaultChunkInfo(), ...(config.info ?? {}) },
      auth: Array.isArray(config.auth) ? config.auth : [],
    };
    this.writeJsonSync(getChunkConfigPath(workingFolder), map);

    // Re-embed into the chunk files so the runtime picks it up immediately.
    const gameData = this.readJsonSync(dataFile) as GameData;
    this.generateChunkFiles(workingFolder, gameData);

    return { success: true };
  }

  static async getRoles(): Promise<Role[]> {
    const dataFile = await this.getDataFile();
    const workingFolder = path.dirname(path.dirname(dataFile));
    const filePath = getRolesPath(workingFolder);
    if (!fs.existsSync(filePath)) return [];
    try {
      return this.readJsonSync(filePath) as Role[];
    }
    catch {
      return [];
    }
  }

  static async setRoles(roles: Role[]): Promise<{ success: boolean }> {
    const dataFile = await this.getDataFile();
    const workingFolder = path.dirname(path.dirname(dataFile));
    this.writeJsonSync(getRolesPath(workingFolder), roles);
    return { success: true };
  }

  static async getGameData(chunkKey?: string): Promise<GameData> {
    const dataFile = await this.getDataFile();
    const fullData = this.readJsonSync(dataFile) as GameData;

    if (!chunkKey) return fullData;

    const workingFolder = path.dirname(path.dirname(dataFile));
    const chunksDir = getChunksDir(workingFolder);

    if (!fs.existsSync(chunksDir)) return fullData;

    // Build globals: GLOBAL_TYPES + PRESET_TYPES + anything without position
    const globalComponents: Record<string, any> = {};
    for (const [id, comp] of Object.entries(fullData.components ?? {})) {
      if (
        GLOBAL_TYPES.has(comp.type) ||
        PRESET_TYPES.has(comp.type) ||
        !comp.position ||
        typeof comp.position?.x !== "number"
      ) {
        globalComponents[id] = comp;
      }
    }

    const chunk = this.readChunkSync(workingFolder, chunkKey);

    return {
      ...fullData,
      components: { ...globalComponents, ...chunk.assets },
      _chunkKey: chunkKey,
    } as GameData & { _chunkKey: string };
  }

  static async getGameRevision(): Promise<GameRevision> {
    const dataFile = await this.getDataFile();
    const stat = fs.statSync(dataFile);
    return { mtimeMs: stat.mtimeMs };
  }

  static async updateGame(opts: {
    id: string;
    patches: Patch[];
    chunkKey?: string;
  }): Promise<{ success: boolean }> {
    const dataFile = await this.getDataFile();
    const gameData = this.readJsonSync(dataFile);

    const patchedData = applyPatches(gameData, opts.patches);
    const updatedData = { ...patchedData, updatedAt: Date.now() };

    this.writeJsonSync(dataFile, updatedData);

    // Auto-generate chunk files
    const workingFolder = path.dirname(path.dirname(dataFile));
    this.generateChunkFiles(workingFolder, updatedData);

    return { success: true };
  }

  static async switchChunk(targetKey: string): Promise<GameData> {
    return this.getGameData(targetKey);
  }

  static async listChunks(): Promise<string[]> {
    const workingFolder = await resolveWorkingFolder();
    const chunksDir = getChunksDir(workingFolder);
    if (!fs.existsSync(chunksDir)) return [];
    return fs.readdirSync(chunksDir)
      .filter(f => f.endsWith(".json"))
      .map(f => f.replace(".json", ""));
  }
}
