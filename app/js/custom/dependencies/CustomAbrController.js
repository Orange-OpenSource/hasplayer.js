
Custom.dependencies.CustomAbrController = function () {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.AbrController);

    rslt.metricsExt = undefined;
    rslt.debug = undefined;
    
    rslt.getPlaybackQuality = function (type, data)
    {
        var self = this;
        var deferred = Q.defer();

        // Get metrics for current data in order to get representation boundaries
        self.parent.getMetricsFor.call(self, data).then(
            function (metrics)
            {
                // Call parent's getPlaybackQuality function
                self.parent.getPlaybackQuality.call(self, type, data).then(
                    function (result)
                    {
                        var repBoundaries = self.metricsExt.getCurrentRepresentationBoundaries(metrics);
                        var newQuality = result.quality;

                        if (repBoundaries !== null)
                        {
                            if (newQuality < repBoundaries.min)
                            {
                                newQuality = repBoundaries.min;
                                self.debug.log("New quality < minQuality => " + newQuality);
                                self.parent.setPlaybackQuality.call(self, type, newQuality);
                            }
                            if (newQuality > repBoundaries.max)
                            {
                                newQuality = repBoundaries.max;
                                self.debug.log("New quality < minQuality => " + newQuality);
                                self.parent.setPlaybackQuality.call(self, type, newQuality);
                            }
                        }

                        deferred.resolve({quality: newQuality, confidence: result.confidence});
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
