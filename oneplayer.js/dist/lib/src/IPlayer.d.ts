import { PlayerType, StreamInfo, MediaType, TrackInfo } from './Types';
export interface IPlayer {
    /**
     * Returns version number/information from the wrapped player.
     * @return {string} version number/information
     */
    getVersion(): string;
    /**
     * Returns the player type
     * @return {PlayerType} the player type
     */
    getPlayerType(): PlayerType;
    /**
     * Initialize the player.
     * @param {HTMLElement} videoElement - the HTML5 video element used to decode and render the media data
     * @param {HTMLDivElement} ttmlRenderingDiv - the HTML5 div to render rich TTML subtitles
     * @return {Promise} a promise which is resolved once player is initialized, or rejected if player failed to initialize
     */
    init(videoElement: HTMLElement, ttmlRenderingDiv?: HTMLDivElement): Promise<void>;
    /**
     * Set configuration parameters that are specific to the embedded player.
     * Use this method if you want to override some default parameter value(s).
     * @param {object} config - the configuration parameters
     */
    setConfig(params: object): any;
    /**
     * Enable/disable player log messages.
     * @param {boolean} enable - true to enable log messages, false to disable log messages
     */
    enableLogs(enable: boolean): any;
    /**
     * Enable/disable caching last media settings such as last audio and text selected language and text tracks state.
     * When enabling caching, the settings are stored in local storage (if enabled)
     * When disable caching, all stored settings are removed from local storage
     * @param {boolean} enable - true to enable, false to disable.
     * @param {string} key - the local storage key for storing media settings (if enabled). Default value is 'oneplayerjs_media_settings'
     */
    enableLastMediaSettingsCaching(enable: boolean, key?: string): any;
    /**
     * Add event listener.
     * This method has to be used to listen for specific events raised by the wrapped player.
     * Generic video element events and OnePlayer events (see {@link PlayerEvents}) are triggered and delivered through the video element.
     * @param {string} type - the event type/name as specified by the wrapped player.
     * @param {function} listener - callback method when the event fires.
     * @param {object} scope - context of the listener so it can be removed properly.
     */
    addEventListener(type: string, listener: any, scope?: object): any;
    /**
     * Remove event listener previously registered using {@link addEventListener}
     * @param {string} type - the event type/name as specified by the wrapped player.
     * @param {function} listener - callback method when the event fires.
     * @param {object} scope - context of the listener so it can be removed properly.
     */
    removeEventListener(type: string, listener: any, scope?: object): any;
    /**
     * Destroy/clean the player instance.
     */
    reset(): any;
    /**
     * Load/open a video stream and start playback.
     * @param {StreamInfo} stream - input stream properties
     * @param {boolean} loadPlugins - true to signal to plugin a new stream is being to be loaded, false otherwise (true by default)
     */
    load(stream: StreamInfo, loadPlugins?: boolean): Promise<void>;
    /**
     * Play/resume playback of the media.
     */
    play(): Promise<void>;
    /**
     * Pause playback of the media.
     */
    pause(): any;
    /**
     * Seek the media to the new time. For LIVE streams, this function can be used to perform seeks within the DVR window if available.
     * @param {number} time - the new time value in seconds
     */
    seek(time: number): any;
    /**
     * Sets the speed/rate at which the media shall being played back.
     * A value of 1.0 indicates normal playback speed.
     * For values superior to normal speed or negative values (speeds between -1 and 0 are not supported), the player will perform fast forward or rewind playback.
     * When playback is not in normal speed, the media element is muted.
     * @param {number} speed - the new playback speed
     */
    setPlaybackSpeed(speed: number): any;
    /**
     * Returns the current playback speed.
     * @param {number} the current playback speed
     */
    getPlaybackSpeed(): number;
    /**
     * Stops/reset the playback of the video stream.
     * @param {boolean} reset - true to reset current stream playback, false otherwise in order to pause playback and seek back to beginning of the content (true by default, false enabled only fo on-demand contents)
     * @param {boolean} stopPlugins - true to signal to plugin the stream is being to be stopped, false otherwise (true by default)
     */
    stop(reset?: boolean, stopPlugins?: boolean): any;
    /**
     * Returns the duration of the media's playback, in seconds.
     * For live a stream, it returns the duration of the DVR window if available, Number.Infinity otherwise
     */
    getDuration(): number;
    /**
     * Returns true if the current stream is a live stream.
     * @return {boolean} true if current stream is a live stream, false otherwise
     */
    isLive(): boolean;
    /**
     * Returns the current time of the playhead.
     * For a live stream, it returns the time within the DVR window (see {@link getDuration getDuration()} method) if available, the absolute media time otherwise.
     */
    getTime(): number;
    /**
     * Returns the list of tracks for a given media type
     * @returns {object} the list of {@link TrackInfo} for each media type
     */
    getTracks(type: MediaType): object;
    /**
     * Returns the list of tracks for a given media type
     * @param {MediaType} - the media type
     * @returns {Array} list of {@link TrackInfo}
     */
    getTracksForType(type: MediaType): TrackInfo[];
    /**
     * Returns the selected track for a given media type
     * @param {MediaType} type - the media type
     * @returns {TrackInfo} the selected track for the given media type
     */
    getSelectedTrackForType(type: MediaType): TrackInfo;
    /**
     * Returns the current quality for a given media type
     * @param {MediaType} type - the media type
     * @returns {number} the index of current quality in the qualities array of the selected track of the given media type
     */
    getQualityForType(type: MediaType): number;
    /**
     * Returns the current buffer level for a given media type
     * @param {MediaType} type - the media type
     * @returns {number} the current buffer level in ms of the selected track of the given media type
     */
    getBufferLevelForType(type: MediaType): number;
    /**
     * Selects the given track for a given media type
     * In case of text media type, selecting a text track will also enable the text tracks (see {@link enableText})
     * @param {MediaType} type - the media type
     * @param {string} the id of the track to select
     */
    selectTrackForType(type: MediaType, id: string): any;
    /**
     * Selects the given track
     * @param {TrackInfo} track - the track to select
     */
    selectTrack(track: TrackInfo): any;
    /**
     * Sets the default audio language when loading a stream
     * @param {string} lang - the default audio language code based on ISO 639-2
     */
    setDefaultAudioLanguage(lang: string): any;
    /**
     * Sets the default text language when loading a stream
     * @param {string} lang - the default text language code based on ISO 639-2
     */
    setDefaultTextLanguage(lang: string): any;
    /**
     * Enable/disable download and display of text tracks.
     * @param {boolean} enable - true to enable text tracks, false to disable
     */
    enableText(enable: boolean): any;
    /**
     * Returns true if text tracks are enabled, false otherwise.
     * @return {boolean} true if text tracks are enabled, false otherwise
     */
    isTextEnabled(): boolean;
    /**
     * Sets the default text tracks enable state when loading a stream
     * @param {boolean} enable - true if text tracks are enabled by default
     */
    setDefaultTextEnabled(enable: boolean): any;
    /**
     * Displays over video element the advanced debug/metrics window
     * @param {boolean} show - true to display the advanced debug/metrics window, false to hide/remove it
     * @param {HTMLDivElement} debugRenderingDiv - the HTML5 div into which to render debug/metrics window. If not provided,
     * the debug/metrics window will be appended as a child of the video element's parent element.
     */
    showDebug(show: boolean, debugRenderingDiv?: HTMLDivElement): any;
}
