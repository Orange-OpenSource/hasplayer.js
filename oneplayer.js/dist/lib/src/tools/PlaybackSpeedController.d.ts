export declare class PlaybackSpeedController {
    private videoElement;
    private speed;
    private trickModeSpeed;
    private volume;
    private seekTime;
    private seekTimeout;
    private onSeekedListener;
    private playPromise;
    init(videoElement: HTMLMediaElement): void;
    reset(): void;
    setSpeed(speed: number): void;
    getSpeed(): number;
    private applySpeed;
    private startTrickMode;
    private stopTrickMode;
    private seek;
    private onSeeked;
    private onPlay;
}
