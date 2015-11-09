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
MediaPlayer.dependencies.Stream = function() {
    "use strict";

    var manifest,
        mediaSource,
        videoCodec = null,
        audioCodec = null,
        currentTimeToSet = 0,
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
        canplayListener,
        playingListener,
        loadstartListener,
        waitingListener,
        defaultAudioLang = 'und',
        defaultSubtitleLang = 'und',

        periodInfo = null,
        //ORANGE : detect when a paused command occurs whitout a seek one
        isPaused = false,
        isSeeked = false,

        initialSeekTime,

        // ORANGE: interval id for checking buffers start time
        checkStartTimeIntervalId,

        eventController = null,
        protectionController,
        initializedeferred = null,

        // Encrypted Media Extensions
        onProtectionError = function(event) {
            if (protectionController && event && event.data && event.data.data && event.data.data.sessionToken) {
                var sessionToken = event.data.data.sessionToken;
                protectionController.closeKeySession(sessionToken);
            }
            this.errHandler.sendError(event.data.code, event.data.message, event.data.data);
            // if the errors give the session token in params we close the current session
            //this.reset();
        },

        play = function() {
            this.debug.info("[Stream] Attempting play...");

            if (!initialized) {
                return;
            }

            this.debug.info("[Stream] Do play.");
            this.videoModel.play();
        },

        pause = function() {
            this.debug.info("[Stream] Do pause.");
            this.videoModel.pause();
        },

        seek = function(time) {
            this.debug.log("[Stream] Attempting seek...");

            if (!initialized) {
                return;
            }

            this.debug.info("[Stream] Do seek: " + time);

            this.system.notify("setCurrentTime");
            this.videoModel.setCurrentTime(time);

            updateBuffer.call(this).then(function() {
                startBuffering(time);
            });
        },

        // Media Source
        setUpMediaSource = function(mediaSourceArg) {
            var deferred = Q.defer(),
                self = this,

                onMediaSourceOpen = function( /*e*/ ) {
                    //self.debug.log("MediaSource is open!");

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

        tearDownMediaSource = function() {
            var self = this,
                funcs = [],
                deferred = Q.defer(),

                executeReset = function() {
                    if (!!videoController) {
                        funcs.push(videoController.reset(errored));
                    }
                    if (!!audioController) {
                        funcs.push(audioController.reset(errored));
                    }
                    if (!!textController) {
                        funcs.push(textController.reset(errored));
                    }

                    Q.all(funcs).then(
                        function() {
                            if (!!eventController) {
                                eventController.reset();
                                eventController = undefined;
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

                            deferred.resolve();
                        });
                };

            Q.when(initializedeferred ? initializedeferred.promise : true).then(
                function() {
                    executeReset();
                }, function() {
                    executeReset();
                });
            return deferred.promise;
        },

        checkIfInitialized = function(videoState, audioState, textTrackState) {
            this.debug.log("[Stream] checkIfInitialized videoState=" + videoState + " audioState=" + audioState + " textTrackState=" + textTrackState);
            if (videoState !== null && audioState !== null && textTrackState !== null) {
                if (videoState === "ready" && audioState === "ready" && textTrackState === "ready") {
                    if (videoController === null && audioController === null && textController === null) {
                        this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_NOSTREAM, "No streams to play (" + msg + ")", manifest);
                        initializedeferred.reject();
                    } else {
                        //this.debug.log("MediaSource initialized!");
                        // Initialize protection controller
                        if (protectionController) {
                            protectionController.init(contentProtection, audioCodec, videoCodec);
                        } else if (contentProtection && !this.capabilities.supportsEncryptedMedia()) {
                            // No protectionController (MediaKeys not supported/enabled) but content is protected => error
                            this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.CAPABILITY_ERR_MEDIAKEYS, "Content is signalized protected but EME is not supported/enabled", manifest);
                            initializedeferred.reject();
                        }

                        initializedeferred.resolve(true);
                    }
                } else if (videoState === "error" || audioState === "error" || textTrackState === "error") {
                    initializedeferred.reject();
                }
            }
        },

        initializeMediaSource = function() {
            var videoState = null,
                audioState = null,
                textTrackState = null,
                self = this;

            initializedeferred = Q.defer();

            eventController = self.system.getObject("eventController");
            // Figure out some bits about the stream before building anything.
            //self.debug.log("Gathering information for buffers. (1)");
            self.manifestExt.getVideoData(manifest, periodInfo.index).then(
                function(videoData) {
                    //self.debug.log("Create video buffer.");
                    self.manifestExt.getDataIndex(videoData, manifest, periodInfo.index).then(
                        function(index) {
                            videoTrackIndex = index;
                            //self.debug.log("Save video track: " + videoTrackIndex);
                        }
                    );

                    self.manifestExt.getCodec(videoData).then(
                        function(codec) {
                            self.debug.info("[Stream] Video codec: " + codec);
                            videoCodec = codec;

                            if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_CODEC, "Video Codec (" + codec + ") is not supported", manifest);
                                videoState = "error";
                                return Q.reject();
                            }

                            return self.manifestExt.getContentProtectionData(videoData).then(
                                function(contentProtectionData) {
                                    contentProtection = contentProtectionData;

                                    if (mediaSource) {
                                        return self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                                    } else {
                                        return Q.reject();
                                    }
                                }
                            );
                        }
                    ).then(
                        function(buffer) {
                            // TODO : How to tell index handler live/duration?
                            // TODO : Pass to controller and then pass to each method on handler?
                            videoController = self.system.getObject("bufferController");
                            videoController.initialize("video", periodInfo, videoData, buffer, self.requestScheduler, self.fragmentController, mediaSource, eventController);
                            videoState = "ready";
                            checkIfInitialized.call(self, videoState, audioState, textTrackState);
                        },
                        function(/*error*/) {
                            if (videoState !== "error") {
                                self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CREATE_SOURCEBUFFER, "Error creating video source buffer");
                                videoState = "error";
                            }
                            checkIfInitialized.call(self, videoState, audioState, textTrackState);
                        }
                    );
                    return self.manifestExt.getSpecificAudioData(manifest, periodInfo.index, defaultAudioLang);
                }, function() {
                    if (videoState !== "error") {
                        self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_CODEC, "No Video Data in manifest", manifest);
                        videoState = "error";
                    }
                    checkIfInitialized.call(self, videoState, audioState, textTrackState);
                    //no video, so don't analyse audio datas....
                    return Q.reject();
                }
            ).then(
                function(specificAudioData) {
                    self.manifestExt.getDataIndex(specificAudioData, manifest, periodInfo.index).then(
                        function(index) {
                            audioTrackIndex = index;
                            //self.debug.log("Save audio track: " + audioTrackIndex);
                        }
                    );

                    self.manifestExt.getCodec(specificAudioData).then(
                        function(codec) {
                            self.debug.info("[Stream] Audio codec: " + codec);
                            audioCodec = codec;
                            if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_CODEC, "Audio Codec (" + codec + ") is not supported", manifest);
                                audioState = "error";
                                return Q.reject();
                            }

                            if (mediaSource) {
                                return self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                            } else {
                                return Q.reject();
                            }
                        }
                    ).then(
                        function(buffer) {
                            // TODO : How to tell index handler live/duration?
                            // TODO : Pass to controller and then pass to each method on handler?
                            audioController = self.system.getObject("bufferController");
                            audioController.initialize("audio", periodInfo, specificAudioData, buffer, self.requestScheduler, self.fragmentController, mediaSource, eventController);
                            //self.debug.log("Audio is ready!");
                            audioState = "ready";
                            checkIfInitialized.call(self, videoState, audioState, textTrackState);
                        },
                        function(/*error*/) {
                            if (audioState !== "error") {
                                self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CREATE_SOURCEBUFFER, "Error creating audio source buffer");
                                audioState = "error";
                            }
                            checkIfInitialized.call(self, videoState, audioState, textTrackState);
                        }
                    );
                    return self.manifestExt.getSpecificTextData(manifest, periodInfo.index, defaultSubtitleLang);
                }, function() {
                    self.debug.log("[Stream] No audio streams.");
                    audioState = "ready";
                    checkIfInitialized.call(self, videoState, audioState, textTrackState);

                    return self.manifestExt.getSpecificTextData(manifest, periodInfo.index, defaultSubtitleLang);
                }
            ).then(
                // ORANGE: added Support for fragmented subtitles
                //         which are downloaded and handled just like Audio/Video - by a regular bufferController, fragmentController etc
                //         (fragmented subtitles are used by MSS and live streams)
                function(specificSubtitleData) {
                    var mimeType;
                    self.manifestExt.getDataIndex(specificSubtitleData, manifest, periodInfo.index).then(
                        function(index) {
                            textTrackIndex = index;
                            self.debug.log("Save text track: " + textTrackIndex);
                        });

                    self.manifestExt.getMimeType(specificSubtitleData).then(
                        function(type) {
                            mimeType = type;
                            if (mediaSource) {
                                return self.sourceBufferExt.createSourceBuffer(mediaSource, mimeType);
                            } else {
                                return Q.reject();
                            }
                        }).then(
                        function(buffer) {
                            textController = self.system.getObject("bufferController");
                            textController.initialize("text", periodInfo, specificSubtitleData, buffer, self.requestScheduler, self.fragmentController, mediaSource);

                            if (buffer.hasOwnProperty('initialize')) {
                                buffer.initialize(mimeType, textController, specificSubtitleData);
                            }
                            //self.debug.log("Text is ready!");
                            textTrackState = "ready";
                            checkIfInitialized.call(self, videoState, audioState, textTrackState);
                        },
                        function(/*error*/) {
                            self.debug.warn("Error creating text source buffer");
                            textTrackState = "ready";
                            textController = null;
                            checkIfInitialized.call(self, videoState, audioState, textTrackState);
                        }
                    );

                    return self.manifestExt.getEventsForPeriod(manifest, periodInfo);
                }, function() {
                    self.debug.log("[Stream] No text tracks.");
                    textTrackState = "ready";
                    checkIfInitialized.call(self, videoState, audioState, textTrackState);

                    return self.manifestExt.getEventsForPeriod(manifest, periodInfo);
                }
            ).then(
                function(events) {
                    if (eventController) {
                        eventController.addInlineEvents(events);
                    }
                }
            );

            return initializedeferred.promise;
        },

        initializePlayback = function() {
            var self = this,
                initialize = Q.defer();

            //self.debug.log("Getting ready for playback...");

            self.manifestExt.getDuration(self.manifestModel.getValue(), periodInfo).then(
                function(duration) {
                    self.debug.log("[Stream] Setting duration: " + duration);
                    return self.mediaSourceExt.setDuration(mediaSource, duration);
                }
            ).then(
                function( /*value*/ ) {
                    //self.debug.log("Duration successfully set to: " + value);
                    initialized = true;
                    initialize.resolve(true);
                }
            );

            return initialize.promise;
        },

        onLoad = function() {
            var self = this;

            this.debug.info("<video> loadedmetadata event");
            this.debug.log("[Stream] Got loadedmetadata event.");

            initialSeekTime = this.timelineConverter.calcPresentationStartTime(periodInfo);
            this.debug.info("[Stream] Starting playback at offset: " + initialSeekTime);
            // ORANGE: performs a programmatical seek only if initial seek time is different
            // from current time (live use case)

            isPaused = this.videoModel.isPaused();
            if (initialSeekTime !== this.videoModel.getCurrentTime()) {
                // ORANGE: we start the <video> element at the real start time got from the video buffer
                // once the first fragment has been appended (see onBufferUpdated)
                this.system.mapHandler("bufferUpdated", undefined, onBufferUpdated.bind(self));

            } else {
                load.resolve(null);
            }
        },

        onCanPlay = function(e) {
            this.debug.info("<video> " + e.type + " event");
            this.debug.log("[Stream] Got canplay event.");
        },

        onPlaying = function() {
            this.debug.info("<video> playing event");
            this.debug.log("[Stream] Got playing event.");
        },

        onLoadStart = function() {
            this.debug.info("<video> loadstart event");
        },

        onWaiting = function() {
            this.debug.info("<video> waiting event");
        },

        onPlay = function() {
            this.debug.info("<video> play event");
            this.debug.log("[Stream] Got play event.");

            // set the currentTime here to be sure that videoTag is ready to accept the seek (cause IE fail on set currentTime on BufferUpdate)
            if ((currentTimeToSet !== 0) && (this.videoModel.getCurrentTime() === 0)) {
                this.system.notify("setCurrentTime");
                this.videoModel.setCurrentTime(currentTimeToSet);
                currentTimeToSet = 0;
            }
            //if a pause command was detected just before this onPlay event, startBuffering again
            //if it was a pause, follow by a seek (in reality just a seek command), don't startBuffering, it's done in onSeeking event
            // we can't, each time, startBuffering in onPlay event (for seek and pause commands) because onPlay event is not fired on IE after a seek command. :-(
            if (isPaused && !isSeeked) {
                startBuffering();
            }

            this.metricsModel.addPlayList("video", new Date().getTime(), this.videoModel.getCurrentTime(), "play");

            isPaused = false;
            isSeeked = false;
        },

        // ORANGE : fullscreen event
        onFullScreenChange = function() {
            var videoElement = this.videoModel.getElement(),
                isFullScreen = 0;

            if (document.webkitIsFullScreen || document.msFullscreenElement || document.mozFullScreen) {
                // browser is fullscreen
                isFullScreen = 1;
            }
            this.metricsModel.addCondition(null, isFullScreen, videoElement.videoWidth, videoElement.videoHeight);
        },

        // ORANGE : ended event
        onEnded = function() {
            this.debug.info("<video> ended event");
            //add stopped state metric with reason = 1 : end of stream
            this.metricsModel.addState("video", "stopped", this.videoModel.getCurrentTime(), 1);
        },

        onPause = function() {
            this.debug.info("<video> pause event");
            //this.debug.log("[Stream] ################################# Got pause event.");
            isPaused = true;
            this.metricsModel.addPlayList("video", new Date().getTime(), this.videoModel.getCurrentTime(), "pause");
            suspend.call(this);
        },

        onError = function(event) {
            var error = event.srcElement.error,
                code;

            if (error.code === -1) {
                // not an error!
                return;
            }

            switch (error.code) {
                case 1:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_ABORTED;
                    break;
                case 2:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_NETWORK;
                    break;
                case 3:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_DECODE;
                    break;
                case 4:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_SRC_NOT_SUPPORTED;
                    break;
                case 5:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_ENCRYPTED;
                    break;
            }

            errored = true;

            this.errHandler.sendError(code, "<video> error event");
        },

        onSeeking = function() {
            var time = this.videoModel.getCurrentTime();
            this.debug.info("<video> seeking event: " + time);
            isSeeked = true;
            startBuffering(time);
        },

        onSeeked = function() {
            this.debug.info("<video> seeked event");
            //this.debug.log("Seek complete.");

            this.videoModel.listen("seeking", seekingListener);
            this.videoModel.unlisten("seeked", seekedListener);
        },

        onProgress = function() {
            this.debug.info("<video> progress event");
            updateBuffer.call(this);
        },

        onTimeupdate = function() {
            this.debug.info("<video> timeupdate event: " + this.videoModel.getCurrentTime());
            updateBuffer.call(this);
        },

        onDurationchange = function() {
            this.debug.info("<video> durationchange event: " + this.videoModel.getElement().duration);
        },

        onRatechange = function() {
            this.debug.info("<video> ratechange event: " + this.videoModel.getElement().playbackRate);
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
                videoController.updateBufferLevel(true);
            }

            if (audioController) {
                audioController.updateBufferLevel(true);
            }

            if (textController) {
                textController.updateBufferLevel(true);
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

        /*updateCurrentTime = function() {
            if (this.videoModel.isPaused()) return;

            var currentTime = this.videoModel.getCurrentTime(),
                representation = videoController ? videoController.getCurrentRepresentation() : audioController.getCurrentRepresentation(),
                actualTime = this.timelineConverter.calcActualPresentationTime(representation, currentTime, this.manifestExt.getIsDynamic(manifest)),
                timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);

            // ORANGE: unuseful?? and generate some bug since we cannot get availability window of current representation (@see TimelineConverter)
            // if (timeChanged) {
            //     this.videoModel.setCurrentTime(actualTime);
            //     startBuffering(actualTime);
            // } else {
            //    startBuffering();
            // }
        },*/

        doLoad = function(manifestResult) {

            var self = this;

            //self.debug.log("Stream start loading.");

            manifest = manifestResult;
            self.debug.log("[Stream] Create MediaSource");
            return self.mediaSourceExt.createMediaSource().then(
                function(mediaSourceResult) {
                    self.debug.log("[Stream] Setup MediaSource");
                    return setUpMediaSource.call(self, mediaSourceResult);
                }
            ).then(
                function(mediaSourceResult) {
                    mediaSource = mediaSourceResult;
                    self.debug.log("[Stream] Initialize MediaSource");
                    return initializeMediaSource.call(self);
                }
            ).then(
                function( /*result*/ ) {
                    self.debug.log("[Stream] Initialize playback");
                    return initializePlayback.call(self);
                }
            ).then(
                function( /*done*/ ) {
                    self.debug.log("[Stream] Playback initialized");
                    return load.promise;
                }
            ).then(
                function() {
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

        currentTimeChanged = function() {
            this.debug.log("[Stream] Current time has changed, block programmatic seek.");

            this.videoModel.unlisten("seeking", seekingListener);
            this.videoModel.listen("seeked", seekedListener);
        },

        bufferingCompleted = function() {

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

        // ORANGE: 'bufferUpdated' event raised when some data has been appended into media buffers
        // => if not started (live use case) then check for playback start time
        onBufferUpdated = function() {
            var self = this,
                videoRange,
                audioRange,
                startTime;

            self.debug.info("[Stream] Check start time");

            // Check if video buffer is not empty
            videoRange = self.sourceBufferExt.getBufferRange(videoController.getBuffer(), initialSeekTime, 2);
            if (videoRange === null) {
                return;
            }
            // PATCH (+0.5) for chrome for which there is an issue for starting live streams,
            // due to a difference (rounding?) between manifest segments times and real samples times
            // returned by the buffer.
            startTime = videoRange.start; // + 0.5;

            if (audioController) {
                // Check if audio buffer is not empty
                audioRange = self.sourceBufferExt.getBufferRange(audioController.getBuffer(), initialSeekTime, 2);
                if (audioRange === null) {
                    return;
                }
                self.debug.info("[Stream] Check start time: A[" + audioRange.start + "-" + audioRange.end + "], V[" + videoRange.start + "-" + videoRange.end + "]");
                // Check if audio and video can be synchronized (if some audio sample is available at returned start time)
                if (audioRange.end < startTime) {
                    return;
                }
                if (audioRange.start > startTime) {
                    startTime = audioRange.start;
                }
            }

            self.debug.info("[Stream] Check start time: OK");

            // Align audio and video buffers
            //self.sourceBufferExt.remove(audioController.getBuffer(), audioRange.start, videoRange.start, Infinity, mediaSource, false);

            // Unmap "bufferUpdated" handler
            self.system.unmapHandler("bufferUpdated");

            // Set current time on video if 'play' event has already been raised.
            // If 'play' event has not yet been raised, the the current time will be set afterwards
            if (isPaused === false) {
                self.system.notify("setCurrentTime");
                self.videoModel.setCurrentTime(startTime);
            } else {
                currentTimeToSet = startTime;
            }

            // Resolve load promise in order to start playing (see doLoad)
            load.resolve(null);
        },

        updateData = function(updatedPeriodInfo) {
            var self = this,
                videoData,
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
                    function(data) {
                        videoController.updateData(data, periodInfo).then(
                            function() {
                                deferredVideoUpdate.resolve();
                            }
                        );
                    }
                );
            } else {
                deferredVideoUpdate.resolve();
            }

            if (audioController) {
                deferredAudioData = self.manifestExt.getDataForIndex(audioTrackIndex, manifest, periodInfo.index);

                deferredAudioData.then(
                    function(data) {
                        audioController.updateData(data, periodInfo).then(
                            function() {
                                deferredAudioUpdate.resolve();
                            }
                        );
                    }
                );
            } else {
                deferredAudioUpdate.resolve();
            }

            if (textController) {
                deferredTextData = self.manifestExt.getDataForIndex(textTrackIndex, manifest, periodInfo.index);

                deferredTextData.then(
                    function(data) {
                        textController.updateData(data, periodInfo).then(
                            function() {
                                deferredTextUpdate.resolve();
                            }
                        );
                    }
                );
            }

            if (eventController) {
                self.manifestExt.getEventsForPeriod(manifest, periodInfo).then(
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
        fragmentExt: undefined,
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
        eventBus: undefined,
        notify: undefined,

        setup: function() {
            this.system.mapHandler("setCurrentTime", undefined, currentTimeChanged.bind(this));
            this.system.mapHandler("bufferingCompleted", undefined, bufferingCompleted.bind(this));
            this.system.mapHandler("segmentLoadingFailed", undefined, segmentLoadingFailed.bind(this));
            // ORANGE: add event handler "liveEdgeFound"
            this.system.mapHandler("liveEdgeFound", undefined, onLiveEdgeFound.bind(this));

            /* @if PROTECTION=true */
            // Protection event handlers
            this[MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR] = onProtectionError.bind(this);
            /* @endif */

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
            canplayListener = onCanPlay.bind(this);
            playingListener = onPlaying.bind(this);
            loadstartListener = onLoadStart.bind(this);
            waitingListener = onWaiting.bind(this);

            // ORANGE : add FullScreen Event listener
            fullScreenListener = onFullScreenChange.bind(this);
            // ORANGE : add Ended Event listener
            endedListener = onEnded.bind(this);

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
            this.videoModel.listen("ended", endedListener);
            this.videoModel.listen("canplay", canplayListener);
            this.videoModel.listen("playing", playingListener);
            this.videoModel.listen("loadstart", loadstartListener);
            //this.videoModel.listen("waiting", waitingListener);

            // ORANGE : add FullScreen Event listener
            this.videoModel.listen("webkitfullscreenchange", fullScreenListener);
            this.videoModel.listen("fullscreenchange", fullScreenListener);
            this.videoModel.listenOnParent("fullscreenchange", fullScreenListener);
            this.videoModel.listenOnParent("webkitfullscreenchange", fullScreenListener);

            this.requestScheduler.videoModel = value;
        },

        // ORANGE: add the capability to set audioTrack
        setAudioTrack: function(audioTrack) {
            var manifest = this.manifestModel.getValue(),
                self = this;

            if (audioController) {
                // Get data index corresponding to new audio track
                self.manifestExt.getDataIndex(audioTrack, manifest, periodInfo.index).then(
                    function(index) {
                        // check if we are not in the same track
                        if (audioTrackIndex !== -1 && index !== audioTrackIndex) {

                            audioTrackIndex = index;

                            // Update manifest
                            self.system.notify("manifestUpdate");
                        }
                    });
            }
        },

        getSelectedAudioTrack: function() {
            var self = this,
                manifest = self.manifestModel.getValue();

            if (audioController) {
                return self.manifestExt.getDataForIndex_(audioTrackIndex, manifest, periodInfo.index);
            }

            return undefined;
        },

        // ORANGE: add the capability to set subtitle track
        setSubtitleTrack: function(subtitleTrack) {
            var deferredSubtitleUpdate = Q.defer(),
                manifest = this.manifestModel.getValue(),
                self = this;

            if (textController) {
                // Get data index corresponding to new audio track
                self.manifestExt.getDataIndex(subtitleTrack, manifest, periodInfo.index).then(
                    function(index) {
                        textTrackIndex = index;

                       // Update manifest
                        self.system.notify("manifestUpdate");
                    }
                );
            } else {
                deferredSubtitleUpdate.reject();
            }

            return deferredSubtitleUpdate.promise;
        },

        getSelectedSubtitleTrack: function() {
            var self = this,
                manifest = self.manifestModel.getValue();

            if (textController) {
                return self.manifestExt.getDataForIndex_(textTrackIndex, manifest, periodInfo.index);
            }

            return undefined;
        },

        initProtection: function(protectionCtrl) {
            protectionController = protectionCtrl;

            // Protection error handler
            if (protectionController) {
                protectionController.subscribe(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, this);
            }
        },

        getVideoModel: function() {
            return this.videoModel;
        },

        getManifestExt: function() {
            var self = this;
            return self.manifestExt;
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

        reset: function() {
            var deferred = Q.defer(),
                self = this;

            this.debug.info("[Stream] Reset");

            pause.call(this);

            this.videoModel.unlisten("play", playListener);
            this.videoModel.unlisten("pause", pauseListener);
            this.videoModel.unlisten("error", errorListener);
            this.videoModel.unlisten("seeking", seekingListener);
            this.videoModel.unlisten("timeupdate", timeupdateListener);
            this.videoModel.unlisten("durationchange", durationchangeListener);
            this.videoModel.unlisten("progress", progressListener);
            this.videoModel.unlisten("ratechange", ratechangeListener);
            this.videoModel.unlisten("loadedmetadata", loadedListener);
            this.videoModel.unlisten("ended", endedListener);
            this.videoModel.unlisten("canplay", canplayListener);
            this.videoModel.unlisten("playing", playingListener);
            this.videoModel.unlisten("loadstart", loadstartListener);
            //this.videoModel.unlisten("waiting", waitingListener);

            this.videoModel.unlisten("webkitfullscreenchange", fullScreenListener);
            this.videoModel.unlisten("fullscreenchange", fullScreenListener);
            this.videoModel.unlistenOnParent("fullscreenchange", fullScreenListener);
            this.videoModel.unlistenOnParent("webkitfullscreenchange", fullScreenListener);


            this.system.unmapHandler("bufferUpdated");
            this.system.unmapHandler("liveEdgeFound");
            this.system.unmapHandler("setCurrentTime");
            this.system.unmapHandler("bufferingCompleted");
            this.system.unmapHandler("segmentLoadingFailed");

            tearDownMediaSource.call(this).then(
                function() {
                    if (protectionController) {
                        protectionController.unsubscribe(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, self);
                    }

                    protectionController = undefined;
                    self.fragmentController = undefined;
                    self.requestScheduler = undefined;

                    load = Q.defer();
                    deferred.resolve();
                });

            return deferred.promise;
        },

        getDuration: function() {
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