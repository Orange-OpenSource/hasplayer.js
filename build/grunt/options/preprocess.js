module.exports = function(grunt) {

    var protocols  = grunt.option('protocol'),
        protection = grunt.option('protection'),
        includeHls = true,
        includeMss = true;

    // Must check the type because it can be a boolean flag if no arguments are specified after the option.
    if (typeof(protocols) === 'string') {
        protocols = grunt.option('protocol').toLowerCase().split(',');
        includeHls = includeMss = false;

        for (var i in protocols) {
            if (protocols[i] === 'hls') {
                includeHls = true;
            } else if (protocols[i] === 'mss') {
                includeMss = true;
            }
            else if (protocols[i] !== 'dash') {
                console.error("PREPROCESS ERROR: protocol '" + protocols[i] + "' is not supported. Expected 'hls', 'mss' or 'dash'.");
            }
        }
    }

    if (typeof(protection) !== 'boolean') {
        protection = true;
    }

    var sendError = function(params) {
        return  'this.errHandler.sendError(' + params[0] + ', ' + params[1] + ');';
    };

    var reject = function(params) {
        return 'return Q.reject(' + params[0] + ')';
    };

    return {
        options: {
            context : {
                INCLUDE_HLS: includeHls,
                INCLUDE_MSS: includeMss,
                PROTECTION: protection,
                sendError: sendError,
                reject: reject
            }
        },
        multifile : {
            files : {
                '<%= preprocesspath %>/Context.js' : '<%= rootpath %>/app/js/streaming/Context.js',
                '<%= preprocesspath %>/playerSrc.html' : '<%= rootpath %>/samples/playerSrc.html',
                '<%= preprocesspath %>/Stream.js' : '<%= rootpath %>/app/js/streaming/Stream.js',
                '<%= preprocesspath %>/MssParser.js' : '<%= rootpath %>/app/js/mss/dependencies/MssParser.js'
            }
        }
    };
};
