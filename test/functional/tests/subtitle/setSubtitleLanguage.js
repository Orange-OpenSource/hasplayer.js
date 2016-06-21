/**
TEST_SETSUBTITLELANGUAGE:

- load test page
- for each stream:
    - load stream
    - get Subtitle tracks and selected subtitle track
    - repeat N times:
        - select a specific track
        - check if <video> is playing with the new subtitle track
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
        var NAME = 'TEST_SETSUBTITLELANGUAGE';

        // Test configuration (see config/testConfig.js)
        var testConfig = config.tests.subtitle.setSubtitleLanguage,
            streams = testConfig.streams;

        // Test constants
        var PROGRESS_DELAY = 2; // Delay for checking progressing (in s) 
        var SEEK_SLEEP = 200;   // Delay before each seek operation (in ms)
        var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;


        // Test variables
        var command = null,
            _subtitleTracks = null,
            _selectedSubtitleTrack = null,
            _newSubtitleTrack = null,
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
                    tests.logLoadStream(NAME, stream);
                    return command.execute(player.loadStream, [stream])
                    .then(function () {
                        tests.log(NAME, 'Check if playing after ' + PROGRESS_DELAY + 's.');
                        return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT);
                    })
                    .then(function(playing) {
                        assert.isTrue(playing);
                        return command.execute(player.getSubtitleLanguages);
                    })
                    .then(function (subtitleTracks) {
                        _subtitleTracks = subtitleTracks;
                        tests.log(NAME, 'subtitleTracks ok');
                        return command.execute(player.setSubtitlesVisibility,[true]);
                    })
                    .then(function () {
                        tests.log(NAME, 'subtitles visibility ok');
                        return command.execute(player.getSelectedSubtitleLanguage);
                    })
                    .then(function (subtitleTrack) {
                        _selectedSubtitleTrack = subtitleTrack;
                        tests.log(NAME, 'selected subtitleTrack id = '+_selectedSubtitleTrack.id);
                        for (var i = 0; i < _subtitleTracks.length; i++) {
                            if (_subtitleTracks[i] !== _selectedSubtitleTrack) {
                                _newSubtitleTrack = _subtitleTracks[i];
                                break;
                            }
                        }
                        return command.execute(player.setSelectedSubtitleLanguage,[_newSubtitleTrack]);
                    })
                    .then(function () {
                        tests.log(NAME, 'new selected subtitle id = '+_newSubtitleTrack.id);
                        return command.execute(player.getSelectedSubtitleLanguage);
                    })
                    .then(function (subtitleTrack) {
                        tests.log(NAME, 'selected subtitleTrack id = '+subtitleTrack.id);
                        assert.strictEqual(JSON.stringify(_newSubtitleTrack), JSON.stringify(subtitleTrack));
                    });
                }
            });
        };

        for (i = 0; i < streams.length; i++) {
            // setup: load test page and stream
            test(streams[i]);
        }

});