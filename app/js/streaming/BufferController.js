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
MediaPlayer.dependencies.BufferController = function () {
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
        availableRepresentations,
        currentRepresentation,
        currentQuality = -1,
        initialQuality = -1,
        stalled = false,
        isDynamic = false,
        isBufferingCompleted = false,
        deferredStreamComplete = Q.defer(),
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
        htmlVideoState = -1,
        lastBufferLevel = -1,
        deferredFragmentBuffered = null,
        //ORANGE : used to test Live chunk download failure
        //testTimeLostChunk = 0,

        // ORANGE: async. vs async. MSE's SourceBuffer appending/removing algorithm
        appendSync = false,

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

        clearPlayListTraceMetrics = function (endTime, stopreason) {
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

        setStalled = function (value) {
            var self = this;

            self.debug.info("[BufferController]["+type+"] stalled = ", value);
            stalled = value;
            self.videoModel.stallStream(type, stalled);
        },

        startPlayback = function () {
            if (!ready || !started) {
                return;
            }

            this.debug.info("[BufferController]["+type+"] startPlayback");

            // Set media type to stalled state
            setStalled.call(this, true);

            // Start buffering process
            checkIfSufficientBuffer.call(this);
        },

        doStart = function () {
            var currentTime,
                self = this;

            if (started === true) {
                return;
            }

            // Notify ABR controller we start the buffering in order to adapt ABR rules
            self.abrController.setPlayerState("buffering");

            if (seeking === false) {
                currentTime = new Date();
                clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
                playListMetrics = this.metricsModel.addPlayList(type, currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
            }

            this.metricsModel.addState(type, "buffering", this.videoModel.getCurrentTime());

            if (isBufferingCompleted) {
                isBufferingCompleted = false;
            }

            started = true;

            self.debug.info("[BufferController]["+type+"] ### START");

            waitingForBuffer = true;

            startPlayback.call(self);
        },

        doSeek = function (time) {
            var self = this,
                currentTime = new Date();

            // Avoid identical successive seeks
            if ((seeking === true) && (seekTarget === time)) {
                // We are already seeking at the given time
                return;
            }

            this.debug.info("[BufferController]["+type+"] ### SEEK: " + time);

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
                function () {
                    // Reset segment list to avoid DashHandler dysfunctionning
                    currentRepresentation.segments = null;
                    //self.debug.log("[BufferController]["+type+"] ### SEEK: deferredFragmentBuffered = "+deferredFragmentBuffered+" Call start!");
                    doStart.call(self);
                }
            );
        },

        doStop = function () {
            //if (state === WAITING) return;
            if (!started) {
                return;
            }
            this.debug.info("[BufferController]["+type+"] ### STOP");

            //Reset htmlVideoState in order to update it after a pause or seek command in UpdateBufferState function
            htmlVideoState = -1;

            // Stop buffering process
            clearTimeout(bufferTimeout);
            started = false;
            waitingForBuffer = false;

            // Stop buffering process and cancel loaded request
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);

            this.fragmentController.abortRequestsForModel(fragmentModel);
        },


        getRepresentationForQuality = function (quality) {
            return availableRepresentations[quality];
        },

        onBytesLoadingStart = function(request) {
            this.debug.info("[BufferController]["+type+"] ### Load request ", (request.url !== null)?request.url:request.quality);
        },

        onBytesLoaded = function (request, response) {
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

            self.debug.log("[BufferController]["+type+"] ### Initialization loaded ", quality);

            self.fragmentController.process(initData).then(
                function (data) {
                    if (data !== null) {
                        // cache the initialization data to use it next time the quality has changed
                        initializationData[quality] = data;

                        // if this is the initialization data for current quality we need to push it to the buffer
                        if (quality === currentQuality) {
                            self.debug.info("[BufferController]["+type+"] ### Buffer initialization segment ", (request.url !== null)?request.url:request.quality);
                            //console.saveBinArray(data, type + "_init_" + request.quality + ".mp4");
                            appendToBuffer.call(self, data, request.quality).then(
                                function() {
                                    self.debug.log("[BufferController]["+type+"] ### Initialization segment buffered");
                                    // Load next media segment
                                    loadNextFragment.call(self);
                                }
                            );
                        }
                    } else {
                        self.debug.log("No " + type + " bytes to push.");
                        // ORANGE : For HLS Stream, init segment are pushed with media (@see HlsFragmentController)
                        loadNextFragment.call(self);
                    }
                }
            );
        },

        onMediaLoaded = function (request, response) {
            var self = this,
                currentRepresentation = getRepresentationForQuality.call(self, request.quality),
                eventStreamAdaption = this.manifestExt.getEventStreamForAdaptationSet(self.getData()),
                eventStreamRepresentation = this.manifestExt.getEventStreamForRepresentation(self.getData(),currentRepresentation);

            self.debug.log("[BufferController]["+type+"] ### Media loaded ", request.url);

            if (self.ChunkMissingState !== false) {
                self.ChunkMissingState = true;
            }

            if (!fragmentDuration && !isNaN(request.duration)) {
                fragmentDuration = request.duration;
            }

            // ORANGE: add request and representations in function parameters, used by MssFragmentController
            self.fragmentController.process(response.data, request, availableRepresentations).then(
                function (data) {
                    if (data !== null) {
                        if(eventStreamAdaption.length > 0 || eventStreamRepresentation.length > 0) {
                            handleInbandEvents.call(self,data,request,eventStreamAdaption,eventStreamRepresentation).then(
                                function(events) {
                                    self.eventController.addInbandEvents(events);
                                }
                            );
                        }

                        self.debug.info("[BufferController]["+type+"] ### Buffer segment from url ", request.url);
                        //console.saveBinArray(data, type + "_" + request.index + "_" + request.quality + ".mp4");
                        deleteInbandEvents.call(self,data).then(
                            function(data) {
                                appendToBuffer.call(self, data, request.quality, request.index).then(
                                    function() {
                                        self.debug.log("[BufferController]["+type+"] ### Media segment buffered");
                                        // Signal end of buffering process
                                        signalSegmentBuffered.call(self);
                                        // Check buffer level
                                        checkIfSufficientBuffer.call(self);
                                    }
                                );
                            }
                        );
                    } else {
                        self.debug.log("[BufferController]["+type+"] Error with segment data, no bytes to push");
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
                isInit = index === undefined,
                currentVideoTime = self.videoModel.getCurrentTime(),
                currentTime = new Date();

            //self.debug.log("Push (" + type + ") bytes: " + data.byteLength);

            if (playListTraceMetricsClosed === true /*&& state !== WAITING*/) {
                playListTraceMetricsClosed = false;
                playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, currentRepresentation.id, null, currentTime, currentVideoTime, null, 1.0, null);
            }

            if (!hasData()) return;

            hasEnoughSpaceToAppend.call(self).then(
                function() {
                    Q.when(deferredBuffersFlatten ? deferredBuffersFlatten.promise : true).then(
                        function() {
                            if (!hasData()) return;
                            self.debug.info("[BufferController]["+type+"] Buffering segment");
                            self.sourceBufferExt.append(buffer, data, appendSync).then(
                                    function (/*appended*/) {
                                        self.debug.info("[BufferController]["+type+"] Segment buffered");
                                        //self.debug.log("[BufferController]["+type+"] Data has been appended for quality = "+quality+" index = "+index);

                                        /*if (isAppendingRejectedData) {
                                            deferredRejectedDataAppend = null;
                                            rejectedBytes = null;
                                        }*/

                                        // index can be undefined only for init segments. In this case
                                        // change currentQuality to a quality of a new appended init segment.
                                        if (isInit) {
                                            currentQuality = quality;
                                        }

                                        isQuotaExceeded = false;

                                        // In case of live streams, remove outdated buffer parts and requests
                                        if (isDynamic) {
                                            removeBuffer.call(self, -1, self.videoModel.getCurrentTime() - minBufferTime).then(
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
                                        var data = {};
                                        data.currentTime = self.videoModel.getCurrentTime();

                                        self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_APPEND_SOURCEBUFFER, result.err.code+':'+result.err.message, data);
                                        self.debug.log("[BufferController]["+type+"] Buffer failed with quality = "+quality+" index = "+index);
                                        // if the append has failed because the buffer is full we should store the data
                                        // that has not been appended and stop request scheduling. We also need to store
                                        // the promise for this append because the next data can be appended only after
                                        // this promise is resolved.
                                        if(result.err.code === MediaPlayer.dependencies.ErrorHandler.prototype.DOM_ERR_QUOTA_EXCEEDED )
                                        {
                                                rejectedBytes = {data: data, quality: quality, index: index};
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

        debugBufferRange = function () {
            var ranges = null,
                i,
                len;

            if (this.debug.getLogToBrowserConsole()) {
                ranges = this.sourceBufferExt.getAllRanges(buffer);
                if ((ranges === null) || (ranges.length === 0)) {
                    return;
                }
                for (i = 0, len = ranges.length; i < len; i += 1) {
                    this.debug.info("[BufferController]["+type+"] ### Buffered " + type + " range [" + i + "]: " + ranges.start(i) + " - " + ranges.end(i) + " (" + this.getVideoModel().getCurrentTime() + ")");
                }
            }
        },

        handleInbandEvents = function(data,request,adaptionSetInbandEvents,representationInbandEvents) {
            var events = [],
                i = 0,
                identifier,
                size,
                expTwo = Math.pow(256,2),
                expThree = Math.pow(256,3),
                segmentStarttime = Math.max(isNaN(request.startTime) ? 0 : request.startTime,0),
                eventStreams = [],
                inbandEvents;

            inbandEventFound = false;
            /* Extract the possible schemeIdUri : If a DASH client detects an event message box with a scheme that is not defined in MPD, the client is expected to ignore it */
            inbandEvents = adaptionSetInbandEvents.concat(representationInbandEvents);
            for(var loop = 0; loop < inbandEvents.length; loop++) {
                eventStreams[inbandEvents[loop].schemeIdUri] = inbandEvents[loop];
            }
            while(i<data.length) {
                identifier = String.fromCharCode(data[i+4],data[i+5],data[i+6],data[i+7]); // box identifier
                size = data[i]*expThree + data[i+1]*expTwo + data[i+2]*256 + data[i+3]*1; // size of the box
                if( identifier === "moov" || identifier === "moof") {
                    break;
                } else if(identifier === "emsg") {
                    inbandEventFound = true;
                    var eventBox = ["","",0,0,0,0,""],
                        arrIndex = 0,
                        j = i+12; //fullbox header is 12 bytes, thats why we start at 12

                    while(j < size+i) {
                        /* == string terminates with 0, this indicates end of attribute == */
                        if(arrIndex === 0 || arrIndex === 1 || arrIndex === 6) {
                            if(data[j] !== 0) {
                                eventBox[arrIndex] += String.fromCharCode(data[j]);
                            } else {
                                arrIndex += 1;
                            }
                            j += 1;
                        } else {
                            eventBox[arrIndex] = data[j]*expThree + data[j+1]*expTwo + data[j+2]*256 + data[j+3]*1;
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
                        presentationTime = segmentStarttime*timescale+presentationTimeDelta;

                    if(eventStreams[schemeIdUri]) {
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

            if(!inbandEventFound) {
                return Q.when(data);
            }

            var length = data.length,
                i = 0,
                j = 0,
                identifier,
                size,
                expTwo = Math.pow(256,2),
                expThree = Math.pow(256,3),
                modData = new Uint8Array(data.length);


            while(i<length) {

                identifier = String.fromCharCode(data[i+4],data[i+5],data[i+6],data[i+7]);
                size = data[i]*expThree + data[i+1]*expTwo + data[i+2]*256 + data[i+3]*1;


                if(identifier !== "emsg" ) {
                    for(var l = i ; l < i + size; l++) {
                        modData[j] = data[l];
                        j += 1;
                    }
                }
                i += size;

            }

            return Q.when(modData.subarray(0,j));

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

        isRunning = function () {
            var self = this;

            if (started) {
                return true;
            }

            // If buffering process is running, then we interrupt it
            if (deferredFragmentBuffered !== null) {
                signalSegmentBuffered.call(self);
            }
            return false;
        },

        signalSegmentBuffered = function () {
            var self = this;

            if (deferredFragmentBuffered) {
                self.debug.info("[BufferController]["+type+"] ### signalSegmentBuffered (resolve deferredFragmentBuffered)");
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
            removeEnd = ((end !== undefined) && (end !== -1)) ? end: buffer.buffered.end(buffer.buffered.length -1 );

            if (removeEnd <= removeStart) {
                deferred.resolve(0);
                return deferred.promise;
            }

            self.debug.info("[BufferController][" + type + "] ### Remove from " + removeStart + " to " + removeEnd +  " (" + self.getVideoModel().getCurrentTime() + ")");

            // Wait for buffer update completed, since some data can have been started to pe pushed before calling this method
            self.sourceBufferExt.waitForUpdateEnd(buffer).then(self.sourceBufferExt.remove(buffer, removeStart, removeEnd, periodInfo.duration, mediaSource, appendSync)).then(
                function() {
                    // after the data has been removed from the buffer we should remove the requests from the list of
                    // the executed requests for which playback time is inside the time interval that has been removed from the buffer
                    self.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, removeEnd);
                    deferred.resolve(removeEnd - removeStart);
                }, function () {
                    self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_REMOVE_SOURCEBUFFER, "impossible to remove data from SourceBuffer");
                }
            );

            return deferred.promise;
        },

        onBytesError = function (e) {
            var msgError = type + ": Failed to load a request at startTime = "+e.startTime,
                data = {};

            //if request.status = 0, it's an aborted request : do not load chunk from another bitrate, do not send
            // error.
            if (e.status !== undefined && e.status === 0 && !isRunning.call(this)) {
                return;
            }

            //if it's the first download error, try to load the same segment for a the lowest quality...
            if(this.ChunkMissingState === false)
            {
                if (e.quality !== 0) {
                    currentRepresentation = getRepresentationForQuality.call(this, 0);
                    if (currentRepresentation !== undefined || currentRepresentation !== null) {
                       return loadNextFragment.call(this);
                    }
                }
            }

            this.debug.log(msgError);
            this.stallTime = e.startTime;
            this.ChunkMissingState = true;

            data.url = e.url;
            data.request = e;
            this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_CONTENT, type + ": Failed to load a request at startTime = "+e.startTime, data);
        },

        signalStreamComplete = function (/*request*/) {
            var self = this;

            self.debug.log("[BufferController]["+type+"] Stream is complete.");

            /*if (stalled) {
                setStalled.call(self, false);
            }*/

            isBufferingCompleted = true;
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);

            signalSegmentBuffered.call(self);

            doStop.call(self);

            self.system.notify("bufferingCompleted");
            //deferredStreamComplete.resolve(request);
        },

        loadInitialization = function () {
            var deferred = Q.defer(),
                self = this;

            // Check if initialization segment for current quality has not already been stored
            if (initializationData[currentQuality]) {
                self.debug.info("[BufferController]["+type+"] ### Buffer initialization segment, quality = ", currentQuality);
                appendToBuffer.call(this, initializationData[currentQuality], currentQuality).then(
                    function() {
                        self.debug.log("[BufferController]["+type+"] ### Initialization segment buffered");
                        // Load next media segment
                        loadNextFragment.call(self);
                    }
                );
                deferred.resolve(null);
            } else {
                // if we have not loaded the init segment for the current quality, do it
                this.indexHandler.getInitRequest(availableRepresentations[currentQuality]).then(
                    function (request) {
                        deferred.resolve(request);
                    }, function(e){
                        deferred.reject(e);
                    }
                );
            }

            return deferred.promise;
        },

        loadNextFragment = function () {
            var self = this;

            // Check if running state
            if (!isRunning.call(self)) {
                return;
            }

            // Get next segment time and check if already in buffer
            var time = seeking ? seekTarget : currentSegmentTime;
            var range = self.sourceBufferExt.getBufferRange(buffer, time);

            var segmentTime = range ? range.end : time;

            if ((currentSequenceNumber !== -1) && !seeking) {
                self.debug.log("[BufferController]["+type+"] loadNextFragment for sequence number: " + currentSequenceNumber);
                self.indexHandler.getNextSegmentRequestFromSN(currentRepresentation, currentSequenceNumber).then(onFragmentRequest.bind(self));
            } else {
                self.debug.log("[BufferController]["+type+"] loadNextFragment for time: " + segmentTime);
                self.indexHandler.getSegmentRequestForTime(currentRepresentation, segmentTime).then(onFragmentRequest.bind(self));
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
                self.indexHandler.getSegmentRequestForTime(currentRepresentation, segmentTime).then(onFragmentRequest.bind(self));
            }*/
        },

        onFragmentRequest = function (request) {
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
                    self.debug.log("[BufferController]["+type+"] new fragment request => already loaded or pending");
                    self.indexHandler.getNextSegmentRequest(currentRepresentation).then(onFragmentRequest.bind(self));
                } else {
                    // Store current segment time for next segment request
                    currentSegmentTime = request.startTime;

                    // Store current segment sequence number for next segment request (HLS use case)
                    if (request.sequenceNumber) {
                        currentSequenceNumber = request.sequenceNumber;
                    }

                    // Download the segment
                    self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, null/*signalStreamComplete*/).then(
                        function() {
                            sendRequest.call(self);
                    });
                }
            }
            else {
                //impossible to find a request for the loadNextFragment call
                //the end of the createdSegment list has been reached, recall checkIfSufficientBuffer to update the list and get the next segment
                self.debug.log("[BufferController]["+type+"] loadNextFragment failed");

                // HLS use case => download playlist for new representation
                if ((manifest.name === "M3U") && isDynamic) {
                    updatePlayListForRepresentation.call(self, currentQuality).then(
                        function () {
                            currentRepresentation = getRepresentationForQuality.call(self, currentQuality);
                            updateCheckBufferTimeout.call(self,0);
                        }
                    );
                }
                else {
                    updateCheckBufferTimeout.call(self,0);
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

        getWorkingTime = function () {
            var time = -1;

            time = this.videoModel.getCurrentTime();

            this.debug.log("Working time is video time: " + time);

            return time;
        },

        getLiveEdgeTime = function() {

            var self = this,
                deferred = Q.defer();

            // Get live edge time from manifest as the last segment time
            var liveEdgeTime = currentRepresentation.segmentAvailabilityRange.end;
            self.debug.log("[BufferController]["+type+"] Manifest live edge = " + liveEdgeTime);

            // Step back from a found live edge time to be able to buffer some data
            var startTime = Math.max((liveEdgeTime - minBufferTime), currentRepresentation.segmentAvailabilityRange.start);

            // Get the request corresponding to the start time
            this.indexHandler.getSegmentRequestForTime(currentRepresentation, startTime).then(
                function(request) {
                    // Set live edge to be the start time of the founded segment
                    periodInfo.liveEdge = request.startTime;
                    self.debug.log("[BufferController]["+type+"] Live edge = " + periodInfo.liveEdge);

                    deferred.resolve(periodInfo.liveEdge);
                    //doSeek(periodInfo.liveEdge);
                    //seeking = true;
                    //seekTarget = periodInfo.liveEdge;
                }
            );

            return deferred.promise;
        },

        updateBufferLevel = function() {
            if (!hasData()) return;

            var self = this,
                currentTime = getWorkingTime.call(self);

            bufferLevel = self.sourceBufferExt.getBufferLength(buffer, currentTime);
            self.debug.log("[BufferController]["+type+"] Buffer level = " + bufferLevel + " (time:" + currentTime + ")");
            self.metricsModel.addBufferLevel(type, new Date(), bufferLevel);
        },

        checkIfSufficientBuffer = function () {
            var self = this;

            // Check if running state
            if (!isRunning.call(self)) {
                return;
            }

            self.debug.log("[BufferController]["+type+"] Check buffer...");

            updateBufferLevel.call(self);

            // videoModel in stalled mode
            if (stalled) {
                if (bufferLevel > minBufferTimeAtStartup) {
                    setStalled.call(self, false);
                    // Notify ABR controller we are no more buffering before playing
                    this.abrController.setPlayerState("playing");
                }
            }

            var timeToEnd = getTimeToEnd.call(self);
            self.debug.log("[BufferController]["+type+"] time to end = " + timeToEnd);

            if ((bufferLevel < minBufferTime) &&
                ((minBufferTime < timeToEnd) || (minBufferTime >= timeToEnd && !isBufferingCompleted))) {
                // Buffer needs to be filled
                bufferFragment.call(self);
                lastBufferLevel = bufferLevel;
            } else {
                // Determine the timeout delay before checking again the buffer
                var delay = bufferLevel - minBufferTime;
                self.debug.log("[BufferController]["+type+"] Check buffer in " + delay + " seconds");
                updateCheckBufferTimeout.call(self,delay);
            }
        },

        updateCheckBufferTimeout = function (delay) {
            var self = this;

            clearTimeout(bufferTimeout);
            bufferTimeout = setTimeout(function () {
                checkIfSufficientBuffer.call(self);
            }, Math.max((delay * 1000), 2000));
        },

        bufferFragment = function() {
            var self = this,
                now = new Date(),
                currentVideoTime = self.videoModel.getCurrentTime(),
                manifest = self.manifestModel.getValue(),
                quality,
                playlistUpdated = null;

            deferredFragmentBuffered = Q.defer();

            // Check if data has changed
            doUpdateData.call(self).then(
                function (dataUpdated) {
                    // If data has been changed, then load initialization segment
                    var loadInit = dataUpdated;

                    // Get current quality
                    self.abrController.getPlaybackQuality(type, data).then(
                        function (result) {

                            quality = result.quality;

                            // Get corresponding representation
                            currentRepresentation = getRepresentationForQuality.call(self, quality);

                            // Quality changed?
                            if (quality !== currentQuality) {
                                self.debug.log("[BufferController]["+type+"] Quality changed: " + quality);
                                currentQuality = quality;

                                // Load initialization segment
                                loadInit = true;

                                // Reset segment list
                                currentRepresentation.segments = null;

                                clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
                                self.metricsModel.addRepresentationSwitch(type, now, currentVideoTime, currentRepresentation.id);

                                // HLS use case => download playlist for new representation
                                if ((manifest.name === "M3U") && (isDynamic || availableRepresentations[currentQuality].initialization === null)) {
                                    playlistUpdated = Q.defer();
                                    updatePlayListForRepresentation.call(self, currentQuality).then(
                                        function () {
                                            currentRepresentation = getRepresentationForQuality.call(self, quality);
                                            playlistUpdated.resolve();
                                        }
                                    );
                                }
                            }

                            Q.when(playlistUpdated ? playlistUpdated.promise : true).then(
                                function () {
                                    if (loadInit === true) {
                                        // Load initialization segment request
                                        loadInitialization.call(self).then(
                                            function (request) {
                                                if (request !== null) {
                                                    self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, null/*signalStreamComplete*/).then(
                                                        function() {
                                                            sendRequest.call(self);
                                                        }
                                                    );
                                                }
                                            }, function(e) {
                                                self.debug.error("[BufferController]["+type+"] Problem during init segment generation \"" + e.message+"\"");
                                                self.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_CODEC, e.name+' : '+e.message,self.manifestModel.getValue());
                                            }
                                        );
                                    } else {
                                        // Load next fragment
                                        // Notes: 1 - Next fragment is download in // with initialization segment
                                        //        2 - Buffer level is checked once next fragment data has been pushed into buffer (@see checkIfSufficientBuffer())
                                        loadNextFragment.call(self);
                                    }
                                }
                            );
                        }
                    );
                }
            );
        },

        updatePlayListForRepresentation = function (repIndex) {
            var self = this,
                deferred = Q.defer(),
                manifest = self.manifestModel.getValue(),
                representation;

            self.manifestExt.getDataIndex(data, manifest, periodInfo.index).then(
                function (idx) {
                    representation = manifest.Period_asArray[periodInfo.index].AdaptationSet_asArray[idx].Representation_asArray[repIndex];
                    self.parser.hlsParser.updatePlaylist(representation).then(
                        function () {
                            updateRepresentations.call(self, data, periodInfo).then(
                                function (representations) {
                                    availableRepresentations = representations;
                                    deferred.resolve();
                                }
                            );
                        }
                    );
                }
            );
            return deferred.promise;
        },

        updateRepresentations = function (data, periodInfo) {
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

            self.debug.log("[BufferController]["+type+"] updateData");

            // Reset stored initialization segments
            initializationData = [];

            // Update representations
            updateRepresentations.call(self, data, periodInfo).then(
                function (representations) {
                    availableRepresentations = representations;

                    // Retrieve the current representation according to the current quality
                    //currentRepresentation = getRepresentationForQuality.call(self, result.quality);

                    self.bufferExt.updateData(data, type);
                    dataChanged = false;

                    deferred.resolve(true);
                }
            );

            return deferred.promise;
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
        scheduleWhilePaused: undefined,
        eventController : undefined,
        config: undefined,
        BUFFERING : 0,
        PLAYING : 1,
        stallTime : null,
        ChunkMissingState : false,

        initialize: function (type, newPeriodInfo, newData, buffer, videoModel, scheduler, fragmentController, source, eventController) {
            var self = this,
                manifest = self.manifestModel.getValue();

            self.debug.log("[BufferController]["+type+"] Initialize");

            // PATCH for Espial browser which implements SourceBuffer appending/removing synchronoulsy
            if (navigator.userAgent.indexOf("Espial") !== -1) {
                self.debug.log("[BufferController]["+type+"] Espial browser = sync append");
                appendSync = true;
            }

            isDynamic = self.manifestExt.getIsDynamic(manifest);
            self.setMediaSource(source);
            self.setVideoModel(videoModel);
            self.setType(type);
            self.setBuffer(buffer);
            self.setScheduler(scheduler);
            self.setFragmentController(fragmentController);
            self.setEventController(eventController);

            minBufferTime = self.config.getParamFor(type, "BufferController.minBufferTime", "number", -1);
            minBufferTimeAtStartup = self.config.getParamFor(type, "BufferController.minBufferTimeForPlaying", "number", 2);

            data = newData;
            periodInfo = newPeriodInfo;
            dataChanged = true;

            doUpdateData.call(this).then(
                function () {
                    // Retreive the representation of initial quality to enable some parameters initialization
                    // (@see getLiveEdgeTime() for example)
                    self.abrController.getPlaybackQuality(type, data).then(
                        function (result) {
                            initialQuality = result.quality;

                            currentRepresentation = getRepresentationForQuality.call(self, result.quality);

                            fragmentDuration = currentRepresentation.segmentDuration;

                            self.indexHandler.setIsDynamic(isDynamic);
                            self.bufferExt.decideBufferLength(manifest.minBufferTime, periodInfo.duration, waitingForBuffer).then(
                                function (time) {
                                    minBufferTime = (minBufferTime === -1) ? time : minBufferTime;
                                }
                            );

                            if (isDynamic) {
                                if (type === "video") {
                                    self.indexHandler.updateSegmentList(currentRepresentation).then(
                                        function() {
                                            getLiveEdgeTime.call(self).then(
                                                function(time) {
                                                    //self.seek(time);
                                                    self.system.notify("liveEdgeFound", time);
                                                    //ORANGE : used to test Live chunk download failure
                                                    //testTimeLostChunk = time+20;
                                                }
                                            );
                                        }
                                    );
                                }
                            } else {
                                self.indexHandler.getCurrentTime(currentRepresentation).then(
                                    function(time) {
                                        self.seek(time);
                                    }
                                );
                            }
                        }
                    );
                }
            );

            ready = true;
        },

        getType: function () {
            return type;
        },

        setType: function (value) {
            type = value;

            if (this.indexHandler !== undefined) {
                this.indexHandler.setType(value);
            }
        },

        getPeriodInfo: function () {
            return periodInfo;
        },

        getVideoModel: function () {
            return this.videoModel;
        },

        setVideoModel: function (value) {
            this.videoModel = value;
        },

        getScheduler: function () {
            return this.requestScheduler;
        },

        setScheduler: function (value) {
            this.requestScheduler = value;
        },

        getFragmentController: function () {
            return this.fragmentController;
        },

        setFragmentController: function (value) {
            this.fragmentController = value;
            fragmentModel = this.fragmentController.attachBufferController(this);
        },

        setEventController: function(value) {
            this.eventController = value;
        },

        getAutoSwitchBitrate : function () {
            var self = this;
            return self.abrController.getAutoSwitchBitrate();
        },

        setAutoSwitchBitrate : function (value) {
            this.abrController.setAutoSwitchBitrate(value);
        },

        getData: function () {
            return data;
        },

        updateData: function(newData, newPeriodInfo) {
            var self = this,
                deferred = Q.defer(),
                languageChanged = (data && (data.lang !== newData.lang)) ? true : false;

            self.debug.log("[BufferController]["+type+"] ### Update data");

            // Set the new data
            data = newData;
            periodInfo = newPeriodInfo;
            dataChanged = true;

            // If data language changed (audio or text)
            if (languageChanged) {
                self.debug.log("[BufferController]["+type+"] ### Language changed");

                // => Cancel current requests in order to perform the language switch as soon as possible
                self.fragmentController.cancelPendingRequestsForModel(fragmentModel);
                self.fragmentController.abortRequestsForModel(fragmentModel);

                // => Remove past buffered from previous language
                var currentTime = self.getVideoModel().getCurrentTime();
                var seekTime = currentTime + 3;
                removeBuffer.call(self, -1, currentTime).then(
                    function() {
                        // => Remove some already buffered in order to perform the language switch before waiting minBufferTime
                        removeBuffer.call(self, seekTime).then(
                            function() {
                                debugBufferRange.call(self);
                                // => restart
                                doSeek.call(self, seekTime);
                                deferred.resolve();
                            }
                        );
                    }
                );
            } else {
                deferred.resolve();
            }

            return deferred.promise;
        },

        getCurrentRepresentation: function() {
            return currentRepresentation;
        },

        getBuffer: function () {
            return buffer;
        },

        setBuffer: function (value) {
            buffer = value;
        },

        getMinBufferTime: function () {
            return minBufferTime;
        },

        setMinBufferTime: function (value) {
            minBufferTime = value;
        },

        setMediaSource: function(value) {
            mediaSource = value;
        },

        isReady: function() {
            return state === READY;
        },

        isBufferingCompleted : function() {
            return isBufferingCompleted;
        },

        clearMetrics: function () {
            if (type === null || type === "") {
                return;
            }

            this.metricsModel.clearCurrentMetricsForType(type);
        },

        updateManifest: function (){
            this.system.notify("reloadManifest");
        },

        updateBufferState: function() {
            //test to detect stalled state, be sure to not to be in seeking state
            if (bufferLevel <= 0 && htmlVideoState !== this.BUFFERING && this.videoModel.isSeeking()!== true) {
                htmlVideoState = this.BUFFERING;
                this.debug.log("[BufferController]["+type+"] BUFFERING - " + this.videoModel.getCurrentTime());
                this.metricsModel.addState(type, "buffering", this.videoModel.getCurrentTime());
                if (this.stallTime !== null && this.ChunkMissingState === true) {
                    if (isDynamic) {
                        this.stallTime = null;
                        setTimeout(this.updateManifest.bind(this),currentRepresentation.segments[currentRepresentation.segments.length-1].duration*1000);
                    }
                    else {
                        //the stall state comes from a chunk download failure
                        //seek to the next fragment
                        doStop.call(this);
                        var seekValue = this.stallTime+currentRepresentation.segments[currentRepresentation.segments.length-1].duration;
                        doSeek.call(this, seekValue);
                        this.videoModel.setCurrentTime(seekValue);
                        this.stallTime = null;
                    }
                }
            }
            else  if(bufferLevel > 0 && htmlVideoState !== this.PLAYING){
                htmlVideoState = this.PLAYING;
                this.debug.log("[BufferController]["+type+"] PLAYING - " + this.videoModel.getCurrentTime());
                this.metricsModel.addState(type, "playing", this.videoModel.getCurrentTime());
            }

            // if the buffer controller is stopped and the buffer is full we should try to clear the buffer
            // before that we should make sure that we will have enough space to append the data, so we wait
            // until the video time moves forward for a value greater than rejected data duration since the last reject event or since the last seek.
            if (isQuotaExceeded && rejectedBytes && !appendingRejectedData) {
                appendingRejectedData = true;
                //try to append the data that was previosly rejected
                appendToBuffer.call(this, rejectedBytes.data, rejectedBytes.quality, rejectedBytes.index).then(
                    function(){
                        appendingRejectedData = false;
                    }
                );
            } else {
                updateBufferLevel.call(this);
            }
        },

        updateStalledState: function() {
            stalled = this.videoModel.isStalled();
            //checkIfSufficientBuffer.call(this);
        },

        reset: function(errored) {
            var self = this,
                cancel = function cancelDeferred(d) {
                    if (d) {
                        d.reject();
                        d = null;
                    }
                };

            doStop.call(self);

            cancel(deferredRejectedDataAppend);
            cancel(deferredBuffersFlatten);
            cancel(deferredFragmentBuffered);
            cancel(deferredStreamComplete);
            deferredStreamComplete = Q.defer();

            self.clearMetrics();
            self.fragmentController.abortRequestsForModel(fragmentModel);
            self.fragmentController.detachBufferController(fragmentModel);
            fragmentModel = null;
            initializationData = [];
            initialPlayback = true;
            isQuotaExceeded = false;
            rejectedBytes = null;
            appendingRejectedData = false;

            if (!errored) {
                self.sourceBufferExt.abort(mediaSource, buffer);
                self.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }
            data = null;
            buffer = null;
        },

        start: doStart,
        seek: doSeek,
        stop: doStop
    };
};

MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
};
