import { IPlayer } from '../IPlayer';
import { StreamInfo } from '../Types';
declare global {
    interface Window {
        Chartist: any;
    }
}
export declare class DebugPanel {
    private videoElement;
    private player;
    private containerDiv;
    private debugDiv;
    private stateChangedListener;
    private pauseListener;
    private qualityRenderedListener;
    private version;
    private protocol;
    private streamType;
    private playbackState;
    private playbackTime;
    private duration;
    private jitter;
    private videoBufferSizes;
    private audioBufferSizes;
    private videoBuffer;
    private audioBuffer;
    private bufferTarget;
    private videoQualities;
    private videoBitrate;
    private connectionSpeeds;
    private connectionSpeed;
    private playbackQuality;
    private videoBufferChart;
    private audioBufferChart;
    private videoBitrateChart;
    private connectionSpeedChart;
    private pollInterval;
    private liveStartTime;
    private liveStartPlaybackTime;
    /**
     * Constructor.
     */
    constructor(player: IPlayer, video: HTMLElement);
    reset(): void;
    start(stream: StreamInfo): void;
    stop(): void;
    show(show: boolean, debugRenderingDiv?: HTMLDivElement): void;
    private registerEvents;
    private unregisterEvents;
    private init;
    private onStateChanged;
    private onPause;
    private onQualityRendered;
    private startMetricsPolling;
    private stopMetricsPolling;
    private updateMetrics;
    private updateDashMetrics;
    private updateBufferLevel;
    private updateVideoBitrate;
    private updateConnectionSpeed;
    private appendChartValue;
    private render;
    private formatDuration;
    private formatBitrate;
    private getPlaybackQualityInfos;
    private loadChartist;
    private ShowDebug;
    private createDebugPanel;
    private addStyles;
    private getHeadSection;
}
