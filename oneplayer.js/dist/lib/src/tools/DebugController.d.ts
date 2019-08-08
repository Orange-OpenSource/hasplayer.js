import { IPlayer } from '../IPlayer';
import { StreamInfo } from '../Types';
export declare class DebugController {
    private player;
    private debugPanel;
    private debug;
    private onKeyPressedListener;
    private version;
    /**
     * Constructor.
     */
    constructor(player: IPlayer, video: HTMLElement);
    reset(): void;
    start(stream: StreamInfo): void;
    stop(): void;
    showDebugPanel(show: boolean, debugRenderingDiv?: HTMLDivElement): void;
    private onKeyPressed;
}
