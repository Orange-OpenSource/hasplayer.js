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
MediaPlayer.rules.DroppedFramesRule = function() {
    "use strict";

    var rule = "DroppedFrames",
        MIN_ELAPSED_TIME = 1,
        lastPlaybackQuality = null,

        getDroppedFramesAndFPS = function(playbackQuality) {
            var elapsedTime,
                droppedFrames,
                totalVideoFrames,
                fps;

            if (lastPlaybackQuality === null) {
                lastPlaybackQuality = playbackQuality;
                return null;
            }

            // Check sufficient elapsed media time to determine frame rate 
            elapsedTime = playbackQuality.mt - lastPlaybackQuality.mt;
            if (elapsedTime < MIN_ELAPSED_TIME) {
                return null;
            }

            droppedFrames = playbackQuality.droppedFrames - lastPlaybackQuality.droppedFrames;
            totalVideoFrames = playbackQuality.totalVideoFrames - lastPlaybackQuality.totalVideoFrames;
            fps = totalVideoFrames / elapsedTime;

            lastPlaybackQuality = playbackQuality;

            return {
                droppedFrames: droppedFrames,
                fps: fps
            };
        };

    return {
        debug: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        manifestModel: undefined,
        config: undefined,

        checkIndex: function(current, metrics, data) {
            var self = this,
                droppedFramesMaxRatio = self.config.getParamFor(data.type, "ABR.droppedFramesMaxRatio", "number", 0.5),
                playbackQuality = self.metricsExt.getCurrentPlaybackQuality(metrics),
                res;

            if (data === null) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            if (playbackQuality === null) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            //self.debug.info("[DroppedFramesRule]["+data.type+"] PlaybackQuality = " + JSON.stringify(playbackQuality));

            // Determine number of dropped frames and fps
            res = getDroppedFramesAndFPS(playbackQuality);

            if (res === null) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            self.debug.info("[DroppedFramesRule]["+data.type+"] " + JSON.stringify(res));

            // If too much dropped frames, then switch to lower representation
            if ((res.droppedFrames > (res.fps * droppedFramesMaxRatio)) &&
                (current > 0)) {
                self.debug.info("[DroppedFramesRule]["+data.type+"] Switch to quality " + (current - 1));
                return Q.when(new MediaPlayer.rules.SwitchRequest((current - 1), MediaPlayer.rules.SwitchRequest.prototype.STRONG, true, rule));
            }

            // If no dropped frames, then allow to switch to higher representation
            if ((res.droppedFrames === 0) &&
                (current < (self.manifestExt.getRepresentationCount_(data) - 1))) {
                self.debug.info("[DroppedFramesRule]["+data.type+"] Switch to quality " + (current + 1));
                return Q.when(new MediaPlayer.rules.SwitchRequest((current + 1), MediaPlayer.rules.SwitchRequest.prototype.DEFAULT, true, rule));
            }

            return Q.when(new MediaPlayer.rules.SwitchRequest());
        }
    };
};

MediaPlayer.rules.DroppedFramesRule.prototype = {
    constructor: MediaPlayer.rules.DroppedFramesRule
};