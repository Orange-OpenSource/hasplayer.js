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
        currentSegmentTime = 0,
        seeking = false,
        //mseSetTime = false,
        seekTarget = -1,
        dataChanged = true,
        languageChanged = false,
        availableRepresentations,
        _currentRepresentation,
        currentBufferedQuality = -1,
        currentDownloadQuality = -1,
        stalled = false,
        isDynamic = false,
        isBufferingCompleted = false,
        deferredRejectedDataAppend = null,
        deferredBuffersFlatten = null,
        periodInfo = null,
        fragmentsToLoad = 0,
        fragmentModel = null,
        bufferLevel = 0,
        isQuotaExceeded = false,
        rejectedBytes = null,
        fragmentDuration = 0,
        appendingRejectedData = false,
        mediaSource,
        type,
        data = null,
        buffer = null,
        minBufferTime,
        minBufferTimeAtStartup,
        bufferTimeout,

        playListMetrics = null,
        playListTraceMetrics = null,
        playListTraceMetricsClosed = true,

        inbandEventFound = false,

        //ORANGE
        INIT = -1,
        BUFFERING = 0,
        PLAYING = 1,
        htmlVideoState = INIT,
        htmlVideoTime = -1,
        deferredFragmentBuffered = null,
        isFirstMediaSegment = false,
        //ORANGE : used to test Live chunk download failure
        //testTimeLostChunk = 0,

        // ORANGE: async. vs async. MSE's SourceBuffer appending/removing algorithm
        appendSync = false,

        // ORANGE: segment downlaod failed recovery
        SEGMENT_DOWNLOAD_ERROR_MAX = 3,
        segmentDownloadFailed = false,
        segmentDownloadErrorCount = 0,
        recoveryTime = -1,
        reloadTimeout = null,

        // ORANGE: HLS chunk sequence number
        currentSequenceNumber = -1,

        sendRequest = function() {

            // Check if running state
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
            var self = this;

            if (type === "text") {
                return;
            }

            self.debug.info("[BufferController][" + type + "] stalled = " + value);
            stalled = value;
            self.videoModel.stallStream(type, stalled);

            // Notify ABR controller we start buffering or playing in order to adapt ABR rules
            self.abrController.setPlayerState(stalled ? "buffering" : "playing");

        },

        startPlayback = function() {
            if (!ready || !started) {
                return;
            }

            this.debug.info("[BufferController][" + type + "] startPlayback");

            // Set media type to stalled state
            setStalled.call(this, true);

            // Start buffering process
            checkIfSufficientBuffer.call(this);
        },

        doStart = function() {
            var currentTime,
                self = this;

            if (started === true) {
                return;
            }

            if (seeking === false) {
                currentTime = new Date();
                clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
                playListMetrics = this.metricsModel.addPlayList(type, currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
            }

            if (isBufferingCompleted) {
                isBufferingCompleted = false;
            }

            started = true;

            self.debug.info("[BufferController][" + type + "] START");

            waitingForBuffer = true;

            //Reset htmlVideoState in order to update it after a pause or seek command in UpdateBufferState function
            htmlVideoState = INIT;
            htmlVideoTime = -1;

            startPlayback.call(self);
        },

        doSeek = function(time) {
            var self = this,
                currentTime = new Date();

            // Avoid identical successive seeks
            if ((seeking === true) && (seekTarget === time)) {
                // We are already seeking at the given time
                return;
            }

            this.debug.info("[BufferController][" + type + "] SEEK: " + time);

            // Do stop since <video>'s stop command may not be called before seek one
            if (started === true) {
                doStop.call(self);
            }

            // Restart
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, seekTarget, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);
            seeking = true;
            seekTarget = time;

            // Wait for current buffering process to be completed before restarting
            Q.when(deferredFragmentBuffered ? deferredFragmentBuffered.promise : true).then(
                function() {
                    // Reset segment list to avoid DashHandler dysfunctionning
                    _currentRepresentation.segments = null;
                    //self.debug.log("[BufferController]["+type+"] SEEK: deferredFragmentBuffered = "+deferredFragmentBuffered+" Call start!");
                    doStart.call(self);
                }
            );
        },

        doStop = function() {
            if (!started) {
                return;
            }
            this.debug.info("[BufferController][" + type + "] STOP");

            // Stop buffering process
            clearTimeout(bufferTimeout);
            started = false;
            waitingForBuffer = false;

            // Stop reload timeout
            clearTimeout(reloadTimeout);
            reloadTimeout = null;

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
            if (request.sequenceNumber) {
                currentSequenceNumber = request.sequenceNumber;
            }

            if (this.fragmentController.isInitializationRequest(request)) {
                onInitializationLoaded.call(this, request, response);
            } else {
                onMediaLoaded.call(this, request, response);
            }
        },

        onInitializationLoaded = function(request, response) {
            var self = this,
                initData = response.data,
                quality = request.quality;

            self.debug.log("[BufferController][" + type + "] Initialization loaded ", quality);

            self.fragmentController.process(initData).then(
                function(data) {
                    if (data !== null) {
                        // cache the initialization data to use it next time the quality has changed
                        initializationData[quality] = data;

                        // if this is the initialization data for current quality we need to push it to the buffer
                        self.debug.info("[BufferController][" + type + "] Buffer initialization segment ", (request.url !== null) ? request.url : request.quality);
                        //console.saveBinArray(data, type + "_init_" + request.quality + ".mp4");
                        // Clear the buffer if required (language track switching)
                        clearBuffer.call(self).then(
                            function() {
                                appendToBuffer.call(self, data, request.quality).then(
                                    function() {
                                        self.debug.log("[BufferController][" + type + "] Initialization segment buffered");
                                        // Load next media segment
                                        if (isRunning()) {
                                            loadNextFragment.call(self);
                                        }
                                    }
                                );
                            }
                        );
                    } else {
                        self.debug.log("No " + type + " bytes to push.");
                        // ORANGE : For HLS Stream, init segment are pushed with media (@see HlsFragmentController)
                        loadNextFragment.call(self);
                    }
                }
            );
        },

        onMediaLoaded = function(request, response) {
            var self = this,
                eventStreamAdaption = this.manifestExt.getEventStreamForAdaptationSet(self.getData()),
                eventStreamRepresentation = this.manifestExt.getEventStreamForRepresentation(self.getData(), _currentRepresentation),
                segmentStartTime = null;

            if (!isRunning()) {
                return;
            }

            // Reset segment download error status
            segmentDownloadFailed = false;
            segmentDownloadErrorCount = 0;

            self.debug.log("[BufferController][" + type + "] Media loaded ", request.url);

            if (self.chunkAborted === true) {
                self.chunkAborted = false;
            }

            if (self.chunkMissingCount === 1) {
                self.chunkMissingCount = 0;
            }

            if (!fragmentDuration && !isNaN(request.duration)) {
                fragmentDuration = request.duration;
            }

            // ORANGE: add request and representations in function parameters, used by MssFragmentController
            self.fragmentController.process(response.data, request, availableRepresentations).then(
                function(data) {
                    if (data !== null) {
                        if (eventStreamAdaption.length > 0 || eventStreamRepresentation.length > 0) {
                            handleInbandEvents.call(self, data, request, eventStreamAdaption, eventStreamRepresentation).then(
                                function(events) {
                                    self.eventController.addInbandEvents(events);
                                }
                            );
                        }

                        self.debug.info("[BufferController][" + type + "] Buffer segment from url ", request.url);
                        //console.saveBinArray(data, type + "_" + request.index + "_" + request.quality + ".mp4");
                        deleteInbandEvents.call(self, data).then(
                            function(data) {
                                appendToBuffer.call(self, data, request.quality, request.index).then(
                                    function() {
                                        if (isFirstMediaSegment) {
                                            isFirstMediaSegment = false;
                                            if (self.fragmentController.hasOwnProperty('getStartTime')) {
                                                segmentStartTime = self.fragmentController.getStartTime();
                                            }
                                            if (segmentStartTime) {
                                                self.metricsModel.addBufferedSwitch(type, segmentStartTime, _currentRepresentation.id, request.quality);
                                            } else {
                                                self.metricsModel.addBufferedSwitch(type, request.startTime, _currentRepresentation.id, request.quality);
                                            }
                                        }

                                        _currentRepresentation.segments = null;

                                        self.debug.log("[BufferController][" + type + "] Media segment buffered");
                                        // Signal end of buffering process
                                        signalSegmentBuffered.call(self);
                                        // Check buffer level
                                        checkIfSufficientBuffer.call(self);
                                    }
                                );
                            }
                        );
                    } else {
                        self.debug.log("[BufferController][" + type + "] Error with segment data, no bytes to push");
                        // Signal end of buffering process
                        signalSegmentBuffered.call(self);
                        // Check buffer level
                        checkIfSufficientBuffer.call(self);
                    }
                }
            );
        },

        appendToBuffer = function(data, quality, index) {
            var self = this,
                deferred = Q.defer(),
                currentVideoTime = self.videoModel.getCurrentTime(),
                currentTime = new Date();

            //self.debug.log("Push (" + type + ") bytes: " + data.byteLength);

            if (playListTraceMetricsClosed === true) {
                playListTraceMetricsClosed = false;
                playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, _currentRepresentation.id, null, currentTime, currentVideoTime, null, 1.0, null);
            }

            if (!hasData()) {
                return;
            }

            hasEnoughSpaceToAppend.call(self).then(
                function() {
                    Q.when(deferredBuffersFlatten ? deferredBuffersFlatten.promise : true).then(
                        function() {
                            if (!hasData()) {
                                return;
                            }
                            self.debug.log("[BufferController][" + type + "] Buffering segment");
                            self.sourceBufferExt.append(buffer, data, appendSync).then(
                                function( /*appended*/ ) {
                                    self.debug.log("[BufferController][" + type + "] Segment buffered");
                                    //self.debug.log("[BufferController]["+type+"] Data has been appended for quality = "+quality+" index = "+index);
                                    if (currentBufferedQuality != quality) {
                                        isFirstMediaSegment = true;
                                        self.debug.log("[BufferController][" + type + "] set currentBufferedQuality to " + quality);
                                        currentBufferedQuality = quality;
                                    }

                                    isQuotaExceeded = false;

                                    // In case of live streams, remove outdated buffer parts and requests
                                    // (checking bufferLevel ensure buffer is not empty or back to current time)
                                    if (isDynamic && bufferLevel > 1) {
                                        removeBuffer.call(self, -1, getWorkingTime.call(self) - 30).then(
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
                                    self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_APPEND_SOURCEBUFFER, "Failed to append data into " + type + " source buffer",
                                        new MediaPlayer.vo.Error(result.err.code, result.err.name, result.err.message));
                                    // if the append has failed because the buffer is full we should store the data
                                    // that has not been appended and stop request scheduling. We also need to store
                                    // the promise for this append because the next data can be appended only after
                                    // this promise is resolved.
                                    if (result.err.code === MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_QUOTA_EXCEEDED) {
                                        rejectedBytes = {
                                            data: data,
                                            quality: quality,
                                            index: index
                                        };
                                        deferredRejectedDataAppend = deferred;
                                        isQuotaExceeded = true;
                                        fragmentsToLoad = 0;
                                        // stop scheduling new requests
                                        doStop.call(self);
                                    }
                                }
                            );
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
            return Q.when(events);
        },

        deleteInbandEvents = function(data) {

            if (!inbandEventFound) {
                return Q.when(data);
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

            return Q.when(modData.subarray(0, j));

        },

        /*checkGapBetweenBuffers= function() {
            var leastLevel = this.bufferExt.getLeastBufferLevel(),
                acceptableGap = fragmentDuration * 2,
                actualGap = bufferLevel - leastLevel;

            // if the gap betweeen buffers is too big we should create a promise that prevents appending data to the current
            // buffer and requesting new segments until the gap will be reduced to the suitable size.
            if (actualGap > acceptableGap && !deferredBuffersFlatten) {
                fragmentsToLoad = 0;
                deferredBuffersFlatten = Q.defer();
            } else if ((actualGap < acceptableGap) && deferredBuffersFlatten) {
                deferredBuffersFlatten.resolve();
                deferredBuffersFlatten = null;
            }
        },*/

        isRunning = function() {
            var self = this;
            if (started) {
                return true;
            }

            // If buffering process is running, then we interrupt it
            signalSegmentBuffered.call(self);

            return false;
        },

        signalSegmentBuffered = function() {
            if (deferredFragmentBuffered) {
                //self.debug.log("[BufferController]["+type+"] End of buffering process");
                deferredFragmentBuffered.resolve();
                deferredFragmentBuffered = null;
            }
        },

        hasEnoughSpaceToAppend = function() {
            var self = this,
                deferred = Q.defer(),
                removedTime = 0,
                startClearing;

            // do not remove any data until the quota is exceeded
            if (!isQuotaExceeded) {
                return Q.when(true);
            }

            startClearing = function() {
                var self = this,
                    currentTime = self.videoModel.getCurrentTime(),
                    removeStart = 0,
                    removeEnd,
                    req;

                // we need to remove data that is more than one segment before the video currentTime
                req = self.fragmentController.getExecutedRequestForTime(fragmentModel, currentTime);
                removeEnd = (req && !isNaN(req.startTime)) ? req.startTime : Math.floor(currentTime);
                fragmentDuration = (req && !isNaN(req.duration)) ? req.duration : 1;

                removeBuffer.call(self, removeStart, removeEnd).then(
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

            startClearing.call(self);

            return deferred.promise;
        },

        clearBuffer = function() {
            var self = this,
                deferred = Q.defer(),
                start,
                end;

            // Clear buffer only if language has changed
            if (languageChanged === false) {
                return Q.when(true);
            }

            if (buffer.buffered.length === 0) {
                return Q.when(true);
            }

            start = buffer.buffered.start(0);
            end = buffer.buffered.end(buffer.buffered.length - 1);
            self.debug.log("[BufferController][" + type + "] Language changed => clear buffer");
            if (type !== "text") {
                // no need to abort for text buffer. remove call do the same thing
                self.sourceBufferExt.abort(mediaSource, buffer);
            }
            self.sourceBufferExt.remove(buffer, start, end, periodInfo.duration, mediaSource, appendSync).then(
                function() {
                    // Remove all requests from the list of the executed requests
                    self.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, end);
                    self.fragmentController.cancelPendingRequestsForModel(fragmentModel);
                    languageChanged = false;
                    seeking = true;
                    seekTarget = self.videoModel.getCurrentTime();
                    self.debug.log("[BufferController][" + type + "] Seek to " + seekTarget);
                    deferred.resolve();
                },
                function(ex) {
                    self.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_REMOVE_SOURCEBUFFER, "Failed to remove data from " + type + " source buffer",
                        new MediaPlayer.vo.Error(ex.code, ex.name, ex.message));
                    deferred.resolve();
                }
            );

            return deferred.promise;
        },

        removeBuffer = function(start, end) {
            var self = this,
                deferred = Q.defer(),
                removeStart,
                removeEnd;

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

            self.debug.info("[BufferController][" + type + "] Remove from " + removeStart + " to " + removeEnd + " (" + self.getVideoModel().getCurrentTime() + ")");

            // Wait for buffer update completed, since some data can have been started to pe pushed before calling this method
            self.sourceBufferExt.remove(buffer, removeStart, removeEnd, periodInfo.duration, mediaSource, appendSync).then(
                function() {
                    // after the data has been removed from the buffer we should remove the requests from the list of
                    // the executed requests for which playback time is inside the time interval that has been removed from the buffer
                    self.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, removeEnd);
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
                    // this.abrController.setAutoSwitchBitrate(false);
                    // this.abrController.setPlaybackQuality(type, 0);
                    bufferFragment.call(this);
                // }
                return;
            }

            // Ignore in case of text track, this will not stop playing
            if (type === "text") {

                this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_CONTENT,
                    "Failed to download media segment",
                    {
                        url: e.url,
                        status: e.status
                    });

                return;
            }

            // Segment download failed
            segmentDownloadErrorCount += 1;

            // => If failed SEGMENT_DOWNLOAD_ERROR_MAX times, then raise an error
            // => Else raise a warning and try to reload session
            if (segmentDownloadErrorCount === SEGMENT_DOWNLOAD_ERROR_MAX) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_CONTENT,
                    "Failed to download media segment",
                    {
                        url: e.url,
                        status: e.status
                    });
            } else {
                this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_CONTENT,
                    "Failed to download media segment",
                    {
                        url: e.url,
                        status: e.status
                    });

                recoveryTime = e.startTime + (e.duration * 1.5);

                // If already in buffering state (i.e. empty buffer) then reload session now
                // Else reload session when entering in buffering state (see updateBufferState())
                if (htmlVideoState === BUFFERING) {
                    requestForReload.call(this, (e.duration * 1.5));
                } else {
                    segmentDownloadFailed = true;
                }
            }
        },

        signalStreamComplete = function( /*request*/ ) {
            var self = this;

            self.debug.log("[BufferController][" + type + "] Stream is complete.");

            isBufferingCompleted = true;
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);

            signalSegmentBuffered.call(self);

            doStop.call(self);

            self.system.notify("bufferingCompleted");
        },

        loadInitialization = function(quality) {
            var self = this;

            // Check if initialization segment for current quality has not already been stored
            if (initializationData[quality]) {
                self.debug.info("[BufferController][" + type + "] Buffer initialization segment, quality = ", quality);
                appendToBuffer.call(this, initializationData[quality], quality).then(
                    function() {
                        self.debug.log("[BufferController][" + type + "] Initialization segment buffered");
                        // Load next media segment
                        if (isRunning()) {
                            loadNextFragment.call(self);
                        }
                    }
                );
                return Q.when(null);
            } else {
                // if we have not loaded the init segment for the current quality, do it
                return this.indexHandler.getInitRequest(availableRepresentations[quality]);
            }
        },

        loadNextFragment = function() {
            var self = this,
                range,
                time,
                segmentTime;

            // Check if running state
            if (!isRunning.call(self)) {
                return;
            }

            // Get next segment time and check if already in buffer
            time = seeking ? seekTarget : currentSegmentTime;
            range = self.sourceBufferExt.getBufferRange(buffer, time);

            segmentTime = range ? range.end : time;

            if ((currentSequenceNumber !== -1) && !seeking) {
                self.debug.log("[BufferController][" + type + "] loadNextFragment for sequence number: " + currentSequenceNumber);
                self.indexHandler.getNextSegmentRequestFromSN(_currentRepresentation, currentSequenceNumber).then(onFragmentRequest.bind(self));
            } else {
                self.debug.log("[BufferController][" + type + "] loadNextFragment for time: " + segmentTime);
                self.indexHandler.getSegmentRequestForTime(_currentRepresentation, segmentTime).then(onFragmentRequest.bind(self));
            }

            // Reset seeking state
            if (seeking === true) {
                seeking = false;
            }

            //ORANGE : used to test Live chunk download failure
            /*if ((testTimeLostChunk-2)<=segmentTime &&
                (testTimeLostChunk+2)>=segmentTime)
            {
                var e = {};
                e.startTime = segmentTime;
                onBytesError.call(self,e);
            }
            else{
                self.indexHandler.getSegmentRequestForTime(_currentRepresentation, segmentTime).then(onFragmentRequest.bind(self));
            }*/
        },

        onFragmentRequest = function(request) {
            var self = this,
                manifest = self.manifestModel.getValue();

            // Check if current request signals end of stream
            if ((request !== null) && (request.action === request.ACTION_COMPLETE)) {
                signalStreamComplete.call(self);
                return;
            }

            if (request !== null) {
                // If we have already loaded the given fragment ask for the next one. Otherwise prepare it to get loaded
                if (self.fragmentController.isFragmentLoadedOrPending(self, request)) {
                    self.debug.log("[BufferController][" + type + "] new fragment request => already loaded or pending");
                    self.indexHandler.getNextSegmentRequest(_currentRepresentation).then(onFragmentRequest.bind(self));
                } else {
                    // Store current segment time for next segment request
                    currentSegmentTime = request.startTime;

                    // Download the segment
                    self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, null /*signalStreamComplete*/ ).then(
                        function() {
                            sendRequest.call(self);
                        });
                }
            } else {
                // No more fragment in current list
                self.debug.log("[BufferController][" + type + "] loadNextFragment failed");
                signalSegmentBuffered.call(self);

                // If live HLS, then try to refresh playlist
                if (isDynamic) {
                    if (manifest.name === "M3U") {
                        // HLS use case => update current representation playlist
                        updatePlayListForRepresentation.call(self, currentDownloadQuality).then(
                            function() {
                                _currentRepresentation = getRepresentationForQuality.call(self, currentDownloadQuality);
                                updateCheckBufferTimeout.call(self, 0);
                            }, function(err) {
                                self.errHandler.sendError(err.name, err.message, err.data);
                            }
                        );
                    }
                } else {
                    // For VOD streams, signal end of stream
                    signalStreamComplete.call(self);
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
            var time = -1;

            if (this.videoModel.isPaused()) {
                time = seekTarget;
            } else {
                time = this.videoModel.getCurrentTime();
            }
            this.debug.log("[BufferController][" + type + "] Working time: " + time + " (paused = " + this.videoModel.isPaused() + ")");

            return time;
        },

        getLiveEdgeTime = function() {
            var self = this,
                deferred = Q.defer(),
                startTime,
                // Get live edge time from manifest as the last segment time
                liveEdgeTime = _currentRepresentation.segmentAvailabilityRange.end;

            self.debug.log("[BufferController][" + type + "] Manifest live edge = " + liveEdgeTime);

            // Step back from a found live edge time to be able to buffer some data
            startTime = Math.max((liveEdgeTime - minBufferTime), _currentRepresentation.segmentAvailabilityRange.start);

            // Get the request corresponding to the start time
            this.indexHandler.getSegmentRequestForTime(_currentRepresentation, startTime).then(
                function(request) {
                    // Set live edge to be the start time of the founded segment
                    periodInfo.liveEdge = request.startTime;
                    self.debug.log("[BufferController][" + type + "] Live edge = " + periodInfo.liveEdge);

                    deferred.resolve(periodInfo.liveEdge);
                    //doSeek(periodInfo.liveEdge);
                    //seeking = true;
                    //seekTarget = periodInfo.liveEdge;
                }
            );

            return deferred.promise;
        },

        updateBufferLevel = function(sendMetric) {
            if (!hasData()) {
                return;
            }

            var self = this,
                currentTime = getWorkingTime.call(self);

            bufferLevel = self.sourceBufferExt.getBufferLength(buffer, currentTime);
            self.debug.log("[BufferController][" + type + "] Buffer level = " + bufferLevel + " (time:" + currentTime + ")");
            if (sendMetric) {
                self.metricsModel.addBufferLevel(type, new Date(), bufferLevel);
            }
            self.updateBufferState();
        },

        checkIfSufficientBuffer = function() {
            var self = this,
                timeToEnd,
                delay;

            // Check if running state
            if (!isRunning.call(self)) {
                return;
            }

            self.debug.log("[BufferController][" + type + "] Check buffer...");

            updateBufferLevel.call(self, false);

            // Check stalled mode of video model
            if (stalled) {
                if (bufferLevel > minBufferTimeAtStartup) {
                    setStalled.call(self, false);
                }
            }

            timeToEnd = getTimeToEnd.call(self);
            self.debug.log("[BufferController][" + type + "] time to end = " + timeToEnd);

            if (languageChanged ||
                ((bufferLevel < minBufferTime) &&
                    ((minBufferTime < timeToEnd) || (minBufferTime >= timeToEnd && !isBufferingCompleted)))) {
                // Buffer needs to be filled
                bufferFragment.call(self);
            } else {
                // Determine the timeout delay before checking again the buffer
                delay = bufferLevel - minBufferTime;
                self.debug.log("[BufferController][" + type + "] Check buffer in " + delay + " seconds");
                updateCheckBufferTimeout.call(self, delay);
            }
        },

        updateCheckBufferTimeout = function(delay) {
            var self = this;

            clearTimeout(bufferTimeout);
            bufferTimeout = setTimeout(function() {
                bufferTimeout = null;
                checkIfSufficientBuffer.call(self);
            }, Math.max((delay * 1000), 2000));
        },

        cancelCheckBufferTimeout = function() {
            if (bufferTimeout) {
                clearTimeout(bufferTimeout);
                bufferTimeout = null;
                checkIfSufficientBuffer.call(this);
            }
        },

        bufferFragment = function() {
            var self = this,
                now = new Date(),
                currentVideoTime = self.videoModel.getCurrentTime(),
                manifest = self.manifestModel.getValue(),
                quality,
                playlistUpdated = null;

            if (deferredFragmentBuffered !== null) {
                self.debug.error("[BufferController][" + type + "] deferredFragmentBuffered has not been resolved, create a new one is not correct.");
            }

            deferredFragmentBuffered = Q.defer();

            self.debug.log("[BufferController][" + type + "] Start buffering process...");

            // Check if data has changed
            doUpdateData.call(self).then(
                function(dataUpdated) {
                    // If data has been changed, then load initialization segment
                    var loadInit = dataUpdated;

                    // Get current quality
                    self.abrController.getPlaybackQuality(type, data).then(
                        function(result) {

                            // Re-enable ABR in case it has been previsouly disabled (see onBytesError)
                            self.abrController.setAutoSwitchBitrate(true);

                            quality = result.quality;

                            // Get corresponding representation
                            _currentRepresentation = getRepresentationForQuality.call(self, quality);

                            // Quality changed?
                            if (quality !== currentDownloadQuality) {
                                self.debug.log("[BufferController][" + type + "] currentDownloadQuality changed : " + quality);
                                currentDownloadQuality = quality;
                                // Load initialization segment
                                loadInit = true;

                                // Reset segment list
                                _currentRepresentation.segments = null;

                                clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
                                self.debug.log("[BufferController][" + type + "] Send RepresentationSwitch with quality = " + quality);
                                self.metricsModel.addRepresentationSwitch(type, now, currentVideoTime, _currentRepresentation.id, quality);

                                // HLS use case => download playlist for new representation
                                if ((manifest.name === "M3U") && (isDynamic || availableRepresentations[quality].initialization === null)) {
                                    playlistUpdated = Q.defer();
                                    updatePlayListForRepresentation.call(self, quality).then(
                                        function() {
                                            _currentRepresentation = getRepresentationForQuality.call(self, quality);
                                            playlistUpdated.resolve();
                                        },
                                        function(err) {
                                            playlistUpdated.reject(err);
                                        }
                                    );
                                }
                            }

                            Q.when(playlistUpdated ? playlistUpdated.promise : true).then(
                                function() {
                                    if (loadInit === true) {
                                        // Load initialization segment request
                                        loadInitialization.call(self, quality).then(
                                            function(request) {
                                                if (request !== null) {
                                                    self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, null /*signalStreamComplete*/ ).then(
                                                        function() {
                                                            sendRequest.call(self);
                                                        }
                                                    );
                                                }
                                            }, function(e) {
                                                signalSegmentBuffered.call(self);
                                                if (e.name === MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED) {
                                                    self.errHandler.sendError(e.name, e.message, e.data);
                                                }
                                                // TODO: manage not available init segment request (internal error?)
                                                // TODO: discard unsupported representations
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
                                    signalSegmentBuffered();
                                    self.errHandler.sendError(err.name, err.message, err.data);
                                }
                            );
                        }
                    );
                }
            );
        },

        updatePlayListForRepresentation = function(repIndex) {
            var self = this,
                deferred = Q.defer(),
                manifest = self.manifestModel.getValue(),
                representation;

            self.manifestExt.getDataIndex(data, manifest, periodInfo.index).then(
                function(idx) {
                    representation = manifest.Period_asArray[periodInfo.index].AdaptationSet_asArray[idx].Representation_asArray[repIndex];
                    self.parser.hlsParser.updatePlaylist(representation).then(
                        function() {
                            updateRepresentations.call(self, data, periodInfo).then(
                                function(representations) {
                                    availableRepresentations = representations;
                                    deferred.resolve();
                                }
                            );
                        },
                        function(err) {
                            deferred.reject(err);
                        }
                    );
                }
            );
            return deferred.promise;
        },

        updateRepresentations = function(data, periodInfo) {
            var self = this,
                deferred = Q.defer(),
                manifest = self.manifestModel.getValue();
            self.manifestExt.getDataIndex(data, manifest, periodInfo.index).then(
                function(idx) {
                    self.manifestExt.getAdaptationsForPeriod(manifest, periodInfo).then(
                        function(adaptations) {
                            self.manifestExt.getRepresentationsForAdaptation(manifest, adaptations[idx]).then(
                                function(representations) {
                                    deferred.resolve(representations);
                                }
                            );
                        }
                    );
                }
            );

            return deferred.promise;
        },

        doUpdateData = function() {
            var self = this,
                deferred = Q.defer();

            if (dataChanged === false) {
                deferred.resolve(false);
                return deferred.promise;
            }

            self.debug.log("[BufferController][" + type + "] updateData");

            // Reset stored initialization segments
            initializationData = [];

            // Update representations
            updateRepresentations.call(self, data, periodInfo).then(
                function(representations) {
                    availableRepresentations = representations;

                    // Retrieve the current representation according to the current quality
                    //_currentRepresentation = getRepresentationForQuality.call(self, result.quality);

                    self.bufferExt.updateData(data, type);
                    dataChanged = false;

                    deferred.resolve(true);
                }
            );

            return deferred.promise;
        },

        onFragmentLoadProgress = function(evt) {
            var self = this,
                i = 0,
                len = 0,
                type = evt.data.request.streamType,
                metricsHttp = evt.data.httpRequestMetrics,
                lastTraceTime = evt.data.lastTraceTime,
                currentTime;

            //self.debug.log("[BufferController]["+type+"] Download request " + evt.data.request.url + " is in progress");

            self.abrRulesCollection.getRules(MediaPlayer.rules.BaseRulesCollection.prototype.ABANDON_FRAGMENT_RULES).then(
                function(rules) {
                    var callback = function(switchRequest) {

                        var newQuality = switchRequest.quality,
                            abrCurrentQuality = self.abrController.getQualityFor(type);

                        if (newQuality < abrCurrentQuality) {
                            self.debug.info("[BufferController][" + type + "] Abandon current fragment : " + evt.data.request.url);

                            currentTime = new Date();

                            metricsHttp.tfinish = currentTime;
                            metricsHttp.bytesLength = evt.data.request.bytesLoaded;

                            self.metricsModel.appendHttpTrace(metricsHttp,
                                currentTime,
                                currentTime.getTime() - lastTraceTime.getTime(), [evt.data.request.bytesLoaded ? evt.data.request.bytesLoaded : 0]);

                            self.fragmentController.abortRequestsForModel(fragmentModel);
                            self.debug.info("[BufferController][" + type + "] Segment download abandonned => Retry segment download at lowest quality");
                            self.abrController.setAutoSwitchBitrate(false);
                            self.abrController.setPlaybackQuality(type, newQuality);
                        }
                    };

                    for (i = 0, len = rules.length; i < len; i += 1) {
                        rules[i].execute(evt.data.request, callback);
                    }
                });
        },

        requestForReload = function(delay) {
            var self = this;

            // Check if not already notified
            if (reloadTimeout !== null) {
                return;
            }

            this.debug.info("[BufferController][" + type + "] Reload session in " + delay + " s.");
            reloadTimeout = setTimeout(function() {
                reloadTimeout = null;
                self.debug.info("[BufferController][" + type + "] Reload session");
                self.system.notify("needForReload");
            }, delay * 1000);
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
            var self = this,
                manifest = self.manifestModel.getValue();

            self.debug.log("[BufferController][" + type + "] Initialize");

            // PATCH for Espial browser which implements SourceBuffer appending/removing synchronoulsy
            if (navigator.userAgent.indexOf("Espial") !== -1) {
                self.debug.log("[BufferController][" + type + "] Espial browser = sync append");
                appendSync = true;
            }
            self[MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_PROGRESS] = onFragmentLoadProgress;

            isDynamic = self.manifestExt.getIsDynamic(manifest);
            self.setMediaSource(source);
            self.setType(type);
            self.setBuffer(buffer);
            self.setFragmentController(fragmentController);
            self.setEventController(eventController);
            minBufferTime = self.config.getParamFor(type, "BufferController.minBufferTime", "number", -1);
            minBufferTimeAtStartup = self.config.getParamFor(type, "BufferController.minBufferTimeForPlaying", "number", 0);

            data = newData;
            periodInfo = newPeriodInfo;
            dataChanged = true;

            self.load();

            ready = true;
        },

        load: function() {
            var self = this,
                manifest = self.manifestModel.getValue();

            doUpdateData.call(this).then(
                function() {
                    // Retreive the representation of initial quality to enable some parameters initialization
                    // (@see getLiveEdgeTime() for example)
                    self.abrController.getPlaybackQuality(type, data).then(
                        function(result) {
                            _currentRepresentation = getRepresentationForQuality.call(self, result.quality);

                            if (_currentRepresentation) {
                                fragmentDuration = _currentRepresentation.segmentDuration;

                                self.indexHandler.setIsDynamic(isDynamic);
                                if (minBufferTime === -1) {
                                    minBufferTime = self.bufferExt.decideBufferLength(manifest.minBufferTime, periodInfo.duration, waitingForBuffer);
                                }
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
                        }
                    );
                }
            );
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
            }
        },

        setEventController: function(value) {
            this.eventController = value;
        },

        getAutoSwitchBitrate: function() {
            var self = this;
            return self.abrController.getAutoSwitchBitrate();
        },

        setAutoSwitchBitrate: function(value) {
            this.abrController.setAutoSwitchBitrate(value);
        },

        getData: function() {
            return data;
        },

        updateData: function(newData, newPeriodInfo) {
            var self = this;

            self.debug.log("[BufferController][" + type + "] Update data");

            // Set the new data
            languageChanged = (data && ((data.lang !== null ? data.lang : data.id) !== ((newData.lang !== null ? newData.lang : newData.id)))) ? true : false;
            data = newData;
            periodInfo = newPeriodInfo;
            dataChanged = true;

            // If data language changed (audio or text) then seek to current time
            // in order to switch to new language as soon as possible (see appendToBuffer())
            if (languageChanged) {
                self.debug.log("[BufferController][" + type + "] Language changed");
                cancelCheckBufferTimeout.call(this);
            }
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

        setMediaSource: function(value) {
            mediaSource = value;
        },

        isReady: function() {
            return state === READY;
        },

        isBufferingCompleted: function() {
            return isBufferingCompleted;
        },

        clearMetrics: function() {
            if (type === null || type === "") {
                return;
            }

            this.metricsModel.clearCurrentMetricsForType(type);
        },

        updateManifest: function() {
            this.system.notify("manifestUpdate");
        },

        updateBufferState: function() {
            var currentTime = this.videoModel.getCurrentTime(),
                previousTime = htmlVideoTime === -1? currentTime : htmlVideoTime,
                progress = (currentTime - previousTime);

            if (started === false) {
                return;
            }

            //this.debug.log("#### [" + type + "] level = " + bufferLevel + ", currentTime = " + currentTime + ", progress = " + progress);

            switch (htmlVideoState) {
                case INIT:
                    htmlVideoState = BUFFERING;
                    this.debug.log("[BufferController][" + type + "] BUFFERING - " + this.videoModel.getCurrentTime() + " - " + bufferLevel);
                    this.metricsModel.addState(type, "buffering", this.videoModel.getCurrentTime());
                    break;

                case BUFFERING:
                    if (!this.getVideoModel().isPaused() &&
                        ((progress > 0) && (bufferLevel >= 1))) {
                        htmlVideoState = PLAYING;
                        this.debug.log("[BufferController][" + type + "] PLAYING - " + this.videoModel.getCurrentTime());
                        this.metricsModel.addState(type, "playing", this.videoModel.getCurrentTime());
                    } else if (!this.getVideoModel().isStalled()) {
                        var ranges = this.sourceBufferExt.getAllRanges(buffer);
                        if (ranges.length > 0) {
                            var gap = getWorkingTime.call(this) - ranges.end(ranges.length-1);
                            this.debug.log("[BufferController][" + type + "] BUFFERING - delay from current time = " + gap);
                            if (gap > 4) {
                                this.debug.log("[BufferController][" + type + "] BUFFERING => reload session");
                                requestForReload.call(this, 1);
                            }
                        }
                    }
                    break;

                case PLAYING:
                    if (!this.getVideoModel().isPaused() &&
                        ((progress <= 0 && bufferLevel <= 1) || (bufferLevel === 0))) {
                        htmlVideoState = BUFFERING;
                        this.debug.log("[BufferController][" + type + "] BUFFERING - " + this.videoModel.getCurrentTime() + " - " + bufferLevel);
                        this.metricsModel.addState(type, "buffering", this.videoModel.getCurrentTime());

                        // If buffering since a segment download failed, then ask for reloading session
                        if (segmentDownloadFailed) {
                            segmentDownloadFailed = false;
                            requestForReload.call(this, recoveryTime - this.videoModel.getCurrentTime());
                        }
                    }
                    break;
            }

            if (currentTime > 0) {
                htmlVideoTime = currentTime;
            }

            // if the buffer controller is stopped and the buffer is full we should try to clear the buffer
            // before that we should make sure that we will have enough space to append the data, so we wait
            // until the video time moves forward for a value greater than rejected data duration since the last reject event or since the last seek.
            /*if (isQuotaExceeded && rejectedBytes && !appendingRejectedData) {
                appendingRejectedData = true;
                //try to append the data that was previosly rejected
                appendToBuffer.call(this, rejectedBytes.data, rejectedBytes.quality, rejectedBytes.index).then(
                    function(){
                        appendingRejectedData = false;
                    }
                );
            }*/
        },

        updateStalledState: function() {
            stalled = this.videoModel.isStalled();
        },

        reset: function(errored) {
            var self = this,
                cancel = function cancelDeferred(d) {
                    if (d) {
                        d.reject();
                        d = null;
                    }
                },
                deferred = Q.defer();

            doStop.call(self);
            // Wait for current buffering process to be completed before restarting
            self.sourceBufferExt.abort(mediaSource, buffer);

            Q.when(deferredFragmentBuffered ? deferredFragmentBuffered.promise : true).then(
                function() {
                    cancel(deferredRejectedDataAppend);
                    cancel(deferredBuffersFlatten);
                    cancel(deferredFragmentBuffered);

                    if (fragmentModel) {
                        fragmentModel.fragmentLoader.unsubscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_PROGRESS, self.abrController);
                        self.fragmentController.abortRequestsForModel(fragmentModel);
                        self.fragmentController.detachBufferController(fragmentModel);
                        fragmentModel = null;
                    }

                    self.clearMetrics();
                    initializationData = [];
                    initialPlayback = true;
                    isQuotaExceeded = false;
                    rejectedBytes = null;
                    appendingRejectedData = false;

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

        start: doStart,
        seek: doSeek,
        stop: doStop,
        updateBufferLevel: updateBufferLevel
    };
};

MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
};