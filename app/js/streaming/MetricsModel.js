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
 MediaPlayer.models.MetricsModel = function () {
    "use strict";

    return {
        system : undefined,
        eventBus: undefined,
        streamMetrics: {},
        metricsChanged: function () {
            this.eventBus.dispatchEvent({
                type: "metricsChanged",
                data: {}
            });
        },

        metricChanged: function (streamType) {
            this.eventBus.dispatchEvent({
                type: "metricChanged",
                data: {stream: streamType}
            });
            this.metricsChanged();
        },

        metricUpdated: function (streamType, metricType, vo) {
            this.eventBus.dispatchEvent({
                type: "metricUpdated",
                data: {stream: streamType, metric: metricType, value: vo}
            });
            this.metricChanged(streamType);
        },

        metricAdded: function (streamType, metricType, vo) {
            this.eventBus.dispatchEvent({
                type: "metricAdded",
                data: {stream: streamType, metric: metricType, value: vo}
            });
            this.metricChanged(streamType);
        },

        clearCurrentMetricsForType: function (type) {
            delete this.streamMetrics[type];
            this.metricChanged(type);
        },

        clearAllCurrentMetrics: function () {
            var self = this;

            for (var prop in this.streamMetrics) {
                if (this.streamMetrics.hasOwnProperty(prop)) {
                    delete this.streamMetrics[prop];
                }
            }

            this.streamMetrics = {};
            this.metricsChanged.call(self);
        },

        getReadOnlyMetricsFor: function(type) {
            if (this.streamMetrics.hasOwnProperty(type)) {
                return this.streamMetrics[type];
            }

            return null;
        },

        getMetricsFor: function(type) {
            var metrics;

            if (this.streamMetrics.hasOwnProperty(type)) {
                metrics = this.streamMetrics[type];
            } else {
                metrics = this.system.getObject("metrics");
                this.streamMetrics[type] = metrics;
            }

            return metrics;
        },

        addTcpConnection: function (streamType, tcpid, dest, topen, tclose, tconnect) {
            var vo = new MediaPlayer.vo.metrics.TCPConnection();

            vo.tcpid = tcpid;
            vo.dest = dest;
            vo.topen = topen;
            vo.tclose = tclose;
            vo.tconnect = tconnect;

            this.getMetricsFor(streamType).TcpList.push(vo);

            this.metricAdded(streamType, "TcpConnection", vo);
            return vo;
        },

        // ORANGE: add request quality
        addHttpRequest: function (streamType, tcpid, type, url, actualurl, range, trequest, tresponse, tfinish, responsecode, interval, mediaduration, startTime, quality) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest();

            vo.stream = streamType;
            vo.tcpid = tcpid;
            vo.type = type;
            vo.url = url;
            vo.actualurl = actualurl;
            vo.range = range;
            vo.trequest = trequest;
            vo.tresponse = tresponse;
            vo.tfinish = tfinish;
            vo.responsecode = responsecode;
            vo.interval = interval;
            vo.mediaduration = mediaduration;
            // ORANGE: add request media start time and quality
            vo.startTime = startTime;
            vo.quality = quality;

            this.getMetricsFor(streamType).HttpList.push(vo);

            // ORANGE: to avoid memory leak
            if(this.getMetricsFor(streamType).HttpList.length > 10) {
                this.getMetricsFor(streamType).HttpList.shift();
            }

            this.metricAdded(streamType, "HttpRequest", vo);
            return vo;
        },

        appendHttpTrace: function (httpRequest, s, d, b) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest.Trace();

            vo.s = s;
            vo.d = d;
            vo.b = b;

            httpRequest.trace.push(vo);

            this.metricUpdated(httpRequest.stream, "HttpRequestTrace", httpRequest);
            return vo;
        },

        addRepresentationBoundaries: function (streamType, t, min, max) {
            var vo = new MediaPlayer.vo.metrics.RepresentationBoundaries();

            vo.t = t;
            vo.min = min;
            vo.max = max;

            this.getMetricsFor(streamType).RepBoundariesList.push(vo);

            this.metricAdded(streamType, "RepresentationBoundaries", vo);
            return vo;
        },

        addBandwidthBoundaries: function (streamType, t, min, max) {
            var vo = new MediaPlayer.vo.metrics.BandwidthBoundaries();

            vo.t = t;
            vo.min = min;
            vo.max = max;

            this.getMetricsFor(streamType).BandwidthBoundariesList.push(vo);

            this.metricAdded(streamType, "BandwidthBoundaries", vo);
            return vo;
        },

        addRepresentationSwitch: function (streamType, t, mt, to, lto) {
            var vo = new MediaPlayer.vo.metrics.RepresentationSwitch();

            vo.t = t;
            vo.mt = mt;
            vo.to = to;
            vo.lto = lto;

            this.getMetricsFor(streamType).RepSwitchList.push(vo);

            this.metricAdded(streamType, "RepresentationSwitch", vo);
            return vo;
        },

        addState: function (streamType, currentState, position, reason) {
            var vo = new MediaPlayer.vo.metrics.State();

            vo.current = currentState;
            vo.position = position;
            vo.reason = reason;

            this.metricAdded(streamType, "State", vo);
            return vo;
        },

        addSession: function (streamType,url,loop, endTime, playerType) {
            var vo = new MediaPlayer.vo.metrics.Session();

            vo.uri = url;
            if (loop) {
                vo.loopMode = 1;
            } else {
                vo.loopMode = 0;
            }
            vo.endTime = endTime;
            vo.playerType = playerType;

            this.metricAdded(streamType, "Session", vo);
            return vo;
        },

        addCondition: function (streamType,isFullScreen,videoWidth, videoHeight, droppedFrames,fps) {
            var vo = new MediaPlayer.vo.metrics.Condition();

            vo.isFullScreen = isFullScreen;
            vo.windowSize = videoWidth+"x"+videoHeight;
            vo.fps = fps;
            vo.droppedFrames = droppedFrames;

            this.metricAdded(streamType, "Condition", vo);
            return vo;
        },

        addMetaData: function () {
            this.metricAdded(null, "ManifestReady", null);
        },

        addBufferLevel: function (streamType, t, level) {
            var vo = new MediaPlayer.vo.metrics.BufferLevel();

            vo.t = t;
            vo.level = level;

            this.getMetricsFor(streamType).BufferLevel.push(vo);

            // ORANGE: to avoid memory leak
            if(this.getMetricsFor(streamType).BufferLevel.length > 10) {
                this.getMetricsFor(streamType).BufferLevel.shift();
            }

            this.metricAdded(streamType, "BufferLevel", vo);
            return vo;
        },


        addDVRInfo: function (streamType, currentTime, mpd, range)
        {
            var vo = new MediaPlayer.vo.metrics.DVRInfo();

            vo.time = currentTime ;
            vo.range = range;
            vo.mpd= mpd;

            this.getMetricsFor(streamType).DVRInfo.push(vo);
            this.metricAdded(streamType, "DVRInfo", vo);

            return vo;
        },

        addDroppedFrames: function (streamType, quality) {
            var vo = new MediaPlayer.vo.metrics.DroppedFrames(),
            list = this.getMetricsFor(streamType).DroppedFrames;

            vo.time = quality.creationTime;
            vo.droppedFrames = quality.droppedVideoFrames;
            // ORANGE : add decoded video frames
            vo.decodedFrameCount = quality.totalVideoFrames;

            if (list.length > 0 && list[list.length - 1] === vo) {
                return list[list.length - 1];
            }

            list.push(vo);

            this.metricAdded(streamType, "DroppedFrames", vo);
            return vo;
        },


        addManifestUpdate: function(streamType, type, requestTime, fetchTime, availabilityStartTime, presentationStartTime, clientTimeOffset, currentTime, buffered, latency) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate(),
                metrics = this.getMetricsFor("stream");

            vo.streamType = streamType;
            vo.type = type;
            vo.requestTime = requestTime; // when this manifest update was requested
            vo.fetchTime = fetchTime; // when this manifest update was received
            vo.availabilityStartTime = availabilityStartTime;
            vo.presentationStartTime = presentationStartTime; // the seek point (liveEdge for dynamic, Period[0].startTime for static)
            vo.clientTimeOffset = clientTimeOffset; // the calculated difference between the server and client wall clock time
            vo.currentTime = currentTime; // actual element.currentTime
            vo.buffered = buffered; // actual element.ranges
            vo.latency = latency; // (static is fixed value of zero. dynamic should be ((Now-@availabilityStartTime) - currentTime)

            metrics.ManifestUpdate.push(vo);
            this.metricAdded(streamType, "ManifestUpdate", vo);

            return vo;
        },

        updateManifestUpdateInfo: function(manifestUpdate, updatedFields) {
            for (var field in updatedFields) {
                if (updatedFields.hasOwnProperty(field)) {
                    manifestUpdate[field] = updatedFields[field];
                }
            }

            this.metricUpdated(manifestUpdate.streamType, "ManifestUpdate", manifestUpdate);
        },

        addManifestUpdatePeriodInfo: function(manifestUpdate, id, index, start, duration) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate.PeriodInfo();

            vo.id = id;
            vo.index = index;
            vo.start = start;
            vo.duration = duration;

            manifestUpdate.periodInfo.push(vo);
            this.metricUpdated(manifestUpdate.streamType, "ManifestUpdatePeriodInfo", manifestUpdate);

            return vo;
        },

        addManifestUpdateRepresentationInfo: function(manifestUpdate, id, index, periodIndex, streamType, presentationTimeOffset, startNumber, segmentInfoType) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate.RepresentationInfo();

            vo.id = id;
            vo.index = index;
            vo.periodIndex = periodIndex;
            vo.streamType = streamType;
            vo.startNumber = startNumber;
            vo.segmentInfoType = segmentInfoType;
            vo.presentationTimeOffset = presentationTimeOffset;

            manifestUpdate.representationInfo.push(vo);
            this.metricUpdated(manifestUpdate.streamType, "ManifestUpdateRepresentationInfo", manifestUpdate);

            return vo;
        },

        addPlayList: function (streamType, start, mstart, starttype) {
            var vo = new MediaPlayer.vo.metrics.PlayList();

            vo.stream = streamType;
            vo.start = start;
            vo.mstart = mstart;
            vo.starttype = starttype;

            this.getMetricsFor(streamType).PlayList.push(vo);

            // ORANGE: to avoid memory leak
            if(this.getMetricsFor(streamType).PlayList.length > 10) {
                this.getMetricsFor(streamType).PlayList.shift();
            }

            this.metricAdded(streamType, "PlayList", vo);
            return vo;
        },

        appendPlayListTrace: function (playList, representationid, subreplevel, start, mstart, duration, playbackspeed, stopreason) {
            var vo = new MediaPlayer.vo.metrics.PlayList.Trace();

            vo.representationid = representationid;
            vo.subreplevel = subreplevel;
            vo.start = start;
            vo.mstart = mstart;
            vo.duration = duration;
            vo.playbackspeed = playbackspeed;
            vo.stopreason = stopreason;

            playList.trace.push(vo);

            // ORANGE: to avoid memory leak
            if(playList.trace.length > 10) {
                playList.trace.shift();
            }

            this.metricUpdated(playList.stream, "PlayListTrace", playList);
            return vo;
        }
    };
};

MediaPlayer.models.MetricsModel.prototype = {
    constructor: MediaPlayer.models.MetricsModel
};
