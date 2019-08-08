import { IPlayer } from '../IPlayer';
import { DefaultPlayer } from '../DefaultPlayer';
import { PlayerType, StreamInfo, MediaType, TrackInfo } from '../Types';
/**
 * Dash.js player
 */
export declare class HlsFpPlayer extends DefaultPlayer implements IPlayer {
    private protectionData;
    private fpcontroller;
    private defaultAudioLanguage;
    private defaultTextLanguage;
    private defaultTextEnabled;
    private selectedTextTrackId;
    private loadedmetadataListener;
    private stateChangedListener;
    private seekedListener;
    private errorListener;
    /**
     * Constructor.
     */
    constructor();
    getVersion(): string;
    getPlayerType(): PlayerType;
    init(videoElement: HTMLElement, ttmlRenderingDiv?: HTMLDivElement): Promise<any>;
    setConfig(params: object): void;
    addEventListener(type: string, listener: any, scope?: object): void;
    removeEventListener(type: string, listener: any, scope?: object): void;
    reset(): void;
    play(): Promise<void>;
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
    protected loadStream(stream: StreamInfo): Promise<void>;
    protected limitToLowestBitrate(state: boolean): void;
    private getVideoTracks;
    private getAudioTracks;
    private getTextTracks;
    private selectAudioTrack;
    private selectTextTrack;
    private getSelectedAudioTrack;
    private getSelectedTextTrack;
    private audioTrackToMediaInfo;
    private textTrackToMediaInfo;
    private onLoadedmetadata;
    private onStateChanged;
    private onSeeked;
    private onError;
}
