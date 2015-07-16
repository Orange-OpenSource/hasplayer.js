module.exports = function() {

    var debugFuncs = [],
        logLevels = ["error", "warn", "info", "debug", "log"];
        

    for (var i = 0; i < logLevels.length; i++) {
        debugFuncs.push("self.debug." + logLevels[i]);
        debugFuncs.push("this.debug." + logLevels[i]);
        debugFuncs.push("rslt.debug." + logLevels[i]);
    }

    return {
        generated: {
            options: {
                beautify: true,
                compress: false,
                mangle: false,
                banner: '//COPYRIGHT/* Last build : @@TIMESTAMP / git revision : @@REVISION */\n /* jshint ignore:start */\n',
                footer: '\n/* jshint ignore:end */'
            }
        },

        min: {
            options: {
                compress:{
                    pure_funcs: debugFuncs,
                    drop_console : true,
                    drop_debugger: true,
                    warnings: false
                },
                preserveComments: 'all'
            },
            files: {
                '<%= path %>/hasplayer.min.js': ['<%= path %>/hasplayer.js']
            }
        },

        json: {
            options: {
                beautify : false,
                mangle: false
            },
            files: {
                '<%= path %>/json.js': ['<%= path %>/json.js']
            }
        }
    };

};