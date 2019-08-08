import { IPlugin } from './IPlugin';
import { StreamInfo, LogLevel } from '../Types';
import { IPlayer } from '../IPlayer';
/**
 * metricsagent.js plugin
 */
export declare class MetricsPlugin implements IPlugin {
    private metricsAgent;
    getType(): string;
    getVersion(): string;
    init(player: IPlayer, videoElement: HTMLMediaElement, config: object): void;
    setLogLevel(level: LogLevel): void;
    reset(): void;
    /**
     * Load/open a video stream.
     * @param {object} stream - video stream properties object such url, startTime, prodData ...
     */
    load(stream: StreamInfo): Promise<any>;
    /**
     * Stops/reset the playback of the video stream.
     */
    stop(): void;
    private checkInitialized;
}
