/**
TEST_STOP:

- for each stream:
    - load test page
    - load stream (OrangeHasPlayer.load())
    - check if <video> is playing
    - check if <video> is progressing
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
        var NAME = 'TEST_STOP';

        // Test configuration (see config/testConfig.js)
        var testConfig = config.tests.play.stop,
            streams = testConfig.streams;

        // Test constants
        var PROGRESS_DELAY = 3;
        var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;
        var delta = 1;

        // Test variables
        var command = null;

        var test = function(stream) {

            registerSuite({
                name: NAME,

                setup: function() {
                    tests.log(NAME, 'Setup');
                    command = this.remote.get(require.toUrl(config.testPage));
                    command = tests.setup(command);
                    return command;
                },

                loadStream: function() {
                    tests.logLoadStream(NAME, stream);
                    return command.execute(player.loadStream, [stream]);
                },

                playing: function() {
                     tests.log(NAME, 'Check if playing after ' + PROGRESS_DELAY + 's.');
                    return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT)
                    .then(function(playing) {
                        assert.isTrue(playing);
                        return command.execute(player.stop);
                    })
                    .then( function () {
                        return command.execute(video.isPaused);
                    })
                    .then(function(paused) {
                        tests.log(NAME, 'Check if player is paused ');
                        assert.isTrue(paused);
                        return command.execute(player.play);
                    })
                    .then(function() {
                         tests.log(NAME, 'Check if playing after ' + PROGRESS_DELAY + 's.');
                         return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT);
                    })
                    .then(function(playing) {
                        assert.isTrue(playing);
                        tests.log(NAME, 'Check if video has restarted from the beginning');
                        return command.execute(video.getCurrentTime);
                    })
                    .then(function (time) {
                        assert.isTrue(PROGRESS_DELAY <= time <= PROGRESS_DELAY+delta);
                    });
                }
            });
        };

        for (var i = 0; i < streams.length; i++) {
            test(streams[i]);
        }
});
