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
MediaPlayer.dependencies.AbrController = function() {
    "use strict";

    var autoSwitchBitrate = true,
        autoSwitchDic = {},
        qualityDict = {},
        qualityMaxDict = {},
        confidenceDict = {},
        playerState = "",

        getInternalAutoSwitch = function(type) {
            if (!autoSwitchDic.hasOwnProperty(type)) {
                autoSwitchDic[type] = true;
            }
            return autoSwitchDic[type];
        },

        setInternalAutoSwitch = function(type, value) {
            autoSwitchDic[type] = value;
        },

        getInternalQuality = function(type) {
            var quality;

            if (!qualityDict.hasOwnProperty(type)) {
                qualityDict[type] = 0;
            }

            quality = qualityDict[type];

            return quality;
        },

        setInternalQuality = function(type, value) {
            qualityDict[type] = value;
        },

        getInternalConfidence = function(type) {
            var confidence;

            if (!confidenceDict.hasOwnProperty(type)) {
                confidenceDict[type] = 0;
            }

            confidence = confidenceDict[type];

            return confidence;
        },

        setInternalConfidence = function(type, value) {
            confidenceDict[type] = value;
        },

        getRulesRequestQuality = function(type, data) {
            var self = this,
                autoSwitch = getInternalAutoSwitch(type),
                quality = getInternalQuality(type),
                confidence = getInternalConfidence(type),
                newQuality = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE,
                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE,
                qualityMax = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE,
                i,
                len,
                results = [],
                metrics,
                req,
                values = {},
                rules,
                max;

            if (!autoSwitchBitrate || !autoSwitch) {
                self.debug.log("[AbrController][" + type + "] ABR disabled");
                return {
                    quality: quality,
                    confidence: confidence
                };
            }

            self.debug.log("[AbrController][" + type + "] Check rules....");

            metrics = self.getMetricsFor(data);
            rules = self.abrRulesCollection.getRules(MediaPlayer.rules.BaseRulesCollection.prototype.QUALITY_SWITCH_RULES);
            for (i = 0, len = rules.length; i < len; i += 1) {
                results.push(rules[i].checkIndex(quality, metrics, data, playerState));
            }

            values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
            values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
            values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;

            for (i = 0, len = results.length; i < len; i += 1) {
                req = results[i];
                if (req.quality !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                    self.debug.log("[AbrController][" + type + "] Request for quality " + req.quality + ", priority = " + req.priority + " (" + rules[i].name + ")");
                    values[req.priority] = Math.min(values[req.priority], req.quality);
                }

                if (req.max === true) {
                    qualityMax = Math.min(qualityMax, req.quality);
                }
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.WEAK;
                newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.WEAK];
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT];
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.STRONG];
            }

            if (newQuality !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && newQuality !== undefined) {
                quality = newQuality;
            }

            if (newConfidence !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && newConfidence !== undefined) {
                confidence = newConfidence;
            }

            if (qualityMax !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                qualityMaxDict[type] = qualityMax;
            }

            max = self.manifestExt.getRepresentationCount(data);
            // Ensure valid quality index
            if (quality < 0) {
                quality = 0;
            }
            if (quality >= max) {
                quality = max - 1;
            }

            if (confidence !== MediaPlayer.rules.SwitchRequest.prototype.STRONG &&
                confidence !== MediaPlayer.rules.SwitchRequest.prototype.WEAK) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
            }

            self.debug.info("[AbrController][" + type + "] Request quality: " + quality);

            return {
                quality: quality,
                confidence: confidence
            };
        },

        getQualityBoundaries = function(type, data) {
            var bitrates = this.metricsExt.getBitratesForType(type, data),
                qualityMin = this.config.getParamFor(type, "ABR.minQuality", "number", -1),
                qualityMax = this.config.getParamFor(type, "ABR.maxQuality", "number", -1),
                bandwidthMin = this.config.getParamFor(type, "ABR.minBandwidth", "number", -1),
                bandwidthMax = this.config.getParamFor(type, "ABR.maxBandwidth", "number", -1),
                i,
                count = bitrates.length;

            if (bandwidthMin !== -1) {
                for (i = 0; i < bitrates.length; i++) {
                    if (bitrates[i] >= bandwidthMin) {
                        qualityMin = (qualityMin === -1) ? i : Math.max(i, qualityMin);
                        break;
                    }
                }
            }

            if (bandwidthMax !== -1) {
                for (i = bitrates.length - 1; i >= 0; i--) {
                    if (bitrates[i] <= bandwidthMax) {
                        qualityMax = (qualityMax === -1) ? i : Math.min(i, qualityMax);
                        break;
                    }
                }
            }

            qualityMin = (qualityMin >= count) ? (count - 1) : qualityMin;
            qualityMin = (qualityMin < 0) ? 0 : qualityMin;
            qualityMax = (qualityMax >= count || qualityMax < 0) ? (count - 1) : qualityMax;

            return {
                min: qualityMin,
                max: qualityMax
            };

        };

    return {
        debug: undefined,
        abrRulesCollection: undefined,
        manifestExt: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        config: undefined,

        getAutoSwitchBitrate: function() {
            return autoSwitchBitrate;
        },

        setAutoSwitchBitrate: function(value) {
            this.debug.log("[AbrController] Set auto switch: " + value);
            autoSwitchBitrate = value;
        },

        getMetricsFor: function(data) {
            var isVideo,
                isAudio;

            isVideo = this.manifestExt.getIsVideo(data);
            if (isVideo) {
                return this.metricsModel.getMetricsFor("video");
            } else {
                isAudio = this.manifestExt.getIsAudio(data);
                if (isAudio) {
                    return this.metricsModel.getMetricsFor("audio");
                } else {
                    return this.metricsModel.getMetricsFor("stream");
                }
            }
        },

        getPlaybackQuality: function(type, data) {
            var self = this,
                previousQuality = this.getQualityFor(type),
                qualityMin = -1,
                qualityMax = -1,
                quality,
                confidence,
                switchUpIncrementally = this.config.getParamFor(type, "ABR.switchUpIncrementally", "boolean", false),
                result;

            result = getRulesRequestQuality.call(this, type, data);
            quality = result.quality;
            confidence = result.confidence;

            if (self.getAutoSwitchBitrate()) {
                // Check incremental switch
                if (switchUpIncrementally && (quality > previousQuality)) {
                    self.debug.log("[AbrController][" + type + "] Incremental switch => quality: " + quality);
                    quality = previousQuality + 1;
                }

                // Check representation boundaries
                var qualityBoundaries = getQualityBoundaries.call(self, type, data);
                qualityMin = qualityBoundaries.min;
                qualityMax = qualityBoundaries.max;

                if (quality < qualityMin) {
                    quality = qualityMin;
                    self.debug.log("[AbrController][" + type + "] New quality < min => " + quality);
                }

                if (quality > qualityMax) {
                    quality = qualityMax;
                    self.debug.log("[AbrController][" + type + "] New quality > max => " + quality);
                }

                // Check max quality allowed by the rules (see DroppedFramesRule for example)
                if (quality > qualityMaxDict[type]) {
                    quality = qualityMaxDict[type];
                    self.debug.log("[AbrController][" + type + "] Max allowed quality = " + quality);
                }
            }

            setInternalQuality.call(self, type, quality);
            setInternalConfidence.call(self, type, confidence);

            self.debug.info("[AbrController][" + type + "] Set quality: " + quality);
            return {
                quality: quality,
                confidence: confidence
            };
        },

        getAutoSwitchFor: function(type) {
            return getInternalAutoSwitch(type);
        },

        setAutoSwitchFor: function(type, value) {
            var autoSwitch = getInternalAutoSwitch(type);
            if (value !== autoSwitch) {
                this.debug.log("[AbrController][" + type + "] Set auto switch: " + value);
                setInternalAutoSwitch(type, value);
            }
        },

        getQualityFor: function(type) {
            return getInternalQuality(type);
        },

        setQualityFor: function(type, value) {
            var quality = getInternalQuality(type);
            if (value !== quality) {
                this.debug.log("[AbrController][" + type + "] Set playback quality: " + value);
                setInternalQuality(type, value);
            }
        },

        isMinQuality: function(type, data, value) {
            var qualityBoundaries = getQualityBoundaries.call(this, type, data);
            return value <= qualityBoundaries.min;
        },

        setPlayerState: function(state) {
            playerState = state;
        }
    };
};

MediaPlayer.dependencies.AbrController.prototype = {
    constructor: MediaPlayer.dependencies.AbrController
};

MediaPlayer.dependencies.AbrController.BANDWIDTH_SAFETY = 0.9;