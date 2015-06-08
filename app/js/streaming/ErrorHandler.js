/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

MediaPlayer.dependencies.ErrorHandler = function () {
    "use strict";

    return {
        eventBus: undefined,

        sendError: function (code, message, data) {
            this.eventBus.dispatchEvent({
                type: "error",
                event: {code : code, message: message, data: data}
            });
        }
    };
};

MediaPlayer.dependencies.ErrorHandler.prototype = {
    constructor: MediaPlayer.dependencies.ErrorHandler
};


MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_ABORTED = "MEDIA_ERR_ABORTED";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_NETWORK = "MEDIA_ERR_NETWORK";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_DECODE = "MEDIA_ERR_DECODE";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_SRC_NOT_SUPPORTED = "MEDIA_ERR_SRC_NOT_SUPPORTED";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_ENCRYPTED = "MEDIA_ERR_ENCRYPTED";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_REMOVE_SOURCEBUFFER = "MEDIA_ERR_REMOVE_SOURCEBUFFER";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CREATE_SOURCEBUFFER = "MEDIA_ERR_CREATE_SOURCEBUFFER";

MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_CODEC = "MANIFEST_ERR_CODEC";
MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_PARSE = "MANIFEST_ERR_PARSE";
MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_NOSTREAM = "MANIFEST_ERR_NOSTREAM";

MediaPlayer.dependencies.ErrorHandler.prototype.CAPABILITY_ERR_MEDIASOURCE = "CAPABILITY_ERR_MEDIASOURCE";
MediaPlayer.dependencies.ErrorHandler.prototype.CAPABILITY_ERR_MEDIAKEYS = "CAPABILITY_ERR_MEDIAKEYS";

MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_MANIFEST = "DOWNLOAD_ERR_MANIFEST";
MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_SIDX = "DOWNLOAD_ERR_SIDX";
MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_CONTENT = "DOWNLOAD_ERR_CONTENT";
MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_INIT = "DOWNLOAD_ERR_INIT";

MediaPlayer.dependencies.ErrorHandler.prototype.CC_ERR_PARSE = "CC_ERR_PARSE";

MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_UNKNOWN = "MEDIA_KEYERR_UNKNOWN";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_CLIENT = "MEDIA_KEYERR_CLIENT";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_SERVICE = "MEDIA_KEYERR_SERVICE";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_OUTPUT = "MEDIA_KEYERR_OUTPUT";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_HARDWARECHANGE = "MEDIA_KEYERR_HARDWARECHANGE";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_DOMAIN = "MEDIA_KEYERR_DOMAIN";

MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYSYSERR_UNSUPPORTED = "MEDIA_KEYSYSERR_UNSUPPORTED";

MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYMESSERR_INVALID_HEADER = "MEDIA_KEYMESSERR_INVALID_HEADER";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYMESSERR_URL_LICENSER_UNKNOWN = "MEDIA_KEYMESSERR_URL_LICENSER_UNKNOWN";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYMESSERR_NOCHALLENGE = "MEDIA_KEYMESSERR_NOCHALLENGE";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYMESSERR_XHR_ABORTED = "MEDIA_KEYMESSERR_XHR_ABORTED";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYMESSERR_XHR_ERROR = "MEDIA_KEYMESSERR_XHR_ERROR";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYMESSERR_KEY_UNKNOWN = "MEDIA_KEYMESSERR_KEY_UNKNOWN";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYMESSERR_MULTIKEYS_UNSUPPORTED = "MEDIA_KEYMESSERR_MULTIKEYS_UNSUPPORTED";
MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYMESSERR_NO_SESSION = "MEDIA_KEYMESSERR_NO_SESSION";

MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_INDEX_SIZE = 1;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_HIERARCHY_REQUEST = 3;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_WRONG_DOCUMENT = 4;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_INVALID_CHARACTER = 5;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_NO_MODIFICATION_ALLOWED = 7;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_NOT_FOUND = 8;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_NOT_SUPPORTED = 9;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_INVALID_STATE = 11;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_SYNTAX = 12;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_INVALID_MODIFICATION = 13;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_NAMESPACE = 14;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_INVALID_ACCESS = 15;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_SECURITY = 18;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_NETWORK = 19;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_ABORT = 20;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_URL_MISMATCH = 21;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_QUOTA_EXCEEDED = 22;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_TIMEOUT = 23;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_INVALID_NODE_TYPE = 24;
MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_DATA_CLONE = 25;