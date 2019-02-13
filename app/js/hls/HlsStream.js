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

Hls.dependencies.HlsStream = function() {
    "use strict";

    var REQUEST_PARAMS = {
        stream: {
            responseType: 'arraybuffer',
            contentType: 'application/octet-stream'
        },
        text: {
            responseType: 'text',
            contentType: 'application/x-www-form-urlencoded'
        },
    };

    var manifestUrl = null,
        subtitlesEnabled = false,
        autoPlay = true,
        initialized = false,
        errored = false,

        protectionData,
        licenseRequest = null,

        // Events listeners
        endedListener,
        loadedmetadataListener,
        loadeddataListener,
        playListener,
        pauseListener,
        errorListener,
        seekingListener,
        seekedListener,
        timeupdateListener,
        waitingListener,
        durationchangeListener,
        progressListener,
        ratechangeListener,
        canplayListener,
        playingListener,
        loadstartListener,

        needKeyListener,
        keyMessageListener,
        keyAddedListener,
        keyErrorListener,

        // Audio/text languages
        defaultAudioLang = 'und',
        defaultSubtitleLang = 'und',

        // Initial start time
        initialStartTime = -1,

        play = function() {
            if (!initialized) {
                return;
            }

            this.debug.info("[Stream] Play.");
            this.videoModel.play();
        },

        pause = function() {
            this.debug.info("[Stream] Pause.");
            this.videoModel.pause();
        },

        seek = function(time/*, autoplay*/) {
            if (!initialized) {
                //this.debug.info("[Stream] (seek) not initialized");
                return;
            }

            this.debug.info("[Stream] Seek: " + time);

            this.videoModel.setCurrentTime(time);
        },

        onLoadedMetadata = function() {
            this.debug.info("[Stream] <video> loadedmetadata event");
            this.metricsModel.addMetaData();
            this.metricsModel.addState("video", "buffering", this.getVideoModel().getCurrentTime());
        },

        onLoadedData = function() {
            this.debug.info("[Stream] <video> loadeddata event");
            this.setAudioLang(defaultAudioLang);
            this.enableSubtitles(subtitlesEnabled);
        },

        onCanPlay = function() {
            this.debug.info("[Stream] <video> canplay event");
            if (autoPlay) {
                this.videoModel.play();
            }
        },

        onPlaying = function() {
            this.debug.info("[Stream] <video> playing event");
            this.metricsModel.addState("video", "playing", this.getVideoModel().getCurrentTime());
        },

        onLoadStart = function() {
            this.debug.info("[Stream] <video> loadstart event");
        },

        onPlay = function() {
            this.debug.info("[Stream] <video> play event");

            this.metricsModel.addPlayList("video", new Date().getTime(), this.videoModel.getCurrentTime(), "play");
        },

        onEnded = function() {
            this.debug.info("[Stream] <video> ended event");
            //add stopped state metric with reason = 1 : end of stream
            this.metricsModel.addState("video", "stopped", this.videoModel.getCurrentTime(), 1);
        },

        onPause = function() {
            this.debug.info("[Stream] <video> pause event");
            this.metricsModel.addState("video", "paused", this.videoModel.getCurrentTime());
            this.metricsModel.addPlayList("video", new Date().getTime(), this.videoModel.getCurrentTime(), "pause");
        },

        onError = function(event) {
            var error = event.target.error,
                code,
                message = "[Stream] <video> error: ",
                data = null;

            if (error.code === -1) {
                // not an error!
                return;
            }

            switch (error.code) {
                case 1:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_ABORTED;
                    message += "[HLS] The fetching process for the media resource was aborted by the user";
                    break;
                case 2:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_NETWORK;
                    message += "[HLS] A network error has caused the user agent to stop fetching the media resource";
                    break;
                case 3:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_DECODE;
                    message += "[HLS] An error has occurred in the decoding of the media resource";
                    break;
                case 4:
                    // code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_SRC_NOT_SUPPORTED;
                    // message += "[HLS] The media could not be loaded, either because the server or network failed or because the format is not supported";
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_MANIFEST;
                    message = "[HLS] Failed to download manifest";
                    data = {
                        url: manifestUrl,
                        status: 0 // Set 0 as we have no way to get response status code
                    };
                    break;
                case 5:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_ENCRYPTED;
                    message += "[HLS] The encrypted media stream could not be played";
                    break;
            }

            errored = true;

            this.errHandler.sendError(code, message, data);
        },

        onSeeking = function() {
            this.debug.info("[Stream] <video> seeking event: " + this.videoModel.getCurrentTime());
            this.metricsModel.addState("video", "seeking", this.videoModel.getCurrentTime());
            this.metricsModel.addPlayList('video', new Date().getTime(), this.getVideoModel().getCurrentTime(), MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);
        },

        onSeeked = function() {
            // this.debug.info("[Stream] <video> seeked event");
        },

        onProgress = function() {
            // this.debug.info("[Stream] <video> progress event");
        },

        onTimeupdate = function() {
            this.debug.info("[Stream] <video> timeupdate event: " + this.videoModel.getCurrentTime());
        },

        onWaiting = function() {
            this.debug.info("[Stream] <video> waiting event");
            if (!this.getVideoModel().isSeeking()) {
                this.metricsModel.addState("video", "buffering", this.getVideoModel().getCurrentTime());
            }
        },

        onDurationchange = function() {
            this.debug.info("[Stream] <video> durationchange event: " + this.videoModel.getDuration());
        },

        onRatechange = function() {
            this.debug.info("[Stream] <video> ratechange event: " + this.videoModel.getPlaybackRate());
        },

        getKsProtectionData = function(ks) {
            if (!protectionData) {
                return null;
            }
            return protectionData[ks];
        },

        stringToArray = function (string) {
            var buffer = new ArrayBuffer(string.length * 2); // 2 bytes for each char
            var array = new Uint16Array(buffer);
            for (var i = 0; i < string.length; i++) {
                array[i] = string.charCodeAt(i);
            }
            return array;
        },

        extractContentId = function (initData) {
            var contentId = String.fromCharCode.apply(null, new Uint16Array(initData.buffer));

            var parts = contentId.split("//");
            if (parts.length != 2) {
              throw "Invalid content key format";
            }

            return parts[1];
        },

        getCertificate = function () {
            var protData = getKsProtectionData('com.apple.fps.1_0');
            if (!protData || !protData.serverCertificate) {
                return new Uint8Array(0);
            }
            return BASE64.decodeArray(protData.serverCertificate);
        },

        concatInitDataIdAndCertificate = function (initData, id, cert) {
            if (typeof id == "string")
                id = stringToArray(id);

            // layout is [initData][4 byte: idLength][idLength byte: id][4 byte:certLength][certLength byte: cert]
            var offset = 0;
            var buffer = new ArrayBuffer(initData.byteLength + 4 + id.byteLength + 4 + cert.byteLength);
            var dataView = new DataView(buffer);

            var initDataArray = new Uint8Array(buffer, offset, initData.byteLength);
            initDataArray.set(initData);
            offset += initDataArray.byteLength;

            dataView.setUint32(offset, id.byteLength, true);
            offset += 4;

            var idArray = new Uint16Array(buffer, offset, id.length);
            idArray.set(id);
            offset += idArray.byteLength;

            dataView.setUint32(offset, cert.byteLength, true);
            offset += 4;

            var certArray = new Uint8Array(buffer, offset, cert.byteLength);
            certArray.set(cert);

            return new Uint8Array(buffer, 0, buffer.byteLength);
        },

        processLicenseMessage = function (session, type, message) {

            if (type === 'text') {
                message = String.fromCharCode.apply(null, message);
                message = 'spc=' + BASE64.encodeASCII(message) + '&assetId=' + encodeURIComponent(session.contentId);
            }

            return message;
        },

        sendLicenseRequest = function (session, type, url, body) {
            var self = this,
                needFailureReport = true,

            licenseRequest = new XMLHttpRequest();
            licenseRequest.responseType = REQUEST_PARAMS[type].responseType;
            licenseRequest.session = session;

            licenseRequest.onload = function() {

                if (this.status < 200 || this.status > 299) {
                    return;
                }

                if (this.status === 200 && this.readyState === 4) {
                    self.debug.log("[DRM] Received license response");
                    needFailureReport = false;
                    processLicenseResponse(this, type);
                    // this.session.update(new Uint8Array(licenseRequest.response));
                }
            };

            licenseRequest.onerror = licenseRequest.onloadend = function() {
                if (!needFailureReport) {
                    licenseRequest = null;
                    return;
                }
                needFailureReport = false;

                // Raise error only if request has not been aborted by reset
                if (!this.aborted) {
                    self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYMESSERR_LICENSER_ERROR, "License request failed", {url: url, status: this.status, error: this.response});
                }
                licenseRequest = null;
            };

            licenseRequest.open('POST', url, true);
            licenseRequest.setRequestHeader('Content-Type', REQUEST_PARAMS[type].contentType);
            licenseRequest.send(body);
        },

        processLicenseResponse = function (request, type) {
            var key;

            if (type === 'text') {
                // Response can be of the form: '\n<ckc>base64encoded</ckc>\n', so trim the excess:
                key = request.responseText.trim();
                if (key.substr(0, 5) === '<ckc>' && key.substr(-6) === '</ckc>')
                    key = key.slice(5,-6);
                key = BASE64.decodeArray(key);
            } else {
                key = new Uint8Array(request.response);
            }

            request.session.update(key);
        },

        getKeyError = function(event) {
            var error = event.target.error,
                code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR,
                msg = "MediakeyError";

            if (error) {
                switch (error.code) {
                    case 1:
                        code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_UNKNOWN;
                        msg = "An unspecified error occurred. This value is used for errors that don't match any of the other codes.";
                        break;
                    case 2:
                        code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_CLIENT;
                        msg = "The Key System could not be installed or updated.";
                        break;
                    case 3:
                        code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_SERVICE;
                        msg = "The message passed into update indicated an error from the license service.";
                        break;
                    case 4:
                        code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_OUTPUT;
                        msg = "There is no available output device with the required characteristics for the content protection system.";
                        break;
                    case 5:
                        code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_HARDWARECHANGE;
                        msg += "A hardware configuration change caused a content protection error.";
                        break;
                    case 6:
                        code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_DOMAIN;
                        msg = "An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.";
                        break;
                    default:
                        code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_UNKNOWN;
                        msg = "An unspecified error occurred. This value is used for errors that don't match any of the other codes.";
                        break;
                }
            } else {
                code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYERR_UNKNOWN;
                msg = "An unspecified error occurred. This value is used for errors that don't match any of the other codes.";
            }
            if (error.systemCode) {
                msg += "  (System Code = " + event.systemCode + ")";
            }
            return new MediaPlayer.vo.protection.KeyError(code, msg);
        },

        onNeedKey = function(e) {
            this.debug.info("[Stream] <video> needkey event", e);

            var video = this.videoModel.getElement(),
                contentId = extractContentId(e.initData),
                certificate = getCertificate();

            var initData = concatInitDataIdAndCertificate(e.initData, contentId, certificate);

            var mediaKeys = new WebKitMediaKeys('com.apple.fps.1_0');
            video.webkitSetMediaKeys(mediaKeys);
            var session = video.webkitKeys.createSession('video/mp4', initData);

            if (!session)
                throw "Could not create key session";

            if (session.error) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYMESSERR_NO_SESSION,
                    "Failed to create key session", {code: session.error.code, systemCode: session.error.systemCode});
            }

            session.contentId = contentId;

            session.addEventListener("webkitkeymessage", keyMessageListener, false);
            session.addEventListener("webkitkeyadded", keyAddedListener, false);
            session.addEventListener("webkitkeyerror", keyErrorListener, false);
        },

        onKeyMessage = function(e) {

            this.debug.info("[Stream] keymessage event", e);

            var session = e.target,
                message = e.message,
                url = null,
                type,
                protData = getKsProtectionData('com.apple.fps.1_0');

            if (protData) {
                if (protData.serverURL && typeof protData.serverURL === "string" && protData.serverURL !== "") {
                    url = protData.serverURL;
                } else if (protData.laURL && protData.laURL !== "") { // TODO: Deprecated!
                    url = protData.laURL;
                }
            }

            if (url === null) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_KEYMESSERR_URL_LICENSER_UNKNOWN, "No license server URL specified");
                return;
            }

            type = (protData && protData.requestType && protData.requestType === 'text') ? 'text' : 'stream';

            message = processLicenseMessage(session, type, message);
            sendLicenseRequest.call(this, session, type, url, message);
        },

        onKeyAdded = function(e) {
            this.debug.info("[Stream] keyadded event", e);
        },

        onKeyError = function(e) {
            this.debug.info("[Stream] keyerror event", e);
            var error = getKeyError(e);
            this.errHandler.sendError(error.code, error.msg);
        };

    return {
        system: undefined,
        videoModel: undefined,
        capabilities: undefined,
        debug: undefined,
        metricsExt: undefined,
        errHandler: undefined,
        metricsModel: undefined,
        eventBus: undefined,
        notify: undefined,

        setup: function() {

            playListener = onPlay.bind(this);
            pauseListener = onPause.bind(this);
            errorListener = onError.bind(this);
            seekingListener = onSeeking.bind(this);
            seekedListener = onSeeked.bind(this);
            progressListener = onProgress.bind(this);
            ratechangeListener = onRatechange.bind(this);
            timeupdateListener = onTimeupdate.bind(this);
            waitingListener = onWaiting.bind(this);
            durationchangeListener = onDurationchange.bind(this);
            loadedmetadataListener = onLoadedMetadata.bind(this);
            loadeddataListener = onLoadedData.bind(this);
            canplayListener = onCanPlay.bind(this);
            playingListener = onPlaying.bind(this);
            loadstartListener = onLoadStart.bind(this);

            needKeyListener = onNeedKey.bind(this);
            keyMessageListener = onKeyMessage.bind(this);
            keyAddedListener = onKeyAdded.bind(this);
            keyErrorListener = onKeyError.bind(this);

            endedListener = onEnded.bind(this);
        },

        load: function(url) {
            manifestUrl = url;
            if (initialStartTime >= 0) {
                url += '#t=' + initialStartTime;
            }
            this.videoModel.setSource(url);
        },

        setVideoModel: function(value) {
            this.videoModel = value;
            this.videoModel.listen("play", playListener);
            this.videoModel.listen("pause", pauseListener);
            this.videoModel.listen("error", errorListener);
            this.videoModel.listen("seeking", seekingListener);
            this.videoModel.listen("seeked", seekedListener);
            this.videoModel.listen("timeupdate", timeupdateListener);
            this.videoModel.listen("waiting", waitingListener);
            this.videoModel.listen("durationchange", durationchangeListener);
            this.videoModel.listen("progress", progressListener);
            this.videoModel.listen("ratechange", ratechangeListener);
            this.videoModel.listen("loadedmetadata", loadedmetadataListener);
            this.videoModel.listen("loadeddata", loadeddataListener);
            this.videoModel.listen("ended", endedListener);
            this.videoModel.listen("canplay", canplayListener);
            this.videoModel.listen("playing", playingListener);
            this.videoModel.listen("loadstart", loadstartListener);

            this.videoModel.listen("webkitneedkey", needKeyListener);
        },

        reset: function() {
            this.debug.info("[Stream] Reset");

            pause.call(this);

            // Abort license request
            if (licenseRequest) {
                licenseRequest.aborted = true;
                licenseRequest.abort();
            }

            this.videoModel.unlisten("play", playListener);
            this.videoModel.unlisten("pause", pauseListener);
            this.videoModel.unlisten("error", errorListener);
            this.videoModel.unlisten("seeking", seekingListener);
            this.videoModel.unlisten("seeked", seekedListener);
            this.videoModel.unlisten("timeupdate", timeupdateListener);
            this.videoModel.unlisten("waiting", waitingListener);
            this.videoModel.unlisten("durationchange", durationchangeListener);
            this.videoModel.unlisten("progress", progressListener);
            this.videoModel.unlisten("ratechange", ratechangeListener);
            this.videoModel.unlisten("loadedmetadata", loadedmetadataListener);
            this.videoModel.unlisten("loadeddata", loadeddataListener);
            this.videoModel.unlisten("ended", endedListener);
            this.videoModel.unlisten("canplay", canplayListener);
            this.videoModel.unlisten("playing", playingListener);
            this.videoModel.unlisten("loadstart", loadstartListener);

            this.videoModel.unlisten("webkitneedkey", needKeyListener);

            this.debug.info("[Stream] Reset source");
            this.videoModel.setSource(null);
            this.videoModel = null;

            return Q.when(true);
        },


        setProtectionData: function(protData) {
            protectionData = protData;
        },

        setInitialStartTime: function(startTime) {
            var time = parseFloat(startTime);
            if (!isNaN(time)) {
                initialStartTime = time;
            }
        },

        getAudioTracks: function() {
            var audioTracks = [],
                tracks = this.getVideoModel().getElement().audioTracks;
            if (tracks.length === 0) {
                return [];
            }

            for (var i = 0; i < tracks.length; i++) {
                audioTracks.push({
                    type: 'audio',
                    id: tracks[i].id,
                    lang: tracks[i].language
                });
            }
            // this.debug.log('[Stream] audio track: ' + JSON.stringify(audioTracks));
            return audioTracks;
        },

        setAudioLang: function(lang) {
            this.debug.log('[Stream] Set audio lang: ' + lang);
            var tracks = this.getVideoModel().getElement().audioTracks;
            if (tracks.length === 0) {
                return;
            }
            for (var i = 0; i < tracks.length; i++) {
                if (lang === tracks[i].language) {
                    tracks[i].enabled = true;
                }
            }
        },

        setAudioTrack: function(audioTrack) {
            this.debug.log('[Stream] Set audio track: ' + audioTrack.lang);
            var tracks = this.getVideoModel().getElement().audioTracks;
            if (tracks.length === 0) {
                return;
            }
            for (var i = 0; i < tracks.length; i++) {
                if (audioTrack.id === tracks[i].id &&
                    audioTrack.lang === tracks[i].language) {
                    tracks[i].enabled = true;
                }
            }
        },

        getSelectedAudioTrack: function() {
            var tracks = this.getVideoModel().getElement().audioTracks;
            for (var i = 0; i < tracks.length; i++) {
                if (tracks[i].enabled) {
                    return {
                        type: 'audio',
                        id: tracks[i].id,
                        lang: tracks[i].language
                    };
                }
            }
            return null;
        },

        getSubtitleTracks: function() {
            var textTracks = [],
                tracks = this.getVideoModel().getElement().textTracks;
            if (tracks.length === 0) {
                return [];
            }

            for (var i = 0; i < tracks.length; i++) {
                textTracks.push({
                    type: 'text',
                    id: tracks[i].label,
                    lang: tracks[i].language
                });
            }
            // this.debug.log('[Stream] text track: ' + JSON.stringify(textTracks));
            return textTracks;
        },

        enableSubtitles: function(enabled) {
            subtitlesEnabled = enabled;
            var tracks = this.getVideoModel().getElement().textTracks;
            if (tracks.length === 0) {
                return;
            }

            if (enabled) {
                this.debug.log('[Stream] Set subtitle lang: ' + defaultSubtitleLang);
            }

            var found = false;
            for (var i = 0; i < tracks.length; i++) {
                if (enabled && defaultSubtitleLang === tracks[i].language) {
                    tracks[i].mode = 'showing';
                    found = true;
                } else {
                    tracks[i].mode = 'hidden';
                }
            }

            if (enabled && !found) {
                tracks[0].mode = "showing";
            }
        },

        setSubtitleTrack: function(subtitleTrack) {
            this.debug.log('[Stream] Set subtitle track: ' + subtitleTrack.lang);
            var tracks = this.getVideoModel().getElement().textTracks;
            if (tracks.length === 0) {
                return;
            }
            for (var i = 0; i < tracks.length; i++) {
                if (subtitleTrack.id === tracks[i].label &&
                    subtitleTrack.lang === tracks[i].language) {
                    tracks[i].mode = 'showing';
                }
            }
        },

        getSelectedSubtitleTrack: function() {
            var tracks = this.getVideoModel().getElement().textTracks;
            for (var i = 0; i < tracks.length; i++) {
                if (tracks[i].mode === 'showing') {
                    return {
                        type: 'text',
                        id: tracks[i].label,
                        lang: tracks[i].language
                    };
                }
            }
            return null;
        },

        initProtection: function(/*protectionCtrl*/) {},

        getVideoModel: function() {
            return this.videoModel;
        },

        setAutoPlay: function(value) {
            autoPlay = value;
        },

        setDefaultAudioLang: function(language) {
            defaultAudioLang = language;
        },

        setDefaultSubtitleLang: function(language) {
            defaultSubtitleLang = language;
        },

        getAutoPlay: function() {
            return autoPlay;
        },

        getDuration: function() {
            return this.videoModel.getDuration();
        },

        // Used by StreamController for periods transitions => NA
        getStartTime: function() {return 0;},

        getPeriodIndex: function() {return 0;},

        getId: function() {return '';},

        // Used by StreamController to compose streams => NA
        getPeriodInfo: function() {return null;},

        // Not used/called
        getMinbufferTime: function() {return 0;},

        // Not called since no DVR window range (see MediaPlayer::seek)
        getLiveDelay: function() {return -1;},

        // Not supported
        startEventController: function() {},
        resetEventController: function() {},

        // Not supported
        setTrickModeSpeed: function(/*speed*/) {},
        getTrickModeSpeed: function() {return -1;},

        // Used by StreamController to compose streams => NA
        updateData: function() {},

        play: play,
        seek: seek,
        pause: pause
    };
};

Hls.dependencies.HlsStream.prototype = {
    constructor: Hls.dependencies.HlsStream
};