/**
TEST_PLAY:

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
        var NAME = 'TEST_ERROR_MANIFEST';

        // Test configuration (see config/testConfig.js)
        var testConfig = config.tests.error.errorManifest,
            streams = testConfig.streams,
            errorCodes = testConfig.expectedErrorCodes;

        // Test constants
        var ASYNC_TIMEOUT = config.asyncTimeout;
        var ERROR_NEW_FILE = 2000;

        // Test variables
        var command = null;
        var error = null;

        var testSetup = function () {
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

        var test = function(stream, expectedErrorCodes) {

            registerSuite({
                name: NAME,

                loadManifestErrorTest: function() {
                    tests.logLoadStream(NAME, stream);
                    return command.execute(player.loadStream, [stream])
                    .then( function(){
                        return tests.executeAsync(command, player.getErrorCode, [], ASYNC_TIMEOUT);
                    })
                    .then(function (errorCode) {
                        tests.log(NAME, 'Error: ' + errorCode);
                        //assert.oneOf(errorCode, expectedErrorCodes);
                        assert.include(expectedErrorCodes, errorCode);
                    });
                }
            });
        };

        testSetup();

        for (var i = 0; i < streams.length; i++) {
            test(streams[i], errorCodes[i]);
        }
});