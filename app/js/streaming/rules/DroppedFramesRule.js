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

    var MIN_ELAPSED_TIME = 1,
        lastPlaybackQuality = null,
        currentDroppedFrames = -1,
        currentTotalVideoFrames = -1,

        getDroppedFrames = function(playbackQuality) {
            var elapsedTime;

            if (lastPlaybackQuality === null) {
                lastPlaybackQuality = playbackQuality;
                return;
            }

            // Check sufficient elapsed media time to determine frame rate 
            elapsedTime = playbackQuality.mt - lastPlaybackQuality.mt;
            if (elapsedTime < MIN_ELAPSED_TIME) {
                return;
            }

            currentDroppedFrames = playbackQuality.droppedFrames - lastPlaybackQuality.droppedFrames;
            currentTotalVideoFrames = playbackQuality.totalVideoFrames - lastPlaybackQuality.totalVideoFrames;

            lastPlaybackQuality = playbackQuality;
        };

    return {
        debug: undefined,
        metricsExt: undefined,
        manifestModel: undefined,
        config: undefined,

        name: "DroppedFramesRule",

        checkIndex: function(current, metrics, data) {
            var droppedFramesMaxRatio = this.config.getParamFor(data.type, "ABR.droppedFramesMaxRatio", "number", 0.30),
                droppedFramesMinRatio = this.config.getParamFor(data.type, "ABR.droppedFramesMinRatio", "number", 0.10),
                playbackQuality = this.metricsExt.getCurrentPlaybackQuality(metrics),
                q = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE,
                p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
                ratio;

            if (data === null) {
                return new MediaPlayer.rules.SwitchRequest();
            }

            if (data.type !== "video") {
                return new MediaPlayer.rules.SwitchRequest();
            }

            if (playbackQuality === null) {
                // No PlaybackQuality metric => start of a new stream => reset lastPlaybackQuality
                lastPlaybackQuality = null;
                currentDroppedFrames = currentTotalVideoFrames = -1;
                return new MediaPlayer.rules.SwitchRequest();
            }

            //this.debug.info("[DroppedFramesRule]["+data.type+"] PlaybackQuality = " + JSON.stringify(playbackQuality));

            // Determine number of dropped frames and fps
            getDroppedFrames(playbackQuality);

            if (currentDroppedFrames === -1) {
                return new MediaPlayer.rules.SwitchRequest();
            }

            ratio = currentDroppedFrames / currentTotalVideoFrames;

            this.debug.info("[DroppedFramesRule]["+data.type+"] DroppedFrames:" + currentDroppedFrames + ", totalVideoFrames:" + currentTotalVideoFrames + " => ratio = " + ratio);

            if (ratio > droppedFramesMaxRatio && current > 0) {
                // If too much dropped frames, then switch to lower representation
                q = current - 1;
                p = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
            } else if (ratio > droppedFramesMinRatio) {
                // Still some dropped frames, then stay at current quality
                q = current;
                p = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
            }

            this.debug.info("[DroppedFramesRule][" + data.type + "] SwitchRequest: q=" + q + ", p=" + p);

            return new MediaPlayer.rules.SwitchRequest(q, p);
        }
    };
};

MediaPlayer.rules.DroppedFramesRule.prototype = {
    constructor: MediaPlayer.rules.DroppedFramesRule
};