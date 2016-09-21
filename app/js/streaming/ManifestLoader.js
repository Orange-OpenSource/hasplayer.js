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
MediaPlayer.dependencies.ManifestLoader = function() {
    "use strict";

    var DEFAULT_RETRY_ATTEMPTS = 2,
        DEFAULT_RETRY_INTERVAL = 500,
        _retryAttempts = DEFAULT_RETRY_ATTEMPTS,
        _retryInterval = DEFAULT_RETRY_INTERVAL,
        _xhrLoader = null,

        _getDecodedResponseText = function(text) {
            var fixedCharCodes = '',
                i = 0,
                charCode;

            // Some content is not always successfully decoded by every browser.
            // Known problem case: UTF-16 BE manifests on Internet Explorer 11.
            // This function decodes any text that the browser failed to decode.
            if (text.length < 1) {
                return text;
            }

            // The troublesome bit here is that IE still strips off the BOM, despite incorrectly decoding the file.
            // So we will simply assume that the first character is < (0x3C) and detect its invalid decoding (0x3C00).
            if (text.charCodeAt(0) !== 0x3C00) {
                return text;
            }

            // We have a problem!
            for (i = 0; i < text.length; i += 1) {
                charCode = text.charCodeAt(i);

                // Swap around the two bytes that make up the character code.
                fixedCharCodes += String.fromCharCode(((charCode & 0xFF) << 8 | (charCode & 0xFF00) >> 8));
            }

            return fixedCharCodes;
    },

        _parseBaseUrl = function(url) {
            var base = null;

            if (url.indexOf("/") !== -1) {
                if (url.indexOf("?") !== -1) {
                    url = url.substring(0, url.indexOf("?"));
                }
                base = url.substring(0, url.lastIndexOf("/") + 1);
            }

            return base;
        },

        _abort = function() {

            if (_xhrLoader !== null) {
                _xhrLoader.abort();
            }

            this.parser.abort();
        },

        _load = function(url) {
            var baseUrl = _parseBaseUrl(url),
                deferred = Q.defer(),
                self = this;

            _xhrLoader = new MediaPlayer.dependencies.XHRLoader();
            _xhrLoader.initialize('text', _retryAttempts, _retryInterval);
            _xhrLoader.load(url).then(
                function (request) {

                    // Get the redirection URL and use it as base URL for subsequent requests
                    if (request.responseURL) {
                        self.debug.log("[ManifestLoader] Redirect URL: " + request.responseURL);
                        baseUrl = _parseBaseUrl(request.responseURL);
                    }

                    self.tokenAuthentication.checkRequestHeaderForToken(request);
                    self.metricsModel.addHttpRequest("stream",
                        null,
                        "MPD",
                        url,
                        null,
                        null,
                        request.startDate,
                        request.endDate,
                        request.status,
                        null,
                        null);

                    self.parser.parse(_getDecodedResponseText(request.responseText), baseUrl).then(
                        function(manifest) {
                            if (manifest) {
                                manifest.mpdUrl = url;
                                manifest.mpdLoadedTime = request.endDate;
                                self.metricsModel.addManifestUpdate("stream", manifest.type, request.startDate, request.endDate, manifest.availabilityStartTime);
                                deferred.resolve(manifest);
                            } else {
                                deferred.reject();
                            }
                        },
                        function(error) {
                            // Check if reject is due to other issue than manifest parsing
                            // (for example HLS variant steam playlist download error) 
                            if (error && error.name && error.message) {
                                deferred.reject(error);
                            } else {
                                self.debug.error("[ManifestLoader] Manifest parsing error");
                                deferred.reject({
                                    name: MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_PARSE,
                                    message: "Failed to parse manifest",
                                    data: {
                                        url: url
                                    }
                                });
                            }
                        }
                    );
                },
                function(request) {

                    if (!request || request.aborted) {
                        deferred.reject();
                    } else {

                        self.metricsModel.addHttpRequest("stream",
                            null,
                            "MPD",
                            url,
                            null,
                            null,
                            request.startDate,
                            request.endDate,
                            request.status,
                            null,
                            null);

                        deferred.reject({
                            name: MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_MANIFEST,
                            message: "Failed to download manifest",
                            data : {
                                url: url,
                                status: request.status
                            }
                        });
                    }
                }
            );

            return deferred.promise;
        };

    return {
        debug: undefined,
        parser: undefined,
        config: undefined,
        metricsModel: undefined,
        tokenAuthentication: undefined,

        setup: function() {
            _retryAttempts = this.config.getParam("ManifestLoader.RetryAttempts", "number", DEFAULT_RETRY_ATTEMPTS);
            _retryInterval = this.config.getParam("ManifestLoader.RetryInterval", "number", DEFAULT_RETRY_INTERVAL);
        },

        load: _load,

        abort: _abort
    };
};

MediaPlayer.dependencies.ManifestLoader.prototype = {
    constructor: MediaPlayer.dependencies.ManifestLoader
};
