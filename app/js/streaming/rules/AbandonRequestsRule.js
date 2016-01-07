/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.rules.AbandonRequestsRule = function() {
    "use strict";

    var GRACE_TIME_THRESHOLD = 0.5,
        ABANDON_MULTIPLIER = 2;

    return {
        debug: undefined,
        metricsExt:undefined,

        execute: function(request, callback) {
            var now = new Date().getTime(),
                type = request.streamType,
                elapsedTime,
                measuredBandwidth,
                estimatedTimeOfDownload,
                switchRequest = new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.WEAK);

                if (request.firstByteDate === null || request.aborted) {
                    this.debug.log("[AbandonRequestsRule][" + type + "] Request has already been aborted.");
                    callback(switchRequest);
                    return;
                }

                elapsedTime = (now - request.firstByteDate.getTime()) / 1000;
                //this.debug.log("[AbandonRequestsRule][" + type + "] elapsedTime = " + elapsedTime + " s (" + request.bytesLoaded + "/" + request.bytesTotal + ")");

                if (request.bytesLoaded < request.bytesTotal && elapsedTime >= (request.duration * GRACE_TIME_THRESHOLD)) {

                    measuredBandwidth = request.bytesLoaded / elapsedTime;
                    estimatedTimeOfDownload = request.bytesTotal / measuredBandwidth;

                    //this.debug.log("[AbandonRequestsRule][" + type + "] bw = " + measuredBandwidth + " kb/s (" + estimatedTimeOfDownload + " s)");

                    if ((estimatedTimeOfDownload) > (request.duration * ABANDON_MULTIPLIER)) {
                        switchRequest = new MediaPlayer.rules.SwitchRequest(this.metricsExt.getQualityBoundaries(type).min, MediaPlayer.rules.SwitchRequest.prototype.STRONG);
                        this.debug.info("[AbandonRequestsRule][" + type + "] bw = " + measuredBandwidth + " kb/s => switch to lowest quality for " + request.url);
                    }
                }

            callback(switchRequest);
        },
    };
};

MediaPlayer.rules.AbandonRequestsRule.prototype = {
    constructor: MediaPlayer.rules.AbandonRequestsRule
};