/* exported startTests */
/* global Output */
/* global mse_test_supports_media_source, mse_test_type_support, mse_test_append_data, mse_get_supported_codecs */
/* global eme_tests_support_eme, eme_tests_eme_enabled, eme_get_supported_cdm, eme_tests_support_key_system, eme_test_append_data */

function startTests() {

    /*------------------------------------------------------------------------------------------*/

    // TESTS DATA

    /*------------------------------------------------------------------------------------------*/

    var MSE_SEGMENT_INFO = {
        url: 'mp4/test_mse.mp4',
        type: 'video/mp4; codecs="mp4a.40.2,avc1.4d400d"',
        init: {
            offset: 0,
            size: 1413
        }
    };

    var EME_SEGMENT_INFO = {
        assetId: 'mp4-basic',
        initDataType: 'cenc',
        type: 'video/mp4;codecs="avc1.4d401e"',
        url: 'mp4/video_512x288_h264-360k_enc_dashinit.mp4',
        init: {
            offset: 0,
            size: 1896
        },
        keys: [{
            kid: [0xad, 0x13, 0xf9, 0xea, 0x2b, 0xe6, 0x98, 0xb8, 0x75, 0xf5, 0x04, 0xa8, 0xe3, 0xcc, 0xea, 0x64],
            key: [0xbe, 0x7d, 0xf8, 0xa3, 0x66, 0x7a, 0x6a, 0x8f, 0xd5, 0x64, 0xd0, 0xed, 0x81, 0x33, 0x9a, 0x95],
            initDataType: 'cenc',
            initData: 'AAAAcXBzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAAFEIARIQrRP56ivmmLh19QSo48zqZBoIY2FzdGxhYnMiKGV5SmhjM05sZEVsa0lqb2laVzFsTFhSbGMzUXRjMmx1WjJ4bEluMD0yB2RlZmF1bHQAAAMacHNzaAAAAACaBPB5mEBChquS5lvgiF+VAAAC+voCAAABAAEA8AI8AFcAUgBNAEgARQBBAEQARQBSACAAeABtAGwAbgBzAD0AIgBoAHQAdABwADoALwAvAHMAYwBoAGUAbQBhAHMALgBtAGkAYwByAG8AcwBvAGYAdAAuAGMAbwBtAC8ARABSAE0ALwAyADAAMAA3AC8AMAAzAC8AUABsAGEAeQBSAGUAYQBkAHkASABlAGEAZABlAHIAIgAgAHYAZQByAHMAaQBvAG4APQAiADQALgAwAC4AMAAuADAAIgA+ADwARABBAFQAQQA+ADwAUABSAE8AVABFAEMAVABJAE4ARgBPAD4APABLAEUAWQBMAEUATgA+ADEANgA8AC8ASwBFAFkATABFAE4APgA8AEEATABHAEkARAA+AEEARQBTAEMAVABSADwALwBBAEwARwBJAEQAPgA8AC8AUABSAE8AVABFAEMAVABJAE4ARgBPAD4APABLAEkARAA+ADYAdgBrAFQAcgBlAFkAcgB1AEoAaAAxADkAUQBTAG8ANAA4AHoAcQBaAEEAPQA9ADwALwBLAEkARAA+ADwAQwBIAEUAQwBLAFMAVQBNAD4AagBZAEYATgBmADAAeQBmADQAaQBzAD0APAAvAEMASABFAEMASwBTAFUATQA+ADwATABBAF8AVQBSAEwAPgBoAHQAdABwADoALwAvAHAAbABhAHkAcgBlAGEAZAB5AC4AZABpAHIAZQBjAHQAdABhAHAAcwAuAG4AZQB0AC8AcAByAC8AcwB2AGMALwByAGkAZwBoAHQAcwBtAGEAbgBhAGcAZQByAC4AYQBzAG0AeAA/AFAAbABhAHkAUgBpAGcAaAB0AD0AMQAmAGEAbQBwADsAVQBzAGUAUwBpAG0AcABsAGUATgBvAG4AUABlAHIAcwBpAHMAdABlAG4AdABMAGkAYwBlAG4AcwBlAD0AMQA8AC8ATABBAF8AVQBSAEwAPgA8AC8ARABBAFQAQQA+ADwALwBXAFIATQBIAEUAQQBEAEUAUgA+AA=='
        }]
    };

    var KEY_SYSTEMS = [/*'org.w3.clearkey', */'com.widevine.alpha',/* 'com.microsoft.playready'*/];


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
    }],
        "com.microsoft.playready": [{
                "serverURL": "http://playready-testserver.azurewebsites.net/rightsmanager.asmx",
                "servertype": "microsoft",
                "sessionTypes": ["persistent-usage-record"],
                "certificate": "Q0hBSQAAAAEAAAUEAAAAAAAAAAJDRVJUAAAAAQAAAfQAAAFkAAEAAQAAAFjt9G6KdSncCkrjbTQPN+/2AAAAAAAAAAAAAAAJIPbrW9dj0qydQFIomYFHOwbhGZVGP2ZsPwcvjh+NFkP/////AAAAAAAAAAAAAAAAAAAAAAABAAoAAABYxw6TjIuUUmvdCcl00t4RBAAAADpodHRwOi8vcGxheXJlYWR5LmRpcmVjdHRhcHMubmV0L3ByL3N2Yy9yaWdodHNtYW5hZ2VyLmFzbXgAAAAAAQAFAAAADAAAAAAAAQAGAAAAXAAAAAEAAQIAAAAAADBRmRRpqV4cfRLcWz9WoXIGZ5qzD9xxJe0CSI2mXJQdPHEFZltrTkZtdmurwVaEI2etJY0OesCeOCzCqmEtTkcAAAABAAAAAgAAAAcAAAA8AAAAAAAAAAVEVEFQAAAAAAAAABVNZXRlcmluZyBDZXJ0aWZpY2F0ZQAAAAAAAAABAAAAAAABAAgAAACQAAEAQGHic/IPbmLCKXxc/MH20X/RtjhXH4jfowBWsQE1QWgUUBPFId7HH65YuQJ5fxbQJCT6Hw0iHqKzaTkefrhIpOoAAAIAW+uRUsdaChtq/AMUI4qPlK2Bi4bwOyjJcSQWz16LAFfwibn5yHVDEgNA4cQ9lt3kS4drx7pCC+FR/YLlHBAV7ENFUlQAAAABAAAC/AAAAmwAAQABAAAAWMk5Z0ovo2X0b2C9K5PbFX8AAAAAAAAAAAAAAARTYd1EkpFovPAZUjOj2doDLnHiRSfYc89Fs7gosBfar/////8AAAAAAAAAAAAAAAAAAAAAAAEABQAAAAwAAAAAAAEABgAAAGAAAAABAAECAAAAAABb65FSx1oKG2r8AxQjio+UrYGLhvA7KMlxJBbPXosAV/CJufnIdUMSA0DhxD2W3eRLh2vHukIL4VH9guUcEBXsAAAAAgAAAAEAAAAMAAAABwAAAZgAAAAAAAAAgE1pY3Jvc29mdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgFBsYXlSZWFkeSBTTDAgTWV0ZXJpbmcgUm9vdCBDQQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgDEuMC4wLjEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEACAAAAJAAAQBArAKJsEIDWNG5ulOgLvSUb8I2zZ0c5lZGYvpIO56Z0UNk/uC4Mq3jwXQUUN6m/48V5J/vuLDhWu740aRQc1dDDAAAAgCGTWHP8iVuQixWizwoABz7PhUnZYWEugUht5sYKNk23h2Cao/D5uf6epDVyilG8fZKLvufXc/+fkNOtEKT+sWr"
    },
            {
                "serverURL": "http://playready.directtaps.net/pr/svc/rightsmanager.asmx",
                "servertype": "microsoft",
                "sessionTypes": ["persistent-usage-record"],
                "certificate": "Q0hBSQAAAAEAAAUEAAAAAAAAAAJDRVJUAAAAAQAAAfQAAAFkAAEAAQAAAFjt9G6KdSncCkrjbTQPN+/2AAAAAAAAAAAAAAAJIPbrW9dj0qydQFIomYFHOwbhGZVGP2ZsPwcvjh+NFkP/////AAAAAAAAAAAAAAAAAAAAAAABAAoAAABYxw6TjIuUUmvdCcl00t4RBAAAADpodHRwOi8vcGxheXJlYWR5LmRpcmVjdHRhcHMubmV0L3ByL3N2Yy9yaWdodHNtYW5hZ2VyLmFzbXgAAAAAAQAFAAAADAAAAAAAAQAGAAAAXAAAAAEAAQIAAAAAADBRmRRpqV4cfRLcWz9WoXIGZ5qzD9xxJe0CSI2mXJQdPHEFZltrTkZtdmurwVaEI2etJY0OesCeOCzCqmEtTkcAAAABAAAAAgAAAAcAAAA8AAAAAAAAAAVEVEFQAAAAAAAAABVNZXRlcmluZyBDZXJ0aWZpY2F0ZQAAAAAAAAABAAAAAAABAAgAAACQAAEAQGHic/IPbmLCKXxc/MH20X/RtjhXH4jfowBWsQE1QWgUUBPFId7HH65YuQJ5fxbQJCT6Hw0iHqKzaTkefrhIpOoAAAIAW+uRUsdaChtq/AMUI4qPlK2Bi4bwOyjJcSQWz16LAFfwibn5yHVDEgNA4cQ9lt3kS4drx7pCC+FR/YLlHBAV7ENFUlQAAAABAAAC/AAAAmwAAQABAAAAWMk5Z0ovo2X0b2C9K5PbFX8AAAAAAAAAAAAAAARTYd1EkpFovPAZUjOj2doDLnHiRSfYc89Fs7gosBfar/////8AAAAAAAAAAAAAAAAAAAAAAAEABQAAAAwAAAAAAAEABgAAAGAAAAABAAECAAAAAABb65FSx1oKG2r8AxQjio+UrYGLhvA7KMlxJBbPXosAV/CJufnIdUMSA0DhxD2W3eRLh2vHukIL4VH9guUcEBXsAAAAAgAAAAEAAAAMAAAABwAAAZgAAAAAAAAAgE1pY3Jvc29mdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgFBsYXlSZWFkeSBTTDAgTWV0ZXJpbmcgUm9vdCBDQQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgDEuMC4wLjEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEACAAAAJAAAQBArAKJsEIDWNG5ulOgLvSUb8I2zZ0c5lZGYvpIO56Z0UNk/uC4Mq3jwXQUUN6m/48V5J/vuLDhWu740aRQc1dDDAAAAgCGTWHP8iVuQixWizwoABz7PhUnZYWEugUht5sYKNk23h2Cao/D5uf6epDVyilG8fZKLvufXc/+fkNOtEKT+sWr"
    },
            {
                "serverURL": "https://lic.staging.drmtoday.com/license-proxy-headerauth/drmtoday/RightsManager.asmx",
                "servertype": "drmtoday",
                "sessionTypes": ["temporary", "persistent-usage-record", "persistent-license"],
                "merchant": "w3c-eme-test",
                "secret": drmtodaysecret
    }]
    };


    var output_document = new Output();

    var started = window.performance.now();
    var ended = started;

    function onTestsDone() {
        ended = window.performance.now();
        output_document.add_test_time(started, ended);
    }
    /*------------------------------------------------------------------------------------------*/

    // MEDIA SOURCE EXTENSION TESTS

    /*------------------------------------------------------------------------------------------*/
    // test supportes media source
    mse_test_supports_media_source().then(function (supports) {
        output_document.add_result('MSE - Supports MSE', supports);

        // get supported codecs
        return mse_get_supported_codecs();
    }).then(function (results) {
        output_document.add_supported_codecs(results);

        // test mime type support
        return mse_test_type_support([
            'video/webm;codecs="vp8"',
            'video/webm;codecs="vorbis"',
            'video/webm;codecs="vp8,vorbis"',
            'video/webm;codecs="vorbis, vp8"',
            'audio/webm;codecs="vorbis"',
            'AUDIO/WEBM;CODECS="vorbis"',
            'video/mp4;codecs="avc1.4d001e"', // H.264 Main Profile level 3.0
            'video/mp4;codecs="avc1.42001e"', // H.264 Baseline Profile level 3.0
            'audio/mp4;codecs="mp4a.40.2"', // MPEG4 AAC-LC
            'audio/mp4;codecs="mp4a.40.5"', // MPEG4 HE-AAC
            'audio/mp4;codecs="mp4a.67"', // MPEG2 AAC-LC
            'video/mp4;codecs="mp4a.40.2"',
            'video/mp4;codecs="avc1.4d001e,mp4a.40.2"',
            'video/mp4;codecs="mp4a.40.2, avc1.4d001e "',
            'video/mp4;codecs="avc1.4d001e,mp4a.40.5"'
        ]);
    }).then(function (result) {
        result.forEach(function (result) {
            output_document.add_result('MSE - Type Mime \"' + result.type + '\" is supported', result.supported);
        });

        // test append init data
        console.log('##### mse_test_append_data, init');
        return mse_test_append_data(MSE_SEGMENT_INFO, true);
    }).then(function (result) {
        output_document.add_result('MSE - Append init data to buffer', result.append, result.err);

        // test append data
        console.log('##### mse_test_append_data, data');
        return mse_test_append_data(MSE_SEGMENT_INFO);
    }).then(function (result) {
        output_document.add_result('MSE - Append data to buffer', result.append, result.err);

        /*------------------------------------------------------------------------------------------*/

        // ENCRYPTED MEDIA EXTENSIONS TESTS

        /*------------------------------------------------------------------------------------------*/

        // test supports eme
        return eme_tests_support_eme();
    }).then(function (supports) {
        output_document.add_result('EME - Supports EME', supports);

        return eme_tests_eme_enabled();
    }).then(function (supports) {
        output_document.add_result('EME - EME enabled (secure origin)', supports);

        if (supports) {
            eme_get_supported_cdm() .then(function (results) {
                output_document.add_supported_CDM(results);

                // test supports key system
                return eme_tests_support_key_system(KEY_SYSTEMS, ['keyids', 'webm', 'cenc']);
            }).then(function (result) {
                result.forEach(function (result) {
                    output_document.add_result('EME - CDM \"' + result.keySystem + ' (' + result.type + ')\" is supported', result.supported, result.err);
                });

                // test append encrypted init data
                console.log('##### eme_test_append_data, init');
                return eme_test_append_data(KEY_SYSTEMS, drmconfig, EME_SEGMENT_INFO, true);
            }).then(function (result) {
                result.forEach(function (result) {
                    output_document.add_result('EME - Append init data to buffer using CDM \"' + result.keySystem + '\"', result.appended, result.err);
                });
                // test append encrypted data
                console.log('##### eme_test_append_data, data');
                return eme_test_append_data(KEY_SYSTEMS, drmconfig, EME_SEGMENT_INFO);
            }).then(function (result) {
                result.forEach(function (result) {
                    output_document.add_result('EME - Append data to buffer using CDM \"' + result.keySystem + '\"', result.appended, result.err);
                });
                onTestsDone();
            });
        } else {
            onTestsDone();
        }
    });
}
