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
Custom.rules.CustomDownloadRatioRule = function () {
    "use strict";

    /*
     * This rule is intended to be sure that we can download fragments in a
     * timely manner.  The general idea is that it should take longer to download
     * a fragment than it will take to play the fragment.
     *
     * This rule is not sufficient by itself.  We may be able to download a fragment
     * fine, but if the buffer is not sufficiently long playback hiccups will happen.
     * Be sure to use this rule in conjuction with the InsufficientBufferRule.
     */

    var checkRatio = function (newIdx, currentBandwidth, data) {
            var self = this,
                deferred = Q.defer();

            self.manifestExt.getRepresentationFor(newIdx, data).then(
                function(rep) {
                    self.manifestExt.getBandwidth(rep).then(
                        function (newBandwidth) {
                            deferred.resolve(newBandwidth / currentBandwidth);
                        }
                    );
                }
            );

            return deferred.promise;
        };

    return {
        debug: undefined,
        manifestExt: undefined,
        metricsExt: undefined,

        checkIndex: function (current, metrics, data) {
            var self = this,
                lastRequest = self.metricsExt.getCurrentHttpRequest(metrics),
                downloadTime,
                totalTime,
                downloadRatio,
                totalRatio,
                switchRatio,
                deferred,
                funcs,
                i,
                DOWNLOAD_RATIO_SAFETY_FACTOR = 0.75,
                SWICH_UP_RATIO_SAFETY_FACTOR = 1.2;

            //self.debug.log("Checking download ratio rule...");

            self.debug.log("[DownloadRatioRule]["+data.type+"] Checking download ratio rule... (current = " + current + ")");


            if (!metrics) {
                //self.debug.log("No metrics, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            if (lastRequest === null) {
                //self.debug.log("No requests made for this stream yet, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            totalTime = (lastRequest.tfinish.getTime() - lastRequest.trequest.getTime()) / 1000;
            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000;

            if (totalTime <= 0) {
                //self.debug.log("Don't know how long the download of the last fragment took, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            if (lastRequest.mediaduration === null ||
                lastRequest.mediaduration === undefined ||
                lastRequest.mediaduration <= 0 ||
                isNaN(lastRequest.mediaduration)) {
                //self.debug.log("Don't know the duration of the last media fragment, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            // TODO : I structured this all goofy and messy.  fix plz

            deferred = Q.defer();

            totalRatio = lastRequest.mediaduration / totalTime;
            downloadRatio = (lastRequest.mediaduration / downloadTime) * DOWNLOAD_RATIO_SAFETY_FACTOR;

            self.debug.log("[DownloadRatioRule]["+data.type+"] Download time: " + downloadTime + "s");
            self.debug.log("[DownloadRatioRule]["+data.type+"] Total time:    " + totalTime + "s");
            self.debug.log("[DownloadRatioRule]["+data.type+"] Total ratio:   " + totalRatio + "s");

            if (isNaN(downloadRatio) || isNaN(totalRatio)) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            if (totalRatio < 1.0) {
                if (current > 0) {
                    self.manifestExt.getRepresentationFor(current - 1, data).then(
                        function (oneDownRepresentation) {
                            self.manifestExt.getBandwidth(oneDownRepresentation).then(
                                function (oneDownBandwidth) {
                                    self.manifestExt.getRepresentationFor(current, data).then(
                                        function (currentRepresentation) {
                                            self.manifestExt.getBandwidth(currentRepresentation).then(
                                                function (currentBandwidth) {

                                                    switchRatio = oneDownBandwidth / currentBandwidth;
                                                    self.debug.log("[DownloadRatioRule]["+data.type+"] switchRatio : " + switchRatio);

                                                    if (totalRatio < switchRatio) {
                                                        // Important download ratio decrease => switch down to lowest quality
                                                        self.debug.log("[DownloadRatioRule]["+data.type+"] SwitchRequest(0)");
                                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(0));
                                                    } else {
                                                        // Switch down to lower quality
                                                        self.debug.log("[DownloadRatioRule]["+data.type+"] SwitchRequest(" + (current - 1) + ")");
                                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(current - 1));
                                                    }
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                } else {
                    // We are at the lowest bitrate and cannot switch down, use current
                    deferred.resolve(new MediaPlayer.rules.SwitchRequest());
                }
            } else {
                self.manifestExt.getRepresentationCount(data).then(
                    function (max) {
                        max -= 1; // 0 based
                        if (current < max) {
                            self.manifestExt.getRepresentationFor(current, data).then(
                                function (currentRepresentation) {
                                    self.manifestExt.getBandwidth(currentRepresentation).then(
                                        function (currentBandwidth) {
                                            i = 0;
                                            funcs = [];
                                            while (i <= max) {
                                                funcs.push(checkRatio.call(self, i, currentBandwidth, data));
                                                i += 1;
                                            }

                                            Q.all(funcs).then(
                                                function (results) {
                                                    for (i = results.length; i > current; i -= 1) {
                                                        if (totalRatio > (results[i] * SWICH_UP_RATIO_SAFETY_FACTOR)) {
                                                            break;
                                                        }
                                                    }

                                                    if (i !== current) {
                                                        self.debug.log("[DownloadRatioRule]["+data.type+"] SwitchRequest(" + i + ")");
                                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(i));
                                                    } else {
                                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest());
                                                    }
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        } else {
                            // We are at the highest bitrate and cannot switch up, use current
                            deferred.resolve(new MediaPlayer.rules.SwitchRequest());
                        }
                    }
                );
            }

            return deferred.promise;
        }
    };
};

Custom.rules.CustomDownloadRatioRule.prototype = {
    constructor: Custom.rules.CustomDownloadRatioRule
};