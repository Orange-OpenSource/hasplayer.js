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
Mss.dependencies.MssFragmentInfoController = function() {
    "use strict";
    var _ready = false,
        _started = false,
        _fragmentController = null,
        _fragmentModel = null,
        _type,
        _bufferController,
        _startTime = null,
        _startFragmentTime = null,
        _loadTimeout,
        
        initialize = function(type, fragmentController, bufferController) {
            
            this.debug.log("[MssFragmentInfoController][" + type + "] Initialize");

            _bufferController = bufferController;
            _type = type;

            _fragmentController = fragmentController;
            _fragmentModel = _fragmentController.attachBufferController(this);
            _fragmentModel.setType(type);
        
            _ready = true;
        },

        reset = function() {

            stop.call(this);

            if (_fragmentModel) {
                _fragmentController.abortRequestsForModel(_fragmentModel);
                _fragmentController.detachBufferController(_fragmentModel);
                _fragmentModel = null;
            }

            return Q.when(null);
        },

        start = function(delay) {
            if (!_ready || _started) {
                return;
            }

            this.debug.info("[MssFragmentInfoController][" + _type + "] START");
            _started = true;
            _startTime = new Date().getTime() + delay * 1000;

            delayLoadNextFragmentInfo.call(this, delay);
        },

        stop = function() {
            if (!_started) {
                return;
            }

            this.debug.info("[MssFragmentInfoController][" + _type + "] STOP");

            // Abort current segment download            
            _fragmentController.abortRequestsForModel(_fragmentModel);
            
            // Stop process
            clearTimeout(_loadTimeout);
            _started = false;
        },

        loadNextFragmentInfo = function() {
            if (!_started) {
                return;
            }

            var adaptation = _bufferController.getData(),
                segments = adaptation.SegmentTemplate.SegmentTimeline.S_asArray,
                segment = segments[segments.length - 1],
                representation = adaptation.Representation_asArray[0],
                request;

            this.debug.log("[MssFragmentInfoController][" + _type + "] Load next fragment for time: " + (segment.t / adaptation.SegmentTemplate.timescale));

            request = getSegmentRequest(adaptation, representation, segment);
            requestFragment.call(this, request);
        },

        getSegmentRequest = function(adaptation, representation, segment) {
            var timescale = adaptation.SegmentTemplate.timescale,
                request = new MediaPlayer.vo.SegmentRequest();

            request.action = "download";
            request.startTime = segment.t / timescale;
            request.streamType = _type;
            request.type = "FragmentInfo Segment";
            request.duration = segment.d / timescale;
            request.timescale = timescale;
            request.quality = representation.quality;
            request.url = adaptation.BaseURL + adaptation.SegmentTemplate.media;
            request.url = request.url.replace('$Bandwidth$', representation.bandwidth);
            request.url = request.url.replace('$Time$', segment.tManifest ? segment.tManifest : segment.t);
            request.url = request.url.replace('/Fragments(', '/FragmentInfo(');

            return request;
        },
        
        requestFragment = function(request) {

            if (_fragmentController.isFragmentLoadedOrPending(this, request)) {
                // We may have reached end of timeline in case of start-over streams
                this.debug.log("[MssFragmentInfoController][" + _type + "] No more fragments");
                return;
            }

            this.debug.log("[MssFragmentInfoController][" + _type + "] Request fragment info " + request.url);
            _fragmentController.prepareFragmentForLoading(this, request, onBytesLoadingStart, onBytesLoaded, onBytesError, null);
            _fragmentController.onBufferControllerStateChange();
        },

        onBytesLoadingStart = function(request) {
            this.debug.info("[MssFragmentInfoController][" + _type + "] Load request ", (request.url !== null) ? request.url : request.quality);
        },

        onBytesLoaded = function(request, response) {
            var self = this,
                representation = _bufferController.getAvailableRepresentations()[0],
                deltaTime,
                deltaTimestamp;

            this.debug.log("[MssFragmentInfoController][" + _type + "] FragmentInfo loaded ", request.url);

            if (!_startFragmentTime) {
                _startFragmentTime = request.startTime;
            }

            try {
                _fragmentController.process(response.data, request, representation).then(function(/*data*/) {
                    deltaTime = (new Date().getTime() - _startTime) / 1000;
                    deltaTimestamp = request.startTime + request.duration - _startFragmentTime;
                    delayLoadNextFragmentInfo.call(self, Math.max(0, (deltaTimestamp - deltaTime)));
                });
            } catch (e) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.INTERNAL_ERROR, "Internal error while processing fragment info segment", e.message);
            }
        },

        onBytesError = function(e) {
            if (_started) {
                return;
            }

            this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_CONTENT,
                "Failed to download fragmentInfo segment", {
                    url: e.url,
                    status: e.status
                }
            );
        },

        delayLoadNextFragmentInfo = function(delay) {
            var self = this;

            this.debug.log("[MssFragmentInfoController][" + _type + "] Load next fragment in " + delay + " s.");

            clearTimeout(_loadTimeout);
            _loadTimeout = setTimeout(function() {
                _loadTimeout = null;
                loadNextFragmentInfo.call(self);
            }, delay * 1000);
        };

    return {
        debug: undefined,
        system: undefined,
        errHandler: undefined,

        initialize: initialize,
        reset: reset,
        start: start,
        stop: stop,

        isReady: function() {
            return _ready;
        },
    };
};

Mss.dependencies.MssFragmentInfoController.prototype = {
    constructor: Mss.dependencies.MssFragmentInfoController
};