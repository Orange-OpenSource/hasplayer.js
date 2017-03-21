/**
TEST_ENABLESUBTITLES:

- load test page
- for each stream:
    - enable subtitles
    - load stream
    - check if subtitles are enabled
    - check if subtitles are displayed (textTrack's cues)
- for each stream:
    - enable external display for subtitles
    - enable subtitles
    - check if subtitles are enabled
    - check if subtitles are displayed (cueEnter)
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
    var NAME = 'TEST_ENABLESUBTITLES';

    // Test configuration (see config/testConfig.js)
    var streams = tests.getTestStreams(config.tests.enableSubtitles, function(stream) {
        if (stream.textTracks) {
            return true;
        }
        return false;
    });

    // Test constants
    var PROGRESS_DELAY = 5; // Delay for checking progressing (in s)
    var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;
    var DETECT_SUBTITLES_TIMEOUT = 600;
    var DETECT_SUBTITLES_TEST_TIMEOUT = DETECT_SUBTITLES_TIMEOUT + config.asyncTimeout


    // Test variables
    var command = null,
        i;

    var testInternDisplay = function(stream) {
        registerSuite({
            name: NAME,

            setup: function() {
                tests.log(NAME, 'Setup testInternDisplay');
                command = this.remote.get(require.toUrl(config.testPage));
                command = tests.setup(command);
                return command;
            },

            enableSubtitles: function() {
                tests.log(NAME, 'Enable subtitles');
                return command.execute(player.enableSubtitles, [true])
                    .then(function() {
                        return command.execute(player.isSubtitlesEnabled);
                    })
                    .then(function(enabled) {
                        assert.isTrue(enabled);
                    });
            },

            play: function() {
                tests.logLoadStream(NAME, stream);
                return command.execute(player.loadStream, [stream])
                    .then(function() {
                        return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT);
                    })
                    .then(function(playing) {
                        assert.isTrue(playing);
                    });
            },

            checkSubtitles: function() {
                 this.timeout = DETECT_SUBTITLES_TEST_TIMEOUT * 1000;
                tests.log(NAME, 'Check if subtitles are displayed');
                return tests.executeAsync(command, video.waitForCues, [], DETECT_SUBTITLES_TIMEOUT)
                    .then(function(hasCues) {
                        assert.isTrue(hasCues);
                    });
            }
        });
    };

    var testExternDisplay = function(stream) {
        registerSuite({
            name: NAME,

            setup: function() {
                tests.log(NAME, 'Setup testExternDisplay');
                command = this.remote.get(require.toUrl(config.testPage));
                command = tests.setup(command);
                return command;
            },

            enableSubtitles: function() {
                tests.log(NAME, 'Enable subtitles');
                return command.execute(player.enableSubtitles, [true])
                    .then(function() {
                        return command.execute(player.isSubtitlesEnabled);
                    })
                    .then(function(enabled) {
                        assert.isTrue(enabled);
                    });
            },

            enableExternDisplay: function() {
                tests.log(NAME, 'Enable subtitles');
                return command.execute(player.enableSubtitleExternDisplay, [true]);
            },

            play: function() {
                tests.logLoadStream(NAME, stream);
                return command.execute(player.loadStream, [stream])
                    .then(function() {
                        return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT);
                    })
                    .then(function(playing) {
                        assert.isTrue(playing);
                    });
            },

            checkSubtitles: function() {

                this.timeout = DETECT_SUBTITLES_TEST_TIMEOUT * 1000;
                tests.log(NAME, 'Check if subtitles are externally displayed');
                return tests.executeAsync(command, player.waitForEvent, ['cueEnter'], DETECT_SUBTITLES_TIMEOUT)
                    .then(function(cue) {
                        assert.isTrue(cue.data !== undefined && cue.data !== null);
                    });
            },
        });
    };


    for (i = 0; i < streams.length; i++) {
        // setup: load test page and stream
        testInternDisplay(streams[i]);
        testExternDisplay(streams[i]);
    }

});
