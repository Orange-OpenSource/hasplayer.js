/* exported startTests */
/* global Output */
/* global mse_test_supports_media_source, mse_test_type_support, mse_test_append_data, mse_get_supported_codecs */
/* global eme_tests_support_eme, eme_tests_eme_enabled, eme_get_supported_cdm, eme_tests_support_key_system, eme_test_append_data */

function startTests() {

    /*------------------------------------------------------------------------------------------*/

    // TESTS DATA

    /*------------------------------------------------------------------------------------------*/

    var MSE_SEGMENT_INFO = {
        assetId: 'mp4-basic-clear',
        url: 'mp4/video_clear.mp4',
        type: 'video/mp4; codecs="avc1.4D4001,mp4a.40.2"',
        init: {
            offset: 0,
            size: 1323
        }
    };

    var EME_SEGMENT_INFO = {
        assetId: 'mp4-basic-enc',
        url: 'mp4/video_enc.mp4',
        type: 'video/mp4;codecs="avc1.4d401e"',
        initDataType: 'cenc',
        init: {
            offset: 0,
            size: 1964
        },
        keys: [{
            kid: [0xad, 0x13, 0xf9, 0xea, 0x2b, 0xe6, 0x98, 0xb8, 0x75, 0xf5, 0x04, 0xa8, 0xe3, 0xcc, 0xea, 0x64],
            key: [0xbe, 0x7d, 0xf8, 0xa3, 0x66, 0x7a, 0x6a, 0x8f, 0xd5, 0x64, 0xd0, 0xed, 0x81, 0x33, 0x9a, 0x95],
            initDataType: 'cenc',
            initData: 'AAAAcXBzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAAFEIARIQrRP56ivmmLh19QSo48zqZBoIY2FzdGxhYnMiKGV5SmhjM05sZEVsa0lqb2laVzFsTFhSbGMzUXRjMmx1WjJ4bEluMD0yB2RlZmF1bHQAAAMacHNzaAAAAACaBPB5mEBChquS5lvgiF+VAAAC+voCAAABAAEA8AI8AFcAUgBNAEgARQBBAEQARQBSACAAeABtAGwAbgBzAD0AIgBoAHQAdABwADoALwAvAHMAYwBoAGUAbQBhAHMALgBtAGkAYwByAG8AcwBvAGYAdAAuAGMAbwBtAC8ARABSAE0ALwAyADAAMAA3AC8AMAAzAC8AUABsAGEAeQBSAGUAYQBkAHkASABlAGEAZABlAHIAIgAgAHYAZQByAHMAaQBvAG4APQAiADQALgAwAC4AMAAuADAAIgA+ADwARABBAFQAQQA+ADwAUABSAE8AVABFAEMAVABJAE4ARgBPAD4APABLAEUAWQBMAEUATgA+ADEANgA8AC8ASwBFAFkATABFAE4APgA8AEEATABHAEkARAA+AEEARQBTAEMAVABSADwALwBBAEwARwBJAEQAPgA8AC8AUABSAE8AVABFAEMAVABJAE4ARgBPAD4APABLAEkARAA+ADYAdgBrAFQAcgBlAFkAcgB1AEoAaAAxADkAUQBTAG8ANAA4AHoAcQBaAEEAPQA9ADwALwBLAEkARAA+ADwAQwBIAEUAQwBLAFMAVQBNAD4AagBZAEYATgBmADAAeQBmADQAaQBzAD0APAAvAEMASABFAEMASwBTAFUATQA+ADwATABBAF8AVQBSAEwAPgBoAHQAdABwADoALwAvAHAAbABhAHkAcgBlAGEAZAB5AC4AZABpAHIAZQBjAHQAdABhAHAAcwAuAG4AZQB0AC8AcAByAC8AcwB2AGMALwByAGkAZwBoAHQAcwBtAGEAbgBhAGcAZQByAC4AYQBzAG0AeAA/AFAAbABhAHkAUgBpAGcAaAB0AD0AMQAmAGEAbQBwADsAVQBzAGUAUwBpAG0AcABsAGUATgBvAG4AUABlAHIAcwBpAHMAdABlAG4AdABMAGkAYwBlAG4AcwBlAD0AMQA8AC8ATABBAF8AVQBSAEwAPgA8AC8ARABBAFQAQQA+ADwALwBXAFIATQBIAEUAQQBEAEUAUgA+AA=='
        }]
    };

    // var KEY_SYSTEMS = ['org.w3.clearkey', 'com.widevine.alpha', 'com.microsoft.playready'];
    var KEY_SYSTEMS = ['com.widevine.alpha'];
    var INITDATA_TYPES = ['cenc'];

    // drmconfig format:
    // { <keysystem> : {    "serverURL"             : <the url for the server>,
    //                      "httpRequestHeaders"    : <map of HTTP request headers>,
    //                      "servertype"            : "microsoft" | "drmtoday",                 // affects how request parameters are formed
    //                      "certificate"           : <base64 encoded server certificate> } }
    //
    var drmtodaysecret = Uint8Array.from([144, 34, 109, 76, 134, 7, 97, 107, 98, 251, 140, 28, 98, 79, 153, 222, 231, 245, 154, 226, 193, 1, 213, 207, 152, 204, 144, 15, 13, 2, 37, 236]);

    var drmconfig = {
        "com.widevine.alpha": [{
            "serverURL": "https://lic.staging.drmtoday.com/license-proxy-widevine/cenc/",
            "servertype": "drmtoday",
            "merchant": "w3c-eme-test",
            "secret": drmtodaysecret
        }]
    };


    var started = window.performance.now();
    var ended = started;

    function onTestsDone() {
        ended = window.performance.now();
        console.log('DONE: ' + (ended - started).toFixed(2) + 'ms');
    }
    /*------------------------------------------------------------------------------------------*/

    // MEDIA SOURCE EXTENSION TESTS

    /*------------------------------------------------------------------------------------------*/
    // test supportes media source
    mse_test_supports_media_source().then(function (supports) {
        console.log('MSE - Supports MSE', supports);

        // test codecs
        return mse_test_type_support([
            'video/mp4;codecs="avc1.4d001e"', // H.264 Main Profile level 3.0
            'audio/mp4;codecs="mp4a.40.2"' // MPEG4 AAC-LC
        ]);
    }).then(function (result) {
        result.forEach(function (result) {
            console.log('MSE - Type Mime \"' + result.type + '\" is supported', result.supported);
        });

        // test append init data
        return mse_test_append_data(MSE_SEGMENT_INFO, true);
    }).then(function (result) {
        console.log('MSE - Append init data to buffer', result.append, result.err);

        // test append data
        return mse_test_append_data(MSE_SEGMENT_INFO);
    }).then(function (result) {
        console.log('MSE - Append data to buffer', result.append, result.err);

        /*------------------------------------------------------------------------------------------*/

        // ENCRYPTED MEDIA EXTENSIONS TESTS

        /*------------------------------------------------------------------------------------------*/

        // test supports eme
        return eme_tests_support_eme();
    }).then(function (supports) {
        console.log('EME - Supports EME', supports);

        return eme_tests_eme_enabled();
    }).then(function (supports) {
        console.log('EME - EME enabled (secure origin)', supports);

        if (supports) {
            eme_tests_support_key_system(KEY_SYSTEMS, INITDATA_TYPES)
            .then(function (result) {
                result.forEach(function (result) {
                    console.log('EME - CDM \"' + result.keySystem + ' (' + result.type + ')\" is supported', result.supported, result.err);
                });

                // test append encrypted init data
                return eme_test_append_data(KEY_SYSTEMS, drmconfig, EME_SEGMENT_INFO, true/*initSegmentOnly*/, false/*requestLicense*/);
            }).then(function (result) {
                result.forEach(function (result) {
                    console.log('EME - Append init data to buffer using CDM \"' + result.keySystem + '\"', result.appended, result.err);
                });
                // test append encrypted data
                return eme_test_append_data(KEY_SYSTEMS, drmconfig, EME_SEGMENT_INFO, false/*initSegmentOnly*/, false/*requestLicense*/);
            }).then(function (result) {
                result.forEach(function (result) {
                    console.log('EME - Append data to buffer using CDM \"' + result.keySystem + '\"', result.appended, result.err);
                });
                onTestsDone();
            });
        } else {
            onTestsDone();
        }
    });
}
