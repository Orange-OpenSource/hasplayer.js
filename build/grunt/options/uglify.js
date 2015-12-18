module.exports = function() {

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
                    drop_console : false,
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