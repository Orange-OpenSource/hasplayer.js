define([], function () {

    return {

        loadStream: function (stream) {
            mediaPlayer.load(stream);
        },

        setParams: function (params) {
            mediaPlayer.setParams(params);
        },

        getDuration: function () {
            return mediaPlayer.getDuration();
        },

        play: function () {
            mediaPlayer.play();
        },

        pause: function () {
            mediaPlayer.pause();
        },

        stop: function () {
            mediaPlayer.stop();
        },

        seek: function (pos, done) {
            var onSeeked = function () {
                mediaPlayer.removeEventListener('seeked', onSeeked);
                done(true);
            };

            mediaPlayer.addEventListener('seeked', onSeeked);
            mediaPlayer.seek(pos);
        },

        setMute: function (isMute) {
            mediaPlayer.setMute(isMute);
        },

        getMute: function () {
            return mediaPlayer.getMute();
        },

        setTrickModeSpeed: function (speed) {
            mediaPlayer.setTrickModeSpeed(speed);
        },

        getTrickModeSpeed: function () {
            return mediaPlayer.getTrickModeSpeed();
        },

        getVideoBitrates: function () {
            return mediaPlayer.getVideoBitrates();
        },

        getTracks: function (type) {
            return mediaPlayer.getTracks(type);
        },

        getSelectedTrack: function (type) {
            return mediaPlayer.getSelectedTrack(type);
        },

        selectTrack: function (type, track) {
            mediaPlayer.selectTrack(type, track);
        },

        getDefaultLang: function (type) {
            if (type === 'audio') {
                return mediaPlayer.getDefaultAudioLang();
            }
            if (type === 'text') {
                return mediaPlayer.getDefaultSubtitleLang();
            }
        },

        setDefaultLang: function (type, lang) {
            if (type === 'audio') {
                return mediaPlayer.setDefaultAudioLang(lang);
            }
            if (type === 'text') {
                return mediaPlayer.setDefaultSubtitleLang(lang);
            }
        },

        enableSubtitles: function (state) {
            mediaPlayer.enableSubtitles(state);
        },

        isSubtitlesEnabled: function () {
            return mediaPlayer.isSubtitlesEnabled();
        },

        setSubtitlesVisibility: function (state) {
            mediaPlayer.enableSubtitles(state);
        },

        getSubtitlesVisibility: function () {
            return mediaPlayer.isSubtitlesEnabled();
        },

        enableSubtitleExternDisplay: function (state) {
            mediaPlayer.enableSubtitleExternDisplay(state);
        },

        isLive: function () {
            return mediaPlayer.isLive();
        },

        getDVRWindowRange: function () {
            return mediaPlayer.getDVRWindowRange();
        },

        waitForEvent: function (event, done) {
            var onmediaPlayerEventListener = function (param) {
                mediaPlayer.removeEventListener(event, onmediaPlayerEventListener);
                if (param instanceof Event) {
                    done(true); // if param is a Javascript event object event, do not serialize it (maximum call stack excedeed error otherwise)
                } else {
                    done(param ? param : true);
                }
            };

            mediaPlayer.addEventListener(event, onmediaPlayerEventListener);

        },

        getError: function (done) {
            var error = mediaPlayer.getError(),
                onError = function (err) {
                    mediaPlayer.removeEventListener('error', onError);
                    done(err.data);
                };

            if (error) {
                done(error);
            } else {
                mediaPlayer.addEventListener('error', onError);
            }
        },

        getErrorCode: function (done) {
            var error = mediaPlayer.getError(),
                onError = function (err) {
                    mediaPlayer.removeEventListener('error', onError);
                    done(err.data.code);
                };

            if (error) {
                done(error.code);
            } else {
                mediaPlayer.addEventListener('error', onError);
            }
        },

        getWarning: function (done) {
            var warning = mediaPlayer.getWarning(),
                onWarning = function (warn) {
                    mediaPlayer.removeEventListener('warning', onWarning);
                    done(warn.data);
                };

            if (warning) {
                done(warning);
            } else {
                mediaPlayer.addEventListener('warning', onWarning);
            }
        },

        getWarningCode: function (done) {
            var warning = mediaPlayer.getWarning(),
                onWarning = function (warn) {
                    mediaPlayer.removeEventListener('warning', onWarning);
                    done(warn.data.code);
                };

            if (warning) {
                done(warning.code);
            } else {
                mediaPlayer.addEventListener('warning', onWarning);
            }
        }
    };
});
