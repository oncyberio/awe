import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { TerrainComponentHeadless } from "./terrain-component-headless";
import { MODES, SHADERS, presetImages, TERRAIN_SHAPES } from "./data";

/**
 * @internal
 *
 * Headless factory for terrain components — geometry and collision only.
 */
export class TerrainComponentFactoryHeadless extends DefaultComponentFactory<TerrainComponentHeadless> {
    Type = TerrainComponentHeadless;

    static info = {
        type: "terrain",
        title: "Terrain",
        image: "https://cyber.mypinata.cloud/ipfs/QmSVtTTDF6vAZazNEDy68QKhbiPW2vFWE9qa4bUJZHsQZb?filename=terrain.png",
        help: {
            desc: "Build a terrain",
        },
        batchDraw: false,
        draggable: true,
        studioTab: "worldSettings",
    };

    static {
        const defaultData = {
            id: `terrain-${Date.now()}`,
            kit: "cyber",
            type: "terrain",
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1000, y: 150, z: 1000 },
            color: "#bbbbbb",
            noiseEnabled: false,
            definition: 100,
            seed: 4321,
            noiseDomain: 5,
            smoothCenter: 0.5,
            smoothLength: 0.1,
            islandSmooth: 1,
            islandLength: 0.1,
            innerRadius: 0,
            textureOpts: presetImages.wooden,
            tiles: 20,
            mode: MODES.shader,
            shader: SHADERS.grid,
            shape: TERRAIN_SHAPES.plane,
            griddiv: 180,
            lineWidth: 0.5,
            gridColor: "#000000",
            edgeTransition: 5,
            noTileDisplacement: 1,
            smoothAngle: 0.7,
            visibleOnOcclusion: true,
            textureSideOpts: presetImages.grass,
            collider: {
                enabled: true,
                rigidbodyType: "FIXED",
                colliderType: "MESH",
            },
        };

        this.setDataConfig({
            defaultData,
        });
    }
}
