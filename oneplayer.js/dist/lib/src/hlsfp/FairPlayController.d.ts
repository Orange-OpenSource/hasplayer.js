import { ProtectionData } from '../Types';
/**
 * Dash.js player
 */
export declare class FairPlayController {
    protected videoElement: HTMLMediaElement;
    private keySystemConfiguration;
    private mediaKeySession;
    private licenseRequest;
    private needKeyListener;
    private keyMessageListener;
    private keyAddedListener;
    private keyErrorListener;
    init(videoElement: HTMLMediaElement, protectionData: ProtectionData): void;
    reset(): void;
    private sendErrorEvent;
    private stringToArray;
    private getChallengeFormatType;
    private extractContentId;
    private getCertificate;
    private concatInitDataIdAndCertificate;
    private processLicenseMessage;
    private sendLicenseRequest;
    private processLicenseResponse;
    private getKeyError;
    private onNeedKey;
    private onKeyMessage;
    private onKeyAdded;
    private onKeyError;
}
