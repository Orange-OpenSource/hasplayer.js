Custom.dependencies.CustomFragmentLoader = function () {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.FragmentLoader);

    rslt.load = function(req){
         var deferred = Q.defer();
        // we already have the data so no need to do request
        if(req.type == "Initialization Segment" && req.data){
            deferred.resolve(req,{data:req.data});
        }else{
            deferred.promise = this.parent.load.call(this,req);
        }

        return deferred.promise;
    };

    return rslt;
};

Custom.dependencies.CustomFragmentLoader.prototype = {
    constructor: Custom.dependencies.CustomFragmentLoader
};
