/* exported eme_tests_support_key_system, eme_get_supported_cdm, eme_tests_single_support_key_system, eme_tests_support_eme, eme_tests_eme_enabled, eme_test_append_data, eme_test_single_append_data*/
/*global toUtf8, base64urlEncode, MediaSourceUtil, CkMessageHandler, DrmMessageHandler*/
'use strict';

/*------------------------------------------------------------------------------------------*/

// ENCRYPTED MEDIA EXTENSIONS TESTS

/*------------------------------------------------------------------------------------------*/

/**
 * Test if eme is supported (MediaKeys defined)
 * @return a promise resolved with true or false
 */
function eme_tests_support_eme() {

    return new Promise(function (resolve) {
        var hasWebKitMediaKeys = ("WebKitMediaKeys" in window),
            hasMsMediaKeys = ("MSMediaKeys" in window),
            hasMediaKeys = ("MediaKeys" in window);
        resolve(hasWebKitMediaKeys || hasMsMediaKeys || hasMediaKeys);
    });
}

/**
 * Test if eme is enabled, i.e. if not diabled due to insecure origins
 * @return a promise resolved with true or false
 */
function eme_tests_eme_enabled() {

    return new Promise(function (resolve) {
        resolve(navigator.requestMediaKeySystemAccess !== undefined &&  typeof navigator.requestMediaKeySystemAccess === 'function');
    });
}

function eme_get_supported_cdm() {
    return new Promise(function (resolve) {

        var supportedCDMs = [];
        var CDM = [
            'org.w3.clearkey',
            'com.widevine.alpha',
            'com.microsoft.playready'
        ];

        var initDataTypes = ['cenc'];

        eme_tests_support_key_system(CDM, initDataTypes).then(function (results) {
            results.forEach(function (result) {
                if (result.supported) {
                    supportedCDMs.push(result.keySystem);
                }
            });
            resolve(supportedCDMs);
        });
    });
}

/**
 * Test if an array of init data type is supported by key systems
 * @param {array} keySystems array of key system
 * @param {array} initDataTypes array of init data types ('cenc', 'webm' or 'keyids')
 * @return a promise resolved using an array of object {supported:true/false, keySystem : the key system, type: init data type,err: the error if any}
 */
function eme_tests_support_key_system(keySystems, initDataTypes) {

    return new Promise(function (resolve) {

        var results = [];
        var keySystemPromises = [];

        keySystems.forEach(function (keySystem) {
            var eachPromise = new Promise(function (resolve) {

                var dataTypesPromises = [];

                initDataTypes.forEach(function (initDataType) {
                    var eachDataTypePromise = new Promise(function (resolve) {

                        eme_tests_single_support_key_system(
                            keySystem, initDataType).then(function (result) {
                            results.push(result);
                            resolve(result);
                        });

                    });
                    dataTypesPromises.push(eachDataTypePromise);
                    return eachDataTypePromise;
                });

                Promise.all(dataTypesPromises).then(function () {
                    resolve();
                });

            });

            keySystemPromises.push(eachPromise);
            return eachPromise;
        });


        Promise.all(keySystemPromises).then(function () {
            resolve(results);
        });
    });
}

/**
 * Test if init data type is supported using key system
 * @param {string} keySystem key system
 * @param {string} initDataType ('cenc', 'webm' or 'keyids')
 * @return a promise resolved using {supported:true/false, keySystem : the key system, type: init data type,err: the error if any}
 */
function eme_tests_single_support_key_system(keySystem, initDataType) {

    return new Promise(function (resolve) {
        navigator.requestMediaKeySystemAccess(
            keySystem, getSimpleConfigurationForInitDataType(keySystem, initDataType)).then(function () {
            resolve({
                supported: true,
                keySystem: keySystem,
                type: initDataType
            });
        }, function (err) {
            resolve({
                supported: false,
                keySystem: keySystem,
                type: initDataType,
                err: err
            });
        });
    });
}

/**
 * Test if data can be correctly played using eme
 * @param {string} keysystems the key systems to be tested
 * @param {object} data eme segment info
 * @param {boolean} initSegmentOnly true to push only init data
 * @return a promise resolved using an array of object {appended:true/false, keySystem : the key system, err: the error if any}
 */
function eme_test_append_data(keySystems, drmConfig, data, initSegmentOnly) {
    return new Promise(function (resolve) {
        var results = [];
        var keySystemPromises = [];

        keySystems.forEach(function (keySystem) {
            var eachPromise = new Promise(function (resolve) {
                eme_test_single_append_data(keySystem, drmConfig, data, initSegmentOnly).then(function (result) {
                    results.push(result);
                    resolve();
                });
            });

            keySystemPromises.push(eachPromise);
            return eachPromise;
        });

        Promise.all(keySystemPromises).then(function () {
            resolve(results);
        });
    });
}

/**
 * Test if data can be correctly played using eme
 * @param {string} keysystem the key system to be tested
 * @param {object} data eme segment info
 * @param {boolean} initSegmentOnly true to push only init data
 * @return a promise resolved using {appended:true/false, keySystem : the key system, err: the error if any}
 */
function eme_test_single_append_data(keysystem, drmConfig, data, initSegmentOnly) {
    return new Promise(function (resolve) {
        eme_playback_test(keysystem, drmConfig, data, initSegmentOnly).then(function () {
            resolve({
                appended: true,
                keySystem: keysystem
            });
        }, function (err) {
            resolve({
                appended: false,
                keySystem: keysystem,
                err: err
            });
        });
    });
}

/*------------------------------------------------------------------------------------------*/

// ENCRYPTED MEDIA EXTENSIONS TESTS TOOLS

/*------------------------------------------------------------------------------------------*/
var WIDEVINE_CDM = 'com.widevine.alpha';
var CLEARKEY_CDM = 'org.w3.clearkey';

function getInitData(contentitem, initDataType) {
    if (initDataType == 'webm') {
        return new Uint8Array(contentitem.keys[0].kid); // WebM initData supports only a single key
    }

    if (initDataType == 'cenc') {

        var size = 36 + contentitem.keys.length * 16,
            kids = contentitem.keys.map(function (k) {
                return k.kid;
            });

        return new Uint8Array(Array.prototype.concat.call([
            0x00, 0x00, size / 256, size % 256, // size
            0x70, 0x73, 0x73, 0x68, // 'pssh'
            0x01, // version = 1
            0x00, 0x00, 0x00, // flags
            0x10, 0x77, 0xEF, 0xEC, 0xC0, 0xB2, 0x4D, 0x02, // Common SystemID
            0xAC, 0xE3, 0x3C, 0x1E, 0x52, 0xE2, 0xFB, 0x4B,
            0x00, 0x00, 0x00, kids.length], // key count ]
            Array.prototype.concat.apply([], kids), [0x00, 0x00, 0x00, 0x00] // datasize
        ));
    }
    if (initDataType == 'keyids') {

        return toUtf8({
            kids: contentitem.keys.map(function (k) {
                return base64urlEncode(new Uint8Array(k.kid));
            })
        });
    }
    throw 'initDataType ' + initDataType + ' not supported.';
}

// Returns a MediaKeySystemConfiguration for |initDataType| that should be
// accepted, possibly as a subset of the specified capabilities, by all
// user agents.
function getSimpleConfigurationForInitDataType(keySystem, initDataType) {
    if (keySystem === WIDEVINE_CDM) {
        return [{
            initDataTypes: [initDataType],
            videoCapabilities: [{
                contentType: 'video/mp4;codecs=\"avc1.4d401e\"'/*,
                robustness: 'SW_SECURE_DECODE'*/
            }],
            sessionTypes: ['temporary']
        }];
    } else {
        return [{
            initDataTypes: [initDataType],
            videoCapabilities: [{
                contentType: 'video/mp4;codecs=\"avc1.4d401e\"'
            }],
            sessionTypes: ['temporary']
        }];
    }
}

function testmediasource(config) {

    return new Promise(function (resolve, reject) {
        var mediaSourceUtil = new MediaSourceUtil(config.segment);

        mediaSourceUtil.openMediaSource(config.video).then(function (mediaInfo) {
            mediaSourceUtil.loadBinaryData().then(function (mediaData) {
                if (config.initSegmentOnly) {
                    mediaData = mediaData.subarray(config.segment.init.offset, config.segment.init.offset + config.segment.init.size);
                }
                mediaSourceUtil.appendData(mediaInfo.mediaTag, mediaInfo.mediaSource, mediaData).then(function () {
                    resolve();
                }, function (err) {
                    reject(err.message);
                });
            }, function (err) {
                reject(err.message);
            });
        });
    });
}

function eme_playback_test(keysystem, drmConfig, data, initSegmentOnly) {
    if (keysystem === CLEARKEY_CDM) {
        return playback_clear_key_test(data, initSegmentOnly);
    } else {
        return playback_drm_test(keysystem, drmConfig, data, initSegmentOnly);
    }
}

function playback_clear_key_test(data, initSegmentOnly) {
    var contentitem = data,
        handler = new CkMessageHandler(CLEARKEY_CDM, contentitem);

    var config = {
        keysystem: CLEARKEY_CDM,
        messagehandler: handler.messagehandler,
        segment: contentitem,
        segmentPath: contentitem.url,
        segmentType: contentitem.type,
        initDataType: 'keyids',
        initData: getInitData(contentitem, 'keyids'),
        initSegmentOnly: initSegmentOnly
    };

    return start_eme_playback_test(config);
}

function playback_drm_test(keysystem, drmConfig, data, initSegmentOnly) {

    var contentitem = data,
        handler = new DrmMessageHandler(keysystem, drmConfig, contentitem);

    var config = {
        keysystem: keysystem,
        messagehandler: handler.messagehandler,
        segment: contentitem,
        segmentPath: contentitem.url,
        segmentType: contentitem.type,
        initDataType: contentitem.initDataType,
        initSegmentOnly: initSegmentOnly
    };

    return start_eme_playback_test(config);
}

function start_eme_playback_test(config) {

    return new Promise(function (resolve, reject) {
        var mediaTag = document.createElement("video");
        if (!document.body) {
            document.body = document.createElement("body");
        }
        document.body.appendChild(mediaTag);

        config.video = mediaTag;
        playback(config).then(function () {
            document.body.removeChild(mediaTag);
            resolve(true);
        }, function (err) {
            document.body.removeChild(mediaTag);
            reject(err);
        });
    });
}

function playback(config) {

    var configuration = {
        initDataTypes: [config.initDataType],
        videoCapabilities: [{
            contentType: config.segmentType
        }],
        sessionTypes: ['temporary']
    };

    if (config.keysystem === WIDEVINE_CDM) {
        configuration = {
            initDataTypes: [config.initDataType],
            videoCapabilities: [{
                contentType: config.segmentType/*,
                robustness: 'SW_SECURE_DECODE'*/
            }],
            sessionTypes: ['temporary']
        };
    }

    return new Promise(function (resolve, reject) {

        var _video = config.video,
            _mediaKeys,
            _mediaKeySession;

        function onFailure(error) {
            reject(error);
        }

        function onEncrypted(event) {

            // Only create the session for the firs encrypted event
            if (_mediaKeySession !== undefined) {
                return;
            }

            var initDataType = config.initData ? config.initDataType : event.initDataType;
            var initData = config.initData || event.initData;

            _mediaKeySession = _mediaKeys.createSession('temporary');
            _mediaKeySession.addEventListener('message', onMessage, true);
            _mediaKeySession.generateRequest(initDataType, initData).catch(onFailure);
        }

        function onMessage(event) {
            config.messagehandler(event.messageType, event.message).then(function (response) {
                return event.target.update(response);
            }).catch(onFailure);
        }

        function onPlaying() {
            resolve();
        }

        function onError(/*error*/) {
            var error = MEDIA_ERROR_CODES[_video.error.code];
            if (_video.error.message) {
                error += ': ' + _video.error.message;
            }
            reject(error);
        }

        navigator.requestMediaKeySystemAccess(config.keysystem, [configuration]).then(function (access) {
            return access.createMediaKeys();
        }).then(function (mediaKeys) {
            _mediaKeys = mediaKeys;
            return _video.setMediaKeys(_mediaKeys);
        }).then(function () {
            _video.addEventListener('encrypted', onEncrypted, true);
            _video.addEventListener('playing', onPlaying, true);
            _video.addEventListener('error', onError, true);
            return testmediasource(config);
        }).then(function () {
            if (config.initSegmentOnly) {
                resolve();
            } else {
                // wait for video playing to pass the test
                // _video.play();
            }
        }).catch(onFailure);
    });
}
