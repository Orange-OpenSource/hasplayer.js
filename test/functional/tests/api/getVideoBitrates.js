/**
TEST_GETVIDEOBITRATES:

- for each stream:
    - load test page
    - load stream (OrangeHasPlayer.load())
    - wait for stream to be loaded
    - get and check video bitrates values
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
        var NAME = 'TEST_GETVIDEOBITRATES';

        // Test configuration (see config/testConfig.js)
        var testConfig = config.tests.api.getVideoBitrates,
            streams = testConfig.streams;

        // Test constants

        // Test variables
        var command = null;

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

        var test = function(stream) {

            registerSuite({
                name: NAME,

                loadStream: function() {
                    tests.logLoadStream(NAME, stream);
                    return command.execute(player.loadStream, [stream]);
                },

                getVideoBitrates: function() {
                    return tests.executeAsync(command, player.waitForEvent, ['loadeddata'], config.asyncTimeout)
                    .then(function(loaded) {
                        assert.isTrue(loaded);
                        return command.execute(player.getVideoBitrates);
                    })
                    .then(function (videoBitrates) {
                        tests.log(NAME, 'Video bitrates: ' + JSON.stringify(videoBitrates));
                        // Compare bitrates arrays by simply comparing stringified representation
                        assert.strictEqual(JSON.stringify(stream.videoBitrates), JSON.stringify(videoBitrates));
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
