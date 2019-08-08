import { IPlayer } from '../IPlayer';
import { StreamInfo, LogLevel } from '../Types';
/**
 * Plugin interface
 */
export interface IPlugin {
    /**
     * Return the type/name of the plugin.
     * @return {string} type/name of the plugin
     */
    getType(): string;
    /**
     * Return version number/information from the wrapped plugin.
     * @return {string} version number/information
     */
    getVersion(): string;
    /**
     * Initialize the plugin.
     * @param {IPlayer} player - the IPlayer instance
     * @param {HTMLMediaElement} videoElement - the HTML5 video element used to decode and render the media data
     * @param {object} config - the plugin configuration parameters
     */
    init(player: IPlayer, videoElement: HTMLMediaElement, config: object): any;
    /**
     * Set level for filtering log messages.
     * @param {LogLevel} level - the log level
     */
    setLogLevel(level: LogLevel): any;
    /**
     * Destroy/clean the plugin instance.
     */
    reset(): any;
    /**
     * Load/open a video stream.
     * @param {StreamInfo} stream - input stream properties
     */
    load(stream: StreamInfo): Promise<any>;
    /**
     * Stops/reset the playback of the video stream.
     */
    stop(): any;
}
