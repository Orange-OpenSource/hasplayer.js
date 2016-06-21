/**
TEST_GETSUBTITLELANGUAGES:

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
        var NAME = 'TEST_GETSUBTITLELANGUAGES';

        // Test configuration (see config/testConfig.js)
        var testConfig = config.tests.api.getSubtitleLanguages,
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

                getSubtitleLanguages: function() {
                    return tests.executeAsync(command, player.waitForEvent, ['loadeddata'], config.asyncTimeout)
                    .then(function(loaded) {
                        assert.isTrue(loaded);
                        return command.execute(player.getSubtitleLanguages);
                    })
                    .then(function (subtitleTracks) {
                        for(var i = 0; i<subtitleTracks.length; i += 1){
                            tests.log(NAME, 'lang : '+subtitleTracks[i].lang+' subtitle track id : '+subtitleTracks[i].id);
                        }
                        // Compare languages arrays by simply comparing stringified representation
                       assert.sameDeepMembers(stream.subtitleTracks, subtitleTracks, 'same deep members');
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
