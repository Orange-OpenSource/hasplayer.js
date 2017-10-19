define(function () {

    var PLAY_TESTS = [
        'test/functional/tests/play/play',
        'test/functional/tests/play/zappingVod',
        'test/functional/tests/play/zappingLive',
        'test/functional/tests/play/seek',
        'test/functional/tests/play/seekDVR',
        'test/functional/tests/play/pause',
        'test/functional/tests/play/stop'
    ];

    var API_TESTS = [
        'test/functional/tests/api/getVideoBitrates',
        'test/functional/tests/api/getDuration',
        'test/functional/tests/api/isLive',
        'test/functional/tests/api/endedEvent',
        'test/functional/tests/api/getDVRWindowRange'
    ];

    var TRACK_TESTS = [
        'test/functional/tests/tracks/getTracks',
        'test/functional/tests/tracks/setDefaultLang',
        'test/functional/tests/tracks/selectTrack',
        'test/functional/tests/tracks/enableSubtitles'
    ];

    var ALL = PLAY_TESTS.concat(API_TESTS, TRACK_TESTS);
    var PLAY = PLAY_TESTS;
    var API = API_TESTS;
    var TRACK = TRACK_TESTS;

    return {
        all: ALL,

        play: PLAY,

        api: API,

        track: TRACK
    };
});
