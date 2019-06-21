export declare enum PlayerErrorCode {
    MEDIA_ERR_ABORTED = 1,
    MEDIA_ERR_NETWORK = 2,
    /**
     * The HTMLVideoElement failed to decode the audio or video stream
     */
    MEDIA_ERR_DECODE = 3,
    /**
     * Audio or video media type is not supported by the HTMLVideoElement
     */
    MEDIA_ERR_SRC_NOT_SUPPORTED = 4,
    /**
     * The stream could not be played because it is encrypted and one of the following:</br>
     * <ul>
     * <li>No key was provided and no needkey handler was provided</li>
     * <li>The provided key could not be successfully applied</li>
     * <li>The user agent does not support decryption of this media data</li>
     * </ul>
     */
    MEDIA_ERR_ENCRYPTED = 5,
    /**
     * The user agent does not support Media Source Extensions.
     */
    CAPABILITY_ERR_MEDIASOURCE = 10,
    /**
     * The mime-type or codec is not supported.
     */
    CAPABILITY_ERR_CODEC_UNSUPPORTED = 11,
    /**
     * The player failed to download the manifest.
     * Error data properties:
     * @property <b>url</b>: string - the manifest url
     * @property <b>status</b>: number - the response status code
     * @property <b>response</b>: string - the response text
     */
    DOWNLOAD_ERR_MANIFEST = 20,
    /**
     * The player failed to download some media segments, leading to freeze playback of the content.
     * Error data properties:
     * @property <b>url</b>: string - the manifest url
     * @property <b>status</b>: number - the response status code
     * @property <b>response</b>: string - the response text
     */
    DOWNLOAD_ERR_CONTENT = 21,
    /**
     * The user agent does not support Encrypted Media Extensions or they are disabled (unsecure origin).
     */
    CAPABILITY_ERR_MEDIAKEYS = 100,
    /**
     * An unspecified error occurred. This value is used for errors that don't match any of the following codes.
     * </br><i>Note: This error may be raised in user agents embedding Encrypted Media Extensions v0.1 (July 2012)</i>
     */
    MEDIA_KEYERR_UNKNOWN = 101,
    /**
     * The Key System could not be installed or updated.
     * </br><i>Note: This error may be raised in user agents embedding Encrypted Media Extensions v0.1 (July 2012)</i>
     */
    MEDIA_KEYERR_CLIENT = 102,
    /**
     * The message passed into addKey indicated an error from the license service.
     * </br><i>Note: This error may be raised in user agents embedding Encrypted Media Extensions v0.1 (July 2012)</i>
     */
    MEDIA_KEYERR_SERVICE = 103,
    /**
     * There is no available output device with the required characteristics for the content protection system.
     * </br><i>Note: This error may be raised in user agents embedding Encrypted Media Extensions v0.1 (July 2012)</i>
     */
    MEDIA_KEYERR_OUTPUT = 104,
    /**
     * A hardware configuration change caused a content protection error.
     * </br><i>Note: This error may be raised in user agents embedding Encrypted Media Extensions v0.1 (July 2012)</i>
     */
    MEDIA_KEYERR_HARDWARECHANGE = 105,
    /**
     * An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.
     * </br><i>Note: This error may be raised in user agents embedding Encrypted Media Extensions v0.1 (July 2012)</i>
     */
    MEDIA_KEYERR_DOMAIN = 106,
    /**
     * Key system access has been denied. No Key System compatible with Key Systems used to encrypt the content is available
     * in the user agent, or the Key System does not support requested capabilities.
     */
    MEDIAKEYS_ERR_KEYSYSTEM_ACCESS = 110,
    /**
     * An error occurred when providing to the CDM the server certificate to be used to encrypt messages to the license server.
     */
    MEDIAKEYS_ERR_SERVER_CERTIFICATE = 111,
    /**
     * an error occured either while creating a session and generate a license request, either while loading a persistent session.
     */
    MEDIAKEYS_ERR_CREATE_SESSION = 112,
    /**
     * The licenser server URL has not been provided.
     */
    MEDIAKEYS_ERR_UNKNOWN_LICENSER = 113,
    /**
     * The license request to the licenser server failed.
     * Error data properties:
     * @property <b>url</b>: string - the license server url
     * @property <b>status</b>: number - the response status code
     * @property <b>response</b>: string - the response text
     */
    MEDIAKEYS_ERR_LICENSE_REQUEST = 114,
    /**
     * An error occurred while providing messages, including licenses, to the CDM.
     */
    MEDIAKEYS_ERR_KEY_ERROR = 115,
    /**
     * The license has expired.
     */
    MEDIAKEYS_ERR_EXPIRED = 116,
    /**
     * There are output restrictions associated with the key that cannot currently be met.
     * Media data decrypted with this key may be blocked from presentation, if necessary according to the output restrictions.
     */
    MEDIAKEYS_ERR_OUTPUT_RESTRICTED = 117,
    /**
     * The key is not currently usable for decryption because of an error in the CDM.
     */
    MEDIAKEYS_ERR_INTERNAL_ERROR = 118,
    /**
     * Content morality level is too high to be played. It is necessary to unlock the stream with the appropriate adult code.
     */
    MEDIA_MORALITY_ERR = 130,
    /**
     * An error occurred when executing a player API function.
     */
    PLAYER_API_ERROR = 998,
    /**
     * An internal error in the player.
     * The data property contains the error as returned by the player
     */
    PLAYER_INTERNAL_ERROR = 999
}
export interface PlayerError {
    /** The error code */
    code: PlayerErrorCode;
    /** The error message */
    message: string;
    /** Extended message */
    extMessage?: string;
    /** The error data. Refer to each code to get the data object properties description */
    data?: object;
}
export declare const PlayerErrorMessage: {};
