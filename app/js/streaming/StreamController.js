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
MediaPlayer.dependencies.StreamController = function() {
    "use strict";

    /*
     * StreamController aggregates all streams defined as Period sections in the manifest file
     * and implements corresponding logic to switch between them.
     */

    var streams = [],
        activeStream,
        protectionController,
        ownProtectionController = false,
        //TODO set correct value for threshold
        STREAM_BUFFER_END_THRESHOLD = 6,
        STREAM_END_THRESHOLD = 0.2,
        autoPlay = true,
        isPeriodSwitchingInProgress = false,
        timeupdateListener,
        seekingListener,
        progressListener,
        pauseListener,
        playListener,
        // ORANGE: audio language management
        audioTracks,
        subtitleTracks,
        protectionData,
        defaultAudioLang = 'und',
        defaultSubtitleLang = 'und',
        subtitlesEnabled = false,
        reloadStream = false,

        /*
         * Replaces the currently displayed <video> with a new data and corresponding <video> element.
         *
         * @param fromVideoModel Currently used video data
         * @param toVideoModel New video data to be displayed
         *
         * TODO - move method to appropriate place - VideoModelExtensions??
         */
        switchVideoModel = function(fromVideoModel, toVideoModel) {
            var activeVideoElement = fromVideoModel.getElement(),
                newVideoElement = toVideoModel.getElement();

            if (!newVideoElement.parentNode) {
                activeVideoElement.parentNode.insertBefore(newVideoElement, activeVideoElement);
            }

            // We use width property to hide/show video element because when using display="none"/"block" playback
            // sometimes stops after switching.
            activeVideoElement.style.width = "0px";
            newVideoElement.style.width = "100%";

            copyVideoProperties(activeVideoElement, newVideoElement);
            detachVideoEvents.call(this, fromVideoModel);
            attachVideoEvents.call(this, toVideoModel);

            return true;
        },

        attachVideoEvents = function(videoModel) {
            videoModel.listen("seeking", seekingListener);
            videoModel.listen("progress", progressListener);
            videoModel.listen("timeupdate", timeupdateListener);
            videoModel.listen("pause", pauseListener);
            videoModel.listen("play", playListener);
        },

        detachVideoEvents = function(videoModel) {
            videoModel.unlisten("seeking", seekingListener);
            videoModel.unlisten("progress", progressListener);
            videoModel.unlisten("timeupdate", timeupdateListener);
            videoModel.unlisten("pause", pauseListener);
            videoModel.unlisten("play", playListener);
        },

        copyVideoProperties = function(fromVideoElement, toVideoElement) {
            ["controls", "loop", "muted", "playbackRate", "volume"].forEach(function(prop) {
                toVideoElement[prop] = fromVideoElement[prop];
            });
        },

        /*
         * Called when more data is buffered.
         * Used to determine the time current stream is almost buffered and we can start buffering of the next stream.
         * TODO move to ???Extensions class
         */
        onProgress = function() {

            var ranges = activeStream.getVideoModel().getElement().buffered;

            // nothing is buffered
            if (!ranges.length) {
                return;
            }

            var lastRange = ranges.length - 1,
                bufferEndTime = ranges.end(lastRange),
                remainingBufferDuration = activeStream.getStartTime() + activeStream.getDuration() - bufferEndTime;

            if (remainingBufferDuration < STREAM_BUFFER_END_THRESHOLD) {
                activeStream.getVideoModel().unlisten("progress", progressListener);
                onStreamBufferingEnd();
            }
        },

        switchStream = function(from, to, seekTo) {

            if (isPeriodSwitchingInProgress || !from || !to || from === to) {
                return;
            }

            isPeriodSwitchingInProgress = true;

            from.pause();
            activeStream = to;

            switchVideoModel.call(this, from.getVideoModel(), to.getVideoModel());

            if (seekTo) {
                this.seek(from.getVideoModel().getCurrentTime());
            } else {
                this.seek(to.getStartTime());
            }

            this.play();
            from.resetEventController();
            activeStream.startEventController();
            isPeriodSwitchingInProgress = false;
        },


        /*
         * Called when current playback positon is changed.
         * Used to determine the time current stream is finished and we should switch to the next stream.
         * TODO move to ???Extensions class
         */
        onTimeupdate = function() {
            var self = this,
                time = new Date(),
                streamEndTime = activeStream.getStartTime() + activeStream.getDuration(),
                videoElement = activeStream.getVideoModel().getElement(),
                currentTime = videoElement.currentTime,
                playBackQuality = self.videoExt.getPlaybackQuality(videoElement);

            self.metricsModel.addPlaybackQuality("video", time, playBackQuality, currentTime);
            self.metricsModel.addVideoResolution("video", time, videoElement.videoWidth, videoElement.videoHeight, currentTime);

            if (!getNextStream()) {
                return;
            }

            // Sometimes after seeking timeUpdateHandler is called before seekingHandler and a new period starts
            // from beginning instead of from a chosen position. So we do nothing if the player is in the seeking state
            if (activeStream.getVideoModel().getElement().seeking) {
                return;
            }

            // check if stream end is reached
            if (streamEndTime - currentTime < STREAM_END_THRESHOLD) {
                switchStream.call(this, activeStream, getNextStream());
            }
        },

        /*
         * Called when Seeking event is occured.
         * TODO move to ???Extensions class
         */
        onSeeking = function() {
            var seekingTime = activeStream.getVideoModel().getCurrentTime(),
                seekingStream = getStreamForTime(seekingTime);

            // ORANGE : add metric
            this.metricsModel.addState("video", "seeking", activeStream.getVideoModel().getCurrentTime());

            if (seekingStream && seekingStream !== activeStream) {
                switchStream.call(this, activeStream, seekingStream, seekingTime);
            }
        },

        onPause = function() {
            this.manifestUpdater.stop();
            // ORANGE : add metric
            this.metricsModel.addState("video", "paused", activeStream.getVideoModel().getCurrentTime());
        },

        onPlay = function() {
            this.manifestUpdater.start();
        },

        /*
         * Handles the current stream buffering end moment to start the next stream buffering
         */
        onStreamBufferingEnd = function() {
            var nextStream = getNextStream();
            if (nextStream) {
                nextStream.seek(nextStream.getStartTime());
            }
        },

        getNextStream = function() {
            var nextIndex = activeStream.getPeriodIndex() + 1;
            return (nextIndex < streams.length) ? streams[nextIndex] : null;
        },

        getStreamForTime = function(time) {
            var duration = 0,
                stream = null,
                ln = streams.length,
                i = 0;

            if (ln > 0) {
                duration += streams[0].getStartTime();
            }

            for (i = 0; i < ln; i += 1) {
                stream = streams[i];
                duration += stream.getDuration();

                if (time < duration) {
                    return stream;
                }
            }
        },

        //  TODO move to ???Extensions class
        createVideoModel = function() {
            var model = this.system.getObject("videoModel"),
                video = document.createElement("video");
            model.setElement(video);
            return model;
        },

        removeVideoElement = function(element) {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        },

        composeStreams = function() {
            var self = this,
                manifest = self.manifestModel.getValue(),
                metrics = self.metricsModel.getMetricsFor("stream"),
                manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics),
                periodInfo,
                periods,
                pLen,
                sLen,
                pIdx,
                sIdx,
                period,
                mpd,
                stream;

            if (!manifest) {
                return false;
            }

            if (self.capabilities.supportsEncryptedMedia()) {
                if (!protectionController) {
                    protectionController = self.system.getObject("protectionController");
                    /*self.eventBus.dispatchEvent({
                        type: MediaPlayer.events.PROTECTION_CREATED,
                        data: {
                            controller: protectionController,
                            manifest: manifest
                        }
                    });*/
                    ownProtectionController = true;
                }
                protectionController.setMediaElement(self.videoModel.getElement());
                if (protectionData) {
                    protectionController.setProtectionData(protectionData);
                }
            }

            mpd = self.manifestExt.getMpd(manifest);
            if (activeStream) {
                periodInfo = activeStream.getPeriodInfo();
                mpd.isClientServerTimeSyncCompleted = periodInfo.mpd.isClientServerTimeSyncCompleted;
                mpd.clientServerTimeShift = periodInfo.mpd.clientServerTimeShift;
            }

            periods = self.manifestExt.getRegularPeriods(manifest, mpd);
            if (periods.length === 0) {
                return false;
            }

            for (pIdx = 0, pLen = periods.length; pIdx < pLen; pIdx += 1) {
                period = periods[pIdx];
                for (sIdx = 0, sLen = streams.length; sIdx < sLen; sIdx += 1) {
                    // If the stream already exists we just need to update the values we got from the updated manifest
                    if (streams[sIdx].getId() === period.id) {
                        stream = streams[sIdx];
                        stream.updateData(period);
                    }
                }
                // If the Stream object does not exist we probably loaded the manifest the first time or it was
                // introduced in the updated manifest, so we need to create a new Stream and perform all the initialization operations
                if (!stream) {
                    stream = self.system.getObject("stream");
                    stream.setVideoModel(pIdx === 0 ? self.videoModel : createVideoModel.call(self));
                    stream.initProtection(protectionController);
                    stream.setAutoPlay(autoPlay);
                    stream.setDefaultAudioLang(defaultAudioLang);
                    stream.setDefaultSubtitleLang(defaultSubtitleLang);
                    stream.enableSubtitles(subtitlesEnabled);
                    stream.load(manifest, period);
                    streams.push(stream);
                }

                self.metricsModel.addManifestUpdatePeriodInfo(manifestUpdateInfo, period.id, period.index, period.start, period.duration);
                stream = null;
            }

            // If the active stream has not been set up yet, let it be the first Stream in the list
            if (!activeStream) {
                activeStream = streams[0];
                attachVideoEvents.call(self, activeStream.getVideoModel());
            }

            self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                currentTime: self.videoModel.getCurrentTime(),
                buffered: self.videoModel.getElement().buffered,
                presentationStartTime: periods[0].start,
                clientTimeOffset: mpd.clientServerTimeShift
            });

            return true;
        },

        // ORANGE: create function to handle audiotracks
        updateAudioTracks = function() {
            if (activeStream) {
                audioTracks = this.manifestExt.getAudioDatas(this.manifestModel.getValue(), activeStream.getPeriodIndex());
                // fire event to notify that audiotracks have changed
                this.system.notify("audioTracksUpdated");
            }
        },

        updateSubtitleTracks = function() {
            if (activeStream) {
                subtitleTracks = this.manifestExt.getTextDatas(this.manifestModel.getValue(), activeStream.getPeriodIndex());
                // fire event to notify that subtitletracks have changed
                this.system.notify("subtitleTracksUpdated");
            }
        },

        manifestUpdate = function(reload) {
            if (reload === true) {
                reloadStream = true;
            }
            this.refreshManifest();
        },

        manifestHasUpdated = function() {
            var result = composeStreams.call(this);

            if (result) {
                // ORANGE: Update Audio Tracks List
                updateAudioTracks.call(this);
                // ORANGE: Update Subtitle Tracks List
                updateSubtitleTracks.call(this);
                this.system.notify("streamsComposed");
            } else {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_NO_STREAM, "No stream/period is provided in the manifest");
            }
        };

    return {
        system: undefined,
        videoModel: undefined,
        parser: undefined,
        manifestLoader: undefined,
        manifestUpdater: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        fragmentExt: undefined,
        capabilities: undefined,
        debug: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        videoExt: undefined,
        errHandler: undefined,
        eventBus: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this.system.mapHandler("manifestUpdate", undefined, manifestUpdate.bind(this));
            this.system.mapHandler("manifestUpdated", undefined, manifestHasUpdated.bind(this));
            timeupdateListener = onTimeupdate.bind(this);
            progressListener = onProgress.bind(this);
            seekingListener = onSeeking.bind(this);
            pauseListener = onPause.bind(this);
            playListener = onPlay.bind(this);
        },

        getManifestExt: function() {
            return activeStream.getManifestExt();
        },

        setAutoPlay: function(value) {
            autoPlay = value;
        },

        getAutoPlay: function() {
            return autoPlay;
        },

        getVideoModel: function() {
            return this.videoModel;
        },

        setVideoModel: function(value) {
            this.videoModel = value;
        },

        getAudioTracks: function() {
            return audioTracks;
        },

        getSelectedAudioTrack: function() {

            if (activeStream) {
                return activeStream.getSelectedAudioTrack();
            }

            return undefined;
        },

        setAudioTrack: function(audioTrack) {
            if (activeStream) {
                activeStream.setAudioTrack(audioTrack);
            }
        },

        getSubtitleTracks: function() {
            return subtitleTracks;
        },

        setSubtitleTrack: function(subtitleTrack) {
            if (activeStream) {
                activeStream.setSubtitleTrack(subtitleTrack);
            }
        },

        getSelectedSubtitleTrack: function() {

            if (activeStream) {
                return activeStream.getSelectedSubtitleTrack();
            }

            return undefined;
        },

        load: function(url, protData) {
            var self = this;

            if (protData) {
                protectionData = protData;
            }

            self.debug.info("[StreamController] load url: " + url);

            reloadStream = false;

            self.manifestLoader.load(url).then(
                function(manifest) {
                    self.manifestModel.setValue(manifest);
                    //ORANGE : add Metadata metric
                    self.metricsModel.addMetaData();
                    self.debug.info("[StreamController] Manifest has loaded.");
                    //self.debug.log(self.manifestModel.getValue());
                    self.manifestUpdater.start();
                },
                function(err) {
                    // err is undefined in the case the request has been aborted
                    if (err) {
                        self.errHandler.sendError(err.name, err.message, err.data);
                    }
                }
            );
        },

        refreshManifest: function(url) {
            var manifest = this.manifestModel.getValue(),
                manifestUrl = url ? url : (manifest.hasOwnProperty("Location") ? manifest.Location : manifest.mpdUrl);

            this.debug.log("### Refresh manifest @ " + manifestUrl);

            var self = this;
            this.manifestLoader.abort();
            this.manifestLoader.load(manifestUrl, true).then(
                function(manifestResult) {
                    self.manifestModel.setValue(manifestResult);
                    self.debug.log("### Manifest has been refreshed.");
                    reloadStream = false;
                },
                function(err) {
                    // err is undefined in the case the request has been aborted
                    if (err === undefined) {
                        return;
                    }

                    // Url is refreshed
                    if (url) {
                        // Raise an error only in case we try to reload the session
                        // to recover some segment downloading error
                        if (reloadStream) {
                            self.errHandler.sendError(err.name, err.message, err.data);
                        }
                    } else {
                        // If internal manifest updating (for ex. track switching),
                        // then raise a warning and ask for refreshing the url (in case it is no more valid or expired)
                        self.errHandler.sendWarning(err.name, err.message, err.data);
                        self.eventBus.dispatchEvent({
                            type: "manifestUrlUpdate",
                            data: {
                                url: manifestUrl
                            }
                        });
                    }
                }
            );
        },

        reset: function(reason) {
            var teardownComplete = {},
                funcs = [],
                self = this;

            this.debug.info("[StreamController] Reset");

            this.metricsModel.addState('video', 'stopped', this.videoModel.getCurrentTime(), reason);

            if (!!activeStream) {
                detachVideoEvents.call(this, activeStream.getVideoModel());
            }

            // Pause the active stream, but reset only once protection controller and media key sessions have been resetted
            this.pause();

            this.manifestUpdater.stop();
            this.manifestLoader.abort();
            this.parser.reset();
            this.metricsModel.clearAllCurrentMetrics();
            isPeriodSwitchingInProgress = false;

            teardownComplete[MediaPlayer.models.ProtectionModel.eventList.ENAME_TEARDOWN_COMPLETE] = function() {
                var i = 0,
                    ln,
                    stream;

                // Complete teardown process
                ownProtectionController = false;
                protectionController = null;
                protectionData = null;

                // Reset the streams
                for (i = 0, ln = streams.length; i < ln; i += 1) {
                    stream = streams[i];
                    funcs.push(stream.reset());
                    // we should not remove the video element for the active stream since it is the element users see at the page
                    if (stream !== activeStream) {
                        removeVideoElement(stream.getVideoModel().getElement());
                    }
                    delete streams[i];
                }

                // Reset the video model (and controllers stalled states)
                self.videoModel.reset();

                Q.all(funcs).then(
                    function() {
                        streams = [];
                        activeStream = null;
                        self.notify(MediaPlayer.dependencies.StreamController.eventList.ENAME_TEARDOWN_COMPLETE);
                    });

                self.manifestModel.setValue(null);
            };

            // Teardown the protection system, if necessary
            if (!protectionController) {
                teardownComplete[MediaPlayer.models.ProtectionModel.eventList.ENAME_TEARDOWN_COMPLETE]();
            } else if (ownProtectionController) {
                protectionController.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_TEARDOWN_COMPLETE, teardownComplete, undefined, true);
                protectionController.teardown();
            } else {
                protectionController.setMediaElement(null);
                teardownComplete[MediaPlayer.models.ProtectionModel.eventList.ENAME_TEARDOWN_COMPLETE]();
            }
        },

        setDefaultAudioLang: function(language) {
            defaultAudioLang = language;
        },

        setDefaultSubtitleLang: function(language) {
            defaultSubtitleLang = language;
        },

        enableSubtitles: function(enabled) {
            subtitlesEnabled = enabled;
            if (activeStream) {
                activeStream.enableSubtitles(enabled);
            }
        },

        setTrickModeSpeed: function(speed) {
            if (activeStream) {
                activeStream.setTrickModeSpeed(speed);
            }
        },

        getTrickModeSpeed: function() {
            if (activeStream) {
                return activeStream.getTrickModeSpeed();
            }
            return 0;
        },

        play: function() {
            activeStream.play();
        },

        pause: function() {
            if (activeStream) {
                activeStream.pause();
            }
        },

        seek: function(time, autoplay) {
            if (activeStream) {
                activeStream.seek(time, autoplay);
            }
        },
    };
};

MediaPlayer.dependencies.StreamController.prototype = {
    constructor: MediaPlayer.dependencies.StreamController
};

MediaPlayer.dependencies.StreamController.eventList = {
    ENAME_STREAMS_COMPOSED: "streamsComposed",
    ENAME_TEARDOWN_COMPLETE: "streamTeardownComplete"
};