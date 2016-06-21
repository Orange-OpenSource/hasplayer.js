
define([], function () {
    return {

        loadStream: function(stream) {
            window.mediaPlayer = player;
            mediaPlayer.load(stream);
        },

        getDuration: function() {
            return mediaPlayer.getDuration();
        },

        play: function() {
            mediaPlayer.play();
        },

        pause: function() {
            mediaPlayer.pause();
        },

        stop: function() {
            mediaPlayer.stop();
        },

        seek: function(pos, done) {
            var onSeeked = function() {
                    mediaPlayer.removeEventListener('seeked', onSeeked);
                    done(true);
                };

            mediaPlayer.addEventListener('seeked', onSeeked);
            mediaPlayer.seek(pos);
        },

        setMute: function(isMute) {
            mediaPlayer.setMute(isMute);
        },

        getMute: function() {
            return mediaPlayer.getMute();
        },

        setTrickModeSpeed: function(speed) {
            mediaPlayer.setTrickModeSpeed(speed);
        },

        getTrickModeSpeed: function(speed) {
            return mediaPlayer.getTrickModeSpeed();
        },

        getVideoBitrates: function() {
            return mediaPlayer.getVideoBitrates();
        },

        getAudioLanguages: function() {
            return mediaPlayer.getTracks(MediaPlayer.TRACKS_TYPE.AUDIO);
        },

        getSelectedAudioLanguage: function() {
            return mediaPlayer.getSelectedTrack(MediaPlayer.TRACKS_TYPE.AUDIO);
        },

        setSelectedAudioLanguage: function(audioTrack) {
            return mediaPlayer.selectTrack(MediaPlayer.TRACKS_TYPE.AUDIO,audioTrack);
        },

        setDefaultAudioLanguage: function(lang) {
            return mediaPlayer.setDefaultAudioLang(lang);
        },

        getSubtitleLanguages: function() {
            return mediaPlayer.getTracks(MediaPlayer.TRACKS_TYPE.TEXT);
        },

        getSelectedSubtitleLanguage: function() {
            return mediaPlayer.getSelectedTrack(MediaPlayer.TRACKS_TYPE.TEXT);
        },

        setSelectedSubtitleLanguage: function(subtitleTrack) {
            return mediaPlayer.selectTrack(MediaPlayer.TRACKS_TYPE.TEXT,subtitleTrack);
        },

        setSubtitlesVisibility: function(state) {
            return mediaPlayer.enableSubtitles(state);
        },

        setDefaultSubtitleLanguage: function(lang) {
            return mediaPlayer.setDefaultSubtitleLang(lang);
        },

        isLive: function() {
            return mediaPlayer.isLive();
        },

        getDVRWindowRange: function() {
            return mediaPlayer.getDVRWindowRange();
        },

        waitForEvent: function (event, done) {
            var onEventHandler = function() {
                    mediaPlayer.removeEventListener(event, onEventHandler);
                    done(true);
                };

            mediaPlayer.addEventListener(event, onEventHandler);
        },

        getErrorCode: function (done) {
            var error = mediaPlayer.getError(),
                onError = function(err) {
                    mediaPlayer.removeEventListener('error', onError);
                    done(err.data.code);
                };

            if (error) {
                done(error.code);
            } else {
                mediaPlayer.addEventListener('error', onError);
            }
        },

        getWarningCode: function(done){
            var warning = mediaPlayer.getWarning(),
                onWarning = function(warn){
                    mediaPlayer.removeEventListener('warning', onWarning);
                    done(warn.data.code);
                }
                if(warning){
                    done(warning.data.code);
                }else{
                    mediaPlayer.addEventListener('warning', onWarning);
                }
        }
    };
});
