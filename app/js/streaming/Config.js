/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014, Orange
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.utils.Config = function () {
    "use strict";

    var DEFAULT_CONFIG_FILE = "hasplayer_config.json",

        paramsType = ["video", "audio"],

        // Default configuration, provides list of possible parameters
        params = {
            "ABR.switchIncremental": false,
            "ABR.minBandwidth": -1,
            "ABR.maxBandwidth": -1,
            "ABR.minQuality": -1,
            "ABR.maxQuality": -1,
            // Video parameters
            "video": {
                "ABR.switchIncremental": false,
                "ABR.minBandwidth": -1,
                "ABR.maxBandwidth": -1,
                "ABR.minQuality": -1,
                "ABR.maxQuality": -1
            },
            // Audio parameters
            "audio": {
                "ABR.switchIncremental": false,
                "ABR.minBandwidth": -1,
                "ABR.maxBandwidth": -1,
                "ABR.minQuality": -1,
                "ABR.maxQuality": -1
            },
        },

        downloadConfigFile = function (url) {
            var req = new XMLHttpRequest();
            req.open("GET", url, true);
            req.setRequestHeader("Content-type", "application/json");
            req.onreadystatechange = function() {
                if ((req.readyState == 4) && (req.status == 200)) {
                    var config = JSON.parse(req.responseText);
                    doSetParams(config);
                }
            };
            req.send();
        },

        doSetParams = function (newParams) {
            var item,
                typeParams,
                typeItem;

            for (item in newParams) {
                // check if type parameters
                if (paramsType.indexOf(item) > -1) {
                    typeParams = newParams[item];
                    for (typeItem in typeParams) {
                        params[item][typeItem] = newParams[item][typeItem];
                    }
                } else {
                    params[item] = newParams[item];
                }
            }
        },

        getParam = function (params, name, type, def) {
            var value = params[name];

            if (value === undefined) {
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

            if (typeParams === undefined) {
                return getParam(params, name, type, def);
            }

            return getParam(typeParams, name, type, def);
        };

    return {
        debug: undefined,

        setup: function () {
            // Download default configuration file
          //  downloadConfigFile(DEFAULT_CONFIG_FILE);
        },

        setParams: function (newParams) {
            doSetParams(newParams);
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