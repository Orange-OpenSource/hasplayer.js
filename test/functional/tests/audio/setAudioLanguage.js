/**
TEST_SETAUDIOLANGUAGE:

- load test page
- for each stream:
    - load stream
    - get Audio tracks and selected audio track
    - repeat N times:
        - select a specific track
        - check if <video> is playing with the new audio track
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
        var NAME = 'TEST_SETAUDIOLANGUAGE';

        // Test configuration (see config/testConfig.js)
        var testConfig = config.tests.audio.setAudioLanguage,
            streams = testConfig.streams;

        // Test constants
        var PROGRESS_DELAY = 2; // Delay for checking progressing (in s) 
        var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;


        // Test variables
        var command = null,
            _audioTracks = null,
            _selectedAudioTrack = null,
            _newAudioTrack = null,
            i;

        var test = function (stream) {
            registerSuite({
                name: NAME,

                setup: function() {
                    tests.log(NAME, 'Setup');
                    command = this.remote.get(require.toUrl(config.testPage));
                    command = tests.setup(command);
                    return command;
                },

                play: function() {
                    tests.log(NAME, 'default audio lang = '+stream.defaultAudioLang);
                    return command.execute(player.setDefaultAudioLanguage,[stream.defaultAudioLang])
                    .then(function () {
                        tests.logLoadStream(NAME, stream);
                        return command.execute(player.loadStream, [stream]);
                    })
                    .then(function () {
                        tests.log(NAME, 'Check if playing after ' + PROGRESS_DELAY + 's.');
                        return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT);
                    })
                    .then(function(playing) {
                        assert.isTrue(playing);
                        return command.execute(player.getSelectedAudioLanguage);
                    })
                    .then(function (audioTrack) {
                        tests.log(NAME, 'current audioTrack lang = '+audioTrack.lang);
                        tests.log(NAME, 'default audioTrack lang = '+stream.defaultAudioLang);
                        assert.isTrue(audioTrack.lang === stream.defaultAudioLang);
                        return command.execute(player.getAudioLanguages);
                    })
                    .then(function (audioTracks) {
                        _audioTracks = audioTracks;
                        tests.log(NAME, 'audioTracks ok');
                        return command.execute(player.getSelectedAudioLanguage);
                    })
                    .then(function (audioTrack) {
                        _selectedAudioTrack = audioTrack;
                        tests.log(NAME, 'selected audioTrack id = '+_selectedAudioTrack.id);
                        for (var i = 0; i < _audioTracks.length; i++) {
                            if (_audioTracks[i] !== _selectedAudioTrack) {
                                _newAudioTrack = _audioTracks[i];
                                break;
                            }
                        }
                        return command.execute(player.setSelectedAudioLanguage,[_newAudioTrack]);
                    })
                    .then(function () {
                        tests.log(NAME, 'new selected audioTrack id = '+_newAudioTrack.id);
                        return command.execute(player.getSelectedAudioLanguage);
                    })
                    .then(function (audioTrack) {
                        tests.log(NAME, 'selected audioTrack id = '+audioTrack.id);
                        assert.strictEqual(JSON.stringify(_newAudioTrack), JSON.stringify(audioTrack));
                    });
                }
            });
        };

        for (i = 0; i < streams.length; i++) {
            // setup: load test page and stream
            test(streams[i]);
        }

});
