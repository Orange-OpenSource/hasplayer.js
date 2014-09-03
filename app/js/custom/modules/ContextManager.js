Custom.modules.ContextManager = function (){
    "use strict";

    return {
        system: undefined,
        debug: undefined,

        setContext: function(ctx) {
            this.debug.log("Custom.modules.ContextManager::setContext",ctx);
            if (ctx === "MSS") {
                // here we map specific Class
                this.system.mapClass('mp4Processor', MediaPlayer.dependencies.Mp4Processor);
                this.system.mapClass('indexHandler', Mss.dependencies.MssHandler);
                this.system.mapClass('fragmentController', Mss.dependencies.MssFragmentController);
            } else {
                this.system.mapClass('fragmentController', MediaPlayer.dependencies.FragmentController);
                this.system.mapClass('indexHandler', Dash.dependencies.DashHandler);
            }
        }
    };
};

Custom.modules.ContextManager.prototype =  {
    constructor: Custom.modules.ContextManager
};


