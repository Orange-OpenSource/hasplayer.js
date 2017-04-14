/**
TEST_ZAPPING:

- load test page
- enable licence persistence config on player
- for each stream:
    - load stream (OrangeHasPlayer.load())
    - check if <video> is playing and progressing
**/
define([
    'intern!object',
    'intern/chai!assert',
    'require',
    'test/functional/config/testsConfig',
    'test/functional/tests/player_functions',
    'test/functional/tests/video_functions',
    'test/functional/tests/tests_functions'
    ], function (registerSuite, assert, require, config, player, video, tests) {

    // Suite name
    var NAME = 'TEST_ZAPPING_LIVE';
    var TEST_NAME = '';

    // Test configuration (see config/testConfig.js)
    var testConfig = config.tests.zapping,
        streams = tests.getTestStreams(config.tests.zapping, function (stream) {
            if (stream.type === 'VOD') {
                return false;
            }
            return true;
        });

    // Test constants
    var PROGRESS_DELAY = 5; // Delay for checking progressing (in s)
    var SEEK_PLAY = 500; // Delay before each play operation (in ms)

    // Test variables
    var command = null,
        i;

    var testSetup = function (licensePersistence) {
        registerSuite({
            name: TEST_NAME,

            setup: function () {
                tests.log(NAME, 'Setup MediaPlayer with licensePersistence = ' + licensePersistence);
                command = this.remote.get(require.toUrl(config.testPage));
                command = tests.setup(command);

                // Media Player configuration for test
                var params = {
                    // Protection parameters
                    "Protection.licensePersistence": licensePersistence
                };
                return command.execute(player.setParams, [params]);
            }
        });
    };

    var test = function (stream, progressDelay) {

        registerSuite({
            name: TEST_NAME,

            zapping: function () {
                return command.sleep(SEEK_PLAY)
                    .then(function () {
                        tests.logLoadStream(NAME, stream);
                        return command.execute(player.loadStream, [stream]);
                    })
                    .then(function () {
                        if (progressDelay >= 0) {
                            tests.log(NAME, 'Check if playing after ' + progressDelay + 's.');
                            return tests.executeAsync(command, video.isPlaying, [progressDelay], (progressDelay + config.asyncTimeout))
                                .then(function (playing) {
                                    assert.isTrue(playing);
                                });
                        }
                    });
            }
        });
    };

    var performTest = function (licensePersistence) {

        TEST_NAME = NAME + " (License Persistence : " + licensePersistence + ")"
        testSetup(licensePersistence);

        // Zapping (change stream after some progressing)
        for (i = 0; i < streams.length; i++) {
            test(streams[i], PROGRESS_DELAY);
        }

        // Zapping (change stream as soon as playing)
        for (i = 0; i < streams.length; i++) {
            test(streams[i], i < (streams.length - 1) ? 0 : PROGRESS_DELAY);
        }

        // Fast zapping (change stream without waiting for playing)
        for (i = 0; i < streams.length; i++) {
            test(streams[i], i < (streams.length - 1) ? -1 : PROGRESS_DELAY);
        }
    }

    // test with license persistence (to test live DRM streams)
    performTest(true);

    // test without license persistence (to test live DRM streams)
    performTest(false);

});
