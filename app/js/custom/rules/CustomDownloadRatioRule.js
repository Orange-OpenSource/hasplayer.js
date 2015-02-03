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

    var _mediaDuration = 0,
        _downloadTime = 0,
        _totalTime = 0,

        checkRatio = function (newIdx, currentBandwidth, data) {
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
        manifestModel: undefined,
        config: undefined,

        checkIndex: function (current, metrics, data) {
            var self = this,
                lastRequest = self.metricsExt.getCurrentHttpRequest(metrics),
                downloadTime,
                totalTime,
                ratio,
                latencyInBandwidth = self.config.getParamFor(data.type, "ABR.latencyInBandwidth", "boolean", true),
                switchUpRatioSafetyFactor = self.config.getParamFor(data.type, "ABR.switchUpRatioSafetyFactor", "number", 1.5),
                deferred,
                funcs,
                i,
                q = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE,
                p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;

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

            // Consider average bandwidth over at least 4 sec. of media (= 2 segments in MSS)
            _mediaDuration += lastRequest.mediaduration;
            _downloadTime += downloadTime;
            _totalTime += downloadTime;

            if (_mediaDuration < 4) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            deferred = Q.defer();

            //ratio = latencyInBandwidth ? (lastRequest.mediaduration / totalTime) : (lastRequest.mediaduration / downloadTime);
            //self.debug.log("[DownloadRatioRule]["+data.type+"] DL: " + downloadTime + "s, Total: " + totalTime + "s => ratio: " + ratio);

            ratio = latencyInBandwidth ? (_mediaDuration / _totalTime) : (_mediaDuration / _downloadTime);
            self.debug.log("[DownloadRatioRule]["+data.type+"] DL: " + _downloadTime + "s, Total: " + _totalTime + "s => ratio: " + ratio);
            _mediaDuration = _downloadTime = _totalTime = 0;

            if (isNaN(ratio)) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            if (ratio <= 1.0) {
                self.manifestExt.getRepresentationFor(current, data).then(
                    function (currentRepresentation) {
                        self.manifestExt.getBandwidth(currentRepresentation).then(
                            function (currentBandwidth) {
                                i = 0;
                                funcs = [];
                                while (i <= current) {
                                    funcs.push(checkRatio.call(self, i, currentBandwidth, data));
                                    i += 1;
                                }

                                Q.all(funcs).then(
                                    function (results) {
                                        for (i = current-1; i >= 0; i -= 1) {
                                            if (ratio > (results[i])) {
                                                break;
                                            }
                                        }

                                        q = i;
                                        p = MediaPlayer.rules.SwitchRequest.prototype.WEAK;

                                        self.debug.log("[DownloadRatioRule]["+data.type+"] SwitchRequest(" + q + ", " + p + ")");
                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(q, p));
                                    }
                                );
                            }
                        );
                    }
                );
            } else if (ratio >= 1.0) {
                self.manifestExt.getRepresentationCount(data).then(
                    function (max) {
                        max -= 1; // 0 based
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
                                                    if (ratio > (results[i] * switchUpRatioSafetyFactor)) {
                                                        break;
                                                    }
                                                }

                                                q = i;
                                                p = MediaPlayer.rules.SwitchRequest.prototype.STRONG;

                                                self.debug.log("[DownloadRatioRule]["+data.type+"] SwitchRequest(" + q + ", " + p + ")");
                                                deferred.resolve(new MediaPlayer.rules.SwitchRequest(q, p));
                                            }
                                        );
                                    }
                                );
                            }
                        );
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