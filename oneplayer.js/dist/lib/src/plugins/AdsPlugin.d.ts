import { IPlugin } from './IPlugin';
import { StreamInfo } from '../Types';
import { IPlayer } from '../IPlayer';
import { DefaultPlayer } from '../DefaultPlayer';
/**
 * adsplayer.js plugin
 */
export declare class AdsPlugin implements IPlugin {
    protected videoElement: HTMLMediaElement;
    protected player: DefaultPlayer;
    private adsPlayer;
    private adsRenderingDiv;
    private handleMainPlayerPlayback;
    getType(): string;
    getVersion(): string;
    init(player: IPlayer, videoElement: HTMLMediaElement, config: object): void;
    enableLogs(enable: boolean): void;
    reset(): void;
    load(stream: StreamInfo): Promise<any>;
    stop(): void;
    private checkInitialized;
    private onError;
    private onStart;
    private onEnd;
    private onAddElement;
    private onRemoveElement;
    private onPlay;
    private onPause;
    private onClick;
    private sendEvent;
}
