define([], function () {

    return {

        loadStream: function (stream) {
            player.load(stream);
        },

        setParams: function (params) {
            player.setParams(params);
        },

        getDuration: function () {
            return player.getDuration();
        },

        play: function () {
            player.play();
        },

        pause: function () {
            player.pause();
        },

        stop: function () {
            player.stop();
        },

        seek: function (pos, done) {
            var onSeeked = function () {
                player.removeEventListener('seeked', onSeeked);
                done(true);
            };

            player.addEventListener('seeked', onSeeked);
            player.seek(pos);
        },

        setMute: function (isMute) {
            player.setMute(isMute);
        },

        getMute: function () {
            return player.getMute();
        },

        setTrickModeSpeed: function (speed) {
            player.setTrickModeSpeed(speed);
        },

        getTrickModeSpeed: function () {
            return player.getTrickModeSpeed();
        },

        getVideoBitrates: function () {
            return player.getVideoBitrates();
        },

        getTracks: function (type) {
            return player.getTracks(type);
        },

        getSelectedTrack: function (type) {
            return player.getSelectedTrack(type);
        },

        selectTrack: function (type, track) {
            player.selectTrack(type, track);
        },

        getDefaultLang: function (type) {
            if (type === 'audio') {
                return player.getDefaultAudioLang();
            }
            if (type === 'text') {
                return player.getDefaultSubtitleLang();
            }
        },

        setDefaultLang: function (type, lang) {
            if (type === 'audio') {
                return player.setDefaultAudioLang(lang);
            }
            if (type === 'text') {
                return player.setDefaultSubtitleLang(lang);
            }
        },

        enableSubtitles: function (state) {
            player.enableSubtitles(state);
        },

        isSubtitlesEnabled: function () {
            return player.isSubtitlesEnabled();
        },

        setSubtitlesVisibility: function (state) {
            player.enableSubtitles(state);
        },

        getSubtitlesVisibility: function () {
            return player.isSubtitlesEnabled();
        },

        enableSubtitleExternDisplay: function (state) {
            player.enableSubtitleExternDisplay(state);
        },

        isLive: function () {
            return player.isLive();
        },

        getDVRWindowRange: function () {
            return player.getDVRWindowRange();
        },

        waitForEvent: function (event, done) {
            var onPlayerEventListener = function (param) {
                player.removeEventListener(event, onPlayerEventListener);
                if (param instanceof Event) {
                    done(true); // if param is a Javascript event object event, do not serialize it (maximum call stack excedeed error otherwise)
                } else {
                    done(param ? param : true);
                }
            };

            player.addEventListener(event, onPlayerEventListener);

        },

        getError: function (done) {
            var error = player.getError(),
                onError = function (err) {
                    player.removeEventListener('error', onError);
                    done(err.data);
                };

            if (error) {
                done(error);
            } else {
                player.addEventListener('error', onError);
            }
        },

        getErrorCode: function (done) {
            var error = player.getError(),
                onError = function (err) {
                    player.removeEventListener('error', onError);
                    done(err.data.code);
                };

            if (error) {
                done(error.code);
            } else {
                player.addEventListener('error', onError);
            }
        },

        getWarning: function (done) {
            var warning = player.getWarning(),
                onWarning = function (warn) {
                    player.removeEventListener('warning', onWarning);
                    done(warn.data);
                };

            if (warning) {
                done(warning);
            } else {
                player.addEventListener('warning', onWarning);
            }
        },

        getWarningCode: function (done) {
            var warning = player.getWarning(),
                onWarning = function (warn) {
                    player.removeEventListener('warning', onWarning);
                    done(warn.data.code);
                };

            if (warning) {
                done(warning.code);
            } else {
                player.addEventListener('warning', onWarning);
            }
        }
    };
});
