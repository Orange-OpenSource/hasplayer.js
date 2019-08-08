import { PlayerType, StreamInfo, MediaType, TrackInfo, PluginType } from './Types';
import { IPlayer } from './IPlayer';
import { PlayerErrorCode } from './Errors';
import { IPlugin } from './plugins/IPlugin';
import { PlaybackSpeedController } from './tools/PlaybackSpeedController';
import { DebugController } from './tools/DebugController';
/**
 * Default player implementation
 */
export declare abstract class DefaultPlayer implements IPlayer {
    protected videoElement: HTMLMediaElement;
    protected stream: StreamInfo;
    protected storeMediaSettings: boolean;
    protected mediaSettingsKey: string;
    protected playbackSpeedController: PlaybackSpeedController;
    protected debugController: DebugController;
    protected plugins: IPlugin[];
    protected logsEnabled: boolean;
    abstract getVersion(): string;
    abstract getPlayerType(): PlayerType;
    init(videoElement: HTMLElement, ttmlRenderingDiv?: HTMLDivElement): Promise<any>;
    abstract setConfig(params: object): any;
    enableLogs(enable: boolean): void;
    enableLastMediaSettingsCaching(enable: boolean, key?: string): void;
    abstract addEventListener(type: string, listener: any, scope?: object): any;
    abstract removeEventListener(type: string, listener: any, scope?: object): any;
    reset(): void;
    load(stream: StreamInfo, loadPlugins?: boolean): Promise<void>;
    abstract play(): any;
    abstract pause(): any;
    abstract seek(time: number): any;
    setPlaybackSpeed(speed: number): void;
    getPlaybackSpeed(): number;
    stop(reset?: boolean, stopPlugins?: boolean): void;
    abstract getDuration(): number;
    abstract isLive(): any;
    abstract getTime(): number;
    /**
     * Returns the list of tracks for a given media type
     * @returns {object} the list of {@link TrackInfo} for each media type
     */
    getTracks(type: MediaType): object;
    abstract getTracksForType(type: MediaType): TrackInfo[];
    abstract getSelectedTrackForType(type: MediaType): TrackInfo;
    abstract getQualityForType(type: MediaType): number;
    abstract getBufferLevelForType(type: MediaType): number;
    abstract selectTrackForType(type: MediaType, id: string): any;
    abstract selectTrack(track: TrackInfo): any;
    abstract setDefaultAudioLanguage(lang: string): any;
    abstract setDefaultTextLanguage(lang: string): any;
    abstract enableText(enable: boolean): any;
    abstract isTextEnabled(): boolean;
    abstract setDefaultTextEnabled(enable: boolean): any;
    addPlugin(type: PluginType, config?: object): void;
    showDebug(show: boolean, debugRenderingDiv?: HTMLDivElement): void;
    protected loadStream(stream: StreamInfo): Promise<void>;
    protected abstract limitToLowestBitrate(state: boolean): any;
    protected sendErrorEvent(code: PlayerErrorCode, extMessage?: string, data?: object): void;
    protected storeDefaultLanguage(type: MediaType, lang: string): void;
    protected storeTextState(enable: boolean): void;
    private applyMediaSettings;
    private removeMediaSettings;
    private getMediaSettings;
}
