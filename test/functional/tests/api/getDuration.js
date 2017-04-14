/**
TEST_GETDURATION:

- for each stream:
    - load test page
    - load stream (OrangeHasPlayer.load())
    - wait for stream to be loaded
    - get and check video duration value
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
    var NAME = 'TEST_GETDURATION';

    // Test configuration (see config/testConfig.js)
    var streams = tests.getTestStreams(config.tests.getDuration, function(stream) {
            if (stream.type === "VOD") {
                return true;
            }
            return false;
        });

    // Test constants
    var PROGRESS_DELAY = 5;
    var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;

    // Test variables
    var command = null;

    var testSetup = function() {
        registerSuite({
            name: NAME,

            setup: function() {
                tests.log(NAME, 'Setup');
                command = this.remote.get(require.toUrl(config.testPage));
                command = tests.setup(command);
                return command;
            }
        });
    };

    var test = function(stream) {

        registerSuite({
            name: NAME,

            getDuration: function() {
                tests.logLoadStream(NAME, stream);
                return command.execute(player.loadStream, [stream])
                    .then(function() {
                        return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT);
                    })
                    .then(function(playing) {
                        assert.isTrue(playing);
                        return command.execute(player.getDuration);
                    })
                    .then(function(duration) {
                        assert.strictEqual(stream.duration.toFixed(3), duration.toFixed(3));
                    });
            }
        });
    };

    // Setup (load test page)
    testSetup();

    for (var i = 0; i < streams.length; i++) {
        test(streams[i]);
    }
});
