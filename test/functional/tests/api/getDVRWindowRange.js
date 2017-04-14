/**
TEST_GETDVRWINDOWRANGE:

- load test page
- for each stream:
    - load stream
    - get stream window DVR range (OrangeHasPlayer.getDVRWindowRange())
    - check if DVR window range is progressing
    - pause the stream and check if DVR window range is still progressing
    - seek backward and check if DVR window range is still progressing
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
    var NAME = 'TEST_GETDVRWINDOWRANGE';

    // Test configuration (see config/testConfig.js)
    var streams = tests.getTestStreams(config.tests.getDVRWindowRange, function(stream) {
            if (stream.dvr === true) {
                return true;
            }
            return false;
        });

    // Test constants
    var PROGRESS_DELAY = 5; // Delay for checking progressing (in s)
    var DVRPROGRESS_DELAY = 20000; // Delay before checking DVR window range progress (in ms)
    var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;

    // Test variables
    var command = null,
        _range = null,
        i;

    var checkDVRWindowRange = function(range, progress) {
        assert.isTrue(range !== null);
        tests.log(NAME, 'range: ' + range.start + ' - ' + range.end);
        if (progress) {
            progress /= 1000;
            progress *= 0.75;
            assert.isAtLeast(range.start, (_range.start + progress));
        }
        _range = range;
    };

    var test = function(stream) {

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
                return command.execute(player.loadStream, [stream])
                    .then(function() {
                        return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT);
                    })
                    .then(function(playing) {
                        assert.isTrue(playing);
                    });
            },

            getDVRWindowRange: function() {
                return command.execute(player.getDVRWindowRange)
                    .then(function(range) {
                        checkDVRWindowRange(range);
                        return command.sleep(DVRPROGRESS_DELAY);
                    })
                    .then(function() {
                        return command.execute(player.getDVRWindowRange);
                    })
                    .then(function(range) {
                        checkDVRWindowRange(range, DVRPROGRESS_DELAY);
                    });
            },

            pauseAndGetDVRWindowRange: function() {
                return command.execute(player.pause)
                    .then(function() {
                        return command.sleep(DVRPROGRESS_DELAY);
                    })
                    .then(function() {
                        return command.execute(player.getDVRWindowRange);
                    })
                    .then(function(range) {
                        checkDVRWindowRange(range, DVRPROGRESS_DELAY);
                    });
            },

            seekAndGetDVRWindowRange: function() {
                return command.execute(player.play)
                    .then(function() {
                        var seekPos = _range.start + (_range.end - _range.start) / 2;
                        return command.execute(player.seek, [seekPos]);
                    })
                    .then(function() {
                        return command.sleep(DVRPROGRESS_DELAY);
                    })
                    .then(function() {
                        return command.execute(player.getDVRWindowRange);
                    })
                    .then(function(range) {
                        checkDVRWindowRange(range, DVRPROGRESS_DELAY);
                    });
            }
        });
    };


    for (i = 0; i < streams.length; i++) {
        test(streams[i]);
    }

});
