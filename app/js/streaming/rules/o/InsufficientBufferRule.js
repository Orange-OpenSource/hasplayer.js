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
MediaPlayer.rules.o.InsufficientBufferRule = function () {    "use strict";

    return {
        debug: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        manifestModel: undefined,
        config: undefined,
        isStartBuffering: {},

        checkIndex: function (current, metrics, data, playerState) {
            var self = this,
                bufferLevel = self.metricsExt.getCurrentBufferLevel(metrics),
                minBufferTime,
                switchLowerBufferRatio,
                switchLowerBufferTime,
                switchDownBufferRatio,
                switchDownBufferTime,
                switchUpBufferRatio,
                switchUpBufferTime,
                deferred,
                q = current,
                p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;

            
            if (data === null) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            // Check if we start buffering the stream. In this case we ignore the rule
            if (playerState === 'buffering') {
                self.isStartBuffering[data.type] = true;
            }

            if (bufferLevel === null) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            self.debug.info("[InsufficientBufferRule]["+data.type+"] Checking buffer level ... (current = " + current + ", buffer level = " + (Math.round(bufferLevel.level * 100) / 100) + ")");

            deferred = Q.defer();

            self.manifestExt.getMpd(self.manifestModel.getValue()).then(
                function(mpd) {
                    if(mpd){
                        minBufferTime = self.config.getParamFor(data.type, "BufferController.minBufferTime", "number", mpd.manifest.minBufferTime);
                        switchLowerBufferRatio = self.config.getParamFor(data.type, "ABR.switchLowerBufferRatio", "number", 0.25);
                        switchLowerBufferTime = self.config.getParamFor(data.type, "ABR.switchLowerBufferTime", "number", switchLowerBufferRatio * minBufferTime);
                        switchDownBufferRatio = self.config.getParamFor(data.type, "ABR.switchDownBufferRatio", "number", 0.5);
                        switchDownBufferTime = self.config.getParamFor(data.type, "ABR.switchDownBufferTime", "number", switchDownBufferRatio * minBufferTime);
                        switchUpBufferRatio = self.config.getParamFor(data.type, "ABR.switchUpBufferRatio", "number", 0.75);
                        switchUpBufferTime = self.config.getParamFor(data.type, "ABR.switchUpBufferTime", "number", switchUpBufferRatio * minBufferTime);

                        if ((bufferLevel.level < switchDownBufferTime) && (self.isStartBuffering[data.type])) {
                            deferred.resolve(new MediaPlayer.rules.SwitchRequest());
                        } else {
                            if (bufferLevel.level >= switchDownBufferTime) {
                                self.isStartBuffering[data.type] = false;
                            }
                            
                            self.manifestExt.getRepresentationCount(data).then(
                                function (max) {
                                    max -= 1; // 0 based

                                    if (bufferLevel.level <= switchLowerBufferTime) {
                                        q = 0;
                                        p = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                                    } else if (bufferLevel.level <= switchDownBufferTime) {
                                        q = (current > 0) ? (current - 1) : 0;
                                        p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                                    }

                                    self.debug.info("[InsufficientBufferRule]["+data.type+"] SwitchRequest: q=" + q + ", p=" + p);
                                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(q, p));
                                }
                            );
                        }
                    }else{
                        self.debug.log("[InsufficientBufferRule]["+data.type+"] Manifest not present yet");
                        deferred.resolve(new MediaPlayer.rules.SwitchRequest());
                    }
                }
            );

            return deferred.promise;
        }
    };
};

MediaPlayer.rules.o.InsufficientBufferRule.prototype = {
    constructor: MediaPlayer.rules.o.OInsufficientBufferRule
};
