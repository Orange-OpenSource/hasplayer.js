/**
TEST_ENDEDVENT:

- for each stream:
    - load test page
    - load stream (OrangeHasPlayer.load())
    - wait for stream to be loaded
    - seek near the end of the stream and check if ended event is sent
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
    var NAME = 'TEST_ENDEDVENT';

    // Test configuration (see config/testConfig.js)
    var streams = tests.getTestStreams(config.tests.endedEvent, function(stream) {
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

            getEndEvent: function() {

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

                        tests.log(NAME, "duration " + duration);
                        return tests.executeAsync(command, player.seek, [duration - 5], config.asyncTimeout);
                    })
                    // .then(function() {
                    //     if (trickModeEnabled) {
                    //         tests.log(NAME, "detect ended event in trick mode");
                    //         return command.execute(player.setTrickModeSpeed, [2]);
                    //     } else {
                    //         tests.log(NAME, "detect ended event in normal mode");
                    //         return command.execute(player.getMute);
                    //     }
                    // })
                    .then(function() {
                        tests.log(NAME, "Wait for ended event");
                        return tests.executeAsync(command, player.waitForEvent, ['ended'], config.asyncTimeout);
                    })
                    .then(function(ended) {
                        assert.isTrue(ended);
                    });
            }
        });
    };


    var testSeekAtEnd = function(stream) {
            
        registerSuite({
            name: NAME,
                    
            getEndEvent: function() {

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
                        tests.log(NAME, "duration " + duration);
                        return tests.executeAsync(command, player.seek, [duration], config.asyncTimeout);
                    })
                    .then(function() {
                        tests.log(NAME, "Wait for ended event");
                        return tests.executeAsync(command, player.waitForEvent, ['ended'], config.asyncTimeout);
                    })
                    .then(function(ended) {
                        assert.isTrue(ended);
                    });
            }
        });
    };

    // Setup (load test page)
    testSetup();

    for (var i = 0; i < streams.length; i++) {
        test(streams[i]);
        testSeekAtEnd(streams[i]);
    }
});
