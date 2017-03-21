/**
TEST_SETDEFAULTLANG:

- for each stream:
    - load test page
    - set default language of given type
    - check if default language is correctly set
    - load stream
    - check if selected track correspond to default language
**/
define([
    'intern!object',
    'intern/chai!assert',
    'require',
    'test/functional/config/testsConfig',
    'test/functional/tests/player_functions',
    'test/functional/tests/video_functions',
    'test/functional/tests/tests_functions'
], function(registerSuite, assert, require, config, player, video, tests) {

    // Suite name
    var NAME = 'TEST_SETDEFAULTLANG';

    // Test configuration (see config/testConfig.js)
    var streams = tests.getTestStreams(config.tests.setDefaultLang, function(stream) {
        if (stream.audioTracks || stream.textTracks) {
            return true;
        }
        return false;
    });

    // Test constants
    var PROGRESS_DELAY = 5; // Delay for checking progressing (in s)
    var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;

    // Test variables
    var command = null,
        i, j;

    var test = function(stream, type, defaultLang) {
        registerSuite({
            name: NAME,

            setup: function() {
                tests.log(NAME, 'Setup');
                command = this.remote.get(require.toUrl(config.testPage));
                command = tests.setup(command);
                return command;
            },

            setDefaultLang: function() {
                tests.log(NAME, 'Set default ' + type + ' lang = ' + defaultLang);
                return command.execute(player.setDefaultLang, [type, defaultLang])
                    .then(function() {
                        return command.execute(player.getDefaultLang, [type]);
                    })
                    .then(function(lang) {
                        tests.log(NAME, 'Default ' + type + ' lang: ' + defaultLang);
                        assert.strictEqual(lang, defaultLang);
                    });
            },

            play: function() {
                tests.logLoadStream(NAME, stream);
                return command.execute(player.loadStream, [stream])
                    .then(function() {
                        return command.execute(player.enableSubtitles, [true]);
                    })
                    .then(function() {
                        return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT);
                    })
                    .then(function(playing) {
                        assert.isTrue(playing);
                    });
            },

            checkLang: function() {
                return command.execute(player.getSelectedTrack, [type])
                    .then(function(track) {
                        tests.log(NAME, 'Selected ' + type + ' track: ' + JSON.stringify(track));
                        assert.isTrue(track.lang === defaultLang);
                    });
            }
        });
    };

    for (i = 0; i < streams.length; i++) {
        if (streams[i].audioTracks) {
            for (j = 0; j < streams[i].audioTracks.length; j++) {
                test(streams[i], 'audio', streams[i].audioTracks[j].lang);
            }
        }
    }

    for (i = 0; i < streams.length; i++) {
        if (streams[i].textTracks) {
            for (j = 0; j < streams[i].textTracks.length; j++) {
                test(streams[i], 'text', streams[i].textTracks[j].lang);
            }
        }
    }

});
