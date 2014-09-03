Custom.rules.CustomDownloadRatioRule = function () {
    "use strict";

    /*
     * This rule is intended to be sure that we can download fragments in a
     * timely manner.  The general idea is that it should take longer to download
     * a fragment than it will take to play the fragment.
     *
     * This rule is not sufficient by itself.  We may be able to download a fragment
     * fine, but if the buffer is not sufficiently long playback hiccups will happen.
     * Be sure to use this rule in conjuction with the InsufficientBufferRule.
     */

    var checkRatio = function (newIdx, currentBandwidth, data) {
            var self = this,
                deferred = Q.defer();

            self.manifestExt.getRepresentationFor(newIdx, data).then(
                function(rep)
                {
                    self.manifestExt.getBandwidth(rep).then(
                        function (newBandwidth)
                        {
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

        checkIndex: function (current, metrics, data) {
            var self = this,
                httpRequests = metrics.HttpList,
                lastRequest,
                downloadTime,
                totalTime,
                downloadRatio,
                totalRatio,
                switchRatio,
                deferred,
                funcs,
                i,
                len,
                minBitrateIdx = this.metricsExt.getMinBitrateIdx(),
                maxBitrateIdx = this.metricsExt.getMaxBitrateIdx(),
                DOWNLOAD_RATIO_SAFETY_FACTOR = 0.75;

            self.debug.log("[DownloadRatioRules]", " Checking download ratio rule...");
            if (!metrics) {
                self.debug.log("[DownloadRatioRules]", " No metrics, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            if (httpRequests === null || httpRequests === undefined || httpRequests.length === 0) {
                self.debug.log("[DownloadRatioRules]", " No requests made for this stream yet, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            lastRequest = httpRequests[httpRequests.length - 1];

            totalTime = (lastRequest.tfinish.getTime() - lastRequest.trequest.getTime()) / 1000;
            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000;

            if (totalTime <= 0) {
                self.debug.log("[DownloadRatioRules]", " Don't know how long the download of the last fragment took, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            if (lastRequest.mediaduration === null ||
                lastRequest.mediaduration === undefined ||
                lastRequest.mediaduration <= 0) {
                self.debug.log("[DownloadRatioRules]", " Don't know the duration of the last media fragment, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            minBitrateIdx = minBitrateIdx ? minBitrateIdx : 0;

            // TODO : I structured this all goofy and messy.  fix plz

            deferred = Q.defer();

            totalRatio = lastRequest.mediaduration / totalTime;
            downloadRatio = (lastRequest.mediaduration / downloadTime) * DOWNLOAD_RATIO_SAFETY_FACTOR;

            if (isNaN(downloadRatio) || isNaN(totalRatio)) {
                self.debug.log("[DownloadRatioRules]", " Total time: " + totalTime + "s");
                self.debug.log("[DownloadRatioRules]", " Download time: " + downloadTime + "s");
                self.debug.log("[DownloadRatioRules]", " The ratios are NaN, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            self.debug.log("[DownloadRatioRules]", " Total ratio: " + totalRatio);
            self.debug.log("[DownloadRatioRules]", " Download ratio: " + downloadRatio);

//            if (totalRatio * 2 < downloadRatio) {
                // don't let data buffering or caching hide the time it 
                // took to down load the data in the latency bucket
                //downloadRatio = (totalRatio * DOWNLOAD_RATIO_SAFETY_FACTOR);
//            }

            self.debug.log("[DownloadRatioRules]", " Download ratio: " + downloadRatio);

            

            self.manifestExt.getRepresentationCount(data).then(
                function(max) {
                    // 0-based ids
                    max-=1;
                    //in case of minBitrateIdx = null, put it to 0
                    minBitrateIdx = minBitrateIdx ? minBitrateIdx : 0;
                    maxBitrateIdx = maxBitrateIdx && (maxBitrateIdx<max) ? maxBitrateIdx : max;
                    if (isNaN(downloadRatio)) {
                        self.debug.log("[DownloadRatioRules]", " Invalid ratio, bailing.");
                        deferred.resolve(new MediaPlayer.rules.SwitchRequest());

                    // if the downloadRation is poor or the current quality is greater than max, we must try to download the lower quality
                    } else if (downloadRatio < 1.0 || current > maxBitrateIdx) {
                        self.debug.log("[DownloadRatioRules]", " Download ratio is poor.");
                        if (current > minBitrateIdx) {
                            self.debug.log("[DownloadRatioRules]", " We are not at the lowest bitrate, so switch down.");
                            self.manifestExt.getRepresentationFor(current - 1, data).then(
                                function (representation1) {
                                    self.manifestExt.getBandwidth(representation1).then(
                                        function (oneDownBandwidth) {
                                            self.manifestExt.getRepresentationFor(current, data).then(
                                                function (representation2) {
                                                    self.manifestExt.getBandwidth(representation2).then(
                                                        function (currentBandwidth) {
                                                            switchRatio = oneDownBandwidth / currentBandwidth;
                                                            self.debug.log("[DownloadRatioRules]", " Switch ratio: " + switchRatio);

                                                            if (downloadRatio < switchRatio) {
                                                                self.debug.log("[DownloadRatioRules]", " Things must be going pretty bad, switch all the way down.");
                                                                deferred.resolve(new MediaPlayer.rules.SwitchRequest(0));
                                                            } else {
                                                                self.debug.log("[DownloadRatioRules]", " Things could be better, so just switch down one index.");
                                                                deferred.resolve(new MediaPlayer.rules.SwitchRequest(current - 1));
                                                            }
                                                        }
                                                    );
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        } else {
                            self.debug.log("[DownloadRatioRules]", " We are at the lowest bitrate and cannot switch down, use current.");
                            deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                        }
                    } else {
                        self.debug.log("[DownloadRatioRules]", " Download ratio is good.");
                        
                        if (current < maxBitrateIdx) {
                            self.debug.log("[DownloadRatioRules]", " We are not at the highest bitrate, so switch up.");
                            self.manifestExt.getRepresentationFor(current + 1, data).then(
                                function (representation1) {
                                    self.manifestExt.getBandwidth(representation1).then(
                                        function (oneUpBandwidth) {
                                            self.manifestExt.getRepresentationFor(current, data).then(
                                                function (representation2) {
                                                    self.manifestExt.getBandwidth(representation2).then(
                                                        function (currentBandwidth) {
                                                            switchRatio = oneUpBandwidth / currentBandwidth;
                                                            self.debug.log("[DownloadRatioRules]", " Switch ratio: " + switchRatio);

                                                            if (downloadRatio >= switchRatio) {
                                                                if (downloadRatio > 1000.0) {
                                                                    self.debug.log("[DownloadRatioRules]", " Tons of bandwidth available, go all the way up.");
                                                                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(max - 1));
                                                                }
                                                                else if (downloadRatio > 100.0) {
                                                                    self.debug.log("[DownloadRatioRules]", " Just enough bandwidth available, switch up one.");
                                                                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(current + 1));
                                                                }
                                                                else {
                                                                    self.debug.log("[DownloadRatioRules]", " Not exactly sure where to go, so do some math.");
                                                                    i = -1;
                                                                    funcs = [];
                                                                    while ((i += 1) < max) {
                                                                        funcs.push(checkRatio.call(self, i, currentBandwidth, data));
                                                                    }

                                                                    Q.all(funcs).then(
                                                                        function (results) {
                                                                            for (i = 0, len = results.length; i < len; i += 1) {
                                                                                if (downloadRatio < results[i]) {
                                                                                    break;
                                                                                }
                                                                            }
                                                                            self.debug.log("[DownloadRatioRules]", " Calculated ideal new quality index is: " + i);
                                                                            deferred.resolve(new MediaPlayer.rules.SwitchRequest(i));
                                                                        }
                                                                    );
                                                                }
                                                            } else {
                                                                self.debug.log("[DownloadRatioRules]", " Not enough bandwidth to switch up.");
                                                                deferred.resolve(new MediaPlayer.rules.SwitchRequest());
                                                            }
                                                        }
                                                    );
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        } else {
                            self.debug.log("[DownloadRatioRules]", " We are at the highest bitrate and cannot switch up, use current.");
                            deferred.resolve(new MediaPlayer.rules.SwitchRequest(max));
                        }
                    }
                }

               
            );

            return deferred.promise;
        }
    };
};

Custom.rules.CustomDownloadRatioRule.prototype = {
    constructor: Custom.rules.CustomDownloadRatioRule
};