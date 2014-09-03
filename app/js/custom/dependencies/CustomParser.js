Custom.dependencies.CustomParser = function () {
    "use strict";

    var customParse = function(data, baseUrl) {

        var parser = null;

        // we parse the response of the request to know the manifest type        
        if (data.indexOf("SmoothStreamingMedia")>-1) {
            this.system.notify('setContext','MSS');
            //do some business to transform it into a Dash Manifest
            parser = this.mssParser;
        } else if(data.indexOf("MPD")>-1) {
            this.system.notify('setContext','MPD');
            parser = this.dashParser;
        } else {
            console.error("manifest cannot be parse, type is unknown !");
            return Q.when(null);
        }

        return parser.parse(data,baseUrl);
    };

    return {
        debug: undefined,
        system: undefined,
        dashParser: undefined,
        mssParser: undefined,
        metricsModel: undefined,

        parse: customParse
    };
};

Custom.dependencies.CustomParser.prototype =  {
    constructor: Custom.dependencies.CustomParser
};
