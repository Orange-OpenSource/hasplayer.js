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
MediaPlayer.dependencies.FragmentInfoController = function() {
    "use strict";
    var READY = "READY",
        state = READY,
        ready = false,
        started = false,
        fragmentModel = null,
        fragmentDuration = 0,
        type,
        bufferTimeout,
        _fragmentInfoTime,
        _bufferController,
        // ORANGE: segment downlaod failed recovery
        SEGMENT_DOWNLOAD_ERROR_MAX = 3,
        segmentDownloadFailed = false,
        segmentDownloadErrorCount = 0,
        reloadTimeout = null,

        segmentDuration = NaN,

        sendRequest = function() {

            // Check if running state
            if (!isRunning.call(this)) {
                return;
            }

            if (fragmentModel !== null) {
                this.fragmentController.onBufferControllerStateChange();
            }
        },

        startPlayback = function() {
            if (!ready || !started) {
                return;
            }

            this.debug.info("[FragmentInfoController][" + type + "] startPlayback");

            // Start buffering process
            bufferFragmentInfo.call(this);
        },

        doStart = function() {
            var self = this;

            if (started === true) {
                return;
            }

            started = true;

            self.debug.info("[FragmentInfoController][" + type + "] START");

            startPlayback.call(self);
        },

        doStop = function() {
            if (!started) {
                return;
            }
            this.debug.info("[FragmentInfoController][" + type + "] STOP");

            // Stop buffering process
            clearTimeout(bufferTimeout);
            started = false;

            // Stop reload timeout
            clearTimeout(reloadTimeout);
            reloadTimeout = null;

            this.fragmentController.abortRequestsForModel(fragmentModel);
        },

        onBytesLoadingStart = function(request) {
            this.debug.info("[FragmentInfoController][" + type + "] Load request ", (request.url !== null) ? request.url : request.quality);
        },

        onBytesLoaded = function(request, response) {
            var data;

            segmentDuration = request.duration;

            // Reset segment download error status
            segmentDownloadFailed = false;
            segmentDownloadErrorCount = 0;

            this.debug.log("[FragmentInfoController][" + type + "] Media loaded ", request.url);

            if (!fragmentDuration && !isNaN(request.duration)) {
                fragmentDuration = request.duration;
            }

            // ORANGE: add request and representations in function parameters, used by MssFragmentController
            data = this.fragmentController.process(response.data, request, _bufferController.getAvailableRepresentations());
            if (data && data.error) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.INTERNAL_ERROR, "Internal error while processing fragment info segment", data.message);
            } else {
                this.debug.info("[FragmentInfoController][" + type + "] Buffer segment from url ", request.url);

                delayLoadNextFragmentInfo.call(this, segmentDuration);
            }
        },

        isRunning = function() {
            return started;
        },

        onBytesError = function(e) {
            if (!isRunning.call(this)) {
                return;
            }

            // Abandonned request => load segment at lowest quality
            if (e.aborted) {
                bufferFragmentInfo.call(this);
                return;
            }

            // Segment download failed
            segmentDownloadErrorCount += 1;

            // => If failed SEGMENT_DOWNLOAD_ERROR_MAX times, then raise a warning
            // => Else raise a warning and try to reload session
            if (segmentDownloadErrorCount === SEGMENT_DOWNLOAD_ERROR_MAX) {
                this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_CONTENT,
                    "Failed to download fragmentInfo segment", {
                        url: e.url,
                        status: e.status
                    });
            } else {
                this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_CONTENT,
                    "Failed to download fragmentInfo segment", {
                        url: e.url,
                        status: e.status
                    });
            }
        },

        onFragmentRequest = function(request) {
            var self = this;

            // Check if current request signals end of stream
            if ((request !== null) && (request.action === request.ACTION_COMPLETE)) {
                doStop.call(self);
                return;
            }

            if (request !== null) {
                _fragmentInfoTime = request.startTime + request.duration;

                request = _bufferController.getIndexHandler().getFragmentInfoRequest(request);

                // Download the fragment info segment
                self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, null);
                sendRequest.call(self);
            } else {
                // No more fragment in current list
                self.debug.log("[FragmentInfoController][" + type + "] bufferFragmentInfo failed");
            }
        },

        delayLoadNextFragmentInfo = function(delay) {
            var self = this,
                delayMs = Math.max((delay * 1000), 2000);

            self.debug.log("[FragmentInfoController][" + type + "] Check buffer delta = " + delayMs + " ms");

            clearTimeout(bufferTimeout);
            bufferTimeout = setTimeout(function() {
                bufferTimeout = null;
                bufferFragmentInfo.call(self);
            }, delayMs);
        },

        bufferFragmentInfo = function() {
            var self = this,
                segmentTime;

            // Check if running state
            if (!isRunning.call(self)) {
                return;
            }

            self.debug.log("[FragmentInfoController][" + type + "] Start buffering process...");

            // Get next segment time
            segmentTime = _fragmentInfoTime;

            self.debug.log("[FragmentInfoController][" + type + "] loadNextFragment for time: " + segmentTime);

            _bufferController.getIndexHandler().getSegmentRequestForTime(_bufferController.getCurrentRepresentation(), segmentTime).then(onFragmentRequest.bind(self));
        };

    return {
        sourceBufferExt: undefined,
        abrController: undefined,
        debug: undefined,
        system: undefined,
        errHandler: undefined,
        abrRulesCollection: undefined,

        initialize: function(type, fragmentController, bufferController) {
            var self = this,
                ranges = null;

            self.debug.log("[FragmentInfoController][" + type + "] Initialize");

            _bufferController = bufferController;

            ranges = self.sourceBufferExt.getAllRanges(_bufferController.getBuffer());

            if (ranges.length > 0) {
                _fragmentInfoTime = ranges.end(ranges.length - 1);
            }

            self.setType(type);
            self.setFragmentController(fragmentController);

            ready = true;

            self.start();
        },

        setType: function(value) {
            type = value;
        },

        isReady: function() {
            return state === READY;
        },

        setFragmentController: function(value) {
            if (value) {
                this.fragmentController = value;
                fragmentModel = this.fragmentController.attachBufferController(this);
                fragmentModel.setType(type);
            }
        },

        reset: function() {
            var self = this;

            doStop.call(self);

            if (fragmentModel) {
                self.fragmentController.abortRequestsForModel(fragmentModel);
                self.fragmentController.detachBufferController(fragmentModel);
                fragmentModel = null;
            }

            return Q.when(null);
        },

        start: doStart,
        stop: doStop
    };
};

MediaPlayer.dependencies.FragmentInfoController.prototype = {
    constructor: MediaPlayer.dependencies.FragmentInfoController
};