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

// Define Math.sign method in case it is not defined (like in IE11)
if (!Math.sign) {
    Math.sign = function(value) {
        "use strict";
        return (value < 0) ? -1 : ((value === 0) ? 0 : 1);
    };
}

MediaPlayer.dependencies.Stream = function() {
    "use strict";

    var manifest,
        mediaSource,
        contentProtection = null,
        videoController = null,
        videoTrackIndex = -1,
        audioController = null,
        audioTrackIndex = -1,
        textController = null,
        subtitlesEnabled = false,
        dvrStarted = false,
        fragmentInfoVideoController = null,
        fragmentInfoAudioController = null,
        fragmentInfoTextController = null,

        textTrackIndex = -1,
        autoPlay = true,
        initialized = false,
        errored = false,

        // Events listeners
        endedListener,
        loadedListener,
        playListener,
        pauseListener,
        errorListener,
        seekingListener,
        seekedListener,
        waitingListener,
        timeupdateListener,
        durationchangeListener,
        progressListener,
        ratechangeListener,
        canplayListener,
        playingListener,
        loadstartListener,

        // Audio/text languages
        defaultAudioLang = 'und',
        defaultSubtitleLang = 'und',

        periodInfo = null,

        // Initial start time
        initialStartTime = -1,

        // Play start time (= live edge for live streams)
        playStartTime = -1,

        // Programmatical seek
        seekTime,
        checkStartTimeIntervalId,

        // trick mode variables
        tmState = "Stopped",
        tmSpeed = 1,
        tmPreviousSpeed,
        tmStartTime,
        tmVideoStartTime,
        tmMinSeekStep,
        tmSeekStep,
        tmSeekTime,
        tmSeekTimeout,
        tmSeekValue,
        tmEndDetected = false,
        muteState = false,

        eventController = null,
        protectionController,
        initializeMediaSourceFinished = true,

        reloadTimeout = null,
        isReloading = false,

        startClockTime = -1,
        startStreamTime = -1,
        visibilitychangeListener,

        // ProtectionController events listener
        onProtectionError = function(event) {
            this.errHandler.sendError(event.data.code, event.data.message, event.data.data);
        },

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

        seek = function(time, autoplay) {
            if (!initialized) {
                //this.debug.info("[Stream] (seek) not initialized");
                return;
            }

            this.debug.info("[Stream] Seek: " + time);

            // In case of live streams and then DVR seek, then we start the fragmentInfoControllers
            // (check if seek not due to stream loading or reloading)
            if (this.manifestExt.getIsDynamic(manifest) && !isReloading && (this.videoModel.getCurrentTime() !== 0)) {
                startFragmentInfoControllers.call(this);
            }

            // Stream is starting playing => fills the buffers before setting <video> current time
            if (autoplay === true) {
                // 1- seeks the buffer controllers at the desired time
                // 2- once data is present in the buffers, then we can set the current time to the <video> component (see onBufferUpdated())
                seekTime = time;
                this.system.unmapHandler("bufferUpdated");
                this.system.mapHandler("bufferUpdated", undefined, onBufferUpdated.bind(this));
                startBuffering.call(this, seekTime);
            } else {
                // Stream is already playing, simply seek the <video> component
                this.videoModel.setCurrentTime(time);
            }
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

                    if (!!fragmentInfoVideoController) {
                        funcs.push(fragmentInfoVideoController.reset(errored));
                    }

                    if (!!audioController) {
                        funcs.push(audioController.reset(errored));
                    }

                    if (!!fragmentInfoAudioController) {
                        funcs.push(fragmentInfoAudioController.reset(errored));
                    }

                    if (!!textController) {
                        funcs.push(textController.reset(errored));
                    }

                    if (!!fragmentInfoTextController) {
                        funcs.push(fragmentInfoTextController.reset(errored));
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

                            contentProtection = null;

                            videoController = null;
                            audioController = null;
                            textController = null;

                            mediaSource = null;
                            manifest = null;

                            deferred.resolve();
                        });
                };


            Q.when(initializeMediaSourceFinished).then(
                function() {
                    executeReset();
                });
            return deferred.promise;
        },

        createBufferController = function(data, codec) {
            var bufferController = null,
                buffer = null;

            // Check if codec is supported (applies only for video and audio)
            if (data.type === 'video' || data.type === 'audio') {
                if (!this.capabilities.supportsCodec(this.videoModel.getElement(), codec)) {
                    this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED, 'Codec is not supported (HTMLMediaElement)', {
                        codec: codec
                    });
                    return null;
                }
            }

            // Create SourceBuffer
            try {
                buffer = this.sourceBufferExt.createSourceBuffer(mediaSource, codec);
            } catch (ex) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CREATE_SOURCEBUFFER, 'Failed to create ' + data.type + ' source buffer',
                    new MediaPlayer.vo.Error(ex.code, ex.name, ex.message));
                return null;
            }

            // Create and initialize BufferController
            bufferController = this.system.getObject("bufferController");
            bufferController.initialize(data.type, periodInfo, data, buffer, this.fragmentController, mediaSource, eventController);

            if (data.type === 'text' && buffer.hasOwnProperty('initialize')) {
                buffer.initialize(codec, bufferController, data);
            }

            return bufferController;
        },

        createFragmentInfoController = function(bufferController, data) {
            if (manifest.name !== 'MSS' || (!this.manifestExt.getIsDynamic(manifest) && !this.manifestExt.getIsStartOver(manifest))) {
                return null;
            }

            var fragmentInfoController = null;

            if (bufferController && data && data.type) {
                fragmentInfoController = this.system.getObject("mssFragmentInfoController");
                fragmentInfoController.initialize(data.type, this.fragmentController, bufferController);
            }

            return fragmentInfoController;
        },

        initializeProtectionController = function () {
            var deferred = null,
                data,
                audioCodec = null,
                videoCodec = null,
                ksSelected,
                self = this;

            data = this.manifestExt.getVideoData(manifest, periodInfo.index);
            if (data) {
                videoCodec = this.manifestExt.getCodec(data);
                contentProtection = this.manifestExt.getContentProtectionData(data);
            }
            data = this.manifestExt.getSpecificAudioData(manifest, periodInfo.index, defaultAudioLang);
            if (data) {
                audioCodec = this.manifestExt.getCodec(data);
            }

            if (!contentProtection) {
                return Q.when(true);
            }

            if (!this.capabilities.supportsEncryptedMedia()) {
                // No protectionController (MediaKeys not supported/enabled) but content is protected => error
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.CAPABILITY_ERR_MEDIAKEYS, "EME is not supported/enabled", null);
                return Q.when(false);
            }

            if (!protectionController) {
                return Q.when(true);
            }

            deferred = Q.defer();

            ksSelected = {};
            ksSelected[MediaPlayer.dependencies.ProtectionController.eventList.ENAME_KEY_SYSTEM_SELECTED] = function(/*event*/) {
                self.debug.log("[Stream] ProtectionController initialized");
                protectionController.unsubscribe(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_KEY_SYSTEM_SELECTED, ksSelected);
                deferred.resolve(true);
            };
            protectionController.subscribe(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_KEY_SYSTEM_SELECTED, ksSelected);
            this.debug.log("[Stream] Initialize ProtectionController");
            protectionController.init(contentProtection, audioCodec, videoCodec);

            return deferred.promise;
        },

        initializeMediaSource = function() {
            var data,
                videoCodec,
                audioCodec,
                textMimeType;

            if (!manifest) {
                return;
            }

            initializeMediaSourceFinished = false;
            eventController = this.system.getObject("eventController");

            // Initialize video BufferController
            data = this.manifestExt.getVideoData(manifest, periodInfo.index);

            if (data === null) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_NO_VIDEO, 'No Video data in manifest');
            } else {
                filterCodecs.call(this, data);
                videoTrackIndex = this.manifestExt.getDataIndex(data, manifest, periodInfo.index);
                videoCodec = this.manifestExt.getCodec(data);
                contentProtection = this.manifestExt.getContentProtectionData(data);

                if (videoCodec === null) {
                    this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED, 'Video codec information not available', {codec: ''});
                } else {
                    videoController = createBufferController.call(this, data, videoCodec);
                    fragmentInfoVideoController = createFragmentInfoController.call(this, videoController, data);
                }
            }

            // Abort if no video controller
            if (videoController === null) {
                initializeMediaSourceFinished = true;
                return;
            }

            // Initialize audio BufferController
            data = this.manifestExt.getSpecificAudioData(manifest, periodInfo.index, defaultAudioLang);

            if (data === null) {
                this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_NO_AUDIO, "No audio data in manifest");
            } else {
                filterCodecs.call(this, data);
                audioTrackIndex = this.manifestExt.getDataIndex(data, manifest, periodInfo.index);
                audioCodec = this.manifestExt.getCodec(data);

                if (audioCodec === null) {
                    this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED, 'Audio codec information not available', {codec: ''});
                } else {
                    audioController = createBufferController.call(this, data, audioCodec);

                    // Abort if audio track defined but failed to create audio controller
                    if (audioController === null) {
                        initializeMediaSourceFinished = true;
                        return;
                    }

                    fragmentInfoAudioController = createFragmentInfoController.call(this, audioController, data);
                }
            }

            // Initialize text BufferController
            data = this.manifestExt.getSpecificTextData(manifest, periodInfo.index, defaultSubtitleLang);

            if (data !== null) {
                textTrackIndex = this.manifestExt.getDataIndex(data, manifest, periodInfo.index);
                textMimeType = this.manifestExt.getMimeType(data);

                if (textMimeType === null) {
                    this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_NO_TEXT, "Text codec information not available");
                } else {
                    textController = createBufferController.call(this, data, textMimeType);
                    fragmentInfoTextController = createFragmentInfoController.call(this, textController, data);
                }
            }

            // Initialize EventController
            if (eventController) {
                eventController.addInlineEvents(this.manifestExt.getEventsForPeriod(manifest, periodInfo));
            }

            initializeMediaSourceFinished = true;
            return;
        },

        initializePlayback = function() {
            this.debug.log("[Stream] Setting duration: " + periodInfo.duration);
            this.mediaSourceExt.setDuration(mediaSource, periodInfo.duration);
            initialized = true;
        },

        startFragmentInfoControllers = function() {
            if (manifest.name !== 'MSS' || (!this.manifestExt.getIsDynamic(manifest) && !this.manifestExt.getIsStartOver(manifest))) {
                return;
            }

            if (fragmentInfoVideoController && dvrStarted === false) {
                dvrStarted = true;
                fragmentInfoVideoController.start(videoController.getSegmentDuration());
            }

            if (fragmentInfoAudioController) {
                fragmentInfoAudioController.start(audioController.getSegmentDuration());
            }

            if (fragmentInfoTextController && subtitlesEnabled) {
                fragmentInfoTextController.start(textController.getSegmentDuration());
            }
        },

        stopFragmentInfoControllers = function() {
            if (fragmentInfoVideoController) {
                dvrStarted = false;
                fragmentInfoVideoController.stop();
            }

            if (fragmentInfoAudioController) {
                fragmentInfoAudioController.stop();
            }

            if (fragmentInfoTextController) {
                fragmentInfoTextController.stop();
            }
        },

        onLoaded = function() {
            this.debug.info("[Stream] <video> loadedmetadata event");
        },

        onCanPlay = function() {
            this.debug.info("[Stream] <video> canplay event");
        },

        onPlaying = function() {
            this.debug.info("[Stream] <video> playing event");

            this.metricsModel.addState("video", "playing", this.getVideoModel().getCurrentTime());

            // Store start time (clock and stream time) for resynchronization purpose
            startClockTime = new Date().getTime() / 1000;
            startStreamTime = this.getVideoModel().getCurrentTime();
        },

        onLoadStart = function() {
            this.debug.info("[Stream] <video> loadstart event");
        },

        onPlay = function() {
            this.debug.info("[Stream] <video> play event");

            //listen pause event to have correct metrics, it should be unlistened by the onBufferingCompleted callback.
            this.videoModel.listen("pause", pauseListener);

            if (tmSpeed !== 1) {
                this.setTrickModeSpeed(1);
            } else {
                // Set the currentTime here to be sure that videoTag is ready to accept the seek (cause IE fail on set currentTime on BufferUpdate)
                if (playStartTime >= 0) {
                    setVideoModelCurrentTime.call(this, playStartTime);
                    playStartTime = -1;
                } else {
                    startBuffering.call(this);
                }
            }

            this.metricsModel.addPlayList("video", new Date().getTime(), this.videoModel.getCurrentTime(), "play");
        },

        // ORANGE : ended event
        onEnded = function() {
            this.debug.info("[Stream] <video> ended event");
            //add stopped state metric with reason = 1 : end of stream
            this.metricsModel.addState("video", "stopped", this.videoModel.getCurrentTime(), 1);

            if (this.manifestExt.getIsStartOver(manifest)) {
                stopFragmentInfoControllers.call(this);
            }
        },

        onPause = function() {
            this.debug.info("[Stream] <video> pause event");
            startClockTime = -1;
            startStreamTime = -1;
            if (tmSpeed === 1) {
                // ORANGE : add metric
                this.metricsModel.addState("video", "paused", this.videoModel.getCurrentTime());
                this.metricsModel.addPlayList("video", new Date().getTime(), this.videoModel.getCurrentTime(), "pause");
            }
            suspend.call(this);
            if (manifest.name === 'MSS' && this.manifestExt.getIsDynamic(manifest)) {
                startFragmentInfoControllers.call(this);
            }
        },

        onError = function(event) {
            var error = event.target.error,
                code,
                message = "[Stream] <video> error: ";

            if (error.code === -1) {
                // not an error!
                return;
            }

            switch (error.code) {
                case 1:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_ABORTED;
                    message += "fetching process aborted";
                    break;
                case 2:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_NETWORK;
                    message += "network error";
                    break;
                case 3:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_DECODE;
                    message += "media decoding error";
                    break;
                case 4:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_SRC_NOT_SUPPORTED;
                    message += "media format not supported";
                    break;
                case 5:
                    code = MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_ENCRYPTED;
                    message += "media is encrypted";
                    break;
            }

            errored = true;

            this.errHandler.sendError(code, message);
        },

        onSeeking = function() {
            var time = this.videoModel.getCurrentTime(),
                duration = this.videoModel.getDuration();

            this.debug.info("[Stream] <video> seeking event: " + time);

            // Check if seeking is different from trick mode seeking, then cancel trick mode
            if ((tmSpeed !== 1) && (time.toFixed(3) !== tmSeekValue.toFixed(3))) {
                this.setTrickModeSpeed(1);
                return;
            }

            // Check if seek time is less than range start, never seek before range start.
            time = (time < this.getStartTime()) ? this.getStartTime() : time;

            // Seeking at end of stream (= duration) does not work consistently across browsers and 'ended' event is then not always raised.
            // Then seek 2 sec. backward to enable 'ended' event to be raised.
            var backoffSeekToEnd = this.config.getParam("backoffSeekToEnd", "number", 2);
            if (duration !== Infinity && time > (duration - backoffSeekToEnd)) {
                setVideoModelCurrentTime.call(this, (duration - backoffSeekToEnd));
                return;
            }

            if (tmSpeed === 1) {
                this.metricsModel.addState("video", "seeking", this.getVideoModel().getCurrentTime());
                this.metricsModel.addPlayList('video', new Date().getTime(), time, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);
            }

            startBuffering.call(this, time);
        },

        onSeeked = function() {
            var self = this,
                currentTime,
                currentVideoTime,
                elapsedTime,
                elapsedSeekTime,
                elapsedVideoTime,
                speed,
                ratio = 0.9,
                seekValue,
                videoEndedEvent,
                delay,
                _seek = function(delay, seekValue) {
                    if (self.videoModel.getCurrentTime() === self.getStartTime() || tmEndDetected) {
                        self.debug.log("[Stream] Trick mode (x" + tmSpeed + "): stop");
                        if (tmEndDetected) {
                            videoEndedEvent = document.createEvent("Event");
                            videoEndedEvent.initEvent("ended", true, true);
                            self.videoModel.getElement().dispatchEvent(videoEndedEvent);
                        }
                        return;
                    }
                    if (seekValue < self.getStartTime()) {
                        seekValue = self.getStartTime();
                    } else if (seekValue >= self.videoModel.getDuration()) {
                        seekValue = self.videoModel.getDuration() - tmMinSeekStep;
                        tmEndDetected = true;
                    }
                    if (delay > 0) {
                        self.debug.log("[Stream] Trick mode (x" + tmSpeed + "): wait " + delay.toFixed(3) + " s");
                    }
                    tmSeekTimeout = setTimeout(function() {
                        tmSeekTime = new Date().getTime() / 1000;
                        self.debug.log("[Stream] Trick mode (x" + tmSpeed + "): seek time = " + seekValue.toFixed(3));
                        tmSeekValue = seekValue;
                        self.videoModel.setCurrentTime(seekValue);
                    }, delay > 0 ? (delay * 1000) : 0);
                };

            this.debug.info("[Stream] <video> seeked event");

            // Notify BufferControllers that video has seeked
            seekedBuffers.call(this);

            // Trick mode
            if (tmSpeed !== 1) {

                currentTime = (new Date().getTime()) / 1000;
                currentVideoTime = self.videoModel.getCurrentTime();
                elapsedTime = currentTime - tmStartTime;
                elapsedSeekTime = currentTime - tmSeekTime;
                elapsedVideoTime = Math.abs(currentVideoTime - tmVideoStartTime);
                speed = (elapsedVideoTime / elapsedTime);

                self.debug.log("[Stream] Trick mode (x" + tmSpeed + "): elapsed time = " + elapsedTime.toFixed(3) + ", elapsed video time = " + elapsedVideoTime.toFixed(3) + ", speed = " + speed.toFixed(3));

                if (tmState === "Changed") {
                    clearTimeout(tmSeekTimeout);
                    // Target speed changed => reset start times, and seek
                    tmState = "Running";
                    tmStartTime = (new Date().getTime()) / 1000;
                    tmVideoStartTime = currentVideoTime;
                    self.debug.info("[Stream] Trick mode (x" + tmSpeed + "): videoTime = " + tmVideoStartTime);
                    //if trick mode speed has decreased, we have to decrease tmSeekStep
                    tmSeekStep = Math.abs(tmPreviousSpeed / tmSpeed) > 1 ? tmSeekStep / Math.abs(tmPreviousSpeed / tmSpeed) : tmSeekStep;
                    seekValue = currentVideoTime + (tmSeekStep * Math.sign(tmSpeed));
                    delay = 0;
                } else if (speed < (Math.abs(tmSpeed) * ratio)) {
                    // Measured speed < target speed => increase seek step
                    var speedRatio = Math.abs(tmSpeed / speed);
                    tmSeekStep *= Math.round(speedRatio) + Math.round(speedRatio % tmMinSeekStep);
                    self.debug.info("[Stream] Trick mode (x" + tmSpeed + "): seek step = " + tmSeekStep);
                    seekValue = currentVideoTime + (tmSeekStep * Math.sign(tmSpeed));
                    delay = 0;
                } else {
                    // Measured speed > target speed => wait before next seek
                    seekValue = currentVideoTime + (tmSeekStep * Math.sign(tmSpeed));
                    delay = (Math.abs(seekValue - tmVideoStartTime) / Math.abs(tmSpeed)) - elapsedTime - elapsedSeekTime;
                }

                _seek.call(self, delay, seekValue);

            }

            // The current time has been changed on video model, then reactivate 'seeking' event listener
            // (see setVideoModelCurrentTime())
            this.videoModel.listen("seeking", seekingListener);

            isReloading = false;
            startClockTime = -1;
            startStreamTime = -1;
        },

        onProgress = function() {
            this.debug.info("[Stream] <video> progress event");
            updateBuffer.call(this);
        },

        onTimeupdate = function() {
            this.debug.info("[Stream] <video> timeupdate event: " + this.videoModel.getCurrentTime());
            updateBuffer.call(this);
        },

        onWaiting = function() {
            this.debug.info("[Stream] <video> waiting event");
            if (!this.getVideoModel().isSeeking()) {
                this.metricsModel.addState("video", "buffering", this.getVideoModel().getCurrentTime());
            }
        },

        onDurationchange = function() {
            var duration = this.videoModel.getDuration();
            this.debug.info("[Stream] <video> durationchange event: " + duration);
        },

        onRatechange = function() {
            this.debug.info("[Stream] <video> ratechange event: " + this.videoModel.getPlaybackRate());
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

        onReload = function() {

            // Ask for manifest refresh
            // Then, once manifest has been refresh and data updated, we reload session (see updateData())
            pause.call(this);
            isReloading = true;
            this.system.notify("manifestUpdate", true);
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
            this.debug.log("[Stream] startBuffering" + ((time === undefined) ? "" : (" at time " + time)));

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

            if (textController && subtitlesEnabled && tmSpeed === 1) {
                if (time === undefined) {
                    textController.start();
                } else {
                    textController.seek(time);
                }
            }
        },

        stopBuffering = function() {
            this.debug.log("[Stream] stopBuffering");

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

        seekedBuffers = function() {
            if (videoController) {
                videoController.seeked();
            }
            if (audioController) {
                audioController.seeked();
            }
            if (textController) {
                textController.seeked();
            }
        },

        suspend = function() {
            if (!this.scheduleWhilePaused || this.manifestExt.getIsDynamic(manifest)) {
                stopBuffering.call(this);
            }

            clearInterval(checkStartTimeIntervalId);
        },

        doLoad = function(manifestResult) {

            var self = this;

            //self.debug.log("Stream start loading.");

            manifest = manifestResult;
            self.debug.log("[Stream] Create MediaSource");

            try {
                mediaSource = self.mediaSourceExt.createMediaSource();
            } catch (error) {
                self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CREATE_MEDIASOURCE, "Failed to create MediaSource", {
                    name: error.name,
                    message: error.message
                });
            }

            if (mediaSource === null) {
                return;
            }

            initializeProtectionController.call(self).then(function() {
                self.debug.log("[Stream] Setup MediaSource");
                setUpMediaSource.call(self, mediaSource).then(
                    function(mediaSourceResult) {
                        mediaSource = mediaSourceResult;
                        self.debug.log("[Stream] Initialize MediaSource");
                        initializeMediaSource.call(self);
                        self.debug.log("[Stream] Initialize playback");
                        initializePlayback.call(self);
                        self.debug.log("[Stream] Playback initialized");
                    }
                );
            });
        },

        setVideoModelCurrentTime = function(time) {
            this.debug.log("[Stream] Set video model current time: " + time);
            this.videoModel.unlisten("seeking", seekingListener);
            this.videoModel.setCurrentTime(time);
        },

        onBufferingCompleted = function() {

            // if there is at least one buffer controller that has not completed buffering yet do nothing
            if ((videoController && !videoController.isBufferingCompleted()) || (audioController && !audioController.isBufferingCompleted())) {
                return;
            }

            // buffering has been complted, now we can signal end of stream
            if (mediaSource) {
                //unlisten pause event to have correct metrics, and not catch the pause event sent before the onded event
                this.videoModel.unlisten("pause", pauseListener);
                this.debug.info("[Stream] Signal end of stream");
                this.mediaSourceExt.signalEndOfStream(mediaSource);
            }
        },

        // 'startTimeFound' event raised by video controller when start time has been found
        // startTime = video live edge for live streams
        // startTime = first video segment time for static streams
        // => then seek every BufferController at the found start time
        onStartTimeFound = function(startTime) {
            this.debug.info("[Stream] Start time = " + startTime);
            // Check if initial start time is set, then overload start time
            if (initialStartTime !== -1 &&
                !this.manifestExt.getIsDynamic(manifest) &&
                initialStartTime < periodInfo.duration) {
                this.debug.info("[Stream] Initial start time = " + initialStartTime);
                startTime = initialStartTime;
            }
            seek.call(this, startTime, (periodInfo.index === 0) && autoPlay);
        },

        // ORANGE: 'bufferUpdated' event raised when some data has been appended into media buffers
        // => if not started (live use case) then check for playback start time and do play
        onBufferUpdated = function() {
            var videoRange,
                audioRange,
                startTime;

            this.debug.info("[Stream] Check start time");

            // Check if video buffer is not empty
            videoRange = this.sourceBufferExt.getBufferRange(videoController.getBuffer(), seekTime, videoController.getSegmentDuration());
            if (videoRange === null) {
                return;
            }

            startTime = Math.max(seekTime, videoRange.start);

            if (videoRange.end < startTime) {
                return;
            }

            if (audioController) {
                // Check if audio buffer is not empty
                audioRange = this.sourceBufferExt.getBufferRange(audioController.getBuffer(), seekTime, audioController.getSegmentDuration());
                if (audioRange === null) {
                    return;
                }
                this.debug.info("[Stream] Check start time: A[" + audioRange.start + "-" + audioRange.end + "], V[" + videoRange.start + "-" + videoRange.end + "]");
                // Check if audio and video can be synchronized (if some audio sample is available at returned start time)
                if (audioRange.end < startTime) {
                    return;
                }
                startTime = Math.max(startTime, audioRange.start);
            }

            this.debug.info("[Stream] Check start time: OK => " + startTime);

            // Unmap "bufferUpdated" handler
            this.system.unmapHandler("bufferUpdated");

            // Set current time on video if 'play' event has already been raised.
            // If 'play' event has not yet been raised, the the current time will be set afterwards
            if (!this.videoModel.isPaused()) {
                setVideoModelCurrentTime.call(this, startTime);
            } else {
                playStartTime = startTime;
            }

            if (this.manifestExt.getIsStartOver(manifest)) {
                startFragmentInfoControllers.call(this);
            }
            
            play.call(this);
        },

        // 'sourceDurationChanged' event is raised when source duration changed (start-over streams use case)
        onSourceDurationChanged = function(duration) {
            this.debug.info("[Stream] Source duration changed: " + duration);
            this.mediaSourceExt.setDuration(mediaSource, duration);
            manifest.mediaPresentationDuration = duration;
            periodInfo.duration = duration;
        },

        selectTrack = function(controller, track, currentIndex) {
            var index = -1;

            if (!controller) {
                return currentIndex;
            }

            if (currentIndex === -1) {
                return currentIndex;
            }

            // Get data index corresponding to the new selected track
            index = this.manifestExt.getDataIndex(track, manifest, periodInfo.index);

            // Check if different track selected
            if (index !== currentIndex) {
                if (manifest.name === 'MSS' && (this.manifestExt.getIsDynamic(manifest)  || this.manifestExt.getIsStartOver(manifest))) {
                    // If live MSS, refresh the manifest to get new selected track segments info
                    this.system.notify("manifestUpdate");
                } else {
                    // Else update controller data directly
                    controller.updateData(track, periodInfo);
                }
            }

            return index;
        },

        filterCodecs = function(data) {
            var codec,
                i;
            // Filter codecs that are not supported
            // But keep at least codec from lowest representation
            i = 1;
            while (i < data.Representation_asArray.length) {
                codec = this.manifestExt.getCodecForRepresentation(data.Representation_asArray[i]);
                if (codec) {
                    if (!this.capabilities.supportsCodec(this.videoModel.getElement(), codec)) {
                        this.debug.warn('[Stream] codec not supported: ' + codec);
                        data.Representation_asArray.splice(i, 1);
                        i--;
                    }
                }
                i++;
            }
        },

        updateData = function(updatedPeriodInfo) {
            var videoData,
                data;

            manifest = this.manifestModel.getValue();
            periodInfo = updatedPeriodInfo;
            this.debug.log("[Stream] Manifest updated ... set new data on buffers.");

            if (videoController) {
                videoData = videoController.getData();

                if (!!videoData && videoData.hasOwnProperty("id")) {
                    data = this.manifestExt.getDataForId(videoData.id, manifest, periodInfo.index);
                } else {
                    data = this.manifestExt.getDataForIndex(videoTrackIndex, manifest, periodInfo.index);
                }
                filterCodecs.call(this, data);
                videoController.updateData(data, periodInfo);
            }

            if (audioController) {
                data = this.manifestExt.getDataForIndex(audioTrackIndex, manifest, periodInfo.index);
                filterCodecs.call(this, data);
                audioController.updateData(data, periodInfo);
            }

            if (textController) {
                data = this.manifestExt.getDataForIndex(textTrackIndex, manifest, periodInfo.index);
                textController.updateData(data, periodInfo);
            }

            if (eventController) {
                var events = this.manifestExt.getEventsForPeriod(manifest, periodInfo);
                eventController.addInlineEvents(events);
            }

            if (isReloading && videoController) {
                this.system.unmapHandler("bufferUpdated");
                this.system.mapHandler("bufferUpdated", undefined, onBufferUpdated.bind(this));
                // Call load on video controller in order to get new stream start time (=live edge for live streams)
                videoController.load();
            }

            if (dvrStarted) {
                startFragmentInfoControllers.call(this);
            }
        },

        streamsComposed = function() {
            var time = this.videoModel.getCurrentTime();
            textController.seek(time);
            textController.seeked();
        },

        // Called when a BufferController failed to download or buffer a segment
        onSegmentLoadingFailed = function(segmentRequest) {
            var self = this;

            this.debug.log("[Stream] Segment loading failed: start time = " + segmentRequest.startTime + ", duration = " + segmentRequest.duration);

            if ((this.manifestExt.getIsDynamic(manifest) || this.manifestExt.getIsStartOver(manifest)) && reloadTimeout === null) {
                // For Live streams, then we try to reload the session
                isReloading = true;
                var delay = segmentRequest.duration;
                this.debug.info("[Stream] Reload session in " + delay + " s.");
                reloadTimeout = setTimeout(function() {
                    reloadTimeout = null;
                    //pause.call(self);
                    isReloading = true;
                    self.debug.info("[Stream] Reload session (update manifest)");
                    self.system.notify("manifestUpdate", true);
                    stopFragmentInfoControllers.call(self);
                }, delay * 1000);
            } else {
                // For VOD streams, we seek at recovery time
                seek.call(this, (segmentRequest.startTime + segmentRequest.duration));
            }
        },

        onVisibilitychange = function() {

            if (document.hidden === true || startClockTime === -1) {
                return;
            }

            // If current document get focus back, then check if resynchronization is required
            var clockTime = new Date().getTime() / 1000,
                streamTime = this.getVideoModel().getCurrentTime(),
                elapsedClockTime = clockTime - startClockTime,
                elapsedStreamTime = streamTime - startStreamTime;

            this.debug.log("[Stream] VisibilityChange: elapsedClockTime = " + elapsedClockTime + ", elapsedStreamTime = " + elapsedStreamTime + " (" + (elapsedClockTime - elapsedStreamTime) + ")");

            if ((elapsedClockTime - elapsedStreamTime) > 1) {
                onReload.call(this);
            }

        };

    return {
        system: undefined,
        videoModel: undefined,
        manifestLoader: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        manifestExt: undefined,
        fragmentController: undefined,
        fragmentExt: undefined,
        protectionExt: undefined,
        capabilities: undefined,
        debug: undefined,
        metricsExt: undefined,
        errHandler: undefined,
        timelineConverter: undefined,
        scheduleWhilePaused: undefined,
        textTrackExtensions: undefined,
        metricsModel: undefined,
        eventBus: undefined,
        notify: undefined,
        config: undefined,

        setup: function() {
            this.system.mapHandler("startTimeFound", undefined, onStartTimeFound.bind(this));
            this.system.mapHandler("segmentLoadingFailed", undefined, onSegmentLoadingFailed.bind(this));
            this.system.mapHandler("bufferingCompleted", undefined, onBufferingCompleted.bind(this));
            this.system.mapHandler("sourceDurationChanged", undefined, onSourceDurationChanged.bind(this));
            
            // Protection event handlers
            if (MediaPlayer.dependencies.ProtectionController) {
                this[MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR] = onProtectionError.bind(this);
            }

            playListener = onPlay.bind(this);
            pauseListener = onPause.bind(this);
            errorListener = onError.bind(this);
            seekingListener = onSeeking.bind(this);
            seekedListener = onSeeked.bind(this);
            waitingListener = onWaiting.bind(this);
            progressListener = onProgress.bind(this);
            ratechangeListener = onRatechange.bind(this);
            timeupdateListener = onTimeupdate.bind(this);
            durationchangeListener = onDurationchange.bind(this);
            loadedListener = onLoaded.bind(this);
            canplayListener = onCanPlay.bind(this);
            playingListener = onPlaying.bind(this);
            loadstartListener = onLoadStart.bind(this);
            endedListener = onEnded.bind(this);

            visibilitychangeListener = onVisibilitychange.bind(this);
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
            this.videoModel.listen("seeked", seekedListener);
            this.videoModel.listen("waiting", waitingListener);
            this.videoModel.listen("timeupdate", timeupdateListener);
            this.videoModel.listen("durationchange", durationchangeListener);
            this.videoModel.listen("progress", progressListener);
            this.videoModel.listen("ratechange", ratechangeListener);
            this.videoModel.listen("loadedmetadata", loadedListener);
            this.videoModel.listen("ended", endedListener);
            this.videoModel.listen("canplay", canplayListener);
            this.videoModel.listen("playing", playingListener);
            this.videoModel.listen("loadstart", loadstartListener);

            //document.addEventListener("visibilitychange", visibilitychangeListener);
        },

        setInitialStartTime: function(startTime) {
            var time = parseFloat(startTime);
            if (!isNaN(time)) {
                initialStartTime = time;
            }
        },

        getAudioTracks: function() {
            return this.manifestExt.getAudioDatas(manifest, periodInfo.index);
        },

        setAudioTrack: function(audioTrack) {
            if (fragmentInfoAudioController) {
                fragmentInfoAudioController.stop();
            }
            audioTrackIndex = selectTrack.call(this, audioController, audioTrack, audioTrackIndex);
        },

        getSelectedAudioTrack: function() {
            if (audioController) {
                return this.manifestExt.getDataForIndex(audioTrackIndex, manifest, periodInfo.index);
            }
            return undefined;
        },

        getSubtitleTracks: function() {
            return this.manifestExt.getTextDatas(manifest, periodInfo.index);
        },

        setSubtitleTrack: function(subtitleTrack) {
            if (fragmentInfoTextController) {
                fragmentInfoTextController.stop();
            }
            textTrackIndex = selectTrack.call(this, textController, subtitleTrack, textTrackIndex);
        },

        getSelectedSubtitleTrack: function() {
            if (textController && subtitlesEnabled) {
                return this.manifestExt.getDataForIndex(textTrackIndex, manifest, periodInfo.index);
            }
            return undefined;
        },

        initProtection: function(protectionCtrl) {
            protectionController = protectionCtrl;
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

            stopBuffering.call(this);

            stopFragmentInfoControllers.call(this);

            pause.call(this);

            // Trick mode seeking timeout
            clearTimeout(tmSeekTimeout);

            // Stop reload timeout
            clearTimeout(reloadTimeout);

            //if player is in trick mode, restore mute state.
            if (tmSpeed !== 1) {
                this.videoModel.setMute(muteState);
            }

            //document.removeEventListener("visibilityChange");

            this.videoModel.unlisten("play", playListener);
            this.videoModel.unlisten("pause", pauseListener);
            this.videoModel.unlisten("error", errorListener);
            this.videoModel.unlisten("seeking", seekingListener);
            this.videoModel.unlisten("seeked", seekedListener);
            this.videoModel.unlisten("waiting", waitingListener);
            this.videoModel.unlisten("timeupdate", timeupdateListener);
            this.videoModel.unlisten("durationchange", durationchangeListener);
            this.videoModel.unlisten("progress", progressListener);
            this.videoModel.unlisten("ratechange", ratechangeListener);
            this.videoModel.unlisten("loadedmetadata", loadedListener);
            this.videoModel.unlisten("ended", endedListener);
            this.videoModel.unlisten("canplay", canplayListener);
            this.videoModel.unlisten("playing", playingListener);
            this.videoModel.unlisten("loadstart", loadstartListener);

            this.system.unmapHandler("streamsComposed", undefined, streamsComposed);

            this.system.unmapHandler("bufferUpdated");
            this.system.unmapHandler("startTimeFound");
            this.system.unmapHandler("segmentLoadingFailed");
            this.system.unmapHandler("bufferingCompleted");
            this.system.unmapHandler("sourceDurationChanged");
            
            tearDownMediaSource.call(this).then(
                function() {
                    if (protectionController) {
                        protectionController.unsubscribe(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, self);
                    }

                    protectionController = undefined;
                    self.fragmentController = undefined;

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

        getMinbufferTime: function() {
            if (!videoController) {
                return MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME;
            }
            return videoController.getMinbufferTime();
        },

        getLiveDelay: function() {
            if (!videoController) {
                return MediaPlayer.dependencies.BufferExtensions.DEFAULT_LIVE_DELAY;
            }
            return videoController.getLiveDelay();
        },

        startEventController: function() {
            eventController.start();
        },

        resetEventController: function() {
            eventController.reset();
        },

        enableSubtitles: function(enabled) {
            var track;

            if (enabled !== subtitlesEnabled) {
                subtitlesEnabled = enabled;
                track = this.textTrackExtensions.getCurrentTextTrack(this.videoModel.getElement());
                this.textTrackExtensions.cleanSubtitles();

                if (textController) {
                    if (enabled) {
                        if (manifest.name === 'MSS' && (this.manifestExt.getIsDynamic(manifest)  || this.manifestExt.getIsStartOver(manifest))) {
                            // In case of MSS live streams, refresh manifest before activating subtitles
                            this.system.mapHandler("streamsComposed", undefined, streamsComposed.bind(this), true);
                            this.system.notify("manifestUpdate");
                        } else {
                            streamsComposed.call(this);
                        }
                        // show subtitle here => useful for full TTML file
                        if (track && track.kind !== 'metadata' && track.mode !== 'showing') {
                            track.mode = "showing";
                        }else if (track) {
                            track.mode = "hidden";
                        }
                    } else {
                        if (fragmentInfoTextController) {
                            fragmentInfoTextController.stop();
                        }
                        // hide subtitle here
                        if (track) {
                            track.mode = "disabled";
                        }
                        textController.stop();
                    }
                }
            }
        },

        setTrickModeSpeed: function(speed) {
            var funcs = [],
                self = this,
                enableTrickMode = (speed !== 1) ? true : false,
                currentVideoTime,
                seekValue,
                restoreMute = function() {
                    if (self.videoModel.getCurrentTime() > (currentVideoTime + 1)) {
                        self.videoModel.unlisten("timeupdate", restoreMute);
                        self.debug.info("[Stream] Set mute: " + muteState + ", the mute state before using trick mode.");
                        self.videoModel.setMute(muteState);
                    }
                };

            if (speed === tmSpeed) {
                return;
            }

            if (!videoController) {
                return;
            }

            self.debug.info("[Stream] Trick mode: speed = " + speed);

            if (enableTrickMode && tmState === "Stopped") {
                //unlisten pause event to have correct metrics
                this.videoModel.unlisten("pause", pauseListener);
                self.debug.info("[Stream] Set mute: true");
                muteState = self.videoModel.getMute();
                if (!muteState) {
                    self.videoModel.setMute(true);
                }
                self.videoModel.pause();
            } else if (!enableTrickMode) {
                //stop trick mode, add a trick mode metric
                self.metricsModel.addPlayList('video', new Date().getTime(), tmVideoStartTime, 'trickMode', tmSpeed);
                tmSpeed = 1;
                clearTimeout(tmSeekTimeout);
                stopBuffering.call(self);
            }

            funcs.push(videoController.setTrickMode(enableTrickMode, speed > 1));
            if (audioController) {
                funcs.push(audioController.setTrickMode(enableTrickMode, speed > 1));
            }

            Q.all(funcs).then(function() {
                tmPreviousSpeed = tmSpeed;
                tmSpeed = speed;
                currentVideoTime = self.videoModel.getCurrentTime();

                if (!enableTrickMode) {
                    //listen pause event to have correct metrics
                    self.videoModel.listen("pause", pauseListener);
                    self.debug.info("[Stream] Trick mode: Stopped, current time = " + currentVideoTime);
                    tmState = "Stopped";
                    self.videoModel.listen("timeupdate", restoreMute);
                    currentVideoTime = tmEndDetected ? self.getStartTime() : currentVideoTime;
                    seek.call(self, currentVideoTime, true);
                } else {
                    if (tmState === "Running") {
                        //trick mode speed has changed, add a trick mode metric for the previous speed
                        self.metricsModel.addPlayList('video', new Date().getTime(), tmVideoStartTime, 'trickMode', tmPreviousSpeed);
                        tmState = "Changed";
                    } else if (tmState === "Stopped") {
                        tmEndDetected = false;
                        tmState = "Running";
                        tmSeekStep = tmMinSeekStep = videoController.getSegmentDuration();
                        tmStartTime = tmSeekTime = (new Date().getTime()) / 1000;
                        tmVideoStartTime = currentVideoTime;
                        self.debug.info("[Stream] Trick mode (x" + tmSpeed + "): videoTime = " + tmVideoStartTime);
                        seekValue = currentVideoTime + (tmSeekStep * Math.sign(tmSpeed));
                        seekValue = Math.round((seekValue - (seekValue % tmMinSeekStep)) * 1000) / 1000;
                        self.debug.info("[Stream] Trick mode (x" + tmSpeed + "): seek step = " + tmSeekStep);
                        tmSeekValue = seekValue;
                        seek.call(self, seekValue);
                    }
                }
            });
        },

        getTrickModeSpeed: function() {
            return tmSpeed;
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
