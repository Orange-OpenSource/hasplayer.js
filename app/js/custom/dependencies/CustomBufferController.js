
Custom.dependencies.CustomBufferController = function () {
    "use strict";

    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.BufferController);
        
        rslt.fragmentController = undefined;
        rslt.sourceBufferExt = undefined;
    
    var mediaSource;

    rslt.initialize = function (type, periodInfo, data, buffer, videoModel, scheduler, fragmentController, source) {
        mediaSource = source;
        this.parent.initialize.apply(this,arguments);
    };

    rslt.emptyBuffer = function(currentTime) {
        var deferred = Q.defer(),
            //currentTime = this.videoModel.getCurrentTime(),
            removeStart = 0,
            selfParent = rslt.parent,
            buffer = selfParent.getBuffer(),
            fragmentModel = rslt.fragmentController.attachBufferController(rslt),
            removeEnd;

        if (buffer.buffered.length > 0) {
            var end = buffer.buffered.end(buffer.buffered.length - 1);
            removeEnd = end;
        }
        else {
            removeEnd = currentTime + 5;
        }
        
        rslt.debug.log("### " + rslt.getType() + " Remove from " + removeStart + " to " + (currentTime - 1) +  " (" + rslt.getVideoModel().getCurrentTime() + ")");
        rslt.sourceBufferExt.remove(buffer, removeStart, (currentTime - 1), selfParent.getPeriodInfo().duration, mediaSource).then(
            function(){
                rslt.debug.log("### " + rslt.getType() + " Remove from " + (currentTime + 3) + " to " + removeEnd +  " (" + rslt.getVideoModel().getCurrentTime() + ")");
                rslt.sourceBufferExt.remove(buffer, (currentTime + 3), removeEnd, selfParent.getPeriodInfo().duration, mediaSource).then(
                        function(){
                            rslt.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel,removeEnd);
                            deferred.resolve();

                            rslt.sourceBufferExt.getAllRanges(buffer).then(
                                function(ranges) {
                                    if (ranges) {
                                        if (ranges.length > 0) {
                                            var i,
                                                len;

                                            for (i = 0, len = ranges.length; i < len; i += 1) {
                                                rslt.debug.log("### " + rslt.getType() + " R Buffered Range: " + ranges.start(i) + " - " + ranges.end(i)+  " (" + rslt.getVideoModel().getCurrentTime() + ")");
                                            }
                                        }
                                    }
                                }
                            );
                        }
                    );
            });

        return deferred.promise;
    };

    return rslt;
};

Custom.dependencies.CustomBufferController.prototype = {
    constructor: Custom.dependencies.CustomBufferController
};
