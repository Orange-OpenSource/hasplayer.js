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
Custom.dependencies.CustomAbrController = function () {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.AbrController);

    rslt.manifestExt = undefined;
    rslt.debug = undefined;
    rslt.config = undefined;

    rslt.getRepresentationBandwidth = function (data, index) {
        var self = this,
            deferred = Q.defer();

        self.manifestExt.getRepresentationFor(index, data).then(
            function(rep) {
                self.manifestExt.getBandwidth(rep).then(
                    function (bandwidth) {
                        deferred.resolve(bandwidth);
                    }
                );
            }
        );

        return deferred.promise;
    };

    rslt.getQualityBoundaries = function (type, data) {
        var self = this,
            deferred = Q.defer(),
            qualityMin = self.config.getParamFor(type, "ABR.minQuality", "number", -1),
            qualityMax = self.config.getParamFor(type, "ABR.maxQuality", "number", -1),
            bandwidthMin = self.config.getParamFor(type, "ABR.minBandwidth", "number", -1),
            bandwidthMax = self.config.getParamFor(type, "ABR.maxBandwidth", "number", -1),
            i,
            funcs = [];

        self.debug.log("[AbrController]["+type+"] Quality   boundaries: [" + qualityMin + "," + qualityMax + "]");
        self.debug.log("[AbrController]["+type+"] Bandwidth boundaries: [" + bandwidthMin + "," + bandwidthMax + "]");

        // Get bandwidth boundaries and override quality boundaries
        if ((bandwidthMin !== -1) || (bandwidthMax !== -1)) {
            // Get min quality corresponding to min bandwidth
            self.manifestExt.getRepresentationCount(data).then(
                function (count) {
                    for (i = 0; i < count; i += 1) {
                        funcs.push(rslt.getRepresentationBandwidth.call(self, data, i));
                    }
                    Q.all(funcs).then(
                        function (bandwidths) {
                            if (bandwidthMin !== -1) {
                                for (i = 0; i < count; i += 1) {
                                    if (bandwidths[i] >= bandwidthMin) {
                                        qualityMin = (qualityMin === -1) ? i : Math.max(i, qualityMin);
                                        break;
                                    }
                                }
                            }
                            if (bandwidthMax !== -1) {
                                for (i = (count - 1); i >= 0; i -= 1) {
                                    if (bandwidths[i] <= bandwidthMax) {
                                        qualityMax = (qualityMax === -1) ? i : Math.min(i, qualityMax);
                                        break;
                                    }
                                }
                            }
                            deferred.resolve({min: qualityMin, max: qualityMax});
                        }
                    );
                }
            );
        } else {
            deferred.resolve({min: qualityMin, max: qualityMax});
        }

        return deferred.promise;
    };
   
    rslt.getPlaybackQuality = function (type, data) {
        var self = this,
            deferred = Q.defer(),
            previousQuality = self.getQualityFor(type),
            qualityMin = -1,
            qualityMax = -1,
            quality,
            switchIncremental = self.config.getParamFor(type, "ABR.switchIncremental", "boolean", false);

        // Call parent's getPlaybackQuality function
        self.parent.getPlaybackQuality.call(self, type, data).then(
            function (result) {
                quality = result.quality;

                // Check incremental switch
                if (switchIncremental && (quality > previousQuality)) {
                    self.debug.log("[AbrController]["+type+"] Incremental switch => quality: " + quality);
                    quality = previousQuality + 1;
                }

                // Check representation boundaries
                rslt.getQualityBoundaries.call(self, type, data).then(
                    function (qualityBoundaries) {
                        qualityMin = qualityBoundaries.min;
                        qualityMax = qualityBoundaries.max;

                        if ((qualityMin !== -1) && (quality < qualityMin)) {
                            quality = qualityMin;
                            self.debug.log("[AbrController]["+type+"] New quality < min => " + quality);
                        }

                        if ((qualityMax !== -1) && (quality > qualityMax)) {
                            quality = qualityMax;
                            self.debug.log("[AbrController]["+type+"] New quality > max => " + quality);
                        }

                        self.parent.setPlaybackQuality.call(self, type, quality);
                        deferred.resolve({quality: quality, confidence: result.confidence});
                    }
                );
            }
        );

        return deferred.promise;
    };

    return rslt;
};

Custom.dependencies.CustomAbrController.prototype = {
    constructor: Custom.dependencies.CustomAbrController
};
