/*
 * The copyright in this software module is being made available under the BSD License, included below. This software module may be subject to other third party and/or contributor rights, including patent rights, and no such rights are granted under this license.
 * The whole software resulting from the execution of this software module together with its external dependent software modules from dash.js project may be subject to Orange and/or other third party rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014, Orange
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Orange nor the names of its contributors may be used to endorse or promote products derived from this software module without specific prior written permission.
 *
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.BufferController = function() {
    "use strict";
    var READY = "READY",
        state = READY,
        ready = false,
        started = false,
        waitingForBuffer = false,
        initialPlayback = true,
        initializationData = [],
        seeking = false,
        seekTarget = -1,
        dataChanged = true,
        trackChanged = false,
        overrideBuffer = false,
        availableRepresentations,
        _currentRepresentation,
        currentBufferedQuality = -1,
        currentDownloadQuality = -1,
        stalled = false,
        isDynamic = false,
        isBufferingCompleted = false,
        deferredRejectedDataAppend = null,
        periodInfo = null,
        fragmentsToLoad = 0,
        fragmentModel = null,
        bufferLevel = 0,
        isQuotaExceeded = false,
        rejectedBytes = null,
        appendingRejectedData = false,
        mediaSource,
        type,
        data = null,
        buffer = null,
        minBufferTime,
        minBufferTimeAtStartup,
        bufferToKeep,
        liveDelay,
        bufferTimeout,
        bufferStateTimeout,
        trickModeEnabled = false,
        trickModePreviousQuality = 0,
        trickModePreviousAutoSwitch = true,
        trickModeForward = false,

        playListMetrics = null,
        playListTraceMetrics = null,
        playListTraceMetricsClosed = true,

        inbandEventFound = false,

        // Buffering state
        INIT = -1,
        BUFFERING = 0,
        PLAYING = 1,
        htmlVideoState = INIT,
        htmlVideoTime = -1,

        deferredFragmentBuffered = null,

        // Segment download failure recovery
        SEGMENT_DOWNLOAD_ERROR_MAX = 3,
        segmentDownloadErrorCount = 0,
        segmentRequestOnError = null,

        // HLS chunk sequence number
        currentSequenceNumber = -1,
        playlistRefreshTimeout = null,

        segmentDuration = NaN,

        // Patch for Safari: do not remove past buffer in live use case since it generates MEDIA_ERROR_DECODE while appending new segment (see hasEnoughSpaceToAppend())
        isSafari = (fingerprint_browser().name === "Safari"),
        isWebKit = (fingerprint_browser().name === "WebKit"),

        // Patch for Firefox: set buffer timestampOffset since on Firefox timestamping is based on CTS (see OnMediaLoaded())
        isFirefox = (fingerprint_browser().name === "Firefox"),

        sendRequest = function() {

            if (!isRunning.call(this)) {
                return;
            }

            if (fragmentModel !== null) {
                this.fragmentController.onBufferControllerStateChange();
            }
        },

        clearPlayListTraceMetrics = function(endTime, stopreason) {
            var duration = 0,
                startTime = null;

            if (playListTraceMetricsClosed === false) {
                startTime = playListTraceMetrics.start;
                duration = endTime.getTime() - startTime.getTime();

                playListTraceMetrics.duration = duration;
                playListTraceMetrics.stopreason = stopreason;

                playListTraceMetricsClosed = true;
            }
        },

        setStalled = function(value) {
            if (type === "text") {
                return;
            }

            this.debug.info("[BufferController][" + type + "] stalled = " + value);
            stalled = value;
            this.videoModel.stallStream(type, stalled);

            // Notify ABR controller we start buffering in order to adapt ABR rules (see InsufficientbufferRule)
            this.abrController.setPlayerState(stalled ? "buffering" : "playing");
        },

        startPlayback = function() {
            if (!ready || !started) {
                return;
            }

            this.debug.info("[BufferController][" + type + "] startPlayback");

            // Start buffering process
            checkIfSufficientBuffer.call(this);
        },

        doStart = function() {
            var currentTime;

            if (started === true) {
                return;
            }

            // We check also if buffering process is not already started
            // This may happen if doStart is called by Stream on 'play' event after a seek
            if (deferredFragmentBuffered !== null) {
                return;
            }

            if (seeking === false) {
                currentTime = new Date();
                clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
                playListMetrics = this.metricsModel.addPlayList(type, currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
            }

            if (isBufferingCompleted) {
                if (data.mimeType === "application/ttml+xml") {
                    return;
                }
                isBufferingCompleted = false;
            }

            started = true;

            this.debug.info("[BufferController][" + type + "] START");

            waitingForBuffer = true;

            // Reset htmlVideoState in order to update it after a pause or seek command in UpdateBufferState function
            if (htmlVideoState === INIT) {
                // At first playback start, set state to BUFFERING
                this.metricsModel.addState(type, "buffering", this.videoModel.getCurrentTime());
            }
            htmlVideoState = BUFFERING;
            htmlVideoTime = -1;
            segmentRequestOnError = null;

            // Clear executed requests from fragment controller. In case the browser has cleared the buffer itslef silently,
            // then FragmentController will not state that the cleared segments have been already loaded.
            this.fragmentController.clearExecutedRequests(fragmentModel);

            startPlayback.call(this);
        },

        doSeek = function(time) {
            var self = this;

            // Avoid identical successive seeks
            if ((seeking === true) && (seekTarget === time)) {
                // We are already seeking at the given time
                return;
            }

            this.debug.info("[BufferController][" + type + "] SEEK: " + time);

            // Do stop since <video>'s stop command may not be called before seek one
            if (started === true) {
                doStop.call(this);
            }

            seeking = true;
            seekTarget = time;

            // Wait for current buffering process to be completed before restarting
            Q.when(deferredFragmentBuffered ? deferredFragmentBuffered.promise : true).then(
                function() {
                    // self.debug.log("[BufferController]["+type+"] SEEK: do start");
                    // Set media type to stalled state
                    setStalled.call(self, true);
                        
                    doStart.call(self);
                }
            );
        },

        doSeeked = function() {
            this.debug.info("[BufferController][" + type + "] SEEKED");
            seeking = false;
            seekTarget = -1;
        },

        doStop = function() {
            if (!started) {
                return;
            }
            this.debug.info("[BufferController][" + type + "] STOP");

            // Stop buffering process
            clearTimeout(bufferTimeout);
            clearTimeout(bufferStateTimeout);
            started = false;
            waitingForBuffer = false;

            seeking = false;
            seekTarget = -1;

            // Stop buffering process and cancel loaded request
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);

            this.fragmentController.abortRequestsForModel(fragmentModel);
        },


        getRepresentationForQuality = function(quality) {
            return availableRepresentations[quality];
        },

        onBytesLoadingStart = function(request) {
            this.debug.info("[BufferController][" + type + "] Load request ", (request.url !== null) ? request.url : request.quality);
        },

        onBytesLoaded = function(request, response) {
            // Store current segment sequence number for next segment request (HLS use case)
            if (request.sequenceNumber !== undefined) {
                currentSequenceNumber = request.sequenceNumber;
            }

            if (this.fragmentController.isInitializationRequest(request)) {
                onInitializationLoaded.call(this, request, response);
            } else {
                onMediaLoaded.call(this, request, response);
            }
        },

        onInitializationLoaded = function(request, response) {

            if (!isRunning.call(this)) {
                return;
            }

            var initData = response.data,
                quality = request.quality,
                self = this;

            this.debug.log("[BufferController][" + type + "] Initialization loaded ", quality);

            try {
                this.fragmentController.process(initData).then(function(data) {
                    if (data) {
                        // Cache the initialization data to use it next time the quality has changed
                        initializationData[quality] = data;

                        self.debug.info("[BufferController][" + type + "] Buffer initialization segment ", (request.url !== null) ? request.url : request.quality);
                        //console.saveBinArray(data, type + "_init_" + request.quality + ".mp4");
                        appendToBuffer.call(self, data, request.quality).then(
                            function() {
                                // Load next media segment
                                if (isRunning.call(self)) {
                                    loadNextFragment.call(self);
                                }
                            }
                        );
                    } else {
                        // ORANGE : For HLS Stream, init segment are pushed with media (@see HlsFragmentController)
                        loadNextFragment.call(self);
                    }
                },
                function (e) {
                    signalSegmentBuffered.call(self);
                    if (e.name) {
                        self.errHandler.sendError(e.name, e.message, e.data);
                    } else {
                        self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.INTERNAL_ERROR, "Internal error while processing media segment", e.message);
                    }
                });
            } catch (e) {
                signalSegmentBuffered.call(self);
                if (e.name) {
                    self.errHandler.sendError(e.name, e.message, e.data);
                } else {
                    self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.INTERNAL_ERROR, "Internal error while processing media segment", e.message);
                }
            }
        },

        onMediaLoaded = function(request, response) {

            if (!isRunning.call(this)) {
                return;
            }

            var eventStreamAdaption = this.manifestExt.getEventStreamForAdaptationSet(this.getData()),
                eventStreamRepresentation = this.manifestExt.getEventStreamForRepresentation(this.getData(), _currentRepresentation),
                events,
                self = this;

            segmentDuration = request.duration;

            // Reset segment download error status
            segmentDownloadErrorCount = 0;

            this.debug.log("[BufferController][" + type + "] Media loaded ", request.url);

            if (this.chunkAborted === true) {
                this.chunkAborted = false;
            }

            if (this.chunkMissingCount === 1) {
                this.chunkMissingCount = 0;
            }

            try {
                this.fragmentController.process(response.data, request, _currentRepresentation).then(function(data) {
                    if (data) {
                        if (eventStreamAdaption.length > 0 || eventStreamRepresentation.length > 0) {
                            events = handleInbandEvents.call(self, data, request, eventStreamAdaption, eventStreamRepresentation);
                            self.eventController.addInbandEvents(events);
                        }

                        self.debug.info("[BufferController][" + type + "] Buffer segment from url ", request.url);

                        /*if (trickModeEnabled) {
                                var filename = type + "_" + request.index + "_" + request.quality + ".mp4",
                                    blob = new Blob([data], {
                                        type: 'data/mp4'
                                    });

                                if (navigator.msSaveBlob) { // For IE10+ and edge
                                    navigator.msSaveBlob(blob, filename);
                                }
                            }*/

                        //console.saveBinArray(data, request.url.substring(request.url.lastIndexOf('/') + 1));
                        data = deleteInbandEvents.call(self, data);

                        // Check if we need to override the current buffered segments (in case of language switch for example)
                        Q.when(overrideBuffer ? removeBuffer.call(self) : true).then(
                            function() {
                                /*if (overrideBuffer) {
                                    debugBufferRange.call(self);
                                }*/
                                overrideBuffer = false;

                                // If firefox, set buffer timestampOffset since timestamping (MSE buffer range and <video> currentTime) is based on CTS (and not DTS like in other browsers)
                                if (isFirefox) {
                                    buffer.timestampOffset = -getSegmentTimestampOffset(data, request);
                                }

                                appendToBuffer.call(self, data, request.quality, request).then(
                                    function() {
                                        // Check if a new quality is being appended,
                                        // then add a metric to enable MediaPlayer to detect playback quality changes
                                        if (currentBufferedQuality !== request.quality) {
                                            self.debug.log("[BufferController][" + type + "] Buffered quality changed: " + request.quality);
                                            self.metricsModel.addBufferedSwitch(type, request.startTime, _currentRepresentation.id, request.quality);
                                            currentBufferedQuality = request.quality;
                                        }

                                        // Signal end of buffering process
                                        signalSegmentBuffered.call(self);
                                        // Check buffer level
                                        checkIfSufficientBuffer.call(self);
                                    }
                                );
                            }
                        );
                    } else {
                        self.debug.error("[BufferController][" + type + "] Error with segment data, no bytes to push");
                        // Signal end of buffering process
                        signalSegmentBuffered.call(self);
                        // Check buffer level
                        checkIfSufficientBuffer.call(self);
                    }
                },
                function (e) {
                    signalSegmentBuffered.call(self);
                    if (e.name) {
                        self.errHandler.sendError(e.name, e.message, e.data);
                    } else {
                        self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.INTERNAL_ERROR, "Internal error while processing media segment", e.message);
                    }
                });
            } catch (e) {
                signalSegmentBuffered.call(self);
                if (e.name) {
                    self.errHandler.sendError(e.name, e.message, e.data);
                } else {
                    self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.INTERNAL_ERROR, "Internal error while processing media segment", e.message);
                }
            }
        },

        appendToBuffer = function(data, quality, request) {
            var deferred = Q.defer(),
                currentVideoTime = this.videoModel.getCurrentTime(),
                currentTime = new Date(),
                self = this;

            // this.debug.log("Push (" + type + ") bytes: " + data.byteLength);

            if (playListTraceMetricsClosed === true) {
                playListTraceMetricsClosed = false;
                playListTraceMetrics = this.metricsModel.appendPlayListTrace(playListMetrics, _currentRepresentation.id, null, currentTime, currentVideoTime, null, 1.0, null);
            }

            if (!hasData()) {
                return;
            }

            hasEnoughSpaceToAppend.call(this).then(
                function() {
                    if (!hasData()) {
                        return;
                    }
                    self.debug.log("[BufferController][" + type + "] Buffering segment");
                    self.sourceBufferExt.append(buffer, data, request).then(
                        function( /*appended*/ ) {
                            self.debug.log("[BufferController][" + type + "] Segment buffered");

                            isQuotaExceeded = false;

                            // Patch for Safari & WebKit: do not remove past buffer since it generates MEDIA_ERROR_DECODE while appending new segment
                            if (bufferLevel > 1 && !isSafari && !isWebKit) {
                                // Remove outdated buffer parts and requests
                                // (checking bufferLevel ensure buffer is not empty or back to current time)
                                removeBuffer.call(self, -1, getWorkingTime.call(self) - bufferToKeep).then(
                                    function() {
                                        debugBufferRange.call(self);
                                        deferred.resolve();
                                    }
                                );
                            } else if (trickModeEnabled) {
                                // In case of trick play, remove outdated buffer parts according to trick play direction
                                var start = trickModeForward ? -1 : (getWorkingTime.call(self) + segmentDuration);
                                var end = trickModeForward ? (getWorkingTime.call(self) - segmentDuration) : -1;
                                removeBuffer.call(self, start, end).then(
                                    function() {
                                        debugBufferRange.call(self);
                                        deferred.resolve();
                                    }
                                );
                            } else {
                                debugBufferRange.call(self);
                                deferred.resolve();
                            }

                            self.system.notify("bufferUpdated");
                        },
                        function(result) {
                            if (type === 'text') {
                                // if text, do nt raise an error (the stream would stop)
                                // just log th error
                                self.debug.error("[BufferController][" + type + "] Failed to append data in source buffer : " + result.err.message);
                                deferred.resolve();
                            } else {
                                self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_APPEND_SOURCEBUFFER, "Failed to append data into " + type + " source buffer",
                                                          new MediaPlayer.vo.Error(result.err.code, result.err.name, result.err.message));
                                // if the append has failed because the buffer is full we should store the data
                                // that has not been appended and stop request scheduling. We also need to store
                                // the promise for this append because the next data can be appended only after
                                // this promise is resolved.
                                if (result.err.code === MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_QUOTA_EXCEEDED) {
                                    rejectedBytes = {
                                        data: data,
                                        quality: quality/*,
                                    index: index*/
                                    };
                                    deferredRejectedDataAppend = deferred;
                                    isQuotaExceeded = true;
                                    fragmentsToLoad = 0;
                                    // stop scheduling new requests
                                    doStop.call(self);
                                } else {
                                    // promise has to be resolved
                                    deferred.resolve();
                                }
                            }
                        }
                    );
                }
            );

            return deferred.promise;
        },

        debugBufferRange = function() {
            var ranges = null,
                i,
                len;

            if (this.debug.getLevel() >= this.debug.INFO) {
                if (buffer) {
                    ranges = this.sourceBufferExt.getAllRanges(buffer);
                    if ((ranges === null) || (ranges.length === 0)) {
                        return;
                    }
                    for (i = 0, len = ranges.length; i < len; i += 1) {
                        this.debug.info("[BufferController][" + type + "] Buffered range [" + i + "]: " + ranges.start(i) + " - " + ranges.end(i) + " (" + this.getVideoModel().getCurrentTime() + ")");
                    }
                }
            }
        },

        getSegmentTimestampOffset = function (data, request) {
            var fragment = mp4lib.deserialize(data),
                moov = fragment.getBoxByType("moov"),
                moof = fragment.getBoxByType("moof"),
                traf = moof === null ? null : moof.getBoxByType("traf"),
                trun = traf === null ? null : traf.getBoxByType("trun"),
                ctsOffset,
                timescale;

            if (trun === null || trun.samples_table.length === 0) {
                return 0;
            }

            ctsOffset = trun.samples_table[0].sample_composition_time_offset;
            if (ctsOffset ===  undefined) {
                return 0;
            }

            // Try to get timescale from moov
            if (moov) {
                var mvhd = moov.getBoxByType("mvhd");
                timescale = mvhd.timescale;
            } else {
                timescale = request.timescale;
            }

            return (ctsOffset / timescale);
        },

        handleInbandEvents = function(data, request, adaptionSetInbandEvents, representationInbandEvents) {
            var events = [],
                i = 0,
                identifier,
                size,
                expTwo = Math.pow(256, 2),
                expThree = Math.pow(256, 3),
                segmentStarttime = Math.max(isNaN(request.startTime) ? 0 : request.startTime, 0),
                eventStreams = [],
                inbandEvents;

            inbandEventFound = false;
            /* Extract the possible schemeIdUri : If a DASH client detects an event message box with a scheme that is not defined in MPD, the client is expected to ignore it */
            inbandEvents = adaptionSetInbandEvents.concat(representationInbandEvents);
            for (var loop = 0; loop < inbandEvents.length; loop++) {
                eventStreams[inbandEvents[loop].schemeIdUri] = inbandEvents[loop];
            }
            while (i < data.length) {
                identifier = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]); // box identifier
                size = data[i] * expThree + data[i + 1] * expTwo + data[i + 2] * 256 + data[i + 3] * 1; // size of the box
                if (identifier === "moov" || identifier === "moof") {
                    break;
                } else if (identifier === "emsg") {
                    inbandEventFound = true;
                    var eventBox = ["", "", 0, 0, 0, 0, ""],
                        arrIndex = 0,
                        j = i + 12; //fullbox header is 12 bytes, thats why we start at 12

                    while (j < size + i) {
                        /* == string terminates with 0, this indicates end of attribute == */
                        if (arrIndex === 0 || arrIndex === 1 || arrIndex === 6) {
                            if (data[j] !== 0) {
                                eventBox[arrIndex] += String.fromCharCode(data[j]);
                            } else {
                                arrIndex += 1;
                            }
                            j += 1;
                        } else {
                            eventBox[arrIndex] = data[j] * expThree + data[j + 1] * expTwo + data[j + 2] * 256 + data[j + 3] * 1;
                            j += 4;
                            arrIndex += 1;
                        }
                    }
                    var schemeIdUri = eventBox[0],
                        value = eventBox[1],
                        timescale = eventBox[2],
                        presentationTimeDelta = eventBox[3],
                        duration = eventBox[4],
                        id = eventBox[5],
                        messageData = eventBox[6],
                        presentationTime = segmentStarttime * timescale + presentationTimeDelta;

                    if (eventStreams[schemeIdUri]) {
                        var event = new Dash.vo.Event();
                        event.eventStream = eventStreams[schemeIdUri];
                        event.eventStream.value = value;
                        event.eventStream.timescale = timescale;
                        event.duration = duration;
                        event.id = id;
                        event.presentationTime = presentationTime;
                        event.messageData = messageData;
                        event.presentationTimeDelta = presentationTimeDelta;
                        events.push(event);
                    }
                }
                i += size;
            }
            return events;
        },

        deleteInbandEvents = function(data) {
            if (!inbandEventFound) {
                return data;
            }

            var length = data.length,
                i = 0,
                j = 0,
                l = 0,
                identifier,
                size,
                expTwo = Math.pow(256, 2),
                expThree = Math.pow(256, 3),
                modData = new Uint8Array(data.length);

            while (i < length) {

                identifier = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]);
                size = data[i] * expThree + data[i + 1] * expTwo + data[i + 2] * 256 + data[i + 3] * 1;


                if (identifier !== "emsg") {
                    for (l = i; l < i + size; l++) {
                        modData[j] = data[l];
                        j += 1;
                    }
                }
                i += size;

            }

            return modData.subarray(0, j);
        },

        isRunning = function() {
            if (started) {
                return true;
            }

            // If buffering process is running, then we interrupt it
            signalSegmentBuffered.call(this);

            return false;
        },

        signalSegmentBuffered = function() {
            if (deferredFragmentBuffered) {
                // this.debug.log("[BufferController][" + type + "] ### End of buffering process");
                deferredFragmentBuffered.resolve();
                deferredFragmentBuffered = null;
            }
        },

        hasEnoughSpaceToAppend = function() {
            var deferred = Q.defer(),
                removedTime = 0,
                fragmentDuration,
                startClearing;

            // do not remove any data until the quota is exceeded
            if (!isQuotaExceeded) {
                return Q.when(true);
            }

            startClearing = function() {
                var currentTime = this.videoModel.getCurrentTime(),
                    removeStart = 0,
                    removeEnd,
                    req;

                // we need to remove data that is more than one segment before the video currentTime
                req = this.fragmentController.getExecutedRequestForTime(fragmentModel, currentTime);
                removeEnd = (req && !isNaN(req.startTime)) ? req.startTime : Math.floor(currentTime);
                fragmentDuration = (req && !isNaN(req.duration)) ? req.duration : 1;

                removeBuffer.call(this, removeStart, removeEnd).then(
                    function(removedTimeValue) {
                        removedTime += removedTimeValue;
                        if (removedTime >= fragmentDuration) {
                            deferred.resolve();
                        } else {
                            setTimeout(startClearing, fragmentDuration * 1000);
                        }
                    }
                );
            };

            startClearing.call(this);

            return deferred.promise;
        },

        removeBuffer = function(start, end) {
            var deferred = Q.defer(),
                removeStart,
                removeEnd,
                self = this;

            if (buffer.buffered.length === 0) {
                deferred.resolve(0);
                return deferred.promise;
            }

            removeStart = ((start !== undefined) && (start !== -1)) ? start : buffer.buffered.start(0);
            removeEnd = ((end !== undefined) && (end !== -1)) ? end : buffer.buffered.end(buffer.buffered.length - 1);

            if (removeEnd <= removeStart) {
                deferred.resolve(0);
                return deferred.promise;
            }

            this.debug.info("[BufferController][" + type + "] Remove from " + removeStart + " to " + removeEnd + " (" + this.getVideoModel().getCurrentTime() + ")");

            // Abort on buffer
            if (type !== "text") {
                // no need to abort for text buffer. remove call do the same thing
                this.sourceBufferExt.abort(mediaSource, buffer);
            }

            // Wait for buffer update completed
            this.sourceBufferExt.remove(buffer, removeStart, removeEnd, periodInfo.duration, mediaSource).then(
                function() {
                    // Remove all requests from the list of the executed requests
                    self.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, removeEnd + 1); // +1 for rounding issues
                    self.fragmentController.cancelPendingRequestsForModel(fragmentModel);
                    deferred.resolve(removeEnd - removeStart);
                }, function(ex) {
                    self.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_REMOVE_SOURCEBUFFER, "Failed to remove data from " + type + " source buffer",
                        new MediaPlayer.vo.Error(ex.code, ex.name, ex.message));
                    deferred.resolve(0);
                }
            );

            return deferred.promise;
        },

        onBytesError = function(e) {

            if (!isRunning.call(this)) {
                return;
            }

            signalSegmentBuffered.call(this);

            // Abandonned request => load segment at lowest quality
            if (e.aborted) {
                // if (e.quality !== 0) {
                // this.debug.info("[BufferController][" + type + "] Segment download abandonned => Retry segment download at lowest quality");
                // this.abrController.setAutoSwitchFor(type, false);
                // this.abrController.setQualityFor(type, 0);
                bufferFragment.call(this);
                // }
                return;
            }

            // Ignore in case of text track, this will not stop playing
            if (type === "text") {

                this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_CONTENT,
                    "Failed to download media segment", {
                        url: e.url,
                        status: e.status
                    });

                return;
            }

            // Segment download failed
            segmentDownloadErrorCount += 1;

            if (segmentDownloadErrorCount === SEGMENT_DOWNLOAD_ERROR_MAX) {
                // If failed consecutively SEGMENT_DOWNLOAD_ERROR_MAX times, then raise an error
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_CONTENT,
                    "Failed to download media segment", {
                        url: e.url,
                        status: e.status
                    });
            } else {
                // Raise a warning
                this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_CONTENT,
                    "Failed to download media segment", {
                        url: e.url,
                        status: e.status
                    });

                // Store segment request that failed to load
                segmentRequestOnError = e;
                if (htmlVideoState === BUFFERING) {
                    // If already in buffering state (i.e. empty buffer) then signal to stream that segment loading failed
                    // Else signal it when entering in buffering state (see updateBufferState())
                    signalSegmentLoadingFailed.call(this);
                }
            }
        },

        signalStreamComplete = function( /*request*/ ) {
            this.debug.log("[BufferController][" + type + "] Stream is complete.");

            isBufferingCompleted = true;
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);

            signalSegmentBuffered.call(this);

            doStop.call(this);

            this.system.notify("bufferingCompleted");
        },

        loadInitialization = function(quality) {

            if (!isRunning.call(this)) {
                return Q.when(null);
            }

            var self = this;

            // Check if initialization segment for current quality has already been loaded and stored
            if (initializationData[quality]) {
                this.debug.info("[BufferController][" + type + "] Buffer initialization segment, quality = ", quality);
                appendToBuffer.call(this, initializationData[quality], quality).then(
                    function() {
                        self.debug.log("[BufferController][" + type + "] Initialization segment buffered");
                        // Load next media segment
                        if (isRunning.call(self)) {
                            loadNextFragment.call(self);
                        }
                    }
                );
                return Q.when(null);
            } else {
                // Get init segment request for the current
                return this.indexHandler.getInitRequest(availableRepresentations[quality]);
            }
        },

        loadNextFragment = function() {

            if (!isRunning.call(this)) {
                return;
            }

            var time = getWorkingTime.call(this),
                range,
                segmentTime,
                self = this;


            // If we override buffer (in case of language for example), then consider current video time for the next segment time
            if (overrideBuffer) {
                segmentTime = time;
            } else {
                // Get buffer range that includes working time
                range = this.sourceBufferExt.getBufferRange(buffer, time);

                // Get next segment time
                segmentTime = range ? range.end : time;
            }

            // currentSequenceNumber used in HLS
            if ((currentSequenceNumber !== -1) && !seeking && !overrideBuffer) {
                this.debug.log("[BufferController][" + type + "] loadNextFragment for sequence number: " + currentSequenceNumber);
                this.indexHandler.getNextSegmentRequestFromSN(_currentRepresentation, currentSequenceNumber).then(onFragmentRequest.bind(this));
            } else {
                this.debug.log("[BufferController][" + type + "] loadNextFragment for time: " + segmentTime);
                this.indexHandler.getSegmentRequestForTime(_currentRepresentation, segmentTime).then(onFragmentRequest.bind(this), function() {
                    currentDownloadQuality = -1;
                    signalStreamComplete.call(self);
                });
            }
        },

        onFragmentRequest = function(request) {

            if (!isRunning.call(this)) {
                return;
            }

            var manifest = this.manifestModel.getValue();

            // Check if current request signals end of stream
            if ((request !== null) && (request.action === request.ACTION_COMPLETE)) {
                signalStreamComplete.call(this);
                return;
            }

            if (request !== null) {
                //if trick mode enbaled, get the request to get I Frame data.
                if (trickModeEnabled) {
                    request = this.indexHandler.getIFrameRequest(request);
                }

                // If we have already loaded the given fragment ask for the next one. Otherwise prepare it to get loaded
                if (this.fragmentController.isFragmentLoadedOrPending(this, request)) {
                    this.debug.log("[BufferController][" + type + "] new fragment request => already loaded or pending " + request.url);
                    this.indexHandler.getNextSegmentRequest(_currentRepresentation).then(onFragmentRequest.bind(this));
                } else {
                    // Download the segment
                    this.fragmentController.prepareFragmentForLoading(this, request, onBytesLoadingStart, onBytesLoaded, onBytesError, null /*signalStreamComplete*/ );
                    sendRequest.call(this);
                }
            } else {
                // No more fragment in current list
                this.debug.log("[BufferController][" + type + "] loadNextFragment failed");
                signalSegmentBuffered.call(this);

                if (isDynamic) {
                    // If live HLS, then check buffer since playlist should be updated
                    if (manifest.name === "M3U") {
                        updateCheckBufferTimeout.call(this);
                    }
                } else {
                    // For VOD streams, signal end of stream
                    signalStreamComplete.call(this);
                }
            }
        },

        hasData = function() {
            return !!data && !!buffer;
        },

        getTimeToEnd = function() {
            var currentTime = this.videoModel.getCurrentTime();

            return ((periodInfo.start + periodInfo.duration) - currentTime);
        },

        getWorkingTime = function() {
            var time = -1,
                videoTime = this.videoModel.getCurrentTime();

            if (seeking) {
                time = seekTarget;
                //this.debug.log("[BufferController][" + type + "] Working time = " + time + " (seeking = " + seeking + ", video time = " + videoTime + ")");
            } else {
                time = videoTime;
                //this.debug.log("[BufferController][" + type + "] Working time = " + time);
            }

            return time;
        },

        getLiveEdgeTime = function() {
            var deferred = Q.defer(),
                startTime,
                // Get live edge time from manifest as the last segment time
                liveEdgeTime = _currentRepresentation.segmentAvailabilityRange.end,
                self = this;

            this.debug.log("[BufferController][" + type + "] Manifest live edge = " + liveEdgeTime);

            // Step back from a found live edge time to be able to buffer some data
            startTime = Math.max((liveEdgeTime - liveDelay), _currentRepresentation.segmentAvailabilityRange.start);

            // Get the request corresponding to the start time
            this.indexHandler.getSegmentRequestForTime(_currentRepresentation, startTime).then(
                function(request) {
                    // Set live edge to be the start time of the founded segment
                    periodInfo.liveEdge = request.startTime;
                    self.debug.log("[BufferController][" + type + "] Live edge = " + periodInfo.liveEdge);

                    deferred.resolve(periodInfo.liveEdge);
                }
            );

            return deferred.promise;
        },

        updateBufferLevel = function(sendMetric) {
            if (!hasData()) {
                return;
            }

            var workingTime = getWorkingTime.call(this);

            bufferLevel = this.sourceBufferExt.getBufferLength(buffer, workingTime);
            this.debug.log("[BufferController][" + type + "] Working time = " + workingTime + ", Buffer level = " + bufferLevel.toFixed(3));
            if (sendMetric) {
                this.metricsModel.addBufferLevel(type, new Date(), bufferLevel);
            }
            this.updateBufferState();
        },

        checkIfSufficientBuffer = function() {

            if (!isRunning.call(this)) {
                return;
            }

            var timeToEnd,
                delay;

            this.debug.log("[BufferController][" + type + "] Check buffer...");

            updateBufferLevel.call(this, true);

            // Check stalled mode of video model
            if (stalled) {
                if (bufferLevel > minBufferTimeAtStartup) {
                    setStalled.call(this, false);
                }
            }

            timeToEnd = getTimeToEnd.call(this);
            this.debug.log("[BufferController][" + type + "] time to end = " + timeToEnd);

            // In trick mode state, always fills buffer
            if (trickModeEnabled) {
                if (bufferLevel < 1) {
                    bufferFragment.call(this);
                }
            } else {
                if (trackChanged || overrideBuffer ||
                    ((bufferLevel < minBufferTime) &&
                        ((minBufferTime < timeToEnd) || (minBufferTime >= timeToEnd && !isBufferingCompleted)))) {
                    // Buffer needs to be filled
                    bufferFragment.call(this);
                } else {
                    // Determine the timeout delay before checking again the buffer
                    delay = bufferLevel - minBufferTime + 0.5; // + 0.5 to ensure buffer level will be inferior to minBufferTime
                    updateCheckBufferTimeout.call(this, delay);
                }
            }
        },

        updateCheckBufferTimeout = function(delay) {
            var self = this;

            delay = delay ? delay : 1;

            this.debug.log("[BufferController][" + type + "] Check buffer in = " + delay.toFixed(3) + " ms (bufferLevel = " + bufferLevel + ")");

            clearTimeout(bufferTimeout);
            bufferTimeout = setTimeout(function() {
                bufferTimeout = null;
                checkIfSufficientBuffer.call(self);
            }, (delay * 1000));
        },

        bufferFragment = function() {
            var now = new Date(),
                currentVideoTime = this.videoModel.getCurrentTime(),
                manifest = this.manifestModel.getValue(),
                loadInit = false,
                quality,
                playlistUpdated = null,
                self = this;

            if (deferredFragmentBuffered !== null) {
                this.debug.error("[BufferController][" + type + "] deferredFragmentBuffered has not been resolved, create a new one is not correct.");
            }

            deferredFragmentBuffered = Q.defer();

            this.debug.log("[BufferController][" + type + "] Start buffering process...");

            // Check if data has changed
            doUpdateData.call(this);

            // If initialization data has been changed (track changed), then load initialization segment
            loadInit = (initializationData.length === 0) && (manifest.name !== "M3U");

            // Get current quality
            quality = this.abrController.getPlaybackQuality(type, data).quality;

            // Get corresponding representation
            _currentRepresentation = getRepresentationForQuality.call(this, quality);

            // Quality changed?
            if (quality !== currentDownloadQuality) {
                this.debug.log("[BufferController][" + type + "] currentDownloadQuality changed : " + quality);
                currentDownloadQuality = quality;
                // Load initialization segment
                loadInit = true;

                clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
                this.debug.log("[BufferController][" + type + "] Send RepresentationSwitch with quality = " + quality);
                this.metricsModel.addRepresentationSwitch(type, now, currentVideoTime, _currentRepresentation.id, quality);

                // HLS use case => download playlist for new representation
                playlistUpdated = updatePlayListForRepresentation.call(this);
            }

            Q.when(playlistUpdated ? playlistUpdated : true).then(
                function() {
                    if (loadInit === true) {
                        // Load initialization segment request
                        loadInitialization.call(self, quality).then(
                            function(request) {
                                if (request !== null) {
                                    self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, null /*signalStreamComplete*/ );
                                    sendRequest.call(self);
                                }
                            }, function(e) {
                                signalSegmentBuffered.call(self);
                                if (e.name === MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED) {
                                    self.errHandler.sendError(e.name, e.message, e.data);
                                } else {
                                    self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.INTERNAL_ERROR, "Internal error while processing initialization segment", e.message);
                                }
                            }
                        );
                    } else {
                        // Load next fragment
                        // Notes: 1 - Next fragment is download in // with initialization segment
                        //        2 - Buffer level is checked once next fragment data has been pushed into buffer (@see checkIfSufficientBuffer())
                        loadNextFragment.call(self);
                    }
                },
                function(err) {
                    signalSegmentBuffered.call(self);
                    if (err) {
                        self.errHandler.sendError(err.name, err.message, err.data);
                    }
                }
            );

        },

        updatePlayListForRepresentation = function() {
            var manifest = this.manifestModel.getValue(),
                deferred,
                representation,
                idx,
                self = this;

            if (manifest.name !== "M3U") {
                return Q.when(true);
            }

            // In static use case, do not update playlist if already downloaded
            if (!isDynamic) {
                if (_currentRepresentation.segmentInfoType === "SegmentList") {
                    return Q.when(true);
                }
            }

            if (playlistRefreshTimeout) {
                clearTimeout(playlistRefreshTimeout);
                playlistRefreshTimeout = null;
            }

            deferred = Q.defer();

            idx = this.manifestExt.getDataIndex(data, manifest, periodInfo.index);
            representation = manifest.Period_asArray[periodInfo.index].AdaptationSet_asArray[idx].Representation_asArray[currentDownloadQuality];

            this.debug.log("[BufferController][" + type + "] Update playlist for representation " + representation.id);

            this.parser.hlsParser.updatePlaylist(representation, data).then(
                function() {
                    availableRepresentations = updateRepresentations.call(self, data, periodInfo);
                    _currentRepresentation = getRepresentationForQuality.call(self, currentDownloadQuality);
                    representation = manifest.Period_asArray[periodInfo.index].AdaptationSet_asArray[idx].Representation_asArray[currentDownloadQuality];

                    // Refresh playlist according to last segment duration
                    var segments = representation.SegmentList.SegmentURL_asArray;
                    if (segments > 0) {
                        segmentDuration = segments[segments.length-1] - 1;
                    }
                    playlistRefreshTimeout = setTimeout(function() {
                        updatePlayListForRepresentation.call(self);
                    }, (segmentDuration * 1000));

                    deferred.resolve();
                },
                function(err) {
                    if (err) {
                        self.errHandler.sendWarning(err.name, err.message, err.data);
                    }
                    deferred.reject(err);
                }
            );

            return deferred.promise;
        },

        updateRepresentations = function(data, periodInfo) {
            var manifest = this.manifestModel.getValue(),
                idx,
                adaptations;

            idx = this.manifestExt.getDataIndex(data, manifest, periodInfo.index);
            adaptations = this.manifestExt.getAdaptationsForPeriod(manifest, periodInfo);

            return this.manifestExt.getRepresentationsForAdaptation(manifest, adaptations[idx]);
        },

        doUpdateData = function() {
            if (dataChanged === false) {
                return false;
            }

            this.debug.log("[BufferController][" + type + "] Data changed");

            // Update representations
            availableRepresentations = updateRepresentations.call(this, data, periodInfo);
            _currentRepresentation = getRepresentationForQuality.call(this, this.abrController.getPlaybackQuality(type, data).quality);

            this.bufferExt.updateData(data, type);

            if (trackChanged) {
                // Reset stored initialization segments
                initializationData = [];

                // Clear the executed requests
                this.fragmentController.clearExecutedRequests(fragmentModel);

                // Signal to override current buffering segments to switch as soon as possible to new track
                overrideBuffer = true;

                // For xml subtitles file, reset cues since there is no media segment
                if (type === 'text') {
                    buffer.UpdateLang(data.id, data.lang);
                    if (data.mimeType === 'application/ttml+xml') {
                        removeBuffer.call(this);
                    }
                }
            }

            dataChanged = false;
            trackChanged = false;
        },

        onFragmentLoadProgress = function(evt) {
            var currentQuality = this.abrController.getQualityFor(type),
                i,
                rules;

            // Check only if not at lowest quality
            if (this.abrController.isMinQuality(type, data, currentQuality)) {
                return;
            }

            rules = this.abrRulesCollection.getRules(MediaPlayer.rules.BaseRulesCollection.prototype.ABANDON_FRAGMENT_RULES);
            var callback = function(switchRequest) {
                if (switchRequest.quality < currentQuality) {
                    this.fragmentController.abortRequestsForModel(fragmentModel);
                    this.debug.info("[BufferController][" + type + "] Abandon current segment download");
                }
            };

            for (i = 0; i < rules.length; i++) {
                rules[i].execute(evt.data.request, callback.bind(this));
            }
        },

        signalSegmentLoadingFailed = function() {
            if (segmentRequestOnError === null) {
                return;
            }
            this.debug.log("[BufferController][" + type + "] Signal segment loading failed");
            this.system.notify("segmentLoadingFailed", segmentRequestOnError);
            segmentRequestOnError = null;
        };

    return {
        videoModel: undefined,
        metricsModel: undefined,
        manifestExt: undefined,
        manifestModel: undefined,
        bufferExt: undefined,
        sourceBufferExt: undefined,
        abrController: undefined,
        parser: undefined,
        fragmentExt: undefined,
        indexHandler: undefined,
        debug: undefined,
        system: undefined,
        errHandler: undefined,
        config: undefined,
        abrRulesCollection: undefined,

        initialize: function(type, newPeriodInfo, newData, buffer, fragmentController, source, eventController) {
            var manifest = this.manifestModel.getValue();

            this.debug.log("[BufferController][" + type + "] Initialize");

            this[MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_PROGRESS] = onFragmentLoadProgress;

            isDynamic = this.manifestExt.getIsDynamic(manifest);
            this.setMediaSource(source);
            this.setType(type);
            this.setBuffer(buffer);
            this.setFragmentController(fragmentController);
            this.setEventController(eventController);
            minBufferTime = this.config.getParamFor(type, "BufferController.minBufferTime", "number", -1);
            minBufferTimeAtStartup = this.config.getParamFor(type, "BufferController.minBufferTimeForPlaying", "number", MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_STARTUP);
            bufferToKeep = this.config.getParamFor(type, "BufferController.bufferToKeep", "number", MediaPlayer.dependencies.BufferExtensions.DEFAULT_BUFFER_TO_KEEP);
            liveDelay = this.config.getParamFor(type, "BufferController.liveDelay", "number", -1);

            this.updateData(newData, newPeriodInfo);

            this.load();

            ready = true;
        },

        load: function() {
            var manifest = this.manifestModel.getValue(),
                self = this;

            doUpdateData.call(this);

            // Retrieve the representation of initial quality to enable some parameters initialization
            // (@see getLiveEdgeTime() for example)
            _currentRepresentation = getRepresentationForQuality.call(this, this.abrController.getPlaybackQuality(type, data).quality);

            currentDownloadQuality = -1;

            // Clear buffer
            removeBuffer.call(this).then(function () {
                if (_currentRepresentation) {
                    self.indexHandler.setIsDynamic(isDynamic);
                    if (minBufferTime === -1) {
                        minBufferTime = self.bufferExt.decideBufferLength(manifest.minBufferTime, periodInfo.duration, waitingForBuffer);
                    }

                    if (liveDelay === -1 || liveDelay < minBufferTime) {
                        liveDelay = minBufferTime;
                    }

                    // Update manifest's minBufferTime value
                    manifest.minBufferTime = minBufferTime;
                    if (type === "video") {
                        if (isDynamic) {
                            self.indexHandler.updateSegmentList(_currentRepresentation).then(
                                function() {
                                    getLiveEdgeTime.call(self).then(
                                        function(time) {
                                            self.system.notify("startTimeFound", time);
                                        }
                                    );
                                }
                            );
                        } else {
                            self.indexHandler.getCurrentTime(_currentRepresentation).then(
                                function(time) {
                                    if (time < _currentRepresentation.segmentAvailabilityRange.start) {
                                        time = _currentRepresentation.segmentAvailabilityRange.start;
                                    }
                                    self.system.notify("startTimeFound", time);
                                }
                            );
                        }
                    }
                }

            });
        },

        getIndexHandler: function() {
            return this.indexHandler;
        },

        getType: function() {
            return type;
        },

        setType: function(value) {
            type = value;

            if (this.indexHandler !== undefined) {
                this.indexHandler.setType(value);
            }
        },

        getPeriodInfo: function() {
            return periodInfo;
        },

        getVideoModel: function() {
            return this.videoModel;
        },

        setVideoModel: function(value) {
            this.videoModel = value;
        },

        getFragmentController: function() {
            return this.fragmentController;
        },

        setFragmentController: function(value) {
            if (value) {
                this.fragmentController = value;
                fragmentModel = this.fragmentController.attachBufferController(this);
                fragmentModel.fragmentLoader.subscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_PROGRESS, this);
                fragmentModel.setType(type);
            }
        },

        setEventController: function(value) {
            this.eventController = value;
        },

        getData: function() {
            return data;
        },

        updateData: function(newData, newPeriodInfo) {

            this.debug.log("[BufferController][" + type + "] Update data");

            // Check if track has changed (in case of language switch for example)
            trackChanged = (data === null) ? false : ((data.id !==  newData.id) || (data.lang !==  newData.lang) || (data.subType !==  newData.subType));

            // Set the new data
            data = newData;
            periodInfo = newPeriodInfo;
            dataChanged = true;

            if (trackChanged) {
                this.debug.log("[BufferController][" + type + "] Track changed");

                // Restart buffering process to switch as soon as possible to new track

                // Reset current timeout
                clearTimeout(bufferTimeout);
                bufferTimeout = null;

                // Reset buffering completed state
                isBufferingCompleted = false;

                // Restart controller if stopped (if buffering was already completed)
                doStart.call(this);

                // Restart buffering process
                if (deferredFragmentBuffered === null) {
                    checkIfSufficientBuffer.call(this);
                }
            }
        },

        getHtmlVideoState: function() {
            return htmlVideoState;
        },

        getAvailableRepresentations: function() {
            return availableRepresentations;
        },

        getCurrentRepresentation: function() {
            return _currentRepresentation;
        },

        getBuffer: function() {
            return buffer;
        },

        setBuffer: function(value) {
            buffer = value;
        },

        getMinBufferTime: function() {
            return minBufferTime;
        },

        setMinBufferTime: function(value) {
            minBufferTime = value;
        },

        getLiveDelay: function() {
            return liveDelay;
        },

        setMediaSource: function(value) {
            mediaSource = value;
        },

        isReady: function() {
            return state === READY;
        },

        isBufferingCompleted: function() {
            return isBufferingCompleted;
        },

        updateManifest: function() {
            this.system.notify("manifestUpdate");
        },

        updateBufferState: function() {
            var currentTime = this.videoModel.getCurrentTime(),
                previousTime = htmlVideoTime === -1 ? currentTime : htmlVideoTime,
                progress = (currentTime - previousTime),
                ranges,
                self = this;

            clearTimeout(bufferStateTimeout);
            bufferStateTimeout = null;

            if (started === false) {
                return;
            }

            if (type === "text") {
                return;
            }

            if (trickModeEnabled) {
                return;
            }

            //this.debug.log("#### [" + type + "] level = " + bufferLevel + ", currentTime = " + currentTime + ", progress = " + progress);

            switch (htmlVideoState) {
                case INIT:
                    htmlVideoState = BUFFERING;
                    this.debug.info("[BufferController][" + type + "] BUFFERING - " + currentTime + " - " + bufferLevel);
                    this.metricsModel.addState(type, "buffering", currentTime);
                    break;

                case BUFFERING:
                    if (!this.getVideoModel().isPaused() &&
                        ((progress > 0) && (bufferLevel >= 1))) {
                        htmlVideoState = PLAYING;
                        this.debug.info("[BufferController][" + type + "] PLAYING - " + currentTime);
                        this.metricsModel.addState(type, "playing", currentTime);
                        // Reset seeking state since on some browsers (IE11/Edge) seeked event may not be raised
                        seeking = false;
                        seekTarget = -1;

                        // Reset segment download error status
                        segmentDownloadErrorCount = 0;
                    } else if (!this.getVideoModel().isStalled()) {
                        ranges = this.sourceBufferExt.getAllRanges(buffer);
                    }
                    break;

                case PLAYING:
                    if (!this.getVideoModel().isPaused() && !this.getVideoModel().isSeeking() &&
                        ((progress <= 0 && bufferLevel <= 1) || (bufferLevel === 0))) {
                        htmlVideoState = BUFFERING;
                        this.debug.info("[BufferController][" + type + "] BUFFERING - " + currentTime + " - " + bufferLevel);
                        this.metricsModel.addState(type, "buffering", currentTime);

                        if (segmentRequestOnError) {
                            // If buffering is due to segment download failure (see onBytesError()), then signal it to Stream (see Stream.onBufferFailed())
                            signalSegmentLoadingFailed.call(this);
                        } else {
                            // Check if there is a hole in the buffer (segment download failed or input stream discontinuity), then skip it
                            // For live streams we consider discontinuities lower than a segment duration
                            ranges = this.sourceBufferExt.getAllRanges(buffer);
                            var i;
                            for (i = 0; i < ranges.length; i++) {
                                if (currentTime < ranges.start(i)) {
                                    if (!isDynamic || ((ranges.start(i) - currentTime) < segmentDuration)) {
                                        break;
                                    }
                                }
                            }
                            if (i < ranges.length) {
                                // Seek to next available range
                                this.debug.info("[BufferController][" + type + "] BUFFERING => skip buffer discontinuity, seek to " + ranges.start(i));
                                this.videoModel.setCurrentTime(ranges.start(i));
                            }
                        }
                    }

                    bufferStateTimeout = setTimeout(function() {
                        bufferStateTimeout = null;
                        updateBufferLevel.call(self, false);
                    }, 1000);

                    break;
            }

            if (currentTime > 0) {
                htmlVideoTime = currentTime;
            }
        },

        updateStalledState: function() {
            stalled = this.videoModel.isStalled();
        },

        reset: function(errored) {
            var cancel = function cancelDeferred(d) {
                    if (d) {
                        d.reject();
                        d = null;
                    }
                },
                deferred = Q.defer(),
                self = this;

            doStop.call(this);
            // Wait for current buffering process to be completed before restarting
            this.sourceBufferExt.abort(mediaSource, buffer);

            if (playlistRefreshTimeout) {
                clearTimeout(playlistRefreshTimeout);
                playlistRefreshTimeout = null;
            }

            Q.when(deferredFragmentBuffered ? deferredFragmentBuffered.promise : true).then(
                function() {
                    cancel(deferredRejectedDataAppend);
                    cancel(deferredFragmentBuffered);

                    if (fragmentModel) {
                        fragmentModel.fragmentLoader.unsubscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_PROGRESS, self.abrController);
                        self.fragmentController.abortRequestsForModel(fragmentModel);
                        self.fragmentController.detachBufferController(fragmentModel);
                        fragmentModel = null;
                    }

                    initializationData = [];
                    initialPlayback = true;
                    isQuotaExceeded = false;
                    rejectedBytes = null;
                    appendingRejectedData = false;

                    if (trickModeEnabled) {
                        // Restore ABR quality and auto switch state
                        self.abrController.setAutoSwitchFor(type, trickModePreviousAutoSwitch);
                        self.abrController.setQualityFor(type, trickModePreviousQuality);
                    }

                    if (!errored) {
                        self.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
                    }
                    data = null;
                    buffer = null;

                    deferred.resolve();
                }, function() {
                    deferred.reject();
                }
            );

            return deferred.promise;
        },

        getSegmentDuration: function() {
            return segmentDuration;
        },

        setTrickMode: function(enabled, forward) {
            var deferred = Q.defer();

            this.debug.log("[BufferController][" + type + "] setTrickMode - enabled = " + enabled);

            if (trickModeEnabled === enabled) {
                deferred.resolve();
                return deferred.promise;
            }
            trickModeEnabled = enabled;

            if (trickModeEnabled) {
                // Trick mode enabled
                // => store current quality and auto switch state
                // => disable auto switch and set lowest quality
                trickModeForward = forward;
                trickModePreviousQuality = this.abrController.getQualityFor(type);
                trickModePreviousAutoSwitch = this.abrController.getAutoSwitchFor(type);
                this.abrController.setAutoSwitchFor(type, false);
                this.abrController.setQualityFor(type, 0);
                deferred.resolve();
            } else {
                // Trick mode disabled
                // => restore ABR quality and auto switch state
                this.abrController.setAutoSwitchFor(type, trickModePreviousAutoSwitch);
                this.abrController.setQualityFor(type, trickModePreviousQuality);
                removeBuffer.call(this).then(function() {
                    deferred.resolve();
                });
            }

            return deferred.promise;
        },

        start: doStart,
        seek: doSeek,
        stop: doStop,
        seeked: doSeeked,
        updateBufferLevel: updateBufferLevel
    };
};

MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
};
