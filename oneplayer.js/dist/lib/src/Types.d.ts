export declare enum PlayerType {
    /** dash.js */
    DASHJS = "DASHJS",
    /** Native HLS + FairPlay (Safari only) */
    HLSFP = "HLSFP"
}
export declare enum HasProtocol {
    /** MPEG-DASH */
    DASH = "DASH",
    /** Microsoft Smooth Streaming */
    MSS = "MSS",
    /** Apple Http Live Streaming */
    HLS = "HLS"
}
export declare enum ServiceType {
    /** Live service */
    LIVE = "LIVE",
    /** On-demand such as VOD or catchup */
    ONDEMAND = "ONDEMAND"
}
export declare enum PluginType {
    /** Metrics collector, using project metricsagent.js */
    METRICS = "METRICS",
    /** Ad-insertion, using project adsplayer.js */
    ADINSERTION = "ADINSERTION"
}
export declare enum ChallengeFormatType {
    OCTET_STREAM = "octet-stream",
    TEXT = "text"
}
export interface KeySystemConfiguration {
    /** The licenser server URL */
    serverURL?: string;
    /** Wether license request is made using credentials */
    withCredentials?: Boolean;
    /** The HTTP request headers to be set in the license request as an object containing list of key/values pairs */
    httpRequestHeaders?: object;
    /** The licenser server certificate as a BASE64 string representation of the binary stream */
    serverCertificate?: string;
    /** The audio robustness level */
    audioRobustness?: string;
    /** The video robustness level */
    videoRobustness?: string;
    /** The session type (see https://w3c.github.io/encrypted-media/#dom-mediakeysessiontype) */
    sessionType?: string;
    /** The session id (see https://w3c.github.io/encrypted-media/#session-id) */
    sessionId?: string;
    /** The license request challenge format, 'octet-stream' or 'text' */
    challengeFormat?: ChallengeFormatType;
}
export interface ProtectionData {
    /** List of property names corresponding to key system name strings and associated values being instances of KeySystemConfiguration */
    [keySystemId: string]: KeySystemConfiguration;
}
export interface StreamInfo {
    /** The manifest URL */
    url: string;
    /** The HTTP streaming protocol */
    protocol?: HasProtocol;
    /** The service type */
    type?: ServiceType;
    /** The protection data */
    protData?: ProtectionData;
    /** The start time (in seconds) at which playback should start */
    startTime?: number;
    /** The metrics collector server URL */
    metricsUrl?: string;
    /** The ad-insertion description (MAST) file URL */
    adsUrl?: string;
    /** Some user/service specific data as an object containing list of key/values pairs */
    userData?: object;
}
export declare enum MediaType {
    /** Video */
    Video = "video",
    /** Audio */
    Audio = "audio",
    /** Text */
    Text = "text"
}
export declare enum AudioKind {
    /** A possible alternative to the main track, e.g., a different take of a song (audio) */
    Alternative = "alternative",
    /** An audio description of a video track */
    Descriptions = "descriptions",
    /** The primary audio track */
    Main = "main",
    /** The primary audio track, mixed with audio descriptions */
    MainDesc = "main-desc",
    /** A translated version of the main audio track */
    Translation = "translation",
    /** The primary audio track, mixed with audio descriptions */
    Commentary = "commentary",
    /** Audio cleaned of ambient noise, for the hearing impaired */
    Clean = "clean"
}
export declare enum TextKind {
    /** Transcription or translation of audio, suitable for when sound is unavailable or not clearly audible
        (e.g., because it is muted, drowned-out by ambient noise, or because the user is deaf) */
    Captions = "captions",
    /** Transcription or translation of the dialog, suitable for when the sound is available but not understood
       (e.g., because the user does not understand the language of the media resource’s audio track) */
    Subtitles = "subtitles",
    /** Textual descriptions of the video content, when the visual content is obscured, unavailable, or not usable */
    Descriptions = "descriptions",
    /** The track defines chapter titles (suitable for navigating the media resource) */
    Chapters = "chapters",
    /** The track defines content used by scripts. Not visible for the user */
    Metadata = "metadata"
}
export interface Quality {
    /** The encoding bitrate (in bits/sec) */
    bitrate: number;
    /** The video width (in case of video tracks) */
    width?: number;
    /** The video height (in case of video tracks) */
    height?: number;
}
export interface TrackInfo {
    /** The track media type */
    mediaType: MediaType;
    /** The track ID */
    id: string;
    /** The track selected state */
    selected: boolean;
    /** The track kind or category (for audio or text tracks) */
    kind?: AudioKind | TextKind;
    /** The track language based on ISO 639-2 */
    lang?: string;
    /** The mime-type of the track content format  */
    mimeType?: string;
    /** The codec used to encode the track content */
    codec?: string;
    /** The list of availables qualities for the track */
    qualities?: Quality[];
}
export declare enum PlayerEvents {
    /**
     * The PLAYER_ERROR event is fired when an error occurs.
     * When the PLAYER_ERROR event is fired, the application shall stop the player using the {@link IPlayer.stop} method.
     * <br/>Event properties:
     * @event PLAYER_ERROR
     * @property <b>name</b>: string - the event name (PLAYER_ERROR)
     * @property <b>detail</b>: {@link PlayerError} - the error
     */
    PLAYER_ERROR = "player_error",
    /**
     * The AD_ERROR event is fired when an error is raised by the AdsPlugin.
     * <br/>Event properties:
     * @event AD_ERROR
     * @property <b>name</b>: string - the event name (AD_ERROR)
     * @property <b>detail</b>: {@link PlayerError} - the error
     */
    AD_ERROR = "ad_error",
    /**
     * The AD_START event is fired when some ads will start to play.
     * When the AD_START event is fired, the application shall record the current video time and stop the player using the {@link IPlayer.stop} method.
     * This event may be fired when the ADINSERTION plugin is loaded.
     * <br/>Event properties:
     * @event AD_START
     * @property <b>name</b>: string - the event name (AD_START)
     */
    AD_START = "ad_start",
    /**
     * The AD_END event is fired when some ads ended to play.
     * When the AD_END event is fired, the application shall restart the player, at the recorded playback time, using the {@link IPlayer.load} method.
     * This event may be fired when the ADINSERTION plugin is loaded.
     * <br/>Event properties:
     * @event AD_START
     * @property <b>name</b>: string - the event name (AD_END)
     */
    AD_END = "ad_end"
}
export declare enum LogLevel {
    NONE = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4
}
