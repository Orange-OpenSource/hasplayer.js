/* exported mse_test_supports_media_source, mse_test_type_support, mse_test_append_data, mse_get_supported_codecs */
/* global MediaSourceUtil */

'use strict';

/*------------------------------------------------------------------------------------------*/

// MEDIA SOURCE EXTENSION TESTS

/*------------------------------------------------------------------------------------------*/

/**
 * Test if media source extension API is available
 * @return a promise resolved with true or false
 */
function mse_test_supports_media_source() {

    return new Promise(function (resolve) {
        var hasWebKit = ("WebKitMediaSource" in window),
            hasMediaSource = ("MediaSource" in window);
        resolve(hasWebKit || hasMediaSource);
    });
}

function mse_get_supported_codecs() {
    return new Promise(function (resolve) {
        var supportedCodecs = [];

        var codecs = [
            // HTML5 Video + Audio
            'video/mp4; codecs="avc1.42E01E, mp4a.40.2"', // H.264 Constrained baseline profile video (main and extended video compatible) level 3 and Low-Complexity AAC audio in MP4 container
            'video/mp4; codecs="avc1.58A01E, mp4a.40.2"', // H.264 Extended profile video (baseline-compatible) level 3 and Low-Complexity AAC audio in MP4 container
            'video/mp4; codecs="avc1.4D401E, mp4a.40.2"', // H.264 Main profile video level 3 and Low-Complexity AAC audio in MP4 container
            'video/mp4; codecs="avc1.64001E, mp4a.40.2"', // H.264 'High' profile video (incompatible with main, baseline, or extended profiles) level 3 and Low-Complexity AAC audio in MP4 container
            'video/mp4; codecs="mp4v.20.8, mp4a.40.2"', // MPEG-4 Visual Simple Profile Level 0 video and Low-Complexity AAC audio in MP4 container
            'video/mp4; codecs="mp4v.20.240, mp4a.40.2"', // MPEG-4 Advanced Simple Profile Level 0 video and Low-Complexity AAC audio in MP4 container
            'video/webm; codecs="vp8, vorbis"', // WebM video and Vorbis audio in Webm container
            'video/ogg; codecs="theora, vorbis"', // Theora video and Vorbis audio in Ogg container
            'video/ogg; codecs="theora, speex"', // Theora video and Speex audio in Ogg container
            'video/ogg; codecs="dirac, vorbis"', // Dirac video and Vorbis audio in Ogg container
            'video/3gpp; codecs="mp4v.20.8, samr"', // MPEG-4 Visual Simple Profile Level 0 video and AMR audio in 3GPP container
            'video/x-matroska; codecs="theora, vorbis"', // Theora video and Vorbis audio in Matroska container

            // HTML5 Video only
            'video/mp4; codecs="avc1.42E01E"', // H.264 Constrained baseline profile video (main and extended video compatible) level 3 in MP4 container
            'video/mp4; codecs="avc1.58A01E"', // H.264 Extended profile video (baseline-compatible) level 3 in MP4 container
            'video/mp4; codecs="avc1.4D401E"', // H.264 Main profile video level 3 in MP4 container
            'video/mp4; codecs="avc1.64001E"', //H.264 'High' profile video (incompatible with main, baseline, or extended profiles) level 3 in MP4 container
            'video/mp4; codecs="mp4v.20.8"', // MPEG-4 Visual Simple Profile Level 0 video and Low-Complexity AAC audio in MP4 container
            'video/mp4; codecs="mp4v.20.240"', // MPEG-4 Advanced Simple Profile Level 0 video in MP4 container
            'video/webm; codecs="vp8"', // WebM video in Webm container
            'video/ogg; codecs="theora"', // Theora video in Ogg container
            'video/ogg; codecs="dirac"', // Dirac video in Ogg container
            'video/3gpp; codecs="mp4v.20.8"', // MPEG-4 Visual Simple Profile Level 0 video in 3GPP container
            'video/x-matroska; codecs="theora"', // Theora video in Matroska container

            // HTML5 Audio only
            'audio/mp4; codecs="mp4a.40.2"', // Low-Complexity AAC audio in MP4 container
            'audio/mpeg;', // MPEG Audio Layer 3 audio
            'audio/webm; codecs="vorbis"', // Vorbis audio in Webm container
            'audio/ogg; codecs="vorbis"', // Vorbis audio in Ogg container
            'audio/wav; codecs="1"', // PCM audio in Waveform Audio File Format (WAVE) container
            'audio/ogg; codecs="speex"', // Speex audio in Ogg container
            'audio/ogg; codecs="flac"', // FLAC audio in Ogg container
            'audio/3gpp; codecs="samr"' // AMR audio in 3GPP container
        ];

        mse_test_type_support(codecs).then(function (results) {
            results.forEach(function (codec) {
                if (codec.supported) {
                    supportedCodecs.push(codec.type);
                }
            });

            resolve(supportedCodecs);
        });
    });
}

/**
 * Test if an array of codec mime type is supported
 * @param {array} types The MIME types that you want to test support for in the current browser.
 * @return a promise resolved with an array of results ( {type: type, supported: true/false })
 */
function mse_test_type_support(types) {

    return new Promise(function (resolve) {

        var results = [];

        var promises = [];
        types.forEach(function (type) {
            var eachPromise = new Promise(function (resolve) {
                var result = {
                    type: type,
                    supported: MediaSource.isTypeSupported(type)
                };

                results.push(result);
                resolve();
            });

            promises.push(eachPromise);
            return eachPromise;
        });


        Promise.all(promises).then(function () {
            resolve(results);
        });
    });
}

/**
 * Test if some data can be appended in media source buffer
 * @param segment_info the segment info to use
 * @param {boolean} initSegmentOnly true to push only init data
 * @return a promise resolved with result {append:true/false, err: the error if any}
 */
function mse_test_append_data(segment_info, initSegmentOnly) {

    return new Promise(function (resolve) {
        var mediaSourceUtil = new MediaSourceUtil(segment_info);
        var mediaTag = mediaSourceUtil.appendVideoElement();

        mediaSourceUtil.openMediaSource(mediaTag).then(function (mediaInfo) {
            mediaSourceUtil.loadBinaryData().then(function (mediaData) {
                if (initSegmentOnly) {
                    mediaData = mediaData.subarray(segment_info.init.offset, segment_info.init.offset + segment_info.init.size);
                }
                mediaSourceUtil.appendData(mediaInfo.mediaTag, mediaInfo.mediaSource, mediaData).then(function () {
                    mediaSourceUtil.closeMediaSource(mediaInfo.mediaTag);
                    resolve({
                        append: true
                    });
                }, function (err) {
                    mediaSourceUtil.closeMediaSource(mediaInfo.mediaTag);
                    resolve({
                        append: false,
                        err: err.message
                    });
                });
            }, function (err) {
                mediaSourceUtil.closeMediaSource(mediaInfo.mediaTag);
                resolve({
                    append: false,
                    err: err.message
                });
            });
        });
    });
}
