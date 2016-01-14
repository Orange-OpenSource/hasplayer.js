module.exports = function() {

    return {
        generated: {
            options: {
                beautify: true,
                compress: false,
                mangle: false,
                banner: '//COPYRIGHT/* Last build : @@TIMESTAMP / git revision : @@REVISION */\n /* jshint ignore:start */\n',
                footer: '\n/* jshint ignore:end */\n'
            }
        },

        min: {
            options: {
                compress:{
                    drop_console : false,
                    drop_debugger: true,
                    warnings: false
                },
                preserveComments: true,
                footer: '\n/* jshint ignore:end */\n' // Add again footer since it is removed by this task !?
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