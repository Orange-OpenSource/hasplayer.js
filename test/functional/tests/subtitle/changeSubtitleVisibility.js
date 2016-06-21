/**
TEST_CHANGESUBTITLEVISIBILITY:

- load test page
- for each stream:
    - load stream
    - enable Subtitles
    - test visibility
    - disable Subtitles
    - test visibility
    - repeat N times:
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
        var NAME = 'TEST_CHANGESUBTITLEVISIBILITY';

        // Test configuration (see config/testConfig.js)
        var testConfig = config.tests.subtitle.changeSubtitleVisibility,
            streams = testConfig.streams;

        // Test constants
        var PROGRESS_DELAY = 2; // Delay for checking progressing (in s) 
        var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;


        // Test variables
        var command = null,
            i;

        var test = function (stream) {
            registerSuite({
                name: NAME,

                setup: function() {
                    tests.log(NAME, 'Setup');
                    command = this.remote.get(require.toUrl(config.testPage));
                    command = tests.setup(command);
                    return command;
                },

                play: function() {
                    tests.logLoadStream(NAME, stream);
                    return command.execute(player.setDefaultSubtitleLanguage,[stream.defaultSubtitleLang])
                    .then(function () {
                        return command.execute(player.loadStream, [stream]);
                    })
                    .then(function () {
                        tests.log(NAME, 'Check if playing after ' + PROGRESS_DELAY + 's.');
                        return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT);
                    })
                    .then(function() {
                        return command.execute(player.setSubtitlesVisibility,[true]);
                    })
                    .then(function () {
                        tests.log(NAME, 'subtitles visibility ok');
                        return command.execute(player.getSelectedSubtitleLanguage);
                    })
                    .then(function (subtitleTrack) {
                        tests.log(NAME, 'current subtitleTrack lang = '+subtitleTrack.lang);
                        tests.log(NAME, 'default subtitleTrack lang = '+stream.defaultSubtitleLang);
                        assert.isTrue(subtitleTrack.lang === stream.defaultSubtitleLang);
                        return command.execute(player.setSubtitlesVisibility,[false]);
                    })
                    .then(function () {
                        tests.log(NAME, 'subtitles visibility hidden');
                        return command.execute(player.getSelectedSubtitleLanguage);
                    })
                    .then(function (subtitleTrack) {
                        assert.isTrue(subtitleTrack === null);
                    });
                }
            });
        };

        for (i = 0; i < streams.length; i++) {
            // setup: load test page and stream
            test(streams[i]);
        }

});