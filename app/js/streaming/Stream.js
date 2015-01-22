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
MediaPlayer.dependencies.Stream = function () {
    "use strict";

    var manifest,
        mediaSource,
        videoCodec = null,
        audioCodec = null,
        contentProtection = null,
        videoController = null,
        videoTrackIndex = -1,
        audioController = null,
        audioTrackIndex = -1,
        textController = null,
        textTrackIndex = -1,
        autoPlay = true,
        initialized = false,
        load,
        errored = false,
        kid = null,
        initData = [],
        // ORANGE : add FullScreen Listener
        fullScreenListener,
        // ORANGE : add Ended Event listener
        endedListener,
        loadedListener,
        playListener,
        pauseListener,
        errorListener,
        seekingListener,
        seekedListener,
        timeupdateListener,
        durationchangeListener,
        progressListener,
        ratechangeListener,
        periodInfo = null,
        //ORANGE : detect when a paused command occurs whitout a seek one
        isPaused = false,
        isSeeked = false,

        needKeyListener,
        keyMessageListener,
        keyAddedListener,
        keyErrorListener,

        canplayListener,
        playingListener,

        // ORANGE: interval id for checking buffers start time
        checkStartTimeIntervalId,

        eventController = null,

        play = function () {
            this.debug.info("[Stream] Attempting play...");

            if (!initialized) {
                return;
            }

            this.debug.info("[Stream] Do play.");
            this.videoModel.play();
        },

        pause = function () {
            this.debug.info("[Stream] Do pause.");
            this.videoModel.pause();
        },

        seek = function (time) {
            this.debug.log("[Stream] Attempting seek...");

            if (!initialized) {
                return;
            }

            this.debug.info("[Stream] Do seek: " + time);

            this.system.notify("setCurrentTime");
            this.videoModel.setCurrentTime(time);

            updateBuffer.call(this).then(function () {
                startBuffering(time);
            });
        },

        // Encrypted Media Extensions

        onMediaSourceNeedsKey = function (event) {
            var self = this,
                type;

            self.debug.log("[DRM] ### onMediaSourceNeedsKey (" + event.type + ")");

            // ORANGE: set videoCodec as type
            //type = (event.type !== "msneedkey") ? event.type : videoCodec;
            type = videoCodec;
            initData.push({type: type, initData: event.initData});

            this.debug.log("[DRM] Key required for - " + type);
            //this.debug.log("[DRM] Generating key request...");
            //this.protectionModel.generateKeyRequest(DEFAULT_KEY_TYPE, event.initData);
            if (!!contentProtection && !!videoCodec && !kid) {
                try
                {
                    self.debug.log("[DRM] Select Key System");
                    kid = self.protectionController.selectKeySystem(videoCodec, contentProtection);
                }
                catch (error)
                {
                    pause.call(self);
                    self.debug.log(error);
                    self.errHandler.mediaKeySystemSelectionError(error);
                    // ORANGE
                    self.metricsModel.addState(self.type, "stopped", self.videoModel.getCurrentTime(), 2);
                    self.reset();
                }
            }

            if (!!kid) {
                self.debug.log("[DRM] Ensure Key Session for KID " + kid);
                self.protectionController.ensureKeySession(kid, type, event.initData);
            }
        },

        onMediaSourceKeyMessage = function (event) {
            var self = this,
                session = null,
                bytes = null,
                msg = null,
                laURL = null;

            self.debug.log("[DRM] ### onMediaSourceKeyMessage (" + event.type + ")");

            session = event.target;

            // ORANGE: Uint16Array if conversion from multi-byte to unicode is required
            bytes = event.message[1] === 0 ? new Uint16Array(event.message.buffer) : new Uint8Array(event.message.buffer);

            msg = String.fromCharCode.apply(null, bytes);
            self.debug.log("[DRM] Key message: " + msg);

            laURL = event.destinationURL;
            self.debug.log("[DRM] laURL: " + laURL);
            
            // ORANGE: if backUrl is defined, override laURL
            var manifest = self.manifestModel.getValue();
            if(manifest.backUrl) {
                laURL = manifest.backUrl;
                self.debug.log("[DRM] backURL: " + laURL);
            }

            self.protectionController.updateFromMessage(kid, session, msg, laURL).fail(
                function (error) {
                    pause.call(self);
                    self.debug.log(error);
                    self.errHandler.mediaKeyMessageError(error);
                    // ORANGE
                    self.metricsModel.addState(self.type, "stopped", self.videoModel.getCurrentTime(), 2);
                    self.reset();
            });

            //if (event.keySystem !== DEFAULT_KEY_TYPE) {
            //    this.debug.log("[DRM] Key type not supported!");
            //}
            // else {
                // todo : request license?
                //requestLicense(e.message, e.sessionId, this);
            // }
        },

        onMediaSourceKeyAdded = function () {
            this.debug.log("[DRM] ### onMediaSourceKeyAdded.");
        },

        onMediaSourceKeyError = function () {
            var session = event.target,
                msg;

            this.debug.log("[DRM] ### onMediaSourceKeyError.");
            msg = 'DRM: MediaKeyError - sessionId: ' + session.sessionId + ' errorCode: ' + session.error.code + ' systemErrorCode: ' + session.error.systemCode + ' [';
            switch (session.error.code) {
                case 1:
                    msg += "MEDIA_KEYERR_UNKNOWN - An unspecified error occurred. This value is used for errors that don't match any of the other codes.";
                    break;
                case 2:
                    msg += "MEDIA_KEYERR_CLIENT - The Key System could not be installed or updated.";
                    break;
                case 3:
                    msg += "MEDIA_KEYERR_SERVICE - The message passed into update indicated an error from the license service.";
                    break;
                case 4:
                    msg += "MEDIA_KEYERR_OUTPUT - There is no available output device with the required characteristics for the content protection system.";
                    break;
                case 5:
                    msg += "MEDIA_KEYERR_HARDWARECHANGE - A hardware configuration change caused a content protection error.";
                    break;
                case 6:
                    msg += "MEDIA_KEYERR_DOMAIN - An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.";
                    break;
            }
            msg += "]";
            //pause.call(this);
            this.debug.log(msg);
            this.errHandler.mediaKeySessionError(msg);
        },

        // Media Source

        setUpMediaSource = function (mediaSourceArg) {
            var deferred = Q.defer(),
                self = this,

                onMediaSourceOpen = function (e) {
                    //self.debug.log("MediaSource is open!");
                    //self.debug.log(e);

                    mediaSourceArg.removeEventListener("sourceopen", onMediaSourceOpen);
                    mediaSourceArg.removeEventListener("webkitsourceopen", onMediaSourceOpen);

                    deferred.resolve(mediaSourceArg);
                };

            //self.debug.log("MediaSource should be closed. The actual readyState is: " + mediaSourceArg.readyState);

            mediaSourceArg.addEventListener("sourceopen", onMediaSourceOpen, false);
            mediaSourceArg.addEventListener("webkitsourceopen", onMediaSourceOpen, false);

            self.mediaSourceExt.attachMediaSource(mediaSourceArg, self.videoModel);

            //self.debug.log("MediaSource attached to video.  Waiting on open...");

            return deferred.promise;
        },

        tearDownMediaSource = function () {
            var self = this;

            if (!!videoController) {
                videoController.reset(errored);
            }
            if (!!audioController) {
                audioController.reset(errored);
            }
            if (!!textController) {
                textController.reset(errored);
            }
            if(!!eventController) {
                eventController.reset();
            }

            if (!!mediaSource) {
                self.mediaSourceExt.detachMediaSource(self.videoModel);
            }

            initialized = false;

            kid = null;
            initData = [];
            contentProtection = null;

            videoController = null;
            audioController = null;
            textController = null;

            videoCodec = null;
            audioCodec = null;

            mediaSource = null;
            manifest = null;
        },

        checkIfInitialized = function (videoReady, audioReady, textTrackReady, deferred) {
            if (videoReady && audioReady && textTrackReady) {
                if (videoController === null && audioController === null && textController === null) {
                    var msg = "No streams to play.";
                    this.errHandler.manifestError(msg, "nostreams", manifest);
                    this.debug.log(msg);
                    deferred.reject();
                } else {
                    //this.debug.log("MediaSource initialized!");
                    deferred.resolve(true);
                }
            }
        },

        initializeMediaSource = function () {
            //this.debug.log("Getting MediaSource ready...");

            var initialize = Q.defer(),
                videoReady = false,
                audioReady = false,
                textTrackReady = false,
                self = this;

            eventController = self.system.getObject("eventController");
            eventController.initialize(self.videoModel);
            // Figure out some bits about the stream before building anything.
            //self.debug.log("Gathering information for buffers. (1)");
            self.manifestExt.getDuration(manifest, periodInfo).then(
                function (/*duration*/) {
                    self.manifestExt.getVideoData(manifest, periodInfo.index).then(
                        function (videoData) {
                            if (videoData !== null) {
                                //self.debug.log("Create video buffer.");
                                self.manifestExt.getDataIndex(videoData, manifest, periodInfo.index).then(
                                    function (index) {
                                        videoTrackIndex = index;
                                        //self.debug.log("Save video track: " + videoTrackIndex);
                                    }
                                );

                                self.manifestExt.getCodec(videoData).then(
                                    function (codec) {
                                        self.debug.info("[Stream] Video codec: " + codec);
                                        videoCodec = codec;

                                        return self.manifestExt.getContentProtectionData(videoData).then(
                                            function (contentProtectionData) {
                                                self.debug.log("[Stream] video contentProtection");

                                                if (!!contentProtectionData && !self.capabilities.supportsMediaKeys()) {
                                                    self.debug.error("[Stream] mediakeys not supported!");
                                                    self.errHandler.capabilityError("mediakeys");
                                                    return Q.when(null);
                                                }

                                                contentProtection = contentProtectionData;

                                                //kid = self.protectionController.selectKeySystem(videoCodec, contentProtection);
                                                //self.protectionController.ensureKeySession(kid, videoCodec, null);

                                                if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                                    var msg = "Video Codec (" + codec + ") is not supported.";
                                                    self.errHandler.manifestError(msg, "codec", manifest);
                                                    return Q.when(null);
                                                    self.debug.error("[Stream] ", msg);
                                                }

                                                return self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                                            }
                                        );
                                    }
                                ).then(
                                    function (buffer) {
                                        if (buffer === null) {
                                            self.debug.log("No buffer was created, skipping video stream.");
                                        } else {
                                            // TODO : How to tell index handler live/duration?
                                            // TODO : Pass to controller and then pass to each method on handler?

                                            videoController = self.system.getObject("bufferController");
                                            videoController.initialize("video", periodInfo, videoData, buffer, self.videoModel, self.requestScheduler, self.fragmentController, mediaSource, eventController);
                                            //self.debug.log("Video is ready!");
                                        }

                                        videoReady = true;
                                        checkIfInitialized.call(self, videoReady, audioReady, textTrackReady,  initialize);
                                    },
                                    function (/*error*/) {
                                        self.errHandler.mediaSourceError("Error creating video source buffer.");
                                        videoReady = true;
                                        checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                                    }
                                );
                            } else {
                                self.debug.log("[Stream] No video data.");
                                videoReady = true;
                                checkIfInitialized.call(self, videoReady, audioReady, textTrackReady,  initialize);
                            }

                            return self.manifestExt.getAudioDatas(manifest, periodInfo.index);
                        }
                    ).then(
                        function (audioDatas) {
                            if (audioDatas !== null && audioDatas.length > 0) {
                                //self.debug.log("Have audio streams: " + audioDatas.length);
                                self.manifestExt.getPrimaryAudioData(manifest, periodInfo.index).then(
                                    function (primaryAudioData) {
                                        self.manifestExt.getDataIndex(primaryAudioData, manifest, periodInfo.index).then(
                                            function (index) {
                                                audioTrackIndex = index;
                                                //self.debug.log("Save audio track: " + audioTrackIndex);
                                            }
                                        );

                                        self.manifestExt.getCodec(primaryAudioData).then(
                                            function (codec) {
                                                self.debug.info("[Stream] Audio codec: " + codec);
                                                audioCodec = codec;

                                                return self.manifestExt.getContentProtectionData(primaryAudioData).then(
                                                    function (contentProtectionData) {
                                                        self.debug.log("[Stream] Audio contentProtection");

                                                        if (!!contentProtectionData && !self.capabilities.supportsMediaKeys()) {
                                                            self.debug.error("[Stream] mediakeys not supported!");
                                                            self.errHandler.capabilityError("mediakeys");
                                                            return Q.when(null);
                                                        }

                                                        contentProtection = contentProtectionData;

                                                        //kid = self.protectionController.selectKeySystem(videoCodec, contentProtection);
                                                        //self.protectionController.ensureKeySession(kid, videoCodec, null);

                                                        if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                                            var msg = "Audio Codec (" + codec + ") is not supported.";
                                                            self.errHandler.manifestError(msg, "codec", manifest);
                                                            self.debug.error("[Stream] ", msg);
                                                            return Q.when(null);
                                                        }

                                                        return self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                                                    }
                                                );
                                            }
                                        ).then(
                                            function (buffer) {
                                                if (buffer === null) {
                                                    self.debug.log("[Stream] No buffer was created, skipping audio stream.");
                                                } else {
                                                    // TODO : How to tell index handler live/duration?
                                                    // TODO : Pass to controller and then pass to each method on handler?
                                                    audioController = self.system.getObject("bufferController");
                                                    audioController.initialize("audio", periodInfo, primaryAudioData, buffer, self.videoModel, self.requestScheduler, self.fragmentController, mediaSource, eventController);
                                                    //self.debug.log("Audio is ready!");
                                                }

                                                audioReady = true;
                                                checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                                            },
                                            function () {
                                                self.errHandler.mediaSourceError("Error creating audio source buffer.");
                                                audioReady = true;
                                                checkIfInitialized.call(self, videoReady, audioReady,textTrackReady,  initialize);
                                            }
                                        );
                                    }
                                );
                            } else {
                                self.debug.log("[Stream] No audio streams.");
                                audioReady = true;
                                checkIfInitialized.call(self, videoReady, audioReady,textTrackReady,  initialize);
                            }

                            return self.manifestExt.getTextDatas(manifest, periodInfo.index);
                        }
                    ).then(

                        // ORANGE: added Support for fragmented subtitles
                        //         which are downloaded and handled just like Audio/Video - by a regular bufferController, fragmentController etc
                        //         (fragmented subtitles are used by MSS and live streams)

                        function (textDatas) {
                            var mimeType;
                            if (textDatas !== null && textDatas.length > 0) {
                                self.debug.log("Have subtitles streams: " + textDatas.length);
                                self.manifestExt.getPrimaryTextData(manifest, periodInfo.index).then(
                                    function (primarySubtitleData) {
                                        self.manifestExt.getDataIndex(primarySubtitleData, manifest, periodInfo.index).then(
                                            function (index) {
                                                textTrackIndex = index;
                                                self.debug.log("Save text track: " + textTrackIndex);
                                            });

                                            self.manifestExt.getMimeType(primarySubtitleData).then(
                                                function (type) {
                                                    mimeType = type;
                                                    return self.sourceBufferExt.createSourceBuffer(mediaSource, mimeType);
                                            }).then(
                                                function (buffer) {
                                                    if (buffer === null) {
                                                        self.debug.log("Source buffer was not created for text track");
                                                    } else {
                                                        textController = self.system.getObject("bufferController");
                                                        textController.initialize("text", periodInfo, primarySubtitleData, buffer, self.videoModel, self.requestScheduler, self.fragmentController, mediaSource);
                                                            
                                                        if (buffer.hasOwnProperty('initialize')) {
                                                                    buffer.initialize(mimeType, textController,primarySubtitleData);
                                                        }
                                                        //self.debug.log("Text is ready!");
                                                        textTrackReady = true;
                                                        checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                                                    }
                                                },
                                                function (error) {
                                                    self.debug.log("Error creating text source buffer:");
                                                    self.debug.log(error);
                                                    self.errHandler.mediaSourceError("Error creating text source buffer.");
                                                    textTrackReady = true;
                                                    checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                                                }
                                        );
                                    }
                                );
                            } else {
                                self.debug.log("[Stream] No text tracks.");
                                textTrackReady = true;
                                checkIfInitialized.call(self, videoReady, audioReady,textTrackReady,  initialize);
                            }
                            return  self.manifestExt.getEventsForPeriod(manifest,periodInfo);
                        }
                    ).then(
                        function (events) {
                            eventController.addInlineEvents(events);
                        }
                    );
                }
            );

            return initialize.promise;
        },

        initializePlayback = function () {
            var self = this,
                initialize = Q.defer();

            //self.debug.log("Getting ready for playback...");

            self.manifestExt.getDuration(self.manifestModel.getValue(), periodInfo).then(
                function (duration) {
                    self.debug.log("[Stream] Setting duration: " + duration);
                    return self.mediaSourceExt.setDuration(mediaSource, duration);
                }
            ).then(
                function (value) {
                    //self.debug.log("Duration successfully set to: " + value);
                    initialized = true;
                    initialize.resolve(true);
                }
            );

            return initialize.promise;
        },

        onLoad = function () {
            var self = this;

            this.debug.log("[Stream] Got loadmetadata event.");

            var initialSeekTime = this.timelineConverter.calcPresentationStartTime(periodInfo);
            this.debug.info("[Stream] Starting playback at offset: " + initialSeekTime);

            // ORANGE: performs a programmatical seek only if initial seek time is different
            // from current time (live use case)
            if (initialSeekTime != this.videoModel.getCurrentTime())
            {
                //this.system.notify("setCurrentTime");
                //this.videoModel.setCurrentTime(initialSeekTime);

                // ORANGE: we start the <video> element at the real start time got from the video buffer
                // once the first fragment has been appended
                waitForStartTime.call(this, initialSeekTime, 2).then(
                    function (time) {
                        self.debug.info("[Stream] Starting playback at offset: " + time);
                        self.system.notify("setCurrentTime");
                        self.videoModel.setCurrentTime(time);
                        load.resolve(null);
                    }
                );
            } else {
                load.resolve(null);
            }
        },

        onCanPlay = function () {
            var self = this;
            this.debug.log("[Stream] Got canplay event.");
        },

        onPlaying = function () {
            var self = this;
            this.debug.log("[Stream] Got playing event.");
        },

        // ORANGE: see onLoad()
        waitForStartTime = function (time, tolerance) {
            var self = this,
                defer = Q.defer(),
                videoBuffer = videoController.getBuffer(),
                audioBuffer = audioController.getBuffer(),
                CHECK_INTERVAL = 100,
                videoRange,
                audioRange,
                startTime,
                checkStartTime = function() {
                    self.debug.info("[Stream] Check start time");
                    // Check if video buffer is not empty
                    videoRange = self.sourceBufferExt.getBufferRange(videoBuffer, time, tolerance);
                    if (videoRange === null) {
                        return;
                    }
                    // PATCH (+0.5) for chrome for which there is an issue for starting live streams,
                    // due to a difference (rounding?) between manifest segments times and real samples times
                    // returned by the buffer.
                    startTime = videoRange.start + 0.5;

                    // Check if audio buffer is not empty
                    audioRange = self.sourceBufferExt.getBufferRange(audioBuffer, time, tolerance);
                    if (audioRange === null) {
                        return;
                    }
                    self.debug.info("[Stream] Check start time: A["+audioRange.start+"-"+audioRange.end+"], V["+videoRange.start+"-"+videoRange.end+"]");
                    // Check if audio and video can be synchronized (if some audio sample is available at returned start time)
                    if (audioRange.end < startTime) {
                        return;
                    }
                    self.debug.info("[Stream] Check start time: OK");
                    // Updating is completed, now we can stop checking and resolve the promise
                    clearInterval(checkStartTimeIntervalId);

                    defer.resolve(startTime);
                };

            checkStartTimeIntervalId = setInterval(checkStartTime, CHECK_INTERVAL);
            return defer.promise;
        },

        onPlay = function () {
            this.debug.log("[Stream] Got play event.");
            
            //if a pause command was detected just before this onPlay event, startBuffering again
            //if it was a pause, follow by a seek (in reality just a seek command), don't startBuffering, it's done in onSeeking event
            // we can't, each time, startBuffering in onPlay event (for seek and pause commands) because onPlay event is not fired on IE after a seek command. :-(
            if ( isPaused && !isSeeked){
                startBuffering();
            }

            isPaused = false;
            isSeeked = false;
        },

        // ORANGE : fullscreen event
        onFullScreenChange = function() {
            var videoElement = this.videoModel.getElement(), isFullScreen = 0;

            if(document.webkitIsFullScreen || document.msFullscreenElement
                || document.mozFullScreen) {
                // browser is fullscreen
                isFullScreen = 1;
            }
            this.metricsModel.addCondition(null, isFullScreen, videoElement.videoWidth, videoElement.videoHeight);
        },
        
        // ORANGE : ended event
        onEnded = function() {
            //add stopped state metric with reason = 1 : end of stream
            this.metricsModel.addState("video", "stopped", this.videoModel.getCurrentTime(), 1);
        },

        onPause = function () {
            //this.debug.log("[Stream] ################################# Got pause event.");
            isPaused = true;
            suspend.call(this);
        },

        onError = function (event) {
            var error = event.srcElement.error,
                code = error.code,
                msg = "";

            if (code === -1) {
                // not an error!
                return;
            }

            switch (code) {
                case 1:
                    msg = "MEDIA_ERR_ABORTED";
                    break;
                case 2:
                    msg = "MEDIA_ERR_NETWORK";
                    break;
                case 3:
                    msg = "MEDIA_ERR_DECODE";
                    break;
                case 4:
                    msg = "MEDIA_ERR_SRC_NOT_SUPPORTED";
                    break;
                case 5:
                    msg = "MEDIA_ERR_ENCRYPTED";
                    break;
            }

            errored = true;

            this.debug.log("Video Element Error: " + msg);
            this.debug.log(error);
            this.errHandler.mediaSourceError(msg);
            this.reset();
        },

        onSeeking = function () {
            //this.debug.log("[Stream] ############################################# Got seeking event.");
            var time = this.videoModel.getCurrentTime();
            isSeeked = true;
            startBuffering(time);
        },

        onSeeked = function () {
            //this.debug.log("Seek complete.");

            this.videoModel.listen("seeking", seekingListener);
            this.videoModel.unlisten("seeked", seekedListener);
        },

        onProgress = function () {
            //this.debug.log("Got timeupdate event.");
            //updateBuffer.call(this);
        },

        onTimeupdate = function () {
            updateBuffer.call(this);
        },

        onDurationchange = function () {
        },

        onRatechange = function() {
            if (videoController) {
                videoController.updateStalledState();
            }
            if (audioController) {
                audioController.updateStalledState();
            }
            if (textController) {
                textController.updateStalledState();
            }


        },

        updateBuffer = function() {

            if (videoController) {
                videoController.updateBufferState();
            }

            if (audioController) {
               audioController.updateBufferState();
            }

            if (textController) {
               textController.updateBufferState();
            }
        },

        startBuffering = function(time) {
            if (videoController) {
                if (time === undefined) {
                videoController.start();
                } else {
                    videoController.seek(time);
            }
            }

            if (audioController) {
                if (time === undefined) {
                audioController.start();
                } else {
                    audioController.seek(time);
                }
            }

            if (textController) {
                if (time === undefined) {
                    textController.start();
                } else {
                    textController.seek(time);
                }
            }
        },

        stopBuffering = function() {
            if (videoController) {
                videoController.stop();
            }
            if (audioController) {
                audioController.stop();
            }
            if (textController) {
                textController.stop();
            }
        },

        suspend = function() {
            if (!this.scheduleWhilePaused || this.manifestExt.getIsDynamic(manifest)) {
                stopBuffering.call(this);
            }

            clearInterval(checkStartTimeIntervalId);
        },

        updateCurrentTime = function() {
            if (this.videoModel.isPaused()) return;

            var currentTime = this.videoModel.getCurrentTime(),
                representation = videoController ? videoController.getCurrentRepresentation() : audioController.getCurrentRepresentation(),
                actualTime = this.timelineConverter.calcActualPresentationTime(representation, currentTime, this.manifestExt.getIsDynamic(manifest)),
                timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);

            // ORANGE: unuseful?? and generate some bug since we cannot get availability window of current representation (@see TimelineConverter)
            /*if (timeChanged) {
                this.videoModel.setCurrentTime(actualTime);
                startBuffering(actualTime);
            } else {*/
               // startBuffering();
            //}
        },

        doLoad = function (manifestResult) {

            var self = this;

            //self.debug.log("Stream start loading.");

            manifest = manifestResult;
            return self.mediaSourceExt.createMediaSource().then(
                function (mediaSourceResult) {
                    //self.debug.log("MediaSource created.");
                    return setUpMediaSource.call(self, mediaSourceResult);
                }
            ).then(
                function (mediaSourceResult) {
                    mediaSource = mediaSourceResult;
                    //self.debug.log("MediaSource set up.");
                    return initializeMediaSource.call(self);
                }
            ).then(
                function (/*result*/) {
                    //self.debug.log("Start initializing playback.");
                    return initializePlayback.call(self);
                }
            ).then(
                function (/*done*/) {
                    //self.debug.log("Playback initialized!");
                    return load.promise;
                }
            ).then(
                function () {
                    self.debug.log("[Stream] element loaded!");
                    // only first period stream must be played automatically during playback initialization
                    if (periodInfo.index === 0) {
                        eventController.start();
                        if (autoPlay) {
                            play.call(self);
                        }
                    }
                }
            );
        },

        currentTimeChanged = function () {
            this.debug.log("[Stream] Current time has changed, block programmatic seek.");

            this.videoModel.unlisten("seeking", seekingListener);
            this.videoModel.listen("seeked", seekedListener);
        },

        bufferingCompleted = function() {
            var self = this;

            // if there is at least one buffer controller that has not completed buffering yet do nothing
            if ((videoController && !videoController.isBufferingCompleted()) || (audioController && !audioController.isBufferingCompleted())) {
                return;
            }

            // buffering has been complted, now we can signal end of stream
            if (mediaSource) {
                this.debug.info("[Stream] Signal end of stream");
                this.mediaSourceExt.signalEndOfStream(mediaSource);
            }
        },

        segmentLoadingFailed = function() {
            stopBuffering.call(this);
        },


        // ORANGE: 'liveEdgeFound' event raised when live edge has been found on video stream
        // => then seek every BufferController at the found live edge time
        onLiveEdgeFound = function(liveEdgeTime) {

            //var liveEdgeTime = this.timelineConverter.calcPresentationStartTime(periodInfo);
            this.debug.info("[Stream] ### LiveEdge = " + liveEdgeTime);

            if (videoController) {
                videoController.seek(liveEdgeTime);
            }
            if (audioController) {
                audioController.seek(liveEdgeTime);
            }
            if (textController) {
                textController.seek(liveEdgeTime);
            }
        },

        updateData = function (updatedPeriodInfo) {
            var self = this,
                videoData,
                audioData,
                textData,
                deferredVideoData,
                deferredAudioData,
                deferredTextData,
                deferred = Q.defer(),
                deferredVideoUpdate = Q.defer(),
                deferredAudioUpdate = Q.defer(),
                deferredTextUpdate = Q.defer(),
                deferredEventUpdate = Q.defer();

                manifest = self.manifestModel.getValue();
            periodInfo = updatedPeriodInfo;
            self.debug.log("Manifest updated... set new data on buffers.");

            if (videoController) {
                videoData = videoController.getData();

                if (!!videoData && videoData.hasOwnProperty("id")) {
                    deferredVideoData = self.manifestExt.getDataForId(videoData.id, manifest, periodInfo.index);
                } else {
                    deferredVideoData = self.manifestExt.getDataForIndex(videoTrackIndex, manifest, periodInfo.index);
                }

                deferredVideoData.then(
                        function (data) {
                        videoController.updateData(data, periodInfo).then(
                            function(){
                                deferredVideoUpdate.resolve();
                        }
                    );
                }
                );
            } else {
                deferredVideoUpdate.resolve();
            }

            if (audioController) {
                audioData = audioController.getData();
                
                // ORANGE: refer only the audio track index to get new audio data (switch audio use case)
                //if (!!audioData && audioData.hasOwnProperty("id")) {
                //    deferredAudioData = self.manifestExt.getDataForId(audioData.id, manifest, periodInfo.index);
                //} else {
                    deferredAudioData = self.manifestExt.getDataForIndex(audioTrackIndex, manifest, periodInfo.index);
                //}

                deferredAudioData.then(
                        function (data) {
                        audioController.updateData(data, periodInfo).then(
                            function(){
                                deferredAudioUpdate.resolve();
                        }
                    );
                }
                );
            } else {
                deferredAudioUpdate.resolve();
            }

            if (textController) {
                textData = textController.getData();

                // ORANGE: refer only the text track index to get new text data (switch text use case)
                //if (!!textData && textData.hasOwnProperty("id")) {
                //    deferredTextData = self.manifestExt.getDataForId(textData.id, manifest, periodInfo.index);
                //} else {
                    deferredTextData = self.manifestExt.getDataForIndex(textTrackIndex, manifest, periodInfo.index);
                //}

                deferredTextData.then(
                    function (data) {
                        textController.updateData(data, periodInfo).then(
                            function(){
                                deferredTextUpdate.resolve();
                            }
                        );
                    }
                );
            }

            if(eventController) {
                self.manifestExt.getEventsForPeriod(manifest,periodInfo).then(
                    function(events) {
                        eventController.addInlineEvents(events);
                        deferredEventUpdate.resolve();
                    }
                );
            }

            Q.when(deferredVideoUpdate.promise, deferredAudioUpdate.promise, deferredTextUpdate.promise).then(
                function() {
                    // ORANGE: unnecessary since seek is performed into each BufferController
                    //updateCurrentTime.call(self);
                    deferred.resolve();
                }
            );

            return deferred.promise;
        };

    return {
        system: undefined,
        videoModel: undefined,
        manifestLoader: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        bufferExt: undefined,
        manifestExt: undefined,
        fragmentController: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        protectionModel: undefined,
        protectionController: undefined,
        protectionExt: undefined,
        capabilities: undefined,
        debug: undefined,
        metricsExt: undefined,
        errHandler: undefined,
        timelineConverter: undefined,
        requestScheduler: undefined,
        scheduleWhilePaused: undefined,
        // ORANGE : add metricsModel
        metricsModel: undefined,

        setup: function () {
            this.system.mapHandler("setCurrentTime", undefined, currentTimeChanged.bind(this));
            this.system.mapHandler("bufferingCompleted", undefined, bufferingCompleted.bind(this));
            this.system.mapHandler("segmentLoadingFailed", undefined, segmentLoadingFailed.bind(this));
            // ORANGE: add event handler "liveEdgeFound"
            this.system.mapHandler("liveEdgeFound", undefined, onLiveEdgeFound.bind(this));

            load = Q.defer();

            playListener = onPlay.bind(this);
            pauseListener = onPause.bind(this);
            errorListener = onError.bind(this);
            seekingListener = onSeeking.bind(this);
            seekedListener = onSeeked.bind(this);
            progressListener = onProgress.bind(this);
            ratechangeListener = onRatechange.bind(this);
            timeupdateListener = onTimeupdate.bind(this);
            durationchangeListener = onDurationchange.bind(this);
            loadedListener = onLoad.bind(this);
            // ORANGE : add FullScreen Event listener
            fullScreenListener = onFullScreenChange.bind(this);
            // ORANGE : add Ended Event listener
            endedListener = onEnded.bind(this);

            canplayListener = onCanPlay.bind(this);
            playingListener = onPlaying.bind(this);
        },

        load: function(manifest, periodInfoValue) {
            periodInfo = periodInfoValue;
            doLoad.call(this, manifest);
        },

        setVideoModel: function(value) {
            this.videoModel = value;
            this.videoModel.listen("play", playListener);
            this.videoModel.listen("pause", pauseListener);
            this.videoModel.listen("error", errorListener);
            this.videoModel.listen("seeking", seekingListener);
            this.videoModel.listen("timeupdate", timeupdateListener);
            this.videoModel.listen("durationchange", durationchangeListener);
            this.videoModel.listen("progress", progressListener);
            this.videoModel.listen("ratechange", ratechangeListener);
            this.videoModel.listen("loadedmetadata", loadedListener);
            // ORANGE : add FullScreen Event listener
            this.videoModel.listen("webkitfullscreenchange", fullScreenListener);
            this.videoModel.listen("fullscreenchange", fullScreenListener);
            this.videoModel.listenOnParent("fullscreenchange", fullScreenListener);
            this.videoModel.listenOnParent("webkitfullscreenchange", fullScreenListener);
            // ORANGE : add Ended Event listener
            this.videoModel.listen("ended", endedListener);

            this.videoModel.listen("canplay", canplayListener);
            this.videoModel.listen("playing", playingListener);

            this.requestScheduler.videoModel = value;
        },

        // ORANGE: add the capability to set audioTrack
        setAudioTrack: function(audioTrack) {
            var deferredAudioUpdate = Q.defer(),
                manifest = this.manifestModel.getValue(),
                url,
                self = this;

            if (audioController) {
                // Get data index corresponding to new audio track
                self.manifestExt.getDataIndex(audioTrack, manifest, periodInfo.index).then(
                    function(index) {
                        audioTrackIndex = index;

                        // Update manifest
                        url = manifest.mpdUrl;

                        if (manifest.hasOwnProperty("Location")) {
                            url = manifest.Location;
                        }

                        self.debug.log("### Refresh manifest @ " + url);

                        self.manifestLoader.load(url).then(
                            function (manifestResult) {
                                self.manifestModel.setValue(manifestResult);
                                self.debug.log("### Manifest has been refreshed.");
                                deferredAudioUpdate.resolve();
                            }
                        );
                    }
                );
            }
            else {
                deferredAudioUpdate.reject();
            }

            return deferredAudioUpdate.promise;
        },

        // ORANGE: add the capability to set subtitle track
        setSubtitleTrack:function(subtitleTrack){
            var deferredSubtitleUpdate = Q.defer(),
                currentTime = this.videoModel.getCurrentTime(),
                manifest = this.manifestModel.getValue(),
                url,
                self = this;

            if (textController) {
                // Get data index corresponding to new audio track
                self.manifestExt.getDataIndex(subtitleTrack, manifest, periodInfo.index).then(
                    function(index) {
                        textTrackIndex = index;

                        // Update manifest
                        url = manifest.mpdUrl;

                        if (manifest.hasOwnProperty("Location")) {
                            url = manifest.Location;
                        }

                        self.debug.log("### Refresh manifest @ " + url);

                        self.manifestLoader.load(url).then(
                            function (manifestResult) {
                                self.manifestModel.setValue(manifestResult);
                                self.debug.log("### Manifest has been refreshed.");
                                deferredSubtitleUpdate.resolve();
                            }
                        );
                    }
                );
            }
            else {
                deferredSubtitleUpdate.reject();
            }

            return deferredSubtitleUpdate.promise;
        },

        initProtection: function() {
            needKeyListener = onMediaSourceNeedsKey.bind(this);
            keyMessageListener = onMediaSourceKeyMessage.bind(this);
            keyAddedListener = onMediaSourceKeyAdded.bind(this);
            keyErrorListener = onMediaSourceKeyError.bind(this);

            this.protectionModel = this.system.getObject("protectionModel");
            this.protectionModel.init(this.getVideoModel());
            this.protectionController = this.system.getObject("protectionController");
            this.protectionController.init(this.videoModel, this.protectionModel);

            this.protectionModel.listenToNeedKey(needKeyListener);
            this.protectionModel.listenToKeyMessage(keyMessageListener);
            this.protectionModel.listenToKeyError(keyErrorListener);
            this.protectionModel.listenToKeyAdded(keyAddedListener);
        },

        getVideoModel: function() {
            return this.videoModel;
        },

        getManifestExt: function () {
            var self = this;
            return self.manifestExt;
        },

        setAutoPlay: function (value) {
            autoPlay = value;
        },

        getAutoPlay: function () {
            return autoPlay;
        },

        reset: function () {

            this.debug.info("[Stream] Reset");

            pause.call(this);

            this.videoModel.unlisten("play", playListener);
            this.videoModel.unlisten("pause", pauseListener);
            this.videoModel.unlisten("error", errorListener);
            this.videoModel.unlisten("seeking", seekingListener);
            this.videoModel.unlisten("timeupdate", timeupdateListener);
            this.videoModel.unlisten("progress", progressListener);
            this.videoModel.unlisten("loadedmetadata", loadedListener);

            tearDownMediaSource.call(this);
            if (!!this.protectionController) {
                this.protectionController.teardownKeySystem(kid);
            }
            this.protectionController = undefined;
            this.protectionModel = undefined;
            this.fragmentController = undefined;
            this.requestScheduler = undefined;

            // streamcontroller expects this to be valid
            //this.videoModel = null;

            load = Q.defer();
        },

        getDuration: function () {
            return periodInfo.duration;
        },

        getStartTime: function() {
            return periodInfo.start;
        },

        getPeriodIndex: function() {
            return periodInfo.index;
        },

        getId: function() {
            return periodInfo.id;
        },

        getPeriodInfo: function() {
            return periodInfo;
        },
        startEventController: function() {
            eventController.start();
        },
        resetEventController: function() {
            eventController.reset();
        },

        updateData: updateData,
        play: play,
        seek: seek,
        pause: pause
    };
};

MediaPlayer.dependencies.Stream.prototype = {
    constructor: MediaPlayer.dependencies.Stream
};
