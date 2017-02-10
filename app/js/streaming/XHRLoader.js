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
MediaPlayer.dependencies.XHRLoader = function() {
    "use strict";

    var _xhr = null,
        _url = null,
        _responseType = null,
        _range = null,
        _onprogress = null,
        _retryAttempts = 0,
        _retryInterval = 0,
        _retryCount = 0,
        _retryTimeout = null,
        _deferred = null,

        _abort = function() {

            if (_xhr !== null && _xhr.readyState > 0 && _xhr.readyState < 4) {
                _xhr.abort();
            } else if (_retryTimeout) {
                clearTimeout(_retryTimeout);
                _retryTimeout = null;
                _deferred.reject();
            }
        },

        _load = function() {
            var needFailureReport = true,

                onprogress = function(event) {
                    if (_onprogress) {
                        _onprogress(_xhr, event);
                    }
                },

                onabort = function() {
                    _xhr.aborted = true;
                },

                onload = function() {
                    if (_xhr.status < 200 || _xhr.status > 299) {
                        return;
                    }

                    if (_xhr.status === 200 && _xhr.readyState === 4) {
                        // The request succeeded
                        // => return the response the responseURL in case of URL redirection
                        needFailureReport = false;

                        // Add endDate attribute to store request end time
                        _xhr.endDate = new Date();

                        _deferred.resolve(_xhr);
                    }
                },

                onloadend = function() {

                    if (!needFailureReport) {
                        return;
                    }
                    needFailureReport = false;

                    // Add endDate attribute to store request end time
                    _xhr.endDate = new Date();

                    // The request failed
                    _retryCount++;
                    if (!_xhr.aborted && _retryAttempts > 0 && _retryCount <= _retryAttempts) {
                        // Retry the request
                        _retryTimeout = setTimeout(function() {
                            _load();
                        }, _retryInterval);
                    } else {
                        _deferred.reject(_xhr);
                    }
                };

            try {
                _xhr = new XMLHttpRequest();
                _xhr.open("GET", _url, true);

                if (_responseType) {
                    _xhr.responseType = _responseType;
                }

                if (_range) {
                    _xhr.setRequestHeader('Range', 'bytes=' + _range);
                }

                _xhr.onprogress = onprogress;
                _xhr.onabort = onabort;
                _xhr.onload = onload;
                _xhr.onloadend = onloadend;
                _xhr.onerror = onloadend;

                // Add startDate attribute to store request start time
                _xhr.startDate = new Date();

                _xhr.send();
            } catch (e) {
                _xhr.onerror();
            }
        };

    return {

        initialize: function(responseType, retryAttempts, retryInterval, onprogress) {
            _responseType = responseType;
            _retryAttempts = retryAttempts;
            _retryInterval = retryInterval;
            _onprogress = onprogress;
        },

        load: function(url, range) {
            _url = url;
            _range = range;
            _retryCount = 0;
            _deferred = Q.defer();
            _load();
            return _deferred.promise;
        },

        abort: _abort
    };
};

MediaPlayer.dependencies.XHRLoader.prototype = {
    constructor: MediaPlayer.dependencies.XHRLoader
};
