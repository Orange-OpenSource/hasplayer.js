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
        videoCodec = null,
        audioCodec = null,
        contentProtection = null,
        videoController = null,
        videoTrackIndex = -1,
        audioController = null,
        audioTrackIndex = -1,
        textController = null,
        subtitlesEnabled = false,
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
        initializedeferred = null,

        reloadTimeout = null,
        isReloading = false,

        startClockTime = -1,
        startStreamTime = -1,
        visibilitychangeListener,

        // Protection errors
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

        initializeMediaSource = function() {
            var data,
                buffer;

            initializedeferred = Q.defer();
            eventController = this.system.getObject("eventController");

            // Initialize video controller
            data = this.manifestExt.getVideoData(manifest, periodInfo.index);
            if (data === null) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_NO_VIDEO, "No Video data in manifest");
                initializedeferred.reject();
                return initializedeferred.promise;
            }
            videoTrackIndex = this.manifestExt.getDataIndex(data, manifest, periodInfo.index);
            videoCodec = this.manifestExt.getCodec(data);
            if (videoCodec === null) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_NO_VIDEO, "Video codec information not available");
                initializedeferred.reject();
                return initializedeferred.promise;
            }

            if (!this.capabilities.supportsCodec(this.videoModel.getElement(), videoCodec)) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED, "Video codec is not supported", {
                    codec: videoCodec
                });
                initializedeferred.reject();
                return initializedeferred.promise;
            }

            contentProtection = this.manifestExt.getContentProtectionData(data);
            if (mediaSource) {
                try {
                    buffer = this.sourceBufferExt.createSourceBuffer_(mediaSource, videoCodec);
                } catch (ex) {
                    this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CREATE_SOURCEBUFFER, "Failed to create video source buffer",
                        new MediaPlayer.vo.Error(ex.code, ex.name, ex.message));
                    initializedeferred.reject();
                    return initializedeferred.promise;
                }
            } else {
                // If MediaSource is not defined then raise DOMException 'InvalidAccessError'
                // as it can raised by MediaSource's addSourceBuffer() method (see https://w3c.github.io/media-source/#widl-MediaSource-addSourceBuffer)                
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CREATE_SOURCEBUFFER, "Failed to create video source buffer",
                    new MediaPlayer.vo.Error(MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_INVALID_ACCESS, "InvalidAccessError", "MediaSource undefined"));
                initializedeferred.reject();
                return initializedeferred.promise;
            }

            videoController = this.system.getObject("bufferController");
            videoController.initialize("video", periodInfo, data, buffer, this.fragmentController, mediaSource, eventController);

            data = this.manifestExt.getSpecificAudioData(manifest, periodInfo.index, defaultAudioLang);

            if (data === null) {
                this.debug.log("[Stream] No audio streams.");
                this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_NO_AUDIO, "No audio data in manifest");
            } else {
                audioTrackIndex = this.manifestExt.getDataIndex(data, manifest, periodInfo.index);
                audioCodec = this.manifestExt.getCodec(data);
                if (audioCodec === null) {
                    this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_NO_AUDIO, "Audio codec information not available");
                    initializedeferred.resolve();
                    return initializedeferred.promise;
                }

                if (!this.capabilities.supportsCodec(this.videoModel.getElement(), audioCodec)) {
                    this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED, "Audio codec is not supported", {
                        codec: audioCodec
                    });
                    initializedeferred.resolve();
                    return initializedeferred.promise;
                }

                if (mediaSource) {
                    buffer = this.sourceBufferExt.createSourceBuffer_(mediaSource, audioCodec);
                } else {
                    // If MediaSource is not defined then raise DOMException 'InvalidAccessError'
                    // as it can raised by MediaSource's addSourceBuffer() method (see https://w3c.github.io/media-source/#widl-MediaSource-addSourceBuffer)
                    this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CREATE_SOURCEBUFFER, "Failed to create audio source buffer",
                        new MediaPlayer.vo.Error(MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_INVALID_ACCESS, "InvalidAccessError", "MediaSource undefined"));
                    initializedeferred.resolve();
                    return initializedeferred.promise;
                }

                audioController = this.system.getObject("bufferController");
                audioController.initialize("audio", periodInfo, data, buffer, this.fragmentController, mediaSource, eventController);
            }

            data = this.manifestExt.getSpecificTextData(manifest, periodInfo.index, defaultSubtitleLang);

            if (data === null) {
                this.debug.log("[Stream] No text tracks.");
            } else {

                textTrackIndex = this.manifestExt.getDataIndex(data, manifest, periodInfo.index);
                var mimeType = this.manifestExt.getMimeType(data);

                if (mimeType === null) {
                    this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_NO_TEXT, "Text codec information not available");
                    initializedeferred.resolve();
                    return initializedeferred.promise;
                }

                if (mediaSource) {
                    buffer = this.sourceBufferExt.createSourceBuffer_(mediaSource, mimeType);
                } else {
                    // If MediaSource is not defined then raise DOMException 'InvalidAccessError'
                    // as it can raised by MediaSource's addSourceBuffer() method (see https://w3c.github.io/media-source/#widl-MediaSource-addSourceBuffer)
                    this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CREATE_SOURCEBUFFER, "Failed to create audio source buffer",
                        new MediaPlayer.vo.Error(MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_INVALID_ACCESS, "InvalidAccessError", "MediaSource undefined"));
                    initializedeferred.resolve();
                    return initializedeferred.promise;
                }

                textController = this.system.getObject("bufferController");
                textController.initialize("text", periodInfo, data, buffer, this.fragmentController, mediaSource, eventController);
                if (buffer.hasOwnProperty('initialize')) {
                    buffer.initialize(mimeType, textController, data);
                }
            }

            if (eventController) {
                eventController.addInlineEvents(this.manifestExt.getEventsForPeriod(manifest, periodInfo));
            }

            if (protectionController) {
                protectionController.init(contentProtection, audioCodec, videoCodec);
            } else if (contentProtection && !this.capabilities.supportsEncryptedMedia()) {
                // No protectionController (MediaKeys not supported/enabled) but content is protected => error
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.CAPABILITY_ERR_MEDIAKEYS, "EME is not supported/enabled", null);
                initializedeferred.reject();
            }
            initializedeferred.resolve();
            return initializedeferred.promise;
        },

        initializePlayback = function() {
            var duration;

            duration = this.manifestExt.getDuration(this.manifestModel.getValue(), periodInfo);
            this.debug.log("[Stream] Setting duration: " + duration);
            this.mediaSourceExt.setDuration(mediaSource, duration);

            initialized = true;
        },

        startFragmentInfoControllers = function() {
            if (fragmentInfoVideoController === null && videoController) {
                fragmentInfoVideoController = this.system.getObject("fragmentInfoController");
                fragmentInfoVideoController.initialize("video", this.fragmentController, videoController);
            }

            if (fragmentInfoAudioController === null && audioController) {
                fragmentInfoAudioController = this.system.getObject("fragmentInfoController");
                fragmentInfoAudioController.initialize("audio", this.fragmentController, audioController);
            }

            if (fragmentInfoTextController === null && textController) {
                fragmentInfoTextController = this.system.getObject("fragmentInfoController");
                fragmentInfoTextController.initialize("text", this.fragmentController, textController);
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

            // Store start time (clock and stream time) for resynchronization purpose
            startClockTime = new Date().getTime() / 1000;
            startStreamTime = this.getVideoModel().getCurrentTime();
        },

        onLoadStart = function() {
            this.debug.info("[Stream] <video> loadstart event");
        },

        onPlay = function() {
            this.debug.info("[Stream] <video> play event");

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
        },

        onPause = function() {
            this.debug.info("[Stream] <video> pause event");
            startClockTime = -1;
            startStreamTime = -1;
            this.metricsModel.addPlayList("video", new Date().getTime(), this.videoModel.getCurrentTime(), "pause");
            suspend.call(this);
        },

        onError = function(event) {
            var error = event.srcElement.error,
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
            var time = this.videoModel.getCurrentTime();

            this.debug.info("[Stream] <video> seeking event: " + time);

            // Check if seeking is different from trick mode seeking, then cancel trick mode
            if ((tmSpeed !== 1) && (time.toFixed(3) !== tmSeekValue.toFixed(3))) {
                this.setTrickModeSpeed(1);
                return;
            }

            // Check if seek time is less than range start, never seek before range start.
            time = (time < this.getStartTime()) ? this.getStartTime() : time;

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
                delay,
                _seek = function(delay, seekValue) {
                    if (self.videoModel.getCurrentTime() === self.getStartTime() || tmEndDetected) {
                        self.debug.log("[Stream] Trick mode (x" + tmSpeed + "): stop");
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

        onDurationchange = function() {
            this.debug.info("[Stream] <video> durationchange event: " + this.videoModel.getDuration());
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

            if (fragmentInfoVideoController) {
                fragmentInfoVideoController.stop();
            }

            if (audioController) {
                audioController.stop();
            }

            if (fragmentInfoAudioController) {
                fragmentInfoAudioController.stop();
            }

            if (textController) {
                textController.stop();
            }

            if (fragmentInfoTextController) {
                fragmentInfoTextController.stop();
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

            self.debug.log("[Stream] Setup MediaSource");
            setUpMediaSource.call(self, mediaSource).then(
                function(mediaSourceResult) {
                    mediaSource = mediaSourceResult;
                    self.debug.log("[Stream] Initialize MediaSource");
                    initializeMediaSource.call(self);
                }
            ).then(
                function( /*result*/ ) {
                    self.debug.log("[Stream] Initialize playback");
                    initializePlayback.call(self);
                    self.debug.log("[Stream] Playback initialized");
                }
            );
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
            videoRange = this.sourceBufferExt.getBufferRange(videoController.getBuffer(), seekTime, 2);
            if (videoRange === null) {
                return;
            }
            // PATCH (+0.5) for chrome for which there is an issue for starting live streams,
            // due to a difference (rounding?) between manifest segments times and real samples times
            // returned by the buffer.
            startTime = videoRange.start; // + 0.5;
            // Do not need to take videoRange.start since in case of live streams the seekTime corresponds
            // to the start of a video segment, then to the videoRange.start
            // (except if theoretical segment time does not corresponds to absolute media time)
            //startTime = seekTime;

            if (audioController) {
                // Check if audio buffer is not empty
                audioRange = this.sourceBufferExt.getBufferRange(audioController.getBuffer(), seekTime, 2);
                if (audioRange === null) {
                    return;
                }
                this.debug.info("[Stream] Check start time: A[" + audioRange.start + "-" + audioRange.end + "], V[" + videoRange.start + "-" + videoRange.end + "]");
                // Check if audio and video can be synchronized (if some audio sample is available at returned start time)
                if (audioRange.end < startTime) {
                    return;
                }
                if (audioRange.start > startTime) {
                    startTime = audioRange.start;
                }
            }

            this.debug.info("[Stream] Check start time: OK => " + startTime);

            // Align audio and video buffers
            //self.sourceBufferExt.remove(audioController.getBuffer(), audioRange.start, videoRange.start, Infinity, mediaSource, false);

            // Unmap "bufferUpdated" handler
            this.system.unmapHandler("bufferUpdated");

            // In case of live streams and then DVR seek, then we start the fragmentInfoControllers
            // (check if seek not due to stream loading)
            // (check if seek not due to stream reloading)
            if (this.manifestExt.getIsDynamic(manifest) && !isReloading && (this.videoModel.getCurrentTime() !== 0)) {
                startFragmentInfoControllers.call(this);
            }

            // Set current time on video if 'play' event has already been raised.
            // If 'play' event has not yet been raised, the the current time will be set afterwards
            if (!this.videoModel.isPaused()) {
                setVideoModelCurrentTime.call(this, startTime);
            } else {
                playStartTime = startTime;
            }

            play.call(this);
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
                if (this.manifestExt.getIsDynamic(manifest)) {
                    // If live, refresh the manifest to get new selected track segments info
                    this.system.notify("manifestUpdate");
                } else {
                    // Else update controller data directly
                    controller.updateData(track, periodInfo);
                }
            }

            return index;
        },

        updateData = function(updatedPeriodInfo) {
            var self = this,
                videoData,
                data,
                deferred = Q.defer(),
                deferredVideoUpdate = Q.defer(),
                deferredAudioUpdate = Q.defer(),
                deferredTextUpdate = Q.defer();

            manifest = self.manifestModel.getValue();
            periodInfo = updatedPeriodInfo;
            self.debug.log("Manifest updated... set new data on buffers.");

            if (videoController) {
                videoData = videoController.getData();

                if (!!videoData && videoData.hasOwnProperty("id")) {
                    data = self.manifestExt.getDataForId(videoData.id, manifest, periodInfo.index);
                } else {
                    data = self.manifestExt.getDataForIndex(videoTrackIndex, manifest, periodInfo.index);
                }
                videoController.updateData(data, periodInfo);
                deferredVideoUpdate.resolve();
            } else {
                deferredVideoUpdate.resolve();
            }

            if (audioController) {
                data = self.manifestExt.getDataForIndex(audioTrackIndex, manifest, periodInfo.index);
                audioController.updateData(data, periodInfo);
                deferredAudioUpdate.resolve();
            } else {
                deferredAudioUpdate.resolve();
            }

            if (textController) {
                data = self.manifestExt.getDataForIndex(textTrackIndex, manifest, periodInfo.index);
                textController.updateData(data, periodInfo);
                deferredTextUpdate.resolve();
            }

            if (eventController) {
                var events = self.manifestExt.getEventsForPeriod(manifest, periodInfo);
                eventController.addInlineEvents(events);
            }

            Q.when(deferredVideoUpdate.promise, deferredAudioUpdate.promise, deferredTextUpdate.promise).then(
                function() {
                    if (isReloading && videoController) {
                        self.system.unmapHandler("bufferUpdated");
                        self.system.mapHandler("bufferUpdated", undefined, onBufferUpdated.bind(self));
                        // Call load on video controller in order to get new stream start time (=live edge for live streams)
                        videoController.load();
                    }

                    deferred.resolve();
                }
            );

            return deferred.promise;
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

            if (this.manifestExt.getIsDynamic(manifest) && !isReloading) {
                // For Live streams, then we try to reload the session
                isReloading = true;
                var delay = segmentRequest.duration;
                this.debug.info("[Stream] Reload session in " + delay + " s.");
                reloadTimeout = setTimeout(function() {
                    reloadTimeout = null;
                    //pause.call(self);
                    self.system.notify("manifestUpdate", true);
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
        // ORANGE : add metricsModel
        metricsModel: undefined,
        eventBus: undefined,
        notify: undefined,

        setup: function() {
            this.system.mapHandler("startTimeFound", undefined, onStartTimeFound.bind(this));
            this.system.mapHandler("segmentLoadingFailed", undefined, onSegmentLoadingFailed.bind(this));
            this.system.mapHandler("bufferingCompleted", undefined, onBufferingCompleted.bind(this));

            /* @if PROTECTION=true */
            // Protection event handlers
            this[MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR] = onProtectionError.bind(this);
            /* @endif */

            playListener = onPlay.bind(this);
            pauseListener = onPause.bind(this);
            errorListener = onError.bind(this);
            seekingListener = onSeeking.bind(this);
            seekedListener = onSeeked.bind(this);
            progressListener = onProgress.bind(this);
            ratechangeListener = onRatechange.bind(this);
            timeupdateListener = onTimeupdate.bind(this);
            durationchangeListener = onDurationchange.bind(this);
            loadedListener = onLoaded.bind(this);
            canplayListener = onCanPlay.bind(this);
            playingListener = onPlaying.bind(this);
            loadstartListener = onLoadStart.bind(this);

            // ORANGE : add Ended Event listener
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

        setAudioTrack: function(audioTrack) {
            audioTrackIndex = selectTrack.call(this, audioController, audioTrack, audioTrackIndex);
        },

        getSelectedAudioTrack: function() {
            var manifest = this.manifestModel.getValue();

            if (audioController) {
                return this.manifestExt.getDataForIndex(audioTrackIndex, manifest, periodInfo.index);
            }

            return undefined;
        },

        setSubtitleTrack: function(subtitleTrack) {
            textTrackIndex = selectTrack.call(this, textController, subtitleTrack, textTrackIndex);
        },

        getSelectedSubtitleTrack: function() {
            var manifest = this.manifestModel.getValue();

            if (textController && subtitlesEnabled) {
                return this.manifestExt.getDataForIndex(textTrackIndex, manifest, periodInfo.index);
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

            stopBuffering.call(this);

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
            this.system.unmapHandler("segmentLoadingFailed");
            this.system.unmapHandler("bufferingCompleted");

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

        startEventController: function() {
            eventController.start();
        },

        resetEventController: function() {
            eventController.reset();
        },

        enableSubtitles: function(enabled) {

            if (enabled !== subtitlesEnabled) {
                subtitlesEnabled = enabled;
                if (textController) {
                    if (enabled) {
                        if (this.manifestExt.getIsDynamic(manifest)) {
                            // In case of live streams, refresh manifest before activating subtitles
                            this.system.mapHandler("streamsComposed", undefined, streamsComposed.bind(this), true);
                            this.system.notify("manifestUpdate");
                        } else {
                            streamsComposed.call(this);
                        }
                    } else {
                        // hide subtitle here
                        var track = this.textTrackExtensions.getCurrentTextTrack(this.videoModel.getElement());
                        if (track) {
                            track.mode = "hidden";
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
                self.debug.info("[Stream] Set mute: true");
                muteState = self.videoModel.getMute();
                if (!muteState) {
                self.videoModel.setMute(true);
                }
                self.videoModel.pause();
            } else if (!enableTrickMode) {
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
                    self.debug.info("[Stream] Trick mode: Stopped, current time = " + currentVideoTime);
                    tmState = "Stopped";
                    self.videoModel.listen("timeupdate", restoreMute);
                    currentVideoTime = tmEndDetected ? self.getStartTime() : currentVideoTime;
                    seek.call(self, tmEndDetected ? self.getStartTime() : currentVideoTime, true);
                } else {
                    if (tmState === "Running") {
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