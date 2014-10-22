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
 Custom.models.CustomMetricsModel = function () {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.models.MetricsModel);

    rslt.addRepresentationBoundaries = function (streamType, t, min, max) {
        var vo = new Custom.vo.metrics.RepresentationBoundaries();

        vo.t = t;
        vo.min = min;
        vo.max = max;

        this.parent.getMetricsFor(streamType).RepBoundariesList.push(vo);

        this.parent.metricAdded(streamType, "RepresentationBoundaries", vo);
        return vo;
    };

    rslt.addBandwidthBoundaries = function (streamType, t, min, max) {
        var vo = new Custom.vo.metrics.BandwidthBoundaries();

        vo.t = t;
        vo.min = min;
        vo.max = max;

        this.parent.getMetricsFor(streamType).BandwidthBoundariesList.push(vo);

        this.parent.metricAdded(streamType, "BandwidthBoundaries", vo);
        return vo;
    };

    rslt.addBufferLevel = function (streamType, t, level) {
        var vo = new MediaPlayer.vo.metrics.BufferLevel();

        vo.t = t;
        vo.level = level;

        // ORANGE unnecessary metrics, when builded, DEBUG is false, saving the whole list is useless
        if (DEBUG) {
            this.parent.getMetricsFor(streamType).BufferLevel.push(vo);
        } else {
            this.parent.getMetricsFor(streamType).BufferLevel = [vo];
        }

        this.parent.metricAdded(streamType, "BufferLevel", vo);
        return vo;
    };

    rslt.addError = function (streamType, code, message) {
        var vo = new Custom.vo.metrics.Error();

        vo.code = code;
        vo.message = message;
    
        this.parent.metricAdded(streamType, "Error", vo);
        return vo;
    };

    rslt.addState = function (streamType, currentState, position, reason) {
        var vo = new Custom.vo.metrics.State();

        vo.current = currentState;
        vo.position = position;
        vo.reason = reason;
        
        this.parent.metricAdded(streamType, "State", vo);
        return vo;
    };

    rslt.addSession = function (streamType,url,loop, endTime, playerType) {
        var vo = new Custom.vo.metrics.Session();

        vo.uri = url;
        if (loop) {
            vo.loopMode = 1;
        }else {
            vo.loopMode = 0;
        }
        vo.endTime = endTime;
        vo.playerType = playerType;

        this.parent.metricAdded(streamType, "Session", vo);
        return vo;
    };

    rslt.addCondition = function (streamType,isFullScreen,videoWidth, videoHeight, droppedFrames,fps) {
        var vo = new Custom.vo.metrics.Condition();

        vo.isFullScreen = isFullScreen;
        vo.windowSize = videoWidth+"x"+videoHeight;
        vo.fps = fps;
        vo.droppedFrames = droppedFrames;

        this.parent.metricAdded(streamType, "Condition", vo);
        return vo;
    };

    rslt.addMetaData = function () {
        this.parent.metricAdded(null, "ManifestReady", null);
    };

    rslt.clearAllCurrentMetrics = function () {
        var self = this,
            streamMetrics = this.parent.streamMetrics;

        for (var prop in streamMetrics) {
            if (streamMetrics.hasOwnProperty(prop)) {
                delete streamMetrics[prop];
            }
        }
        
        this.metricsChanged.call(self);
    };

    return rslt;
};

Custom.models.CustomMetricsModel.prototype = {
    constructor: Custom.models.CustomMetricsModel
};
