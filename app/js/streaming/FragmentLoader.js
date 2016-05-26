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
MediaPlayer.dependencies.FragmentLoader = function() {
    "use strict";

    var DEFAULT_RETRY_ATTEMPTS = 2,
        DEFAULT_RETRY_INTERVAL = 500,
        retryAttempts = DEFAULT_RETRY_ATTEMPTS,
        retryInterval = DEFAULT_RETRY_INTERVAL,
        retryCount = 0,
        xhrs = [],
        type,

        _checkForExistence = function(request) {
            var req = new XMLHttpRequest(),
                isSuccessful = false;

            req.open("HEAD", request.url, true);

            req.onload = function() {
                if (req.status < 200 || req.status > 399) {
                    return;
                }
                isSuccessful = true;
                request.deferred.resolve(request);
            };

            req.onloadend = req.onerror = function() {
                if (isSuccessful) {
                    return;
                }
                request.deferred.reject(req);
            };

            req.send();
        },

        _loadRequest = function(request) {
            var d = Q.defer(),
                req = new XMLHttpRequest(),
                httpRequestMetrics = null,
                firstProgress = true,
                needFailureReport = true,
                lastTraceTime = null,
                self = this;

            xhrs.push(req);
            request.requestStartDate = new Date();

            httpRequestMetrics = self.metricsModel.addHttpRequest(
                request.streamType,
                null,
                request.type,
                request.url,
                null,
                request.range,
                request.requestStartDate,
                null,
                null,
                null,
                null,
                request.duration,
                request.startTime,
                request.quality);

            self.metricsModel.appendHttpTrace(
                httpRequestMetrics,
                request.requestStartDate,
                request.requestStartDate.getTime() - request.requestStartDate.getTime(), [0]);

            lastTraceTime = request.requestStartDate;

            req.open("GET", self.tokenAuthentication.addTokenAsQueryArg(request.url), true);
            req.responseType = "arraybuffer";
            req = self.tokenAuthentication.setTokenInRequestHeader(req);

            if (request.range) {
                req.setRequestHeader("Range", 'bytes='+request.range);
            }

            req.onprogress = function(event) {
                var currentTime = new Date();
                if (firstProgress) {
                    firstProgress = false;
                    if (!event.lengthComputable || (event.lengthComputable && event.total !== event.loaPded)) {
                        request.firstByteDate = currentTime;
                        httpRequestMetrics.tresponse = currentTime;
                    }
                }

                if (event.lengthComputable) {
                    request.bytesLoaded = event.loaded;
                    request.bytesTotal = event.total;
                }

                self.metricsModel.appendHttpTrace(
                    httpRequestMetrics,
                    currentTime,
                    currentTime.getTime() - lastTraceTime.getTime(), [request.bytesLoaded ? request.bytesLoaded : 0]);

                lastTraceTime = currentTime;

                self.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_PROGRESS, {
                    request: request,
                    httpRequestMetrics: httpRequestMetrics,
                    lastTraceTime: lastTraceTime
                });

            };

            req.onload = function() {
                if (req.status < 200 || req.status > 399) {
                    return;
                }
                needFailureReport = false;

                var currentTime = new Date(),
                    bytes = req.response,
                    latency,
                    download;

                if (!request.firstByteDate) {
                    request.firstByteDate = request.requestStartDate;
                }
                request.requestEndDate = currentTime;

                latency = (request.firstByteDate.getTime() - request.requestStartDate.getTime());
                download = (request.requestEndDate.getTime() - request.firstByteDate.getTime());

                self.debug.log("[FragmentLoader]["+type+"] Loaded: " + request.url + " (" + req.status + ", " + latency + "ms, " + download + "ms)");

                httpRequestMetrics.tresponse = request.firstByteDate;
                httpRequestMetrics.tfinish = request.requestEndDate;
                httpRequestMetrics.responsecode = req.status;

                httpRequestMetrics.bytesLength = bytes ? bytes.byteLength : 0;

                self.metricsModel.appendHttpTrace(
                    httpRequestMetrics,
                    currentTime,
                    currentTime.getTime() - lastTraceTime.getTime(), [bytes ? bytes.byteLength : 0]);

                lastTraceTime = currentTime;

                d.resolve({
                    data: bytes,
                    request: request
                });
            };

            req.onabort = function() {
                req.aborted = true;
            };

            req.onloadend = req.onerror = function() {
                if (xhrs.indexOf(req) === -1) {
                    return;
                }
                
                xhrs.splice(xhrs.indexOf(req), 1);
                
                if (!needFailureReport) {
                    return;
                }
                needFailureReport = false;

                var currentTime = new Date(),
                    bytes = req.response,
                    latency,
                    download;

                if (!request.firstByteDate) {
                    request.firstByteDate = request.requestStartDate;
                }
                request.requestEndDate = currentTime;

                latency = (request.firstByteDate.getTime() - request.requestStartDate.getTime());
                download = (request.requestEndDate.getTime() - request.firstByteDate.getTime());

                httpRequestMetrics.tresponse = request.firstByteDate;
                httpRequestMetrics.tfinish = request.requestEndDate;
                httpRequestMetrics.responsecode = req.status;

                self.metricsModel.appendHttpTrace(httpRequestMetrics,
                    currentTime,
                    currentTime.getTime() - lastTraceTime.getTime(), [bytes ? bytes.byteLength : 0]);
                lastTraceTime = currentTime;

                d.reject(req);
            };

            self.debug.log("[FragmentLoader]["+type+"] Load: " + request.url);

            req.send();
            return d.promise;
        },

        _load = function (request, deferred) {
            var self = this;

            _loadRequest.call(self, request).then(function(result) {
                    retryCount = 0;
                    deferred.resolve(result);
                }, function(reqerror) {
                     if (reqerror.aborted) {
                        // Request has been aborted => set status to 0
                        request.status = 0;
                        request.aborted = true;
                        deferred.reject(request);
                    } else if (retryCount >= retryAttempts) {
                        // No (more) retry => set status and reject
                        retryCount = 0;
                        request.status = reqerror.status;
                        deferred.reject(request);
                    } else {
                        // Retry
                        setTimeout(function() {
                            retryCount++;
                            _load.call(self, request, deferred);
                        }, retryInterval);
                    }
                });           

        };

    return {
        metricsModel: undefined,
        debug: undefined,
        tokenAuthentication: undefined,
        config: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            retryAttempts = this.config.getParam("FragmentLoader.RetryAttempts", "number", DEFAULT_RETRY_ATTEMPTS);
            retryInterval = this.config.getParam("FragmentLoader.RetryInterval", "number", DEFAULT_RETRY_INTERVAL);
        },

        setType: function (value) {
            type = value;
        },

        load: function(request) {
            var deferred = Q.defer();

            // MSS use case: if initialization segment and data already ready (automatically generated),
            // then do not download segment
            if (request.type === "Initialization Segment" && request.data) {
                deferred.resolve(request, {data: request.data});
            } else {
                _load.call(this, request, deferred);
            }

            return deferred.promise;
        },

        abort: function() {
            var i = 0;

            for (i = 0; i < xhrs.length; i += 1) {
                this.debug.log("[FragmentLoader]["+type+"] Abort XHR " + (xhrs[i].responseURL ? xhrs[i].responseURL : ""));
                xhrs[i].abort();
            }

            xhrs.length = 0;
            xhrs = [];
        },

        checkForExistence: function(req) {
            if (!req) {
                return Q.when(null);
            }

            req.deferred = Q.defer();
            _checkForExistence.call(this, req);

            return req.deferred.promise;
        }
    };
};

MediaPlayer.dependencies.FragmentLoader.prototype = {
    constructor: MediaPlayer.dependencies.FragmentLoader
};

MediaPlayer.dependencies.FragmentLoader.eventList = {
    ENAME_LOADING_PROGRESS: "loadingProgress"
};