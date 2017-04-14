/**
TEST_GETTRACKS:

- for each stream:
    - load test page
    - load stream
    - check list of trakcs of given type
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
    var NAME = 'TEST_GETTRACKS';

    // Test configuration (see config/testConfig.js)
    var streams = tests.getTestStreams(config.tests.getTracks, function(stream) {
            if (stream.audioTracks || stream.textTracks) {
                return true;
            }
            return false;
        });

    // Test constants
    var PROGRESS_DELAY = 5;
    var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;

    // Test variables
    var command = null,
        i;

    var test = function(stream, type) {

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

            getTracks: function() {
                return command.execute(player.getTracks, [type])
                    .then(function(tracks) {
                        var streamTracks = type === 'audio' ? stream.audioTracks : stream.textTracks;
                        tests.log(NAME, type + ' tracks ' + JSON.stringify(tracks));
                        tests.log(NAME, type + ' expected tracks ' + JSON.stringify(streamTracks));
                        for (i = 0; i < tracks.length; i++) {
                            console.log("### " + tracks[i].subType);
                        }
                        assert.sameDeepMembers(streamTracks, tracks);
                    });
            }
        });
    };


    for (i = 0; i < streams.length; i++) {
        if (streams[i].audioTracks) {
            test(streams[i], 'audio');
        }
    }

    for (i = 0; i < streams.length; i++) {
        if (streams[i].textTracks) {
            test(streams[i], 'text');
        }
    }
});
