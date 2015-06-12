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
            if (protocols[i] === 'dash') {
                // Do nothing
            }
            else if (protocols[i] === 'hls') {
                includeHls = true;
            } else if (protocols[i] === 'mss') {
                includeMss = true;
            }
            else {
                console.error("PREPROCESS ERROR: protocol '" + protocols[i] + "' is not a valid option. Expected 'hls' and/or 'mss'.");
            }
        }
    }
    
    if (typeof(protection) !== 'boolean') {
        protection = true;
    }

    return {
        options: {
            context : {
                INCLUDE_HLS: includeHls,
                INCLUDE_MSS: includeMss,
                PROTECTION: protection
            }
        },
        multifile : {
            files : {
                '<%= preprocesspath %>/CustomContext.js' : '<%= rootpath %>/app/js/custom/di/CustomContext.js',
                '<%= preprocesspath %>/CustomContextNoRule.js' : '<%= rootpath %>/app/js/custom/di/CustomContextNoRule.js',
                '<%= preprocesspath %>/playerSrc.html' : '<%= rootpath %>/samples/playerSrc.html',
                '<%= preprocesspath %>/Context.js' : '<%= rootpath %>/app/js/streaming/Context.js',
                '<%= preprocesspath %>/Stream.js' : '<%= rootpath %>/app/js/streaming/Stream.js',
                '<%= preprocesspath %>/MssParser.js' : '<%= rootpath %>/app/js/mss/dependencies/MssParser.js'
            }
        }
    }
};
