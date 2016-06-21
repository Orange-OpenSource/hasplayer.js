/**
TEST_SEEKDVR:

- load test page
- for each stream:
    - load stream
    - get stream window DVR range (OrangeHasPlayer.getDVRWindowRange())
    - repeat N times:
        - seek at a random position (OrangeHasPlayer.seek())
        - check if <video> is playing at new position
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
        var NAME = 'TEST_SEEKDVR';

        // Test configuration (see config/testConfig.js)
        var testConfig = config.tests.play.seekDVR,
            streams = testConfig.streams;

        // Test constants
        var PROGRESS_DELAY = 2; // Delay for checking progressing (in s) 
        var SEEK_SLEEP = 200;   // Delay before each seek operation (in ms)
        var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;


        // Test variables
        var command = null,
            _dvrRange = null,
            i, j;

        var generateSeekPos = function () {
            var pos = _dvrRange? Math.round(Math.random() * (_dvrRange.end - _dvrRange.start) * 100) / 100 : null;
            
            if (pos) {
                pos = _dvrRange.start + pos;
               
                if (pos > (_dvrRange.end - PROGRESS_DELAY)) {
                    pos -= PROGRESS_DELAY;
                }
                if (pos < (_dvrRange.start + PROGRESS_DELAY)) {
                    pos += PROGRESS_DELAY;
                }
            }
            return pos;
        };

        var testSetup = function (stream) {
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
                    .then(function () {
                        tests.log(NAME, 'Check if playing after ' + PROGRESS_DELAY + 's.');
                        return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT);
                    });
                }
            });
        };

        var test = function (progressDelay) {

            registerSuite({
                name: NAME,

                seekDVR: function () {
                    var seekPos;

                    return command.sleep(SEEK_SLEEP)
                    .then(function () {
                        return command.execute(player.getDVRWindowRange);
                    })
                    .then(function (dvrRange) {
                        _dvrRange = dvrRange;
                        assert.isTrue(_dvrRange !== null);
                        tests.log(NAME, 'dvrRange start: ' + _dvrRange.start+' end: '+_dvrRange.end);
                        seekPos = generateSeekPos();
                        tests.log(NAME, 'Seek: ' + seekPos);
                        return tests.executeAsync(command, player.seek, [seekPos], config.asyncTimeout);
                    })
                    .then(function () {
                        if (progressDelay >= 0) {
                            command.execute(video.getCurrentTime)
                            .then(function (time) {
                                tests.log(NAME, 'Check current time ' + time);
                                assert.isTrue(time >= seekPos);
                                if (progressDelay > 0) {
                                    tests.log(NAME, 'Check if playing after ' + progressDelay + 's.');
                                    return tests.executeAsync(command, video.isPlaying, [progressDelay], (progressDelay + config.asyncTimeout))
                                    .then(function(playing) {
                                        assert.isTrue(playing);
                                    });
                                }
                            });
                        }
                    });
                }
            });
        };


        for (i = 0; i < streams.length; i++) {

            // setup: load test page and stream
            testSetup(streams[i]);

            // Performs seeks and wait for playing and progressing
            for (j = 0; j < testConfig.seekCount; j++) {
                test(PROGRESS_DELAY);
            }

            // Performs seeks and wait for playing before each seek
            for (j = 0; j < testConfig.seekCount; j++) {
                test(j < (testConfig.seekCount - 1) ? 0 : PROGRESS_DELAY);
            }

            // Performs (fast) seeks, do not wait for playing before each seek
            for (j = 0; j < testConfig.seekCount; j++) {
                test(j < (testConfig.seekCount - 1) ? -1 : PROGRESS_DELAY);
            }
        }

});
