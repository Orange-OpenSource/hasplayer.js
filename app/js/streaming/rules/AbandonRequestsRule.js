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
MediaPlayer.rules.AbandonRequestsRule = function () {
    "use strict";

    var GRACE_TIME_THRESHOLD = 500,
        ABANDON_MULTIPLIER = 1.5,
        fragmentDict = {},
        abandonDict = {},

        setFragmentRequestDict = function (type, id) {
            fragmentDict[type] = fragmentDict[type] || {};
            fragmentDict[type][id] = fragmentDict[type][id] || {};
        };

    return {
        metricsExt: undefined,
        debug:undefined,

        execute: function(request, abrController, metrics, callback) {
            var now = new Date().getTime(),
                mediaType = request.streamType,
                fragmentInfo,
                switchRequest = new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.WEAK),
                index,
                bufferLevel = this.metricsExt.getCurrentBufferLevel(metrics);

            if (request.sequenceNumber) {
                index = request.sequenceNumber;
            }else{
                index = request.index;  
            } 

            if (!isNaN(index)) {
                setFragmentRequestDict(mediaType, index);
                fragmentInfo = fragmentDict[mediaType][index];

                if (fragmentInfo === null || request.firstByteDate === null || (abandonDict.hasOwnProperty(fragmentInfo.id)&&(abandonDict[fragmentInfo.id].url === request.url))) {
                    this.debug.log("[AbandonRequestsRule]["+mediaType+"] No change fragmentInfo, request.firstByteDate may be null or abandonDict.hasOwnProperty(fragmentInfo.id)===true");
                    callback(switchRequest);
                    return;
                }

                //setup some init info based on first progress event
                if (fragmentInfo.firstByteTime === undefined) {
                    fragmentInfo.firstByteTime = request.firstByteDate.getTime();
                    fragmentInfo.segmentDuration = request.duration;
                    fragmentInfo.bytesTotal = request.bytesTotal;
                    fragmentInfo.id = index;
                    fragmentInfo.nb = 1;
                    fragmentInfo.url = request.url;
                    this.debug.log("[AbandonRequestsRule]["+mediaType+"] FRAG ID : " +fragmentInfo.id+ " *****************");
                }
               
                //update info base on subsequent progress events until completed.
                fragmentInfo.bytesLoaded = request.bytesLoaded;
                fragmentInfo.elapsedTime = (now - fragmentInfo.firstByteTime);

                if (fragmentInfo.bytesLoaded < fragmentInfo.bytesTotal &&
                    fragmentInfo.elapsedTime >= GRACE_TIME_THRESHOLD) {

                    fragmentInfo.measuredBandwidthInKbps = Math.round(fragmentInfo.bytesLoaded*8/fragmentInfo.elapsedTime);
                    //fragmentInfo.measuredBandwidthInKbps = (concurrentCount > 1) ? getAggragateBandwidth.call(this, mediaType, concurrentCount) :  Math.round(fragmentInfo.bytesLoaded*8/fragmentInfo.elapsedTime);
                    fragmentInfo.estimatedTimeOfDownload = +(fragmentInfo.bytesTotal*8*0.001/fragmentInfo.measuredBandwidthInKbps).toFixed(2);
                    this.debug.log("[AbandonRequestsRule]["+mediaType+"] id: "+fragmentInfo.id+" Bytes Loaded = "+(fragmentInfo.bytesLoaded)+", Measured bandwidth : "+fragmentInfo.measuredBandwidthInKbps+" kbps estimated Time of download : "+fragmentInfo.estimatedTimeOfDownload+" secondes, elapsed time : "+fragmentInfo.elapsedTime/1000+" secondes.");

                     if ((fragmentInfo.elapsedTime)/1000 > (fragmentInfo.segmentDuration*1.5) || (bufferLevel.level < (fragmentInfo.segmentDuration/2))) {
                        switchRequest = new MediaPlayer.rules.SwitchRequest(0, MediaPlayer.rules.SwitchRequest.prototype.STRONG);
                        abandonDict[fragmentInfo.id] = fragmentInfo;
                        this.debug.log("[AbandonRequestsRule]["+mediaType+"] frag id"+fragmentInfo.id+" is asking to abandon and switch to initial quality measured bandwidth was"+fragmentInfo.measuredBandwidthInKbps);
                        delete fragmentDict[mediaType][fragmentInfo.id];
                     }
                }else if (fragmentInfo.bytesLoaded === fragmentInfo.bytesTotal) {
                    delete fragmentDict[mediaType][fragmentInfo.id];
                }
            }

            callback(switchRequest);
        },

        reset: function() {
            fragmentDict = {};
            abandonDict = {};
        }
    };
};

MediaPlayer.rules.AbandonRequestsRule.prototype = {
    constructor: MediaPlayer.rules.AbandonRequestsRule
};




