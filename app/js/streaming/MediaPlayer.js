/**
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 *
 *  Initialization:
 *
 * 1) Check if MediaSource is available.
 * 2) Load manifest.
 * 3) Parse manifest.
 * 4) Check if Video Element can play codecs.
 * 5) Register MediaSource with Video Element.
 * 6) Create SourceBuffers.
 * 7) Do live stuff.
 *      a. Start manifest refresh.
 *      b. Calculate live point.
 *      c. Calculate offset between availabilityStartTime and initial video timestamp.
 * 8) Start buffer managers.
 *
 * Buffer Management:
 *
 * 1) Generate metrics.
 * 2) Check if fragments should be loaded.
 * 3) Check ABR for change in quality.
 * 4) Figure out which fragments to load.
 * 5) Load fragments.
 * 6) Transform fragments.
 * 7) Push fragmemt bytes into SourceBuffer.
 *
 *
 * @constructs MediaPlayer
 * @param aContext - context used by the MediaPlayer. The context class is used to
 * inject dijon dependances.
 */
 /*jshint -W020 */
MediaPlayer = function(aContext) {
    "use strict";

    /*
     *
     */
    var VERSION = "1.2.0",
        VERSION_HAS = "1.2.5_dev",
        GIT_TAG = "@@REVISION",
        BUILD_DATE = "@@TIMESTAMP",
        context = aContext,
        system,
        element,
        source,
        protectionData = null,
        streamController,
        videoModel,
        initialized = false,
        resetting = false,
        playing = false,
        autoPlay = true,
        scheduleWhilePaused = false,
        bufferMax = MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED,
        defaultAudioLang = 'und',
        defaultSubtitleLang = 'und',

        /**
         * is hasplayer ready to play the stream? element and source have been setted?
         * @return true if ready, false otherwise.
         * @access public
         */
        isReady = function() {
            return (!!element && !!source && !resetting);
        },

        /**
         * start to play the selected stream
         * @access public
         */
        play = function() {
            if (!initialized) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.HASPLAYER_INIT_ERROR, "MediaPlayer not initialized!");
                return;
            }

            if (!this.capabilities.supportsMediaSource()) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.CAPABILITY_ERR_MEDIASOURCE);
                return;
            }

            if (!element || !source) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.HASPLAYER_INIT_ERROR, "Missing view or source.");
                return;
            }

            playing = true;

            //this.debug.log("Playback initiated!");
            if (!streamController) {
                streamController = system.getObject("streamController");
                streamController.setVideoModel(videoModel);
                streamController.setAutoPlay(autoPlay);
            }

            streamController.setDefaultAudioLang(defaultAudioLang);
            streamController.setDefaultSubtitleLang(defaultSubtitleLang);

            // ORANGE: add source stream parameters
            streamController.load(source, protectionData);
            system.mapValue("scheduleWhilePaused", scheduleWhilePaused);
            system.mapOutlet("scheduleWhilePaused", "stream");
            system.mapOutlet("scheduleWhilePaused", "bufferController");
            system.mapValue("bufferMax", bufferMax);
            system.injectInto(this.bufferExt, "bufferMax");
        },

        doAutoPlay = function() {
            if (isReady()) {
                play.call(this);
            }
        },

        resetAndPlay = function() {
            if (playing && streamController) {
                if (!resetting) {
                    resetting = true;

                    var teardownComplete = {},
                            self = this;
                    teardownComplete[MediaPlayer.dependencies.StreamController.eventList.ENAME_TEARDOWN_COMPLETE] = function () {

                        // Finish rest of shutdown process
                        streamController = null;
                        playing = false;

                        resetting = false;
                        if (isReady.call(self)) {
                            doAutoPlay.call(self);
                        }
                    };
                    streamController.subscribe(MediaPlayer.dependencies.StreamController.eventList.ENAME_TEARDOWN_COMPLETE, teardownComplete, undefined, true);
                    streamController.reset();
                }
            } else {
                if (isReady.call(this)) {
                    doAutoPlay.call(this);
                }
            }
        },

        getDVRInfoMetric = function() {
            var metric = this.metricsModel.getReadOnlyMetricsFor('video') || this.metricsModel.getReadOnlyMetricsFor('audio');
            return this.metricsExt.getCurrentDVRInfo(metric);
        },

        /**
         * TBD
         * @return DVR window size
         * @access public
         */
        getDVRWindowSize = function() {
            return getDVRInfoMetric.call(this).mpd.timeShiftBufferDepth;
        },

        /**
         * TBD
         * @param  value
         * @return DVR seek offset
         * @access public
         */
        getDVRSeekOffset = function(value) {
            var metric = getDVRInfoMetric.call(this),
                val = metric.range.start + parseInt(value, 10);

            if (val > metric.range.end) {
                val = metric.range.end;
            }

            return val;
        },

        /**
         * seek to a special time (seconds) in the stream.
         * html5 video currentTime parameter is better to use than this function.
         * @access public
         */
        seek = function(value) {

            videoModel.getElement().currentTime = this.getDVRSeekOffset(value);
        },

        /**
         * TBD
         * @access public
         */
        time = function() {
            var metric = getDVRInfoMetric.call(this);
            return (metric === null) ? 0 : Math.round(this.duration() - (metric.range.end - metric.time));
        },

        /**
         * TBD
         * @access public
         */
        duration = function() {
            var metric = getDVRInfoMetric.call(this),
                range;

            if (metric === null) {
                return 0;
            }

            range = metric.range.end - metric.range.start;

            return Math.round(range < metric.mpd.timeShiftBufferDepth ? range : metric.mpd.timeShiftBufferDepth);
        },

        /**
         * TBD
         * @access public
         */
        timeAsUTC = function() {
            var metric = getDVRInfoMetric.call(this),
                availabilityStartTime,
                currentUTCTime;

            if (metric === null) {
                return 0;
            }

            availabilityStartTime = metric.mpd.availabilityStartTime.getTime() / 1000;
            currentUTCTime = this.time() + (availabilityStartTime + metric.range.start);

            return Math.round(currentUTCTime);
        },

        /**
         * TBD
         * @access public
         */
        durationAsUTC = function() {
            var metric = getDVRInfoMetric.call(this),
                availabilityStartTime,
                currentUTCDuration;

            if (metric === null) {
                return 0;
            }

            availabilityStartTime = metric.mpd.availabilityStartTime.getTime() / 1000;
            currentUTCDuration = (availabilityStartTime + metric.range.start) + this.duration();

            return Math.round(currentUTCDuration);
        },

        /**
         * TBD
         * @param  time - .
         * @param  locales - .
         * @param  hour12 - .
         * @return formatted UTC time.
         * @access public
         */
        formatUTC = function(time, locales, hour12) {
            var dt = new Date(time * 1000);
            var d = dt.toLocaleDateString(locales);
            var t = dt.toLocaleTimeString(locales, {
                hour12: hour12
            });
            return t + ' ' + d;
        },

        /**
         * TBD
         * @param  value - .
         * @return time code value
         * @access public
         */
        convertToTimeCode = function(value) {
            value = Math.max(value, 0);

            var h = Math.floor(value / 3600);
            var m = Math.floor((value % 3600) / 60);
            var s = Math.floor((value % 3600) % 60);
            return (h === 0 ? "" : (h < 10 ? "0" + h.toString() + ":" : h.toString() + ":")) + (m < 10 ? "0" + m.toString() : m.toString()) + ":" + (s < 10 ? "0" + s.toString() : s.toString());
        };


    system = new dijon.System();
    system.mapValue("system", system);
    system.mapOutlet("system");
    system.injectInto(context);


    return {
        /**
         * @access public
         * @memberof MediaPlayer#
         * debug object reference
         */
        notifier: undefined,
        debug: undefined,
        eventBus: undefined,
        capabilities: undefined,
        abrController: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        bufferExt: undefined,
        errHandler: undefined,
        tokenAuthentication: undefined,
        uriQueryFragModel: undefined,
        // ORANGE: add config manager
        config: undefined,

        /**
         * function used to register webapp function on hasplayer events
         * @access public
         * @memberof MediaPlayer#
         * @param  type - event type event type log, error, subtitlesStyleChanged, updateend, manifestLoaded, metricChanged, metricsChanged, metricAdded
         *  and metricUpdated.
         * @param  listener - function callback name.
         * @param  useCapture - .
         */
        addEventListener: function(type, listener, useCapture) {
            if (!initialized) {
                //not used sendError....listener must be registered to use it.
                throw "MediaPlayer not initialized!";
            }

            this.eventBus.addEventListener(type, listener, useCapture);
        },

        /**
         * function used to unregister webapp function on hasplayer events
         * @access public
         * @memberof MediaPlayer#
         * @param  type - event type : log, error, subtitlesStyleChanged, updateend, manifestLoaded, metricChanged, metricsChanged, metricAdded
         *  and metricUpdated.
         * @param  listener - function callback name.
         * @param  useCapture - .
         * @return TBD
         */
        removeEventListener: function(type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         * @return TBD
         */
        getVersion: function() {
            return VERSION;
        },

        /**
         * get the HAS version
         * @access public
         * @memberof MediaPlayer#
         * @return hasplayer version
         */
        getVersionHAS: function() {
            return VERSION_HAS;
        },

        /**
         * get the full version (with git tag, only at build)
         * @access public
         * @memberof MediaPlayer#
         * @return full hasplayer version
         */
        getVersionFull: function() {
            if (GIT_TAG.indexOf("@@") === -1) {
                return VERSION_HAS + '_' + GIT_TAG;
            } else {
                return VERSION_HAS;
            }
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         * @return date when the hasplayer has been built.
         */
        getBuildDate: function() {
            if (BUILD_DATE.indexOf("@@") === -1) {
                return BUILD_DATE;
            } else {
                return 'Not a builded version';
            }
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         */
        startup: function() {
            if (!initialized) {
                system.injectInto(this);
                initialized = true;

                this.debug.log("[MediaPlayer] Version: " + this.getVersionFull() + " - " + this.getBuildDate());
                this.debug.log("[MediaPlayer] user-agent: " + navigator.userAgent);
            }
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         * @return TBD
         */
        getDebug: function() {
            return this.debug;
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         * @return TBD
         */
        getVideoModel: function() {
            return videoModel;
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         * @param value - .
         */
        setAutoPlay: function(value) {
            autoPlay = value;
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         * @return TBD
         */
        getAutoPlay: function() {
            return autoPlay;
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         * @param value - .
         */
        setScheduleWhilePaused: function(value) {
            scheduleWhilePaused = value;
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         * @return TBD
         */
        getScheduleWhilePaused: function() {
            return scheduleWhilePaused;
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         * @param name - .
         * @param type - .
         */
        setTokenAuthentication: function(name, type) {
            this.tokenAuthentication.setTokenAuthentication({
                name: name,
                type: type
            });
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         * @param value - .
         */
        setBufferMax: function(value) {
            bufferMax = value;
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         * @return TBD
         */
        getBufferMax: function() {
            return bufferMax;
        },

        /**
         * @access public
         * @memberof MediaPlayer#
         * @return TBD
         */
        getMetricsExt: function() {
            return this.metricsExt;
        },

        /**
         * get metrics for stream type
         * @access public
         * @memberof MediaPlayer#
         * @param  type - stream type, video or audio.
         * @return metrics array for the selected type
         */
        getMetricsFor: function(type) {
            var metrics = this.metricsModel.getReadOnlyMetricsFor(type);
            return metrics;
        },

        /**
         * get current quality for a stream
         * @access public
         * @memberof MediaPlayer#
         * @param  type - stream type, video or audio.
         * @return current quality for the selected type.
         */
        getQualityFor: function(type) {
            return this.abrController.getQualityFor(type);
        },

        /**
         * select quality level for audio or video stream.
         * If you want to set limit up and down for video for instance, you have to use setConfig function.
         * @access public
         * @memberof MediaPlayer#
         * @param type - audio or video stream type.
         * @param value - selected quality level, id of the quality not bitrate.
         */
        setQualityFor: function(type, value) {
            this.abrController.setPlaybackQuality(type, value);
        },

        /**
         * function to get auto switch quality status.
         * @access public
         * @memberof MediaPlayer#
         * @return auto switch quality, true or false.
         */
        getAutoSwitchQuality: function() {
            return this.abrController.getAutoSwitchBitrate();
        },

        /**
         * function to enable or disable auto switch quality by ABR controller.
         * @access public
         * @memberof MediaPlayer#
         * @param value - true or false auto switch quality
         */
        setAutoSwitchQuality: function(value) {
            this.abrController.setAutoSwitchBitrate(value);
        },

        /**
         * function to set some player configuration parameters
         * @access public
         * @memberof MediaPlayer#
         * @param params - configuration parameters
         * @see {@link http://localhost:8080/OrangeHasPlayer/samples/Dash-IF/hasplayer_config.json}
         *
         */
        setConfig: function(params) {
            if (this.config && params) {
                this.debug.log("[MediaPlayer] set config: " + JSON.stringify(params, null, '\t'));
                this.config.setParams(params);
            }
        },

        /**
         * function to switch audioTracks for a media
         * @access public
         * @memberof MediaPlayer#
         * @param audioTrack - The selected audio track.
         */
        setAudioTrack: function(audioTrack) {
            streamController.setAudioTrack(audioTrack);
        },

        getSelectedAudioTrack: function() {
            if (streamController) {
                return streamController.getSelectedAudioTrack();
            }else{
                return null;
            }
        },

        getSelectedSubtitleTrack: function() {
            if (streamController) {
                return streamController.getSelectedSubtitleTrack();
            }else{
                return null;
            }
        },

        /**
         * get the audio track list
         * @access public
         * @memberof MediaPlayer#
         * @return audio tracks array.
         */
        getAudioTracks: function() {
            if (streamController) {
                return streamController.getAudioTracks();
            } else {
                return null;
            }
        },

        /**
         * add function to switch subtitleTracks for a media
         * @access public
         * @memberof MediaPlayer#
         * @param subtitleTrack - The selected subtitle track.
         */
        setSubtitleTrack: function(subtitleTrack) {
            if (streamController) {
                streamController.setSubtitleTrack(subtitleTrack);
            }else{
                return null;
            }
        },

        /**
         * get the subtitle track list
         * @access public
         * @memberof MediaPlayer#
         * @return subtitle tracks array.
         */
        getSubtitleTracks: function() {
            if (streamController) {
                return streamController.getSubtitleTracks();
            } else {
                return null;
            }
        },

        /**
         * set the video element in the hasplayer.js
         * @access public
         * @memberof MediaPlayer#
         * @param  view - html5 video element
         */
        attachView: function(view) {
            if (!initialized) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.HASPLAYER_INIT_ERROR, "MediaPlayer not initialized!");
                return;
            }

            element = view;

            videoModel = null;
            if (element) {
                videoModel = system.getObject("videoModel");
                videoModel.setElement(element);
            }

            // TODO : update
            if (playing && streamController) {
                streamController.reset();
                playing = false;
            }
        },

        /**
         * add source stream parameters (ex: DRM custom data)
         * @function
         * @access public
         * @memberof MediaPlayer#
         * @param  url - video stream url to play, it could be dash, smooth or hls.
         * @param  params - datas like back Url licenser and custom datas
         */
        attachSource: function(url, protData) {
            var loop,
                videoModel;

            if (!initialized) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.HASPLAYER_INIT_ERROR, "MediaPlayer not initialized!");
                return;
            }

            videoModel = this.getVideoModel();

            if (!videoModel) {
                this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.HASPLAYER_INIT_ERROR, "videoModel not initialized");
                return;
            }

            // ORANGE : add metric
            loop = videoModel.getElement().loop;
            if (url) {
                this.metricsModel.addSession(null, url, loop, null, "HasPlayer.js_" + this.getVersionHAS());
            }

            this.uriQueryFragModel.reset();
            if (url) {
                source = this.uriQueryFragModel.parseURI(url);
            } else {
                source = null;
            }

            protectionData = protData;

            resetAndPlay.call(this);

            /*if (playing && streamController) {
                streamController.reset();
                playing = false;
            }

            if (isReady.call(this)) {
                doAutoPlay.call(this);
            }*/
        },

         /**
         * refresh manifest url
         * @method refeshManifest
         * @access public
         * @memberof OrangeHasPlayer#
         * param {string} url - the video stream's manifest (MPEG DASH, Smooth Streaming or HLS) url
         */
        refreshManifest: function(url){
            if(streamController){
                streamController.refreshManifest(url);
            }
        },

        /**
         * function used to stop video player, set source value to null and reset stream controller.
         * @access public
         * @memberof MediaPlayer#
         */
        reset: function(reason) {
            this.metricsModel.addState("video", "stopped", this.getVideoModel().getCurrentTime(), reason);
            this.attachSource(null);
            protectionData = null;
        },

        setDefaultAudioLang: function(language) {
            defaultAudioLang = language;
        },

        setDefaultSubtitleLang: function(language) {
            defaultSubtitleLang = language;
        },


        play: play,
        isReady: isReady,
        seek: seek,
        time: time,
        duration: duration,
        timeAsUTC: timeAsUTC,
        durationAsUTC: durationAsUTC,
        getDVRWindowSize: getDVRWindowSize,
        getDVRSeekOffset: getDVRSeekOffset,
        formatUTC: formatUTC,
        convertToTimeCode: convertToTimeCode

    };
};

/**
 * @class
 * @classdesc MediaPlayer is the object used by the webapp to instanciante and control hasplayer.
 */
MediaPlayer.prototype = {
    constructor: MediaPlayer
};

MediaPlayer.dependencies = {};
MediaPlayer.dependencies.protection = {};
MediaPlayer.dependencies.protection.servers = {};
MediaPlayer.utils = {};
MediaPlayer.models = {};
MediaPlayer.modules = {};
MediaPlayer.vo = {};
MediaPlayer.vo.metrics = {};
MediaPlayer.vo.protection = {};
MediaPlayer.rules = {};
MediaPlayer.rules.o = {};
MediaPlayer.di = {};
