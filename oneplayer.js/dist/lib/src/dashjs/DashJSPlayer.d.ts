import { IPlayer } from '../IPlayer';
import { DefaultPlayer } from '../DefaultPlayer';
import { PlayerType, StreamInfo, MediaType, TrackInfo } from '../Types';
import * as dashjs from 'dashjs';
/**
 * Dash.js player
 */
export declare class DashJSPlayer extends DefaultPlayer implements IPlayer {
    private mediaPlayer;
    private defaultSettings;
    private audioSettings;
    private downloadError;
    private ttmlController;
    /**
     * Constructor.
     */
    constructor();
    getVersion(): string;
    getPlayerType(): PlayerType;
    init(videoElement: HTMLElement, ttmlRenderingDiv?: HTMLDivElement): Promise<any>;
    setConfig(params: object): void;
    enableLogs(enable: boolean): void;
    addEventListener(type: string, listener: any, scope?: object): void;
    removeEventListener(type: string, listener: any, scope?: object): void;
    reset(): void;
    getMetricsFor(type: MediaType): dashjs.MetricsList;
    play(): void;
    pause(): void;
    seek(time: number): void;
    stop(reset?: boolean, stopPlugins?: boolean): void;
    getDuration(): number;
    isLive(): boolean;
    getTime(): number;
    getTracksForType(type: MediaType): TrackInfo[];
    getSelectedTrackForType(type: MediaType): TrackInfo;
    getQualityForType(type: MediaType): number;
    getBufferLevelForType(type: MediaType): number;
    selectTrackForType(type: MediaType, id: string): void;
    selectTrack(track: TrackInfo): void;
    setDefaultAudioLanguage(lang: string): void;
    setDefaultTextLanguage(lang: string): void;
    enableText(enable: boolean): void;
    isTextEnabled(): boolean;
    setDefaultTextEnabled(enable: boolean): void;
    protected loadStream(stream: StreamInfo): void;
    protected limitToLowestBitrate(state: boolean): void;
    private checkInitialized;
    private getDefaultSettings;
    private applySettings;
    private mediaInfoToTrackInfo;
    private onStreamInitialized;
    private getResponseText;
    private getType;
    private onPlaybackPlaying;
    private onPlaybackSeeking;
    private onPlaybackWaiting;
    private processDownloadError;
    private onError;
}
