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
MediaPlayer.utils.Config = function () {
    "use strict";

    var paramsType = ["video", "audio"],

        // Default configuration, provides list of possible parameters
        params = {
            // BufferController parameters
            "BufferController.minBufferTimeForPlaying": -1,
            "BufferController.minBufferTime": -1,
            "BufferController.bufferToKeep": -1,
            "BufferController.liveDelay": -1,
            // ABR parameters
            "ABR.minBandwidth": -1,
            "ABR.maxBandwidth": -1,
            "ABR.minQuality": -1,
            "ABR.maxQuality": -1,
            "ABR.switchUpIncrementally": -1,
            "ABR.switchUpRatioSafetyFactor": -1,
            "ABR.latencyInBandwidth": -1,
            "ABR.switchDownBufferTime": -1,
            "ABR.switchDownBufferRatio": -1,
            "ABR.switchLowerBufferTime": -1,
            "ABR.switchLowerBufferRatio": -1,
            "ABR.switchUpBufferTime": -1,
            "ABR.switchUpBufferRatio": -1,
            "ABR.keepBandwidthCondition": -1,
            "ABR.droppedFramesMinRatio": -1,
            "ABR.droppedFramesMaxRatio": -1,
            // Manifest loader parameters
            "ManifestLoader.RetryAttempts": -1,
            "ManifestLoader.RetryInterval": -1,
            // Fragment loader parameters
            "FragmentLoader.RetryAttempts": -1,
            "FragmentLoader.RetryInterval": -1,
            // Protection parameters
            "Protection.licensePersistence": -1,
            // Other parameters
            "backoffSeekToEnd" : 2,
            // Video parameters
            "video": {
            },
            // Audio parameters
            "audio": {
            }
        },

        doSetParams = function (newParams) {
            var item,
                typeParams,
                typeItem;

            for (item in newParams) {
                if (newParams.hasOwnProperty(item)) {
                    // Check if comment
                    if (item.indexOf('//') === -1) {
                        // Check if type parameters
                        if (paramsType.indexOf(item) > -1) {
                            typeParams = newParams[item];
                            for (typeItem in typeParams) {
                                if (typeParams.hasOwnProperty(typeItem)) {
                                    params[item][typeItem] = newParams[item][typeItem];
                                }
                            }
                        } else {
                            params[item] = newParams[item];
                        }
                    }
                }
            }
        },

        getParam = function (params, name, type, def) {
            var value = params[name];

            if ((value === undefined) || (value === -1)) {
                return def;
            }

            if ((type !== undefined) && (typeof value !== type)) {
                switch (type) {
                    case 'number':
                        value = Number(value);
                        break;
                    case 'boolean':
                        value = (value === 'true') ||
                                (value === '1') ||
                                (value === 1);
                        break;
                    default:
                        break;
                }
            }

            return value;
        },

        doGetParam = function (name, type, def) {
            return getParam(params, name, type, def);
        },

        doGetParamFor = function (key, name, type, def) {
            var typeParams = params[key];

            if ((typeParams !== undefined) && (typeParams[name] !== undefined)) {
                return getParam(typeParams, name, type, def);
            }

            return getParam(params, name, type, def);
        };

    return {
        debug: undefined,

        setup: function () {
        },

        setParams: function (newParams) {
            doSetParams(newParams);

            // Update debugger level if set in config
            var level = this.getParam("Debug.level", "number", -1);
            if (level !== -1) {
                this.debug.setLevel(level);
            }
        },

        getParam: function (name, type, def) {
            return doGetParam(name, type, def);
        },

        getParamFor: function (key, name, type, def) {
            return doGetParamFor(key, name, type, def);
        }
    };
};

MediaPlayer.utils.Config.prototype = {
    constructor: MediaPlayer.utils.Config
};
