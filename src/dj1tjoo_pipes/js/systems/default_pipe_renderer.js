import { globalConfig } from "shapez/core/config";
import { Loader } from "shapez/core/loader";
import { GameSystem } from "shapez/game/game_system";
import { MapChunkView } from "shapez/game/map_chunk_view";
import { enumPipeVariant, enumPipeVariantToVariant } from "../buildings/pipe";
import { enumPipeType, PipeComponent } from "../components/pipe";
import { PipeNetwork } from "./pipe";

/**
 * @param {String} color
 * @param {number} percent
 * @returns
 */
function shadeColor(color, percent) {
    var R = parseInt(color.substring(1, 3), 16);
    var G = parseInt(color.substring(3, 5), 16);
    var B = parseInt(color.substring(5, 7), 16);

    // @ts-ignore
    R = parseInt((R * (100 + percent)) / 100);
    // @ts-ignore
    G = parseInt((G * (100 + percent)) / 100);
    // @ts-ignore
    B = parseInt((B * (100 + percent)) / 100);

    R = R < 255 ? R : 255;
    G = G < 255 ? G : 255;
    B = B < 255 ? B : 255;

    var RR = R.toString(16).length == 1 ? "0" + R.toString(16) : R.toString(16);
    var GG = G.toString(16).length == 1 ? "0" + G.toString(16) : G.toString(16);
    var BB = B.toString(16).length == 1 ? "0" + B.toString(16) : B.toString(16);

    return "#" + RR + GG + BB;
}

export class DefaultPipeRendererSystem extends GameSystem {
    constructor(root) {
        super(root);

        /**
         * @type {Object<enumPipeVariant, Object<enumPipeType, import("shapez/core/draw_utils").AtlasSprite>>}
         */
        this.pipeSprites = {};

        const variants = Object.keys(enumPipeVariant);
        for (let i = 0; i < variants.length; ++i) {
            const pipeVariant = variants[i];
            const sprites = {};
            for (const pipeType in enumPipeType) {
                sprites[pipeType] = Loader.getSprite(
                    "sprites/pipes/" + pipeVariant + "_" + pipeType + ".png"
                );
            }
            this.pipeSprites[pipeVariant] = sprites;
        }
    }

    /**
     * Returns the given tileset and opacity
     * @param {PipeComponent} pipeComp
     * @returns {{ spriteSet: Object<enumPipeType, import("../../core/draw_utils").AtlasSprite>, opacity: number}}
     */
    getSpriteSetAndOpacityForPipe(pipeComp) {
        if (!pipeComp.linkedNetwork) {
            // There is no network, it's empty
            return {
                spriteSet: this.pipeSprites[pipeComp.variant],
                opacity: 0.5,
            };
        }

        const network = pipeComp.linkedNetwork;
        return {
            spriteSet: this.pipeSprites[pipeComp.variant],
            opacity: network.currentPressure > 0 ? (pipeComp.localPressure > 0 ? 1 : 0.9) : 0.5,
        };
    }

    /**
     * Draws a given chunk
     * @param {import("shapez/core/draw_utils").DrawParameters} parameters
     * @param {MapChunkView} chunk
     */
    drawChunk(parameters, chunk) {
        // @ts-ignore
        const contents = chunk.contents;
        for (let y = 0; y < globalConfig.mapChunkSize; ++y) {
            for (let x = 0; x < globalConfig.mapChunkSize; ++x) {
                const entity = contents[x][y];
                // @ts-ignore
                if (entity && entity.components.DefaultPipeRenderer && entity.components.Pipe) {
                    // @ts-ignore
                    const pipeComp = entity.components.Pipe;
                    const pipeType = pipeComp.type;

                    const { opacity, spriteSet } = this.getSpriteSetAndOpacityForPipe(pipeComp);

                    const sprite = spriteSet[pipeType];

                    assert(sprite, "Unknown pipe type: " + pipeType);
                    const staticComp = entity.components.StaticMapEntity;
                    parameters.context.globalAlpha = opacity;
                    staticComp.drawSpriteOnBoundsClipped(parameters, sprite, 0);

                    /** @type {PipeNetwork} */
                    const network = pipeComp.linkedNetwork;

                    if (network && network.currentFluid && pipeComp.localPressure > 0) {
                        // @ts-ignore
                        parameters.context.fillStyle = shadeColor(
                            network.currentFluid.getBackgroundColorAsResource(),
                            pipeComp.localPressure / pipeComp.maxPressure
                        );

                        const size =
                            enumPipeVariant.pipe === enumPipeVariantToVariant[staticComp.getVariant()]
                                ? 3
                                : 8;

                        switch (pipeType) {
                            case enumPipeType.forward:
                                if (staticComp.rotation % 180 === 0) {
                                    parameters.context.fillRect(
                                        (staticComp.origin.x + 0.5) * globalConfig.tileSize - size / 2,
                                        staticComp.origin.y * globalConfig.tileSize - 0.1,
                                        size,
                                        globalConfig.tileSize + 0.2
                                    );
                                } else {
                                    parameters.context.fillRect(
                                        staticComp.origin.x * globalConfig.tileSize - 0.1,
                                        (staticComp.origin.y + 0.5) * globalConfig.tileSize - size / 2,
                                        globalConfig.tileSize + 0.2,
                                        size
                                    );
                                }
                                break;
                            case enumPipeType.cross:
                                parameters.context.fillRect(
                                    (staticComp.origin.x + 0.5) * globalConfig.tileSize - size / 2,
                                    staticComp.origin.y * globalConfig.tileSize - 0.1,
                                    size,
                                    globalConfig.tileSize + 0.2
                                );
                                parameters.context.fillRect(
                                    staticComp.origin.x * globalConfig.tileSize - 0.1,
                                    (staticComp.origin.y + 0.5) * globalConfig.tileSize - size / 2,
                                    globalConfig.tileSize + 0.2,
                                    size
                                );
                                break;
                            case enumPipeType.split:
                                if (staticComp.rotation % 360 === 0) {
                                    parameters.context.fillRect(
                                        (staticComp.origin.x + 0.5) * globalConfig.tileSize - size / 2,
                                        (staticComp.origin.y + 0.5) * globalConfig.tileSize - 0.1,
                                        size,
                                        globalConfig.tileSize / 2 + 0.2
                                    );
                                    parameters.context.fillRect(
                                        staticComp.origin.x * globalConfig.tileSize - 0.1,
                                        (staticComp.origin.y + 0.5) * globalConfig.tileSize - size / 2,
                                        globalConfig.tileSize + 0.2,
                                        size
                                    );
                                } else if (staticComp.rotation % 270 === 0) {
                                    parameters.context.fillRect(
                                        (staticComp.origin.x + 0.5) * globalConfig.tileSize - size / 2,
                                        staticComp.origin.y * globalConfig.tileSize - 0.1,
                                        size,
                                        globalConfig.tileSize + 0.2
                                    );
                                    parameters.context.fillRect(
                                        (staticComp.origin.x + 0.5) * globalConfig.tileSize - 0.1,
                                        (staticComp.origin.y + 0.5) * globalConfig.tileSize - size / 2,
                                        globalConfig.tileSize / 2 + 0.2,
                                        size
                                    );
                                } else if (staticComp.rotation % 180 === 0) {
                                    parameters.context.fillRect(
                                        (staticComp.origin.x + 0.5) * globalConfig.tileSize - size / 2,
                                        staticComp.origin.y * globalConfig.tileSize - 0.1,
                                        size,
                                        globalConfig.tileSize / 2 + 0.2
                                    );
                                    parameters.context.fillRect(
                                        staticComp.origin.x * globalConfig.tileSize - 0.1,
                                        (staticComp.origin.y + 0.5) * globalConfig.tileSize - size / 2,
                                        globalConfig.tileSize + 0.2,
                                        size
                                    );
                                } else if (staticComp.rotation % 90 === 0) {
                                    parameters.context.fillRect(
                                        (staticComp.origin.x + 0.5) * globalConfig.tileSize - size / 2,
                                        staticComp.origin.y * globalConfig.tileSize - 0.1,
                                        size,
                                        globalConfig.tileSize + 0.2
                                    );
                                    parameters.context.fillRect(
                                        staticComp.origin.x * globalConfig.tileSize - 0.1,
                                        (staticComp.origin.y + 0.5) * globalConfig.tileSize - size / 2,
                                        globalConfig.tileSize / 2 + 0.2,
                                        size
                                    );
                                }
                                break;

                            case enumPipeType.turn:
                                if (staticComp.rotation % 360 === 0) {
                                    parameters.context.fillRect(
                                        (staticComp.origin.x + 0.5) * globalConfig.tileSize - size / 2,
                                        (staticComp.origin.y + 0.5) * globalConfig.tileSize - 0.1,
                                        size,
                                        globalConfig.tileSize / 2 + 0.2
                                    );
                                    parameters.context.fillRect(
                                        (staticComp.origin.x + 0.5) * globalConfig.tileSize - 0.1,
                                        (staticComp.origin.y + 0.5) * globalConfig.tileSize - size / 2,
                                        globalConfig.tileSize / 2 + 0.2,
                                        size
                                    );
                                } else if (staticComp.rotation % 270 === 0) {
                                    parameters.context.fillRect(
                                        (staticComp.origin.x + 0.5) * globalConfig.tileSize - size / 2,
                                        staticComp.origin.y * globalConfig.tileSize - 0.1,
                                        size,
                                        globalConfig.tileSize / 2 + 0.2
                                    );
                                    parameters.context.fillRect(
                                        (staticComp.origin.x + 0.5) * globalConfig.tileSize - 0.1,
                                        (staticComp.origin.y + 0.5) * globalConfig.tileSize - size / 2,
                                        globalConfig.tileSize / 2 + 0.2,
                                        size
                                    );
                                } else if (staticComp.rotation % 180 === 0) {
                                    parameters.context.fillRect(
                                        (staticComp.origin.x + 0.5) * globalConfig.tileSize - size / 2,
                                        staticComp.origin.y * globalConfig.tileSize - 0.1,
                                        size,
                                        globalConfig.tileSize / 2 + 0.2
                                    );
                                    parameters.context.fillRect(
                                        staticComp.origin.x * globalConfig.tileSize - 0.1,
                                        (staticComp.origin.y + 0.5) * globalConfig.tileSize - size / 2,
                                        globalConfig.tileSize / 2 + 0.2,
                                        size
                                    );
                                } else if (staticComp.rotation % 90 === 0) {
                                    parameters.context.fillRect(
                                        (staticComp.origin.x + 0.5) * globalConfig.tileSize - size / 2,
                                        (staticComp.origin.y + 0.5) * globalConfig.tileSize - 0.1,
                                        size,
                                        globalConfig.tileSize / 2 + 0.2
                                    );
                                    parameters.context.fillRect(
                                        staticComp.origin.x * globalConfig.tileSize - 0.1,
                                        (staticComp.origin.y + 0.5) * globalConfig.tileSize - size / 2,
                                        globalConfig.tileSize / 2 + 0.2,
                                        size
                                    );
                                }

                                parameters.context.beginPath();
                                parameters.context.arc(
                                    (staticComp.origin.x + 0.5) * globalConfig.tileSize,
                                    (staticComp.origin.y + 0.5) * globalConfig.tileSize,
                                    size / 2,
                                    0,
                                    2 * Math.PI
                                );
                                parameters.context.fill();
                                break;

                            default:
                                break;
                        }
                    }
                }
            }
        }

        parameters.context.globalAlpha = 1;
    }
}
