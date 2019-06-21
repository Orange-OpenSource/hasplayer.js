import { IPlayer } from './IPlayer';
import { PlayerType, PluginType } from './Types';
/**
 * OnePlayer is the main class that has to be used to create player instances.
 */
export declare class OnePlayer {
    /**
     * Returns current version of oneplayer.js.
     * @return current version of oneplayer.js
     */
    static getVersion(): string;
    /**
     * Creates a new instance of a player.
     * This methods creates a player instance of the given type.
     * @param {HTMLElement} video - the HTML5 video element used to decode and render the media data
     * @param {HTMLDivElement} ttmlRenderingDiv - the HTML5 div to render rich TTML subtitles
     * @returns {Promise} a promise which is resolved with the created player, or rejected if failed to create the player
     */
    static create(playerType: PlayerType, video: HTMLElement, ttmlRenderingDiv?: HTMLDivElement): Promise<IPlayer>;
    /**
     * Adds a plugin.
     * @param {IPlayer} player - IPlayer reference
     * @param {PluginType} type - the type of the plugin
     * @param {object} config - the plugin configuration parameters
     */
    static addPlugin(player: IPlayer, type: PluginType, config?: object): void;
}
