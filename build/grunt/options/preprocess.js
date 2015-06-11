module.exports = function(grunt) {

    var protocols  = grunt.option('protocol'),
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

    return {
        options: {
            context : {
                INCLUDE_HLS: includeHls,
                INCLUDE_MSS: includeMss
            }
        },
        multifile : {
            files : {
                '<%= preprocesspath %>/CustomContext.js' : '<%= rootpath %>/app/js/custom/di/CustomContext.js',
                '<%= preprocesspath %>/CustomContextNoRule.js' : '<%= rootpath %>/app/js/custom/di/CustomContextNoRule.js',
                '<%= preprocesspath %>/playerSrc.html' : '<%= rootpath %>/samples/playerSrc.html'
            }
        }
    }
};
