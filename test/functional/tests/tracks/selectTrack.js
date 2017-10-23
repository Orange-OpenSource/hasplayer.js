/**
TEST_SELECTTRACK:

- for each stream:
    - load test page
    - load stream
    - get tracks and selected track for given type
    - select a different track
    - check if <video> is playing with the new selected track
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
    var NAME = 'TEST_SELECTTRACK';

    // Test configuration (see config/testConfig.js)
    var streams = tests.getTestStreams(config.tests.selectTrack, function(stream) {
            if ((stream.audioTracks && stream.audioTracks.length > 1) ||
                (stream.textTracks && stream.textTracks.length > 1)) {
                return true;
            }
            return false;
        });

    // Test constants
    var PROGRESS_DELAY = 5; // Delay for checking progressing (in s)
    var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;

    // Test variables
    var command = null,
        _tracks = null,
        _newTrack = null,
        i;

    var _isSameTrack = function (track1, track2) {
        return (track1.id === track2.id) && (track1.lang === track2.lang) && (track1.subType === track2.subType);
    };

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

            enableSubtitles: function() {
                tests.log(NAME, 'Enable subtitles');
                return command.execute(player.enableSubtitles, [true])
                    .then(function() {
                        return command.execute(player.isSubtitlesEnabled);
                    })
                    .then(function(enabled) {
                        assert.isTrue(enabled);
                    });
            },

            selectTrack: function() {
                return command.execute(player.getTracks, [type])
                    .then(function(tracks) {
                        tests.log(NAME, type + ' tracks: ' + JSON.stringify(tracks));
                        _tracks = tracks;
                        return command.execute(player.getSelectedTrack, [type]);
                    })
                    .then(function(track) {
                        tests.log(NAME, 'Selected ' + type + ' track: ' + JSON.stringify(track));
                        _newTrack = _tracks[0];
                        for (var i = 0; i < _tracks.length; i++) {
                            if (!_isSameTrack(_tracks[i], track)) {
                                _newTrack = _tracks[i];
                                break;
                            }
                        }
                        tests.log(NAME, 'Select ' + type + ' track = ' + JSON.stringify(_newTrack));
                        return command.execute(player.selectTrack, [type, _newTrack]);
                    })
                    .then(function() {
                        tests.log(NAME, 'Check if playing');
                        return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT);
                    })
                    .then(function() {
                        return command.execute(player.getSelectedTrack, [type]);
                    })
                    .then(function(track) {
                        tests.log(NAME, 'Selected ' + type + ' track: ' + JSON.stringify(track));
                        assert.strictEqual(JSON.stringify(_newTrack), JSON.stringify(track));
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
