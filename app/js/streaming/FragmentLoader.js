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
 MediaPlayer.dependencies.FragmentLoader = function () {
    "use strict";
    var rslt = {};

    var RETRY_ATTEMPTS = 3,
    RETRY_INTERVAL = 500,
    BYTESLENGTH = false,
    retryCount = 0,
    xhrs = [],

    _checkForExistence = function(request) {
        var req = new XMLHttpRequest(),
            isSuccessful = false;

        req.open("HEAD", request.url, true);

        req.onload = function () {
            if (req.status < 200 || req.status > 399) return;

            isSuccessful = true;

            request.deferred.resolve(request);
        };

        req.onloadend = req.onerror = function () {
            if (isSuccessful) return;

                request.deferred.reject(req);
        };

        req.send();
    };

    return {
        metricsModel: undefined,
        errHandler: undefined,
        debug: undefined,
        tokenAuthentication: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        doLoad: function (request, bytesRange) {
            var d = Q.defer();
            var req = new XMLHttpRequest(),
            httpRequestMetrics = null,
            firstProgress = true,
            needFailureReport = true,
            lastTraceTime = null,
            self = this;

            xhrs.push(req);
            request.requestStartDate = new Date();

            httpRequestMetrics = self.metricsModel.addHttpRequest(request.streamType,
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

            self.metricsModel.appendHttpTrace(httpRequestMetrics,
              request.requestStartDate,
              request.requestStartDate.getTime() - request.requestStartDate.getTime(),
              [0]);
            lastTraceTime = request.requestStartDate;

            req.open("GET", self.tokenAuthentication.addTokenAsQueryArg(request.url), true);
            req.responseType = "arraybuffer";
            req = self.tokenAuthentication.setTokenInRequestHeader(req);

            if (bytesRange) {
                req.setRequestHeader("Range", bytesRange);
            }

            req.onprogress = function (event) {
                var currentTime = new Date();
                if (firstProgress) {
                    firstProgress = false;
                    if (!event.lengthComputable || (event.lengthComputable && event.total !== event.loaded)) {
                        request.firstByteDate = currentTime;
                        httpRequestMetrics.tresponse = currentTime;
                    }
                }
                
                if (event.lengthComputable) {
                    request.bytesLoaded = event.loaded;
                    request.bytesTotal = event.total;
                }

                self.metricsModel.appendHttpTrace(httpRequestMetrics,
                  currentTime,
                  currentTime.getTime() - lastTraceTime.getTime(),
                  [request.bytesLoaded ? request.bytesLoaded : 0]);

                lastTraceTime = currentTime;

                self.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_PROGRESS, {request: request, httpRequestMetrics: httpRequestMetrics, lastTraceTime: lastTraceTime});

            };

            req.onload = function () {
                if (req.status < 200 || req.status > 399)
                {
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

                self.debug.log("[FragmentLoader]["+request.streamType+"] Loaded: " + request.url +" (" + req.status + ", " + latency + "ms, " + download + "ms)");

                httpRequestMetrics.tresponse = request.firstByteDate;
                httpRequestMetrics.tfinish = request.requestEndDate;
                httpRequestMetrics.responsecode = req.status;

                httpRequestMetrics.bytesLength = bytes ? bytes.byteLength : 0;

                self.metricsModel.appendHttpTrace(httpRequestMetrics,
                    currentTime,
                    currentTime.getTime() - lastTraceTime.getTime(),
                    [bytes ? bytes.byteLength : 0]);
                lastTraceTime = currentTime;

                d.resolve({
                    data: bytes,
                    request: request
                });
            };

            req.onabort = function(){
                req.aborted = true;
            };
            
            req.onloadend = req.onerror = function () {
                if (xhrs.indexOf(req) === -1) {
                    return;
                } else {
                    xhrs.splice(xhrs.indexOf(req), 1);
                }

                if (!needFailureReport)
                {
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
                  currentTime.getTime() - lastTraceTime.getTime(),
                  [bytes ? bytes.byteLength : 0]);
                lastTraceTime = currentTime;

                d.reject(req);
            };

            self.debug.log("[FragmentLoader]["+request.streamType+"] Load: " + request.url);

            req.send();
            return d.promise;
        },

        getBytesLength: function(request) {
            var d = Q.defer();
            var http = new XMLHttpRequest();

            http.open('HEAD', request.url);

            http.onreadystatechange = function () {
                if (http.status < 200 || http.status > 299) {
                    d.reject();
                } else {
                    if(http.getResponseHeader('Content-Length')) {
                        d.resolve(http.getResponseHeader('Content-Length'));
                    } else {
                        d.reject();
                    }
                }
            };
            http.send();
            return d.promise;
        },

        planRequests: function (req) {
            if (!req) {
                return Q.when(null);
            }

            var that = this;
            var d = Q.defer();

            if(BYTESLENGTH) {
                this.getBytesLength(req).then(function(bytesLength) {

                    BYTESLENGTH = true;

                    that.loadRequests(bytesLength, req).then(function(datas) {
                        var buffer1 = datas[0].data,
                        buffer2 = datas[1].data,
                        tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);

                        tmp.set(new Uint8Array(buffer1), 0);
                        tmp.set(new Uint8Array(buffer2), buffer1.byteLength);

                        d.resolve({
                            data: tmp.buffer,
                            request: req
                        });
                    });

                }, function() {
                    BYTESLENGTH = false;
                    d.resolve(that.doLoad(req, RETRY_ATTEMPTS));
                });
            } else {
                that.doLoad(req).then(function (result){
                  d.resolve(result);
                },function (reqerror){
                    //if status = 0, request has been aborted, do not retry....
                    if (!reqerror.aborted) {
                        that.retry(req,d,that);
                    }else{
                        req.status = 0;
                        d.reject(req);
                    }
            });
          }
            return d.promise;
        },

        retry: function (request, d, that) {
            setTimeout(function() {
                that.doLoad(request).then(function (result) {
                    retryCount = 0;
                    d.resolve(result);
                },function (error) {
                    retryCount++;
                    if (retryCount < RETRY_ATTEMPTS) {
                        that.retry(request,d,that);
                    }
                    else {
                        retryCount = 0;
                        d.reject(error);
                    }
                });
            }, RETRY_INTERVAL);
        },

        loadRequests: function(bytesLength, req) {

            var halfBytes = Math.floor(bytesLength/2),
            bytesFirstHalf = 'bytes=0-' + (halfBytes-1),
            bytesSecondHalf = 'bytes=' + halfBytes + '-' + bytesLength;

            return Q.all([
                this.doLoad(req, RETRY_ATTEMPTS, bytesFirstHalf),
                this.doLoad(req, RETRY_ATTEMPTS, bytesSecondHalf)
                ]);
        },

        load: function(req){
            var deferred = Q.defer();

            if(req.type === "Initialization Segment" && req.data){
                deferred.resolve(req,{data:req.data});
            } else {
                //this.debug.log("[FragmentLoader][load] planRequests"+req.url);
                this.planRequests(req).then(function(result) {
                    deferred.resolve(result);
                },function (error) {
                    deferred.reject(error);
                });
            }

            return deferred.promise;
        },

        abort: function() {
            var i,
                req,
                ln = xhrs.length;

            this.debug.log("[FragmentLoader] "+ln+" xhr requests to Abort.");
            for (i = 0; i < ln; i +=1) {
                req = xhrs[i];
                this.debug.log("[FragmentLoader] ### Abort XHR");
                req.abort();
                req = null;
            }

            xhrs.length = 0; // Clear array

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
    ENAME_LOADING_PROGRESS: "loadingProgress",
};