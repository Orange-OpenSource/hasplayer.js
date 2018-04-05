/**
 * The copyright in this software module is being made available under the BSD License, included below. This software module may be subject to other third party and/or contributor rights, including patent rights, and no such rights are granted under this license.
 * The whole software resulting from the execution of this software module together with its external dependent software modules from dash.js project may be subject to Orange and/or other third party rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014, Orange
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Orange nor the names of its contributors may be used to endorse or promote products derived from this software module without specific prior written permission.
 *
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * @constructs MediaPlayer
 *
 */
/*jshint -W020 */

/**
 * @class
 * @classdesc MediaPlayer is the object used by the webapp to instanciante and control hasplayer.
 */
MediaPlayer = function () {

//#region Private attributes/properties
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////// PRIVATE ////////////////////////////////////////////
    var VERSION_DASHJS = '1.2.0',
        VERSION = 'DEV',
        GIT_TAG = '@@REVISION',
        BUILD_DATE = '@@TIMESTAMP',
        context = new MediaPlayer.di.Context(), // default context
        system = new dijon.System(), // dijon system instance
        initialized = false,
        debugController = null, // use to handle key pressed and download debug file
        videoModel, // model to manipulate the domVideoNode
        videoBitrates = null, //bitrates list of video
        audioBitrates = null,
        videoQualityChanged = [],
        audioQualityChanged = [],
        error = null,
        warning = null,
        defaultAudioLang = 'und',
        defaultSubtitleLang = 'und',
        subtitlesEnabled = false,
        initialQuality = {
            video: -1,
            audio: -1
        },
        streamController = null,
        resetting = false,
        playing = false,
        autoPlay = true,
        source = null, // current source played
        scheduleWhilePaused = false, // should we buffer while in pause
        isSafari = (fingerprint_browser().name === "Safari"),
        plugins = {};
//#endregion

//#region Private methods
    var _isPlayerInitialized = function () {
        if (!initialized) {
            throw new Error('MediaPlayer not initialized !!!');
        }
    };

    var _isVideoModelInitialized = function () {
        if (!videoModel.getElement()) {
            throw new Error('MediaPlayer.play(): Video element not attached to MediaPlayer');
        }
    };

    var _isSourceInitialized = function () {
        if (!source) {
            throw new Error('MediaPlayer.play(): Source not attached to MediaPlayer');
        }
    };

    var _play = function () {
        var plugin,
            pluginsInitDefer = [],
            pluginsLoadDefer = [];

        _isPlayerInitialized();
        _isVideoModelInitialized();
        _isSourceInitialized();

        // Check MSE support
        // (except in case of HLS streams on Safari for which we do not use MSE)
        if (!(isSafari && source.protocol === 'HLS') && !MediaPlayer.hasMediaSourceExtension()) {
            this.errHandler.sendError(MediaPlayer.dependencies.ErrorHandler.prototype.CAPABILITY_ERR_MEDIASOURCE, "MediaSource extension not supported by the browser");
            return;
        }

        // Wait for plugins completely intialized before starting a new session
        for(var name in  plugins) {
            pluginsInitDefer.push(plugins[name].deferInit.promise);
        }
        Q.all(pluginsInitDefer).then((function () {
            // Notify plugins a new stream is loaded
            for (var name in plugins) {
                plugin = plugins[name];
                plugin.deferLoad = Q.defer();
                pluginsLoadDefer.push(plugin.deferLoad.promise);
                plugin.load(source, function () {
                    this.deferLoad.resolve();
                }.bind(plugin));
            }

            Q.all(pluginsLoadDefer).then((function () {
                // Once all plugins are ready, we load the stream
                playing = true;

                this.metricsModel.addSession(null, source.url, videoModel.getElement().loop, null, "MediaPlayer.js_" + this.getVersion());

                this.debug.log("[MediaPlayer] Version: " + this.getVersionFull() + " - " + this.getBuildDate());
                this.debug.log("[MediaPlayer] user-agent: " + navigator.userAgent);
                this.debug.log("[MediaPlayer] Load stream:\n", JSON.stringify(source, null, '  '));

                // streamController Initialization
                if (!streamController) {
                    streamController = system.getObject('streamController');
                    streamController.setVideoModel(videoModel);
                    streamController.setAutoPlay(autoPlay);
                }

                streamController.setDefaultAudioLang(defaultAudioLang);
                streamController.setDefaultSubtitleLang(defaultSubtitleLang);
                streamController.enableSubtitles(subtitlesEnabled);
                streamController.load(source);
                system.mapValue("scheduleWhilePaused", scheduleWhilePaused);
                system.mapOutlet("scheduleWhilePaused", "stream");

            }).bind(this));
        }).bind(this));
    };

    // player state and intitialization
    var _isReady = function () {
        return initialized && videoModel.getElement() && source && !resetting;
    };

    var _doAutoPlay = function () {
        if (_isReady()) {
            _play.call(this);
        }
    };

    // event disptach
    var _dispatchBitrateEvent = function (type, value) {
        var event = document.createEvent("CustomEvent");
        event.initCustomEvent(type, false, false, {
            type: value.streamType,
            bitrate: value.switchedQuality,
            representationId: value.representationId,
            time: videoModel.getCurrentTime(),
            width: value.width,
            height: value.height
        });
        videoModel.getElement().dispatchEvent(event);
    };

    var _metricAdded = function (e) {
        var event;
        switch (e.data.metric) {
            case "ManifestReady":
                _isPlayerInitialized();
                this.debug.log("[MediaPlayer] ManifestReady");
                videoBitrates = this.metricsExt.getBitratesForType('video');
                this.debug.log("[MediaPlayer] video bitrates: " + JSON.stringify(videoBitrates));
                event = document.createEvent("CustomEvent");
                event.initCustomEvent('manifest_loaded', false, false, {});
                videoModel.getElement().dispatchEvent(event);
                break;
            case "RepresentationSwitch":
                _isPlayerInitialized();
                if (e.data.stream == "video") {
                    videoBitrates = this.metricsExt.getBitratesForType(e.data.stream);
                    if (videoBitrates) {
                        _dispatchBitrateEvent('download_bitrate', {
                            streamType: e.data.stream,
                            switchedQuality: videoBitrates[e.data.value.lto],
                            representationId: e.data.value.to,
                            width: this.metricsExt.getVideoWidthForRepresentation(e.data.value.to),
                            height: this.metricsExt.getVideoHeightForRepresentation(e.data.value.to)
                        });
                        this.debug.log("[MediaPlayer][" + e.data.stream + "] send download_bitrate - b=" + videoBitrates[e.data.value.lto]);
                    }
                } else if (e.data.stream == "audio") {
                    audioBitrates = this.metricsExt.getBitratesForType(e.data.stream);
                    if (audioBitrates) {
                        _dispatchBitrateEvent('download_bitrate', {
                            streamType: e.data.stream,
                            switchedQuality: audioBitrates[e.data.value.lto],
                            representationId: e.data.value.to,
                            width: this.metricsExt.getVideoWidthForRepresentation(e.data.value.to),
                            height: this.metricsExt.getVideoHeightForRepresentation(e.data.value.to)
                        });
                        this.debug.log("[MediaPlayer][" + e.data.stream + "] send download_bitrate - b=" + videoBitrates[e.data.value.lto]);
                    }
                }
                break;
            case "BufferedSwitch":
                _isPlayerInitialized();
                if (e.data.stream == "video") {
                    videoQualityChanged.push({
                        streamType: e.data.stream,
                        mediaStartTime: e.data.value.mt,
                        switchedQuality: videoBitrates[e.data.value.lto],
                        representationId: e.data.value.to,
                        width: this.metricsExt.getVideoWidthForRepresentation(e.data.value.to),
                        height: this.metricsExt.getVideoHeightForRepresentation(e.data.value.to)
                    });
                } else if (e.data.stream == "audio") {
                    audioQualityChanged.push({
                        streamType: e.data.stream,
                        mediaStartTime: e.data.value.mt,
                        switchedQuality: audioBitrates[e.data.value.lto],
                        representationId: e.data.value.to,
                        width: this.metricsExt.getVideoWidthForRepresentation(e.data.value.to),
                        height: this.metricsExt.getVideoHeightForRepresentation(e.data.value.to)
                    });
                }
                break;
            case "BufferLevel":
                //this.debug.log("[MediaPlayer] BufferLevel = "+e.data.value.level+" for type = "+e.data.stream);
                event = document.createEvent("CustomEvent");
                event.initCustomEvent('bufferLevel_updated', false, false, {
                    type: e.data.stream,
                    level: e.data.value.level
                });
                videoModel.getElement().dispatchEvent(event);
                break;
            case "State":
                //this.debug.log("[MediaPlayer] State = "+e.data.value.current+" for type = "+e.data.stream);
                event = document.createEvent("CustomEvent");
                event.initCustomEvent('state_changed', false, false, {
                    type: e.data.stream,
                    state: e.data.value.current
                });
                videoModel.getElement().dispatchEvent(event);
                break;
        }
    };

    var _onError = function (e) {
        error = e.data;
        this.reset(2);
    };

    var _onWarning = function (e) {
        warning = e.data;
    };

    var _cleanStreamTab = function (streamTab, idToRemove) {
        var i = 0;

        for (i = idToRemove.length - 1; i >= 0; i -= 1) {
            streamTab.splice(i, 1);
        }
    };

    var _detectPlayBitrateChange = function (streamTab) {
        var currentTime = videoModel.getCurrentTime(),
            currentSwitch = null,
            idToRemove = [],
            i = 0;

        for (i = 0; i < streamTab.length; i += 1) {
            currentSwitch = streamTab[i];
            if (currentTime >= currentSwitch.mediaStartTime) {
                _dispatchBitrateEvent('play_bitrate', currentSwitch);
                this.debug.log("[MediaPlayer][" + currentSwitch.streamType + "] send play_bitrate - b=" + currentSwitch.switchedQuality + ", t=" + currentSwitch.mediaStartTime + "(" + videoModel.getPlaybackRate() + ")");
                // And remove when it's played
                idToRemove.push(i);
            }
        }

        _cleanStreamTab(streamTab, idToRemove);
    };

    // Usefull to dispatch event of quality changed
    var _onTimeupdate = function () {
        // If not in playing state, then do not send 'play_bitrate' events, wait for 'loadeddata' event first
        if (videoModel.getPlaybackRate() === 0) {
            return;
        }
        // Check for video playing quality change
        _detectPlayBitrateChange.call(this, videoQualityChanged);
        // Check for audio playing quality change
        _detectPlayBitrateChange.call(this, audioQualityChanged);
    };

    // event connection
    var _connectEvents = function () {
        this.addEventListener('metricAdded', _metricAdded.bind(this));
        this.addEventListener('error', _onError.bind(this));
        this.addEventListener('warning', _onWarning.bind(this));
        this.addEventListener('timeupdate', _onTimeupdate.bind(this));
    };

    // Keyboard handler to display version
    var _handleKeyPressedEvent = function(e) {
        // If Ctrl+Alt+Shift+d is pressed then display MediaPlayer version and plugins versions
        if (e.altKey === true && e.ctrlKey === true && e.shiftKey === true && e.keyCode === 86) {
            console.log('[MediaPlayer] Version: ' + this.getVersion() + ' - ' + this.getBuildDate());
            for (var plugin in plugins) {
                console.log('[' + plugins[plugin].getName() + '] Version: ' + plugins[plugin].getVersion() + ' - ' + plugins[plugin].getBuildDate());
            }
            
        }
    };

    /// Private playback functions ///
    var _resetAndPlay = function (reason) {
        if (playing && streamController) {
            if (!resetting) {
                resetting = true;

                var teardownComplete = {};
                teardownComplete[MediaPlayer.dependencies.StreamController.eventList.ENAME_TEARDOWN_COMPLETE] = (function () {

                    // Notify plugins that player is reset
                    for (var plugin in plugins) {
                        plugins[plugin].reset();
                    }

                    // Finish rest of shutdown process
                    streamController = null;
                    playing = false;

                    resetting = false;

                    this.debug.log("[MediaPlayer] Player is stopped");

                    if (_isReady.call(this)) {
                        _doAutoPlay.call(this);
                    }
                }).bind(this);
                streamController.subscribe(MediaPlayer.dependencies.StreamController.eventList.ENAME_TEARDOWN_COMPLETE, teardownComplete, undefined, true);
                streamController.reset(reason);
            }
        } else {
            if (_isReady.call(this)) {
                _doAutoPlay.call(this);
            }
        }
    };

    var _toMediaPlayerTrack = function (track) {
        if (!track) {
            return null;
        }
        var _track = {};
        if (track.id) {
            _track.id = track.id;
        }
        if (track.lang) {
            _track.lang = track.lang;
        }
        if (track.subType) {
            _track.subType = track.subType;
        }
        return _track;
    };

    var _getTracksFromType = function (_type) {
        if (!streamController) {
            return null;
        }
        switch (_type) {
            case MediaPlayer.TRACKS_TYPE.AUDIO:
                return streamController.getAudioTracks();
            case MediaPlayer.TRACKS_TYPE.TEXT:
                return streamController.getSubtitleTracks();
        }
        return null;
    };

    var _getSelectedTrackFromType = function (_type) {
        if (!streamController) {
            return null;
        }
        switch (_type) {
            case MediaPlayer.TRACKS_TYPE.AUDIO:
                return streamController.getSelectedAudioTrack();
            case MediaPlayer.TRACKS_TYPE.TEXT:
                return streamController.getSelectedSubtitleTrack();
        }
        return null;
    };

    var _selectTrackFromType = function (_type, _track) {
        if (!streamController) {
            return null;
        }
        switch (_type) {
            case MediaPlayer.TRACKS_TYPE.AUDIO:
                streamController.setAudioTrack(_track);
                break;
            case MediaPlayer.TRACKS_TYPE.TEXT:
                streamController.setSubtitleTrack(_track);
                break;
        }
        return null;
    };

    var _isEqual = function (prop1, prop2) {
        if (!prop1 && !prop2) {
            // let's consider in this case that null and undefined are equal
            return true;
        }
        return prop1 === prop2;
    };

    var _isSameTrack = function (track1, track2) {
        return (_isEqual(track1.id, track2.id) && _isEqual(track1.lang, track2.lang) && _isEqual(track1.subType, track2.subType));
    };

    // parse the arguments of load function to make an object
    var _parseLoadArguments = function () {
        if (arguments && arguments.length > 0) {
            var params = {};
            // restaure url
            if (typeof arguments[0] === 'string') {
                params.url = arguments[0];
            }
            //restaure protData
            if (arguments[1]) {
                params.protData = arguments[1];
            }
            return params;
        }

    };

    var _getDVRInfoMetric = function () {
        var metrics = this.metricsModel.getReadOnlyMetricsFor('video'),
            dvrInfo = metrics ? this.metricsExt.getCurrentDVRInfo(metrics) : null;
        return dvrInfo;
    };

//#endregion

//#region DIJON initialization
    system.mapValue('system', system);
    system.mapOutlet('system');
    system.injectInto(context);
//#endregion

    return {
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////// PUBLIC /////////////////////////////////////////////
//#region dependencies
        notifier: undefined,
        debug: undefined,
        eventBus: undefined,
        metricsExt: undefined,
        abrController: undefined,
        metricsModel: undefined,
        errHandler: undefined,
        config: undefined,
//#endregion

//#region VERSION
        /**
         * Returns the version of the player.
         * @method getVersion
         * @access public
         * @memberof MediaPlayer#
         * @return {string} the version of the player
         */
        getVersion: function () {
            return VERSION;
        },

        /**
         * Returns the full version of the player (including git tag).
         * @method getVersionFull
         * @access public
         * @memberof MediaPlayer#
         * @return {string} the version of the player including git tag
         */
        getVersionFull: function () {
            if (GIT_TAG.indexOf("@@") === -1) {
                return VERSION + '_' + GIT_TAG;
            } else {
                return VERSION;
            }
        },

        /**
         * Returns the version of dash.js from which this player has been built.
         * @method getVersionDashJS
         * @access public
         * @memberof MediaPlayer#
         * @return {string} the dash.js version
         */
        getVersionDashJS: function () {
            return VERSION_DASHJS;
        },

        /**
         * Returns the date at which this player has been built.
         * @access public
         * @memberof MediaPlayer#
         * @return {string} the date at which this player has been built
         */
        getBuildDate: function () {
            if (BUILD_DATE.indexOf("@@") === -1) {
                return BUILD_DATE;
            } else {
                return 'Not a builded version';
            }
        },
//#endregion

//#region INIT
        /**
         * Initialize the player.
         * @method init
         * @access public
         * @memberof MediaPlayer#
         * @param {Object} video - the HTML5 video element used to decode and render the media data
         */
        init: function (video) {
            if (!video) {
                throw new Error('MediaPlayer.init(): Invalid Argument');
            }
            if (!initialized) {
                system.injectInto(this);
                initialized = true;
                this.debug.log("[MediaPlayer] Version: " + this.getVersionFull() + " - " + this.getBuildDate());
                this.debug.log("[MediaPlayer] user-agent: " + navigator.userAgent);
            }
            videoModel = system.getObject('videoModel');
            videoModel.setElement(video);

            // in case of init is called another time
            /*if (playing && streamController) {
                streamController.reset();
                playing = false;
            }*/

            // connect default events
            _connectEvents.call(this);
            //debugController.init();

            // create DebugController
            debugController = system.getObject('debugController');
            debugController.init(VERSION);

            window.addEventListener('keydown', _handleKeyPressedEvent.bind(this));            
        },
//#endregion

//#region LISTENERS
        /**
         * Registers a listener on the specified event.
         * The possible event types are:
         * <li>'error' (see [error]{@link MediaPlayer#event:error} event specification)
         * <li>'warning' (see [warning]{@link MediaPlayer#event:warning} event specification)
         * <li>'manifestUrlUpdate' (see [manifestUrlUpdate]{@link MediaPlayer#event:manifestUrlUpdate} event specification)
         * <li>'play_bitrate' (see [play_bitrate]{@link MediaPlayer#event:play_bitrate} event specification)
         * <li>'download_bitrate' (see [download_bitrate]{@link MediaPlayer#event:download_bitrate} event specification)
         * <li>'bufferLevel_updated' (see [bufferLevel_updated]{@link MediaPlayer#event:bufferLevel_updated} event specification)
         * <li>'state_changed' (see [state_changed]{@link MediaPlayer#event:state_changed} event specification)
         * <li>'cueEnter' (see [cueEnter]{@link MediaPlayer#event:cueEnter} event specification)
         * <li>'cueExit' (see [cueExit]{@link MediaPlayer#event:cueExit} event specification)
         * @method addEventListener
         * @access public
         * @memberof MediaPlayer#
         * @param {string} type - the event type for listen to, either any HTML video element event or player event.
         * @param {callback} listener - the callback which is called when an event of the specified type occurs
         * @param {boolean} useCapture - see HTML DOM addEventListener() method specification
         */
        addEventListener: function (type, listener, useCapture) {
            _isPlayerInitialized();
            if (MediaPlayer.PUBLIC_EVENTS[type] === 'hasplayer') {
                this.eventBus.addEventListener(type, listener, useCapture);
            } else {
                videoModel.listen(type, listener, useCapture);
            }
        },

        /**
         * Unregisters the listener previously registered with the addEventListener() method.
         * @method removeEventListener
         * @access public
         * @memberof MediaPlayer#
         * @see [addEventListener]{@link MediaPlayer#addEventListener}
         * @param {string} type - the event type on which the listener was registered
         * @param {callback} listener - the callback which was registered to the event type
         */
        removeEventListener: function (type, listener) {
            _isPlayerInitialized();
            if (MediaPlayer.PUBLIC_EVENTS[type] === 'hasplayer') {
                this.eventBus.removeEventListener(type, listener);
            } else {
                videoModel.unlisten(type, listener);
            }
        },
//#endregion

//#region COMPONENTS GETTER
        /**
         * Returns the video model object.
         * @access public
         * @memberof MediaPlayer#
         * @return {object} the video model object
         */
        getVideoModel: function() {
            return videoModel;
        },

        /**
         * Returns the debug object.
         * @access public
         * @memberof MediaPlayer#
         * @return {object} the debug object
         */
        getDebug: function () {
            return this.debug;
        },

        /**
         * Returns the metrics extension object.
         * @access public
         * @memberof MediaPlayer#
         * @return {object} the metrics extension object
         */
        getMetricsExt: function () {
            return this.metricsExt;
        },
//#endregion

//#region CONFIG
        /**
         * Sets player configuration parameters.
         * @access public
         * @memberof MediaPlayer#
         * @param {MediaPlayer#PlayerParams} params - parameter(s) value(s) to set.
         */
        setConfig: function (params) {
            if (this.config && params) {
                this.debug.log("[MediaPlayer] set config: " + JSON.stringify(params, null, '\t'));
                this.config.setParams(params);
            }
        },
        setParams: function (params) {
            this.setConfig(params);
        },

        /**
         * Enables or disables debug information in the browser console.
         * @method setDebug
         * @access public
         * @memberof MediaPlayer#
         * @param {boolean} value - true to enable debug information, false to disable
         */
        setDebug: function (value) {
            _isPlayerInitialized();
            if (typeof value !== 'boolean') {
                throw new Error('MediaPlayer.setDebug(): Invalid Arguments');
            }
            if (value === true) {
                this.debug.setLevel(4);
            } else {
                this.debug.setLevel(0);
            }
        },

        /**
         * Returns the autoplay state.
         * @access public
         * @memberof MediaPlayer#
         * @return {boolean} the autoplay state
         */
        getAutoPlay: function () {
            return autoPlay;
        },

        /**
         * Sets the autoplay state.
         * @access public
         * @memberof MediaPlayer#
         * @param {boolean} value - true to activate autoplay, false to disable autoplay
         */
        setAutoPlay: function (value) {
            autoPlay = value;
        },

        /**
         * Sets the initial quality to be downloaded for the given track type.
         * This method has to be used before each call to load() method to set the initial quality.
         * Otherwise, the initial quality is set according to previous bandwidth condition.
         * @access public
         * @memberof MediaPlayer#
         * @see [setConfig]{@link MediaPlayer#setConfig} to set quality boundaries
         * @param {string} type - the track type ('video' or 'audio')
         * @param {number} value - the new initial quality index (starting from 0) to be downloaded
         */
        setInitialQualityFor: function (type, value) {
            initialQuality[type] = value;
        },

        /**
         * Returns the current quality for a stream type.
         * @access public
         * @memberof MediaPlayer#
         * @param {string} type - stream type, 'video' or 'audio'
         * @return {number} the current quality level as an index of the quality (in bitrate ascending order)
         */
        getQualityFor: function (type) {
            _isPlayerInitialized();
            return this.abrController.getQualityFor(type);
        },

        /**
         * Selects the quality for a stream type.
         * @access public
         * @memberof MediaPlayer#
         * @param {string} type - stream type, 'video' or 'audio'
         * @param {number} value - the selected quality level as an index of the quality (in bitrate ascending order)
         */
        setQualityFor: function (type, value) {
            _isPlayerInitialized();
            if (typeof value !== 'number') {
                throw new Error('MediaPlayer.setQualityFor(): Invalid Arguments');
            }
            this.abrController.setQualityFor(type, value);
        },

        /**
         * Returns the auto switch quality state.
         * @access public
         * @memberof MediaPlayer#
         * @return {boolean} the auto switch quality state
         */
        getAutoSwitchQuality: function() {
            _isPlayerInitialized();
            return this.abrController.getAutoSwitchBitrate();
        },

        /**
         * Sets the auto switch quality state.
         * @access public
         * @memberof MediaPlayer#
         * @param {boolean} value - the new auto switch quality state
         */
        setAutoSwitchQuality: function(value) {
            _isPlayerInitialized();
            if (typeof value !== 'boolean') {
                throw new Error('MediaPlayer.setAutoSwitchQuality(): Invalid Arguments');
            }
            this.abrController.setAutoSwitchBitrate(value);
        },

        /**
         * Returns the buffering behaviour while the player is in pause.
         * @access public
         * @memberof MediaPlayer#
         * @return {boolean} true if the player still buffers stream while in pause
         */
        getScheduleWhilePaused: function () {
            return scheduleWhilePaused;
        },

        /**
         * Sets the buffering behaviour while player is in pause.
         * @access public
         * @memberof MediaPlayer#
         * @param {boolean} value - true if the player has to buffer stream while in pause
         */
        setScheduleWhilePaused: function (value) {
            if (typeof value !== 'boolean') {
                throw new Error('MediaPlayer.setScheduleWhilePaused(): Invalid Arguments');
            }
            scheduleWhilePaused = value;
        },

        /**
         * Sets the default audio language. If the default language is available in the stream,
         * the corresponding audio track is selected. Otherwise, the first declared audio track in the manifest is selected.
         * @method setDefaultAudioLang
         * @access public
         * @memberof MediaPlayer#
         * @param {string} lang - the default audio language based on ISO 3166-2
         */
        setDefaultAudioLang: function (language) {
            if (typeof language !== 'string') {
                throw new Error('MediaPlayer.setDefaultAudioLang(): Invalid Arguments');
            }
            defaultAudioLang = language;
        },

        /**
         * Gets the default audio language.
         * @method getDefaultAudioLang
         * @access public
         * @memberof MediaPlayer#
         * @return {string} lang - the default audio language based on ISO 3166-2
         */
        getDefaultAudioLang: function(){
            return defaultAudioLang;
        },

        /**
         * Sets the default subtitle language. If the default language is available in the stream,
         * the corresponding subtitle track is selected. Otherwise, the first declared subtitle track in the manifest is selected.
         * @method setDefaultSubtitleLang
         * @access public
         * @memberof MediaPlayer#
         * @param {string} lang - the default subtitle language based on ISO 3166-2
         */
        setDefaultSubtitleLang: function (language) {
            if (typeof language !== 'string') {
                throw new Error('MediaPlayer.setDefaultSubtitleLang(): Invalid Arguments');
            }
            defaultSubtitleLang = language;
        },

        /**
         * Gets the default subtitle language.
         * @method getDefaultSubtitleLang
         * @access public
         * @memberof MediaPlayer#
         * @return {string} lang - the default subtitle language based on ISO 3166-2
         */
        getDefaultSubtitleLang: function () {
            return defaultSubtitleLang;
        },
//#endregion

//#region PLAYBACK
        /**
         * Load/open a video stream.
         * @method load
         * @access public
         * @memberof MediaPlayer#
         * @param {object} stream - video stream properties object such url, startTime, prodData ...
            <pre>
            {
                url : "[manifest url]",
                startTime : [start time in seconds (optional, only for static streams)],
                startOver : [true if start-over DVR stream (optional)],
                protocol : "[protocol type]", // 'HLS' to activate native support on Safari/OSx
                protData : {
                    // one entry for each key system ('com.microsoft.playready' or 'com.widevine.alpha')
                    "[key_system_name]": {
                        laURL: "[licenser url (optional)]",
                        withCredentials: "[license_request_withCredentials_value (true or false, optional)]",
                        cdmData: "[CDM data (optional)]", // Supported by PlayReady key system (using MS-prefixed EME API) only
                        serverCertificate: "[license_server_certificate (as Base64 string, optional)]",
                        audioRobustness: "[audio_robustness_level (optional)]", // Considered for Widevine key system only
                        videoRobustness: "[video_robustness_level (optional)]" // Considered for Widevine key system only
                    },
                    ...
               }
               ...
            }
            </pre>
        */
        load: function (stream) {
            var config = {
                    video: {
                        "ABR.keepBandwidthCondition": true
                    },
                    audio: {
                        "ABR.keepBandwidthCondition": true
                    }
                };

            // patch to be retro compatible with old syntax
            if (arguments && arguments.length > 0 && typeof arguments[0] !== 'object') {
                console.warn('You are using "deprecated" call of the method load, please refer to the documentation to change prameters call');
                stream = _parseLoadArguments.apply(null, arguments);
            }

            if(!stream || !stream.url){
                 throw new Error('MediaPlayer.load(): stream has no url.');
            }

            videoQualityChanged = [];
            audioQualityChanged = [];

            _isPlayerInitialized();

            // Reset the player
            this.reset(0);

            // Set initial quality if first stream
            if (initialQuality.video >= 0) {
                this.abrController.setQualityFor('video', initialQuality.video);
                config.video["ABR.keepBandwidthCondition"] = false;
                initialQuality.video = -1;
            }

            if (initialQuality.audio >= 0) {
                this.abrController.setQualityFor('audio', initialQuality.audio);
                config.audio["ABR.keepBandwidthCondition"] = false;
                initialQuality.audio = -1;
            }

            // Set config to set 'keepBandwidthCondition' parameter
            this.setConfig(config);

            // Reset last error and warning
            error = null;
            warning = null;

            source = stream;
            _resetAndPlay.call(this, 0);
        },

        /**
        * Plays/resumes playback of the media.
        * @method play
        * @access public
        * @memberof MediaPlayer#
        */
        play: function () {
            _isPlayerInitialized();
            videoModel.play();
        },

        /**
         * Seeks the media to the new time. For LIVE streams, this function can be used to perform seeks within the DVR window if available.
         * @method seek
         * @access public
         * @memberof MediaPlayer#
         * @param {number} time - the new time value in seconds
         */
        seek: function (time) {
            var range = null,
                liveDelay = 0;

            _isPlayerInitialized();

            if (typeof time !== 'number' || isNaN(time)) {
                throw new Error('MediaPlayer.seek(): Invalid Arguments');
            }

            if (!this.isLive()) {
                if (time < 0 || time > videoModel.getDuration()) {
                    throw new Error('MediaPlayer.seek(): seek value outside available time range');
                } else {
                    videoModel.setCurrentTime(time);
                }
            } else {
                range = this.getDVRWindowRange();
                liveDelay = streamController.getLiveDelay();
                if (range === null) {
                    throw new Error('MediaPlayer.seek(): impossible for live stream');
                } else if (time < range.start || time > range.end) {
                    throw new Error('MediaPlayer.seek(): seek value outside available time range');
                } else {
                    // Ensure we keep enough buffer
                    if (time > (range.end - liveDelay)) {
                        time = range.end - liveDelay;
                    }
                    streamController.seek(time, true);
                }
            }
        },

        /**
         * Pauses the media playback.
         * @method pause
         * @access public
         * @memberof MediaPlayer#
         */
        pause: function () {
            _isPlayerInitialized();
            videoModel.pause();
        },

        /**
         * Stops the media playback and seek back to start of stream and media. Subsequently call to play() method will restart streaming and playing from beginning.
         * @method stop
         * @access public
         * @memberof MediaPlayer#
         */
        stop: function () {
            _isPlayerInitialized();
            videoModel.pause();
            //test if player is in VOD mode
            if (!this.isLive()) {
                videoModel.setCurrentTime(0);
            }

            // Notify plugins that current stream is stopped
            for (var plugin in plugins) {
                plugins[plugin].stop();
            }
        },

        /**
         * Stops and resets the player.
         * @method reset
         * @access public
         * @memberof MediaPlayer#
         * @param {number} reason - the reason for stopping the player.
         * Possible values are:
         * <li>0 : stop during streaming at user request
         * <li>1 : stop when all streams are completed
         * <li>2 : stop after an error
         */
        reset: function (reason) {
            _isPlayerInitialized();

            // Reset ABR controller
            this.setQualityFor('video', 0);
            this.setQualityFor('audio', 0);

            source = null;

            _resetAndPlay.call(this, reason);
        },

        /**
        * Updates the manifest URL. This method is used to provide an update of the manifest URL when the original
        * URL provided in load() method is no more valid (for example if it has expired when signed)
        * (see [manifestUrlUpdate]{@link MediaPlayer#event:manifestUrlUpdate} event specification).
        * @method refeshManifest
        * @access public
        * @memberof MediaPlayer#
        * param {string} url - the updated video stream's manifest URL
        */
        refreshManifest: function (url) {
            _isPlayerInitialized();
            streamController.refreshManifest(url);
        },
//#endregion

//#region STREAM METADATA
        /**
         * Returns the media duration.
         * @method getDuration
         * @access public
         * @memberof MediaPlayer#
         * @return {number} the media duration in seconds, <i>Infinity</i> for live content
         */
        getDuration: function () {
            _isPlayerInitialized();
            return videoModel.getDuration();
        },

        /**
         * Returns true if the current stream is a live stream.
         * @method isLive
         * @access public
         * @memberof MediaPlayer#
         * @return {boolean} true if current stream is a live stream, false otherwise
         */
        isLive: function () {
            _isPlayerInitialized();
            return videoModel.getDuration() !== Number.POSITIVE_INFINITY ? false : true;
        },

        /**
         * Returns the current playback time/position.
         * @method getPosition
         * @access public
         * @memberof MediaPlayer#
         * @return {number} the current playback time/position in seconds
         */
        getPosition: function () {
            _isPlayerInitialized();
            return videoModel.getCurrentTime();
        },

        /**
         * Return the available DVR window range in case of live streams.
         * @method getDVRWindowRange
         * @access public
         * @memberOf MediaPlayer#
         * @return {object} range - the DVR window range
         * @return {number} range.start - the DVR window range start time
         * @return {number} range.end - the DVR window range end time
         * @return {number} range.programStart - the DVR window range absolute program start date/time (if available, may be undefined)
         * @return {number} range.programEnd - the DVR window range absolute program end date/time (if available, may be undefined)
         */
        getDVRWindowRange: function () {
            _isPlayerInitialized();
            if (!this.isLive()) {
                return null;
            }
            var dvrInfo = _getDVRInfoMetric.call(this);
            return dvrInfo ? dvrInfo.range : null;
        },

        /**
         * Returns the DVR window size.
         * @method getDVRWindowSize
         * @access public
         * @memberof MediaPlayer#
         * @return {number} the DVR window size in seconds
         */
        getDVRWindowSize: function () {
            _isPlayerInitialized();
            if (!this.isLive()) {
                return null;
            }
            // TODO: get timeShiftBufferDepth
            return null;
            // var dvrInfo = _getDVRInfoMetric();
            // return dvrInfo ? dvrInfo.mpd.timeShiftBufferDepth : null;;
        },

        /**
         * TBD
         * @method getDVRSeekOffset
         * @access public
         * @memberof MediaPlayer#
         * @param  value
         * @return DVR seek offset
         */
        getDVRSeekOffset: function (value) {
            _isPlayerInitialized();
            if (!this.isLive()) {
                return null;
            }
            var dvrInfo = _getDVRInfoMetric.call(this),
                val = dvrInfo ? dvrInfo.range.start + value : null;

            if (val && val > dvrInfo.range.end) {
                val = dvrInfo.range.end;
            }

            return val;
        },

        /**
         * Returns the list of available bitrates (in bitrate ascending order).
         * @method getVideoBitrates
         * @access public
         * @memberof MediaPlayer#
         * @return {Array<Number>} array of bitrate values
         */
        getVideoBitrates: function () {
            _isPlayerInitialized();
            if (!videoBitrates) {
                return [];
            }
            return videoBitrates.slice();
        },

        /**
         * Returns the metrics for stream type.
         * @access public
         * @memberof MediaPlayer#
         * @param {string} type - stream type, 'video' or 'audio'
         * @return {Array} the metrics array for the selected type
         */
        getMetricsFor: function(type) {
            var metrics = this.metricsModel.getReadOnlyMetricsFor(type);
            return metrics;
        },
//#endregion

//#region TRICK MODE
        /////////// TRICK MODE
        /**
         * Returns the current trick mode speed.
         * @method setTrickModeSpeed
         * @access public
         * @memberof MediaPlayer#
         * @return {number} the current trick mode speed
         */
        getTrickModeSpeed: function () {
            if (streamController) {
                return streamController.getTrickModeSpeed();
            }

            return 0;
        },

        /**
         * Sets the trick mode speed.
         * @method setTrickModeSpeed
         * @access public
         * @memberof MediaPlayer#
         * @param {number} speed - the new trick mode speed (0 corresponds to normal playback, i.e. playbackRate = 1)
         */
        setTrickModeSpeed: function (speed) {
            _isPlayerInitialized();
            if (streamController) {
                streamController.setTrickModeSpeed(speed);
            }
        },
//#endregion

//#region ERROR/WARNING
        /**
         * Returns the Error object for the most recent error.
         * @method getError
         * @access public
         * @memberof MediaPlayer#
         * @return {object} the Error object for the most recent error, or null if there has not been an error
        */
        getError: function () {
            return error;
        },

        /**
         * Returns the Warning object for the most recent warning.
         * @method getWarning
         * @access public
         * @memberof MediaPlayer#
         * @return {object} the Warning object for the most recent warning, or null if there has not been a warning
         */
        getWarning: function () {
            return warning;
        },
//#endregion

//#region TRACKS
        /**
         * Returns the list of available tracks for the stream type (as specified in the stream manifest).
         * The tracks list can be retrieved once the video 'loadeddata' event has been fired.
         * @method getTracks
         * @access public
         * @param {String} type - the stream type according to MediaPlayer.TRACKS_TYPE (see @link MediaPlayer#TRACKS_TYPE)
         * @memberof MediaPlayer#
         * @return {Array<Track>} the available tracks for the stream type
         */
        getTracks: function (type) {

            _isPlayerInitialized();

            if (!type || (type !== MediaPlayer.TRACKS_TYPE.AUDIO && type !== MediaPlayer.TRACKS_TYPE.TEXT)) {
                throw new Error('MediaPlayer Invalid Argument - "type" should be defined and shoud be kind of MediaPlayer.TRACKS_TYPE');
            }

            var _tracks = _getTracksFromType(type);

            if (!_tracks) {
                return [];
            }

            var tracks = [];
            for (var i = 0; i < _tracks.length; i += 1) {
                tracks.push(_toMediaPlayerTrack(_tracks[i]));
            }

            return tracks;
        },

        /**
         * Selects the track to be playbacked for the stream type.
         * @method selectTrack
         * @access public
         * @memberof MediaPlayer#
         * @see [getTracks]{@link MediaPlayer#getTracks}
         * @param {String} type - the stream type according to MediaPlayer.TRACKS_TYPE (see @link MediaPlayer#TRACKS_TYPE)
         * @param {Track} track - the track to select, as returned by the [getTracks]{@link MediaPlayer#getTracks} method
         *
         */
        selectTrack: function (type, track) {

            _isPlayerInitialized();

            if (!type || (type !== MediaPlayer.TRACKS_TYPE.AUDIO && type !== MediaPlayer.TRACKS_TYPE.TEXT)) {
                throw new Error('MediaPlayer Invalid Argument - "type" should be defined and shoud be kind of MediaPlayer.TRACKS_TYPE');
            }

            if (!track || !(track.id || track.lang || track.subType)) {
                throw new Error('MediaPlayer.selectTrack(): track parameter is not in valid');
            }

            var _tracks = _getTracksFromType(type);

            if (!_tracks) {
                this.debug.error("[MediaPlayer] No available track for type " + type);
                return;
            }
            var selectedTrack = _getSelectedTrackFromType(type);

            if (selectedTrack && _isSameTrack(selectedTrack, track)) {
                this.debug.log("[MediaPlayer] " + type + " track [" + track.id + " - " + track.lang + "] is already selected");
                return;
            }

            for (var i = 0; i < _tracks.length; i += 1) {
                if (_isSameTrack(_tracks[i], track)) {
                    _selectTrackFromType(type, _tracks[i]);
                    return;
                }
            }
        },

        /**
         * Returns the selected track for the stream type.
         * @method getSelectedTrack
         * @access public
         * @memberof MediaPlayer#
         * @param {String} type - the stream type according to MediaPlayer.TRACKS_TYPE (see @link MediaPlayer#TRACKS_TYPE)
         * @return {Track} the selected track
         */
        getSelectedTrack: function (type) {
            _isPlayerInitialized();

            if (!type || (type !== MediaPlayer.TRACKS_TYPE.AUDIO && type !== MediaPlayer.TRACKS_TYPE.TEXT)) {
                throw new Error('MediaPlayer Invalid Argument - "type" should be defined and shoud be kind of MediaPlayer.TRACKS_TYPE');
            }

            return _toMediaPlayerTrack(_getSelectedTrackFromType(type));
        },
//#endregion

//#region SUBTITLES DISPLAY
        /**
         * Enable or disables subtitles processing.
         * @method enableSubtitles
         * @access public
         * @memberof MediaPlayer#
         * @param {boolean} value - true to enable subtitles, false to disables subtitles processing (by default subtitles are disabled)
         */
        enableSubtitles: function (value) {
            _isPlayerInitialized();
            if (typeof value !== 'boolean') {
                throw new Error('MediaPlayer.enableSubtitles(): Invalid Arguments');
            }
            subtitlesEnabled = value;
            if (streamController) {
                streamController.enableSubtitles(subtitlesEnabled);
            }
        },

        /**
        * Returns the subtitles processing state.
        * @method isSubtitlesEnabled
        * @access public
        * @memberof MediaPlayer#
        * @return {boolean} true if subtitles are enabled, false otherwise
        */
        isSubtitlesEnabled: function () {
            _isPlayerInitialized();
            return subtitlesEnabled;
        },

        /**
         * Enables or disables subtitles display in a div outside video player.
         * @method enableSubtitleExternDisplay
         * @access public
         * @memberof MediaPlayer#
         * @param {boolean} mode - true if subtitles are displayed in a div outside video player
         */
        enableSubtitleExternDisplay: function (value) {
            if (typeof value !== 'boolean') {
                throw new Error('MediaPlayer.enableSubtitleExternDisplay(): Invalid Arguments');
            }
            this.config.setParams({'TextTrackExtensions.displayModeExtern': value});
        },

        /**
         * Returns the HTML div element previously attached (@see [attachTTMLRenderingDiv]{@link MediaPlayer#attachTTMLRenderingDiv})
         * @method getTTMLRenderingDiv
         * @access public
         * @memberof MediaPlayer#
         * @returns {HTMLDivElement} the HTML div object previously attached
         */
        getTTMLRenderingDiv: function() {
            return videoModel ? videoModel.getTTMLRenderingDiv() : null;
        },

        /**
         * Attaches an HTML div element to be used to render rich TTML subtitles.
         * @method attachTTMLRenderingDiv
         * @access public
         * @memberof MediaPlayer#
         * @param {HTMLDivElement} div - An unstyled div element placed after the video element. It will be styled to match the video size and overlay z-order
         */
        attachTTMLRenderingDiv: function(div) {
            _isPlayerInitialized();
            videoModel.setTTMLRenderingDiv(div);
        },
//#endregion

//#region AUDIO VOLUME
        /**
         * Returns the audio mute state.
         * @method getMute
         * @access public
         * @memberof MediaPlayer#
         * @return {boolean} true if the audio is muted, false otherwise
         */
        getMute: function () {
            _isPlayerInitialized();
            return videoModel.getMute();
        },

        /**
         * Sets the audio mute state.
         * @method setMute
         * @access public
         * @memberof MediaPlayer#
         * @param {boolean} value - true to mute audio, false otherwise
         */
        setMute: function (value) {
            _isPlayerInitialized();
            if (typeof value !== 'boolean') {
                throw new Error('MediaPlayer.setMute(): Invalid Arguments');
            }
            videoModel.setMute(value);
        },

        /**
         * Returns the audio volume level.
         * @method getVolume
         * @access public
         * @memberof MediaPlayer#
         * @return {number} the current audio volume level, from 0.0 (silent) to 1.0 (loudest)
         */
        getVolume: function () {
            _isPlayerInitialized();
            return videoModel.getVolume();
        },

        /**
         * Sets the audio volume level.
         * @method setVolume
         * @access public
         * @memberof MediaPlayer#
         * @param {number} level - the audio volume level, from 0.0 (silent) to 1.0 (loudest)
         */
        setVolume: function (level) {
            _isPlayerInitialized();
            if ((typeof level !== 'number') || level < 0 || level > 1) {
                throw new Error('MediaPlayer.setVolume(): Invalid Arguments');
            }

            videoModel.setVolume(level);
        },
//#endregion

//#region TERMINAL ID
        /**
         * Returns the terminal ID.
         * @method getTerminalId
         * @access public
         * @memberof MediaPlayer#
         * @return {string} the terminal ID (<OS name>-<OS bits>-<browser name>)
         */
        getTerminalId: function () {
            var browser = fingerprint_browser(),
                os = fingerprint_os();

            return os.name + "-" + os.bits + "-" + browser.name;
        },
//#endregion

//#region PLUGINS
        /**
         * Adds a MediaPlayer plugin.
         * @method addPlugin
         * @access public
         * @memberof MediaPlayer#
         * @param {object} plugin - the plugin instance
         */
        addPlugin: function (plugin) {
            _isPlayerInitialized();

            if (plugin === undefined) {
                throw new Error('MediaPlayer.addPlugin(): plugin undefined');
            }

            // Check plugin API
            if (typeof(plugin.getName) !== 'function' ||
                typeof(plugin.getVersion) !== 'function' ||
                typeof(plugin.init) !== 'function' ||
                typeof(plugin.load) !== 'function' ||
                typeof(plugin.stop) !== 'function' ||
                typeof(plugin.reset) !== 'function') {
                throw new Error('MediaPlayer.addPlugin(): plugin API not compliant');
            }

            if (plugins[plugin.getName()]) {
                // Destroy plugin already loaded
                plugins[plugin.getName()].destroy();
            }

            this.debug.log("[MediaPlayer] Add plugin '" + plugin.getName() + "' (v" + plugin.getVersion() + ")");

            // Store plugin
            plugins[plugin.getName()] = plugin;

            // Initialize plugin (if player initialized)
            plugin.deferInit = Q.defer();
            if (initialized) {
                plugin.init(this, function () {
                    this.deferInit.resolve();
                }.bind(plugin));
            }
        },

        /**
         * Removes a MediaPlayer plugin.
         * @method removePlugin
         * @access public
         * @memberof MediaPlayer#
         * @param {object|string} plugin - the plugin instance (or name) to remove
         */
        removePlugin: function (plugin) {
            var name;

            if (plugin === undefined) {
                throw new Error('MediaPlayer.removePlugin(): plugin undefined');
            }

            if (typeof(plugin) === 'string') {
                name = plugin;
            } else {
                if (typeof(plugin.getName) !== 'function') {
                    throw new Error('MediaPlayer.removePlugin(): plugin API not compliant');
                }
                name = plugin.getName();
            }

            if (plugins[name]) {
                this.debug.log("[MediaPlayer] Remove plugin '" + name);
                // Reset plugin
                plugins[name].destroy();
                // delete it
                plugins[name] = null;
                delete plugins[name];
            }
        }
//#endregion
    };
};

MediaPlayer.prototype = {
    constructor: MediaPlayer
};

//#region Packages
/**
 * Packages declaration
 */
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
//#endregion

//#region Enums
/**
 * ENUMS
 */
MediaPlayer.PUBLIC_EVENTS = {
    /**
     * The error event is fired when an error occurs.
     * When the error event is fired, the application shall stop the player.
     *
     * @event MediaPlayer#error
     * @param {object} event - the event
     * @param {object} event.type - the event type ('error')
     * @param {object} event.data - the event data
     * @param {string} event.data.code - error code
     * @param {string} event.data.message - error message
     * @param {object} event.data.data - error additionnal data
     */
    'error': 'hasplayer',

    /**
    * The warning event is fired when a warning occurs.
    *
    * @event MediaPlayer#warning
    * @param {object} event - the event
    * @param {object} event.type - the event type ('warning')
    * @param {object} event.data - the event data
    * @param {string} event.data.code - warning code
    * @param {string} event.data.message - warning message
    * @param {object} event.data.data - warning additionnal data
    */
    'warning': 'hasplayer',

    /**
     * The manifestUrlUpdate event is fired when the URL of the manifest may have to be refreshed,
     * since the player failed to download the manifest file (URL expiration for example).
     * The application shall therefore provide an updated manifest URL by using the method [refreshManifest]{@link MediaPlayer#refreshManifest}
     *
     * @event MediaPlayer#manifestUrlUpdate
     * @param {object} event - the event
     * @param {object} event.type - the event type ('manifestUrlUpdate')
     * @param {object} event.data - the event data
     * @param {object} event.data.url - the current manifest url
     */
    'manifestUrlUpdate': 'hasplayer',

    /**
     * The metricAdded event is fired when a new metric has been added,
     * TBD
     */
    'metricAdded' : 'hasplayer',

    /**
     * The metricChanged event is fired when a metric has been updated,
     * TBD
     */
    'metricChanged' : 'hasplayer',

    /**
     * The cueEnter event is fired when a subtitle cue needs to be displayed.
     *
     * @event MediaPlayer#cueEnter
     * @param {object} event - the event
     * @param {object} event.type - the event type ('cueEnter')
     * @param {object} event.data - the event data
     * @param {object} event.data.text - the subtitle text
     * @param {string} event.data.style.backgroundColor - the background color
     * @param {string} event.data.style.color - the font color
     * @param {string} event.data.style.fontFamily - the font family
     * @param {string} event.data.style.fontSize - the font size
     */
    'cueEnter': 'hasplayer',

    /**
     * The cueExit event is fired when a subtitle cue needs to be erased.
     *
     * @event MediaPlayer#cueExit
     * @param {object} event - the event
     * @param {object} event.type - the event type ('cueExit')
     * @param {object} event.data - the event data
     * @param {object} event.data.text - the subtitle text
     * @param {string} event.data.style.backgroundColor - the background color
     * @param {string} event.data.style.color - the font color
     * @param {string} event.data.style.fontFamily - the font family
     * @param {string} event.data.style.fontSize - the font size
     */
    'cueExit': 'hasplayer',

    /**
     * The 'play_bitrate' event is fired when the current played bitrate has changed.
     *
     * @event MediaPlayer#play_bitrate
     * @param {CustomEvent} event - the event
     * @param {object} event.detail - the event data
     * @param {string} event.detail.type - the stream type ('audio' or 'video')
     * @param {number} event.detail.bitrate - the new bitrate
     * @param {string} event.detail.representationId - the corresponding representation id (from manifest)
     * @param {number} event.detail.time - the current video time
     * @param {number} event.detail.width - in case of video stream, the video width of the representation
     * @param {number} event.detail.height - in case of video stream, the video height of the representation
     */
    'play_bitrate': 'video',

    /**
     * The download_bitrate event is fired when the current downloaded bitrate has changed.
     *
     * @event MediaPlayer#download_bitrate
     * @param {CustomEvent} event - the event
     * @param {object} event.detail - the event data
     * @param {string} event.detail.type - the stream type ('audio' or 'video')
     * @param {number} event.detail.bitrate - the new bitrate
     * @param {string} event.detail.representationId - the corresponding representation id (from manifest)
     * @param {number} event.detail.time - the current video time
     * @param {number} event.detail.width - in case of video stream, the video width of the representation
     * @param {number} event.detail.height - in case of video stream, the video height of the representation
     */
    'download_bitrate': 'video',

    /**
     * The bufferLevel_updated event is fired when the buffer level changed.
     *
     * @event MediaPlayer#bufferLevel_updated
     * @param {CustomEvent} event - the event
     * @param {object} event.detail - the event data
     * @param {string} event.detail.type - the stream type ('audio' or 'video')
     * @param {number} event.detail.level - the buffer level (in seconds)
     */
    'bufferLevel_updated': 'video',

    /**
     * The state_changed event is fired when the player state changed.
     *
     * @event MediaPlayer#state_changed
     * @param {CustomEvent} event - the event
     * @param {object} event.detail - the event data
     * @param {string} event.detail.type - the stream type ('audio' or 'video')
     * @param {string} event.detail.state - the current state ('stopped', 'buffering', 'seeking' or 'playing')
     */
    'state_changed': 'video'
};

/**
 * Exposes the available tracks types used to manage tracks (language) switching.
 * @see [getTracks]{@link MediaPlayer#getTracks}
 * @see [getSelectedTrack]{@link MediaPlayer#getSelectedTrack}
 * @see [selectTrack]{@link MediaPlayer#selectTrack}
 * @enum
 */
MediaPlayer.TRACKS_TYPE = {
    AUDIO: "audio",
    TEXT: "text"
};
//#endregion

//#region Player parameters
/**
 * Player parameters object.
 * All parameters values are applied for any stream type. Parameters can be overriden specifically for audio and video track by setting
 * parameters values in the params.audio and params.video objects.
 * @typedef MediaPlayer#PlayerParams
 * @type Object
 * @property {number}   BufferController.minBufferTimeForPlaying - Minimum buffer level before playing, in seconds (default value = 0)
 * @property {number}   BufferController.minBufferTime - Minimum buffer size (in seconds), if set to '-1' the maximum value between the manifest's minBufferTime and 16 sec. is considered (default value = -1)
 * @property {number}   BufferController.bufferToKeep - The buffer size (in seconds) to keep anterior to current playing time (default value = 30)
 * @property {number}   BufferController.liveDelay - The delay (in seconds) between the live edge and playing time, if set to '-1' the live delay is set according to minBufferTime (default value = -1)
 * @property {number}   ABR.minBandwidth - Minimum bandwidth to be playbacked (default value = -1)
 * @property {number}   ABR.maxBandwidth - Maximum bandwidth to be playbacked (default value = -1)
 * @property {number}   ABR.minQuality - Minimum quality index (start from 0) to be playbacked (default value = -1)
 * @property {number}   ABR.maxQuality - Maximum quality index (start from 0) to be playbacked (default value = -1)
 * @property {boolean}  ABR.switchUpIncrementally - Switch up quality incrementally, or not (default value = false)
 * @property {number}   ABR.switchUpRatioSafetyFactor - Switch up bandwith ratio safety factor (default value = 1.5)
 * @property {boolean}  ABR.latencyInBandwidth - Include (or not) latency in bandwidth (default value = true)
 * @property {number}   ABR.switchLowerBufferTime - Buffer level (in seconds) under which switching down to lowest quality occurs (default value = -1)
 * @property {number}   ABR.switchLowerBufferRatio - Buffer level (as percentage of buffer size) under which switching down to lowest quality occurs (default value = 0.25)
 * @property {number}   ABR.switchDownBufferTime - Buffer level (in seconds) under which switching down quality occur, if unsufficient bandwidth (default value = -1)
 * @property {number}   ABR.switchDownBufferRatio - Buffer level (as percentage of buffer size) under which switching down quality occurs, if unsufficient bandwidth (default value = 0.5)
 * @property {number}   ABR.switchUpBufferTime - Buffer level (in seconds) upper which switching up quality occurs, if sufficient bandwidth (default value = -1)
 * @property {number}   ABR.switchUpBufferRatio - Buffer level (as percentage of buffer size) upper which switching up quality occurs, if sufficient bandwidth (default value = 0.75)
 * @property {number}   ABR.droppedFramesMinRatio - The number of dropped frames (as a ratio to total video frames) from which switching up quality is disabled (default value = 0.1)
 * @property {number}   ABR.droppedFramesMaxRatio - The number of dropped frames (as a ratio to total video frames) from which quality is switched down (default value = 0.3)
 * @property {number}   ManifestLoader.RetryAttempts - Number of retry attempts for downloading manifest file when it fails (default value = 2)
 * @property {number}   ManifestLoader.RetryInterval - Interval (in milliseconds) between each retry attempts for downloading manifest file (default value = 500)
 * @property {number}   FragmentLoader.RetryAttempts - Number of retry attempts for downloading segment files when it fails (default value = 2)
 * @property {number}   FragmentLoader.RetryInterval - Interval (in milliseconds) between each retry attempts for downloading segment files (default value = 500)
 * @property {boolean}  Protection.licensePersistence - Provides or not license persistence at application level, in case no persistence is provided by the CDM (default value = false)
 * @property {number}   backoffSeekToEnd - Backoff value (in seconds) when seeking at end/duration (default value = 2)
 * @property {Object}   video - Video parameters (parameters for video track)
 * @property {Object}   audio - audio parameters (parameters for audio track)
 */
//#endregion

//#region Static functions
/**
 * Static functions
 */
/**
* Returns the current browser status on MSE support.
* @method hasMediaSourceExtension
* @static
* @return true if MSE is supported, false otherwise
*/
MediaPlayer.hasMediaSourceExtension = function () {
    return new MediaPlayer.utils.Capabilities().supportsMediaSource();
};

/**
 * Returns the current browser status on EME support.
 * @method hasMediaKeysExtension
 * @static
 * @return true if EME is supported, false otherwise
 */
MediaPlayer.hasMediaKeysExtension = function () {
    return new MediaPlayer.utils.Capabilities().supportsMediaKeys();
};
//#endregion
