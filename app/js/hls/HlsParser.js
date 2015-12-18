/*
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
 */
Hls.dependencies.HlsParser = function() {
    var TAG_EXTM3U = "#EXTM3U",
        /*TAG_EXTXMEDIASEQUENCE = "#EXT-X-MEDIA-SEQUENCE",
        TAG_EXTXKEY = "#EXT-X-KEY",
        TAG_EXTXPROGRAMDATETIME = "#EXT-X-PROGRAM_DATE_TIME",
        TAG_EXTXDISCONTINUITY = "#EXT-X-DISCONTINUITY",
        TAG_EXTXALLOWCACHE = "#EXT-X-ALLOW-CACHE",*/
        TAG_EXTINF = "#EXTINF",
        TAG_EXTXVERSION = "#EXT-X-VERSION",
        TAG_EXTXTARGETDURATION = "#EXT-X-TARGETDURATION",
        //TAG_EXTXMEDIA = "#EXT-X-MEDIA",
        TAG_EXTXMEDIASEQUENCE = "#EXT-X-MEDIA-SEQUENCE",
        TAG_EXTXSTREAMINF = "#EXT-X-STREAM-INF",
        TAG_EXTXENDLIST = "#EXT-X-ENDLIST",
        ATTR_BANDWIDTH = "BANDWIDTH",
        ATTR_PROGRAMID = "PROGRAM-ID",
        ATTR_AUDIO = "AUDIO",
        ATTR_SUBTITLES = "SUBTITLES",
        ATTR_RESOLUTION = "RESOLUTION",
        ATTR_CODECS = "CODECS";
    /*ATTR_METHOD = "METHOD",
        ATTR_IV = "IV",
        ATTR_URI = "URI",
        ATTR_TYPE = "TYPE",
        ATTR_GROUPID = "GROUP-ID",
        ATTR_NAME = "NAME",
        ATTR_DEFAULT = "DEFAULT",
        ATTR_AUTOSELECT = "AUTOSELECT",
        ATTR_LANGUAGE = "LANGUAGE",
        VAL_YES = "YES";*/

    var playlistRequest = new XMLHttpRequest();

    var _splitLines = function(oData) {
        var i = 0;
        oData = oData.split('\n');
        //remove empty lines
        for (i = 0; i < oData.length; i++) {
            if (oData[i] === "" || oData[i] === " ") {
                oData.splice(i, 1);
                i--;
            }
        }
        return oData;
    };

    /*var _getAttrValue = function(data, attrKey) {
        // remove attrKey + '='
        var value = data.substring(data.indexOf(attrKey)+attrKey.length+1);
        // remove quottes
        if (value.charAt(0) == '"') {
            value = value.substring(1,value.length-1);
        }
        return value;
    };*/

    var _containsTag = function(data, tag) {
        return (data.indexOf(tag) > -1);
    };

    var _getTagValue = function(data, tag) {
        // +1 to remove ':' character
        return data.substring(tag.length + 1, data.length);
    };

    var _getTagParams = function(data) {
        return data.substring(data.indexOf(':') + 1).split(',');
    };

    var _isAbsoluteURI = function(uri) {
        return (uri.indexOf("http://") === 0) ||
            (uri.indexOf("https://") === 0);
    };

    var _parseStreamInf = function(streamInfArray) {
        var stream = {
                programId: "",
                bandwidth: 0,
                resolution: "0x0",
                codecs: ""
            },
            name = "",
            value = "",
            i,
            //streamParams = _getTagValue(streamInfArray[0], TAG_EXTXSTREAMINF).split(',');
            streamParams = _getTagParams(streamInfArray[0]);

        for (i = streamParams.length - 1; i >= 0; i--) {

            // Check if '=' character is present. If not, it means that there was
            // a ',' in the parameter value
            if ((streamParams[i].indexOf('=') === -1) && (i > 0)) {
                streamParams[i - 1] += "," + streamParams[i];
            } else {
                name = streamParams[i].trim().split('=')[0];
                value = streamParams[i].trim().split('=')[1];

                switch (name) {
                    case ATTR_PROGRAMID:
                        stream.programId = value;
                        break;
                    case ATTR_BANDWIDTH:
                        stream.bandwidth = parseInt(value, 10);
                        break;
                    case ATTR_RESOLUTION:
                        stream.resolution = value;
                        break;
                    case ATTR_CODECS:
                        stream.codecs = value.replace(/"/g, ''); // Remove '"' characters
                        break;

                        // > HLD v3
                    case ATTR_AUDIO:
                        stream.audioId = value;
                        break;
                    case ATTR_SUBTITLES:
                        stream.subtitlesId = value;
                        break;

                    default:
                        break;

                }
            }
        }

        // Get variant stream URI
        stream.uri = streamInfArray[1];

        return stream;
    };

    // Parse #EXTINF tag
    //  #EXTINF:<duration>,<title>
    //  <url>
    var _parseExtInf = function(extInf) {
        var media = {},
            //mediaParams = _getTagValue(extInf[0], TAG_EXTINF).split(',');
            mediaParams = _getTagParams(extInf[0]);

        media.duration = parseInt(mediaParams[0], 10);
        media.title = mediaParams[1];
        media.uri = extInf[1];

        return media;
    };

    /* > HLS v3
    var _parseMediaInf = function(mediaLine) {
        var mediaObj = {};
        var infos = mediaLine.split(',');
        for (var i = infos.length - 1; i >= 0; i--) {
            if(infos[i].indexOf(ATTR_TYPE)>-1) {
                mediaObj.type = _getAttrValue(infos[i],ATTR_TYPE);
            } else if(infos[i].indexOf(ATTR_GROUPID)>-1) {
                mediaObj.groupId = _getAttrValue(infos[i],ATTR_GROUPID);
            } else if(infos[i].indexOf(ATTR_NAME)>-1) {
                mediaObj.name = _getAttrValue(infos[i],ATTR_NAME);
            } else if(infos[i].indexOf(ATTR_DEFAULT)>-1) {
                mediaObj.default = _getAttrValue(infos[i],ATTR_DEFAULT) == VAL_YES ? true : false;
            } else if(infos[i].indexOf(ATTR_AUTOSELECT)>-1) {
                mediaObj.autoSelect = _getAttrValue(infos[i],ATTR_AUTOSELECT) == VAL_YES ? true : false;
            } else if(infos[i].indexOf(ATTR_LANGUAGE)>-1) {
                mediaObj.language = _getAttrValue(infos[i],ATTR_LANGUAGE);
            } else if(infos[i].indexOf(ATTR_URI)>-1) {
                mediaObj.uri = _getAttrValue(infos[i],ATTR_URI);
            }
        }
        return mediaObj;
    };*/

    var _getVariantStreams = function(data) {
        var streamsArray = [],
            i = 0;

        for (i = 0; i < data.length; i++) {

            if (_containsTag(data[i], TAG_EXTXSTREAMINF)) {
                streamsArray.push(_parseStreamInf([data[i], data[i + 1]]));
            }
        }
        return streamsArray;
    };

    var _parsePlaylist = function(data, representation) {
        var segmentList,
            segments,
            segment,
            initialization,
            version,
            duration = 0,
            index = 0,
            media,
            i,
            self = this;

        // Check playlist header
        if (!data || (data && data.length < 0)) {
            return false;
        }

        self.debug.log(data);

        data = _splitLines(data);

        if (data[0].trim() !== TAG_EXTM3U) {
            return false;
        }

        // Intitilaize SegmentList
        segmentList = {
            name: "SegmentList",
            isRoot: false,
            isArray: false,
            // children: [],
            duration: 0,
            startNumber: 0,
            timescale: 1,
            BaseURL: representation.BaseURL,
            SegmentURL_asArray: []
        };
        representation[segmentList.name] = segmentList;

        segments = segmentList.SegmentURL_asArray;

        // Set representation duration, by default set to  (="dynamic")
        representation.duration = Infinity;

        // Parse playlist
        for (i = 1; i < data.length; i++) {
            if (_containsTag(data[i], TAG_EXTXVERSION)) {
                version = _getTagValue(data[i], TAG_EXTXVERSION);
            } else if (_containsTag(data[i], TAG_EXTXTARGETDURATION)) {
                segmentList.duration = parseInt(_getTagValue(data[i], TAG_EXTXTARGETDURATION), 10);
            } else if (_containsTag(data[i], TAG_EXTXMEDIASEQUENCE)) {
                segmentList.startNumber = parseInt(_getTagValue(data[i], TAG_EXTXMEDIASEQUENCE), 10);
            } else if (_containsTag(data[i], TAG_EXTINF)) {
                media = _parseExtInf([data[i], data[i + 1]]);
                segment = {
                    name: "SegmentURL",
                    isRoot: false,
                    isArray: true,
                    //parent: segmentList,
                    // children: [],
                    media: _isAbsoluteURI(media.uri) ? media.uri : (segmentList.BaseURL + media.uri),
                    sequenceNumber: segmentList.startNumber + index,
                    time: (segments.length === 0) ? 0 : segments[segments.length - 1].time + segments[segments.length - 1].duration,
                    duration: media.duration
                };

                segments.push(segment);
                duration += media.duration;

                index++;

            } else if (_containsTag(data[i], TAG_EXTXENDLIST)) {
                // "static" playlist => set representation duration
                representation.duration = duration;
            }
        }

        // Set initialization segment info
        initialization = {
            name: "Initialization",
            sourceURL: representation.SegmentList.SegmentURL_asArray[0].media
        };
        representation.SegmentList.Initialization = initialization;

        // PATCH Live = VOD
        //representation.duration = duration;

        return true;
    };

    /*var mergeSegmentLists = function(_representation, representation) {

        var _segmentList = _representation.SegmentList,
            segmentList = representation.SegmentList,
            _segments = _segmentList.SegmentURL_asArray,
            segments = segmentList.SegmentURL_asArray,
            _length = _segments.length,
            length = segments.length,
            segment,
            _lastSegment = _segments[_length - 1],
            i = 0;

        for (i = 0; i < length; i++) {
            segment = segments[i];
            if (segment.sequenceNumber > _lastSegment.sequenceNumber) {
                segment.time = _lastSegment.time + _lastSegment.duration;
                _segments.push(segment);
                _lastSegment = _segments[_length - 1];
            }
        }

        representation.SegmentList = _segmentList;

    };*/

    var postProcess = function(manifest, quality) {
        var deferred = Q.defer(),
            period = manifest.Period_asArray[0],
            adaptationSet = period.AdaptationSet_asArray[0],
            representation = adaptationSet.Representation_asArray[quality],
            //startNumber = -1,
            //i,
            //valid,
            //initialization,
            request = new MediaPlayer.vo.SegmentRequest(),
            //_manifest = this.manifestModel.getValue(),
            self = this,
            manifestDuration,
            mpdLoadedTime;


        period.start = 0; //segmentTimes[adaptationSet.Representation_asArray[0].SegmentList.startNumber];

        // Copy duration from first representation's duration
        adaptationSet.duration = representation.duration;
        period.duration = representation.duration;

        if (representation.duration !== Infinity) {
            manifest.mediaPresentationDuration = representation.duration;
        }

        // Set manifest type, "static" vs "dynamic"
        manifest.type = (representation.duration === Infinity) ? "dynamic" : "static";

        manifestDuration = representation.SegmentList.duration * representation.SegmentList.SegmentURL_asArray.length;

        // Dynamic use case
        if (manifest.type === "dynamic") {
            // => set manifest refresh period as the duration of 1 fragment/chunk
            //manifest.minimumUpdatePeriod = representation.SegmentList.duration;

            // => set availabilityStartTime property
            mpdLoadedTime = new Date();
            manifest.availabilityStartTime = new Date(mpdLoadedTime.getTime() - (manifestDuration * 1000));

            // => set timeshift buffer depth
            manifest.timeShiftBufferDepth = manifestDuration - representation.SegmentList.duration;
        }

        // Set minBufferTime
        manifest.minBufferTime = representation.SegmentList.duration * 2; //MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME

        // Filter invalid representations
        /*for (i = 0; i < adaptationSet.Representation_asArray.length; i++) {
            representation = adaptationSet.Representation_asArray[i];

            valid = true;

            // Check if segment list is valid
            valid = valid & (representation.SegmentList.SegmentURL_asArray.length > 0);

            // Check if representation (bandwidth) is not already defined
            if (i > 0) {
                valid = valid & (adaptationSet.Representation_asArray[i-1].bandwidth !== adaptationSet.Representation_asArray[i].bandwidth);
            }

            if (valid) {
                // Set initialization segment info
                initialization = {
                    name: "Initialization",
                    sourceURL: representation.SegmentList.SegmentURL_asArray[0].media
                };
                representation.SegmentList.Initialization = initialization;

                // And get highest start sequence number among all representations
                if (representation.SegmentList.startNumber > startNumber) {
                    startNumber = representation.SegmentList.startNumber;
                }
            } else {
                adaptationSet.Representation_asArray.splice(i, 1);
                i--;
            }
        }*/

        /*if (manifest.type === "dynamic") {

            if ((_manifest === undefined) || (_manifest === null)) {
                // At first manifest download, align segment lists according to sequence number
                for (i = 0; i < adaptationSet.Representation_asArray.length; i++) {
                    var itemsToRemove = startNumber - representation.SegmentList.SegmentURL_asArray[0].sequenceNumber;
                    if (itemsToRemove > 0) {
                        representation.SegmentList.SegmentURL_asArray.splice(0, itemsToRemove);
                    }
                }
            } else {
                // Merge segments lists of all representation to get whole timeline
                // in order to enable DashHandler generic operating
                var _period = _manifest.Period_asArray[0],
                    _adaptationSet = _period.AdaptationSet_asArray[0],
                    _representation;

                manifest.availabilityStartTime = _manifest.availabilityStartTime;

                for (i = 0; i < adaptationSet.Representation_asArray.length; i++) {
                    representation = adaptationSet.Representation_asArray[i];
                    _representation = _adaptationSet.Representation_asArray[i];
                    mergeSegmentLists(_representation, representation);
                }
            }
        }*/

        // Download initialization data (PSI, IDR...) of 1st representation to obtain codec information
        representation = adaptationSet.Representation_asArray[quality];
        request.type = "Initialization Segment";
        request.url = representation.SegmentList.Initialization.sourceURL;
        //request.range = "0-18799";

        var onLoaded = function(representation, response) {

            // Parse initialization data to obtain codec information
            var tracks = this.hlsDemux.getTracks(new Uint8Array(response.data)),
                i = 0;

            representation.codecs = "";
            for (i = 0; i < tracks.length; i++) {
                representation.codecs += tracks[i].codecs;
                if (i < (tracks.length - 1)) {
                    representation.codecs += ",";
                }
            }

            deferred.resolve();
        };

        var onError = function() {
            // ERROR
            deferred.resolve();
        };

        // PATCH to remove audio track
        /*var tracksCodecs = representation.codecs.split(',');
        for (i = 0; i < tracksCodecs.length; i++) {
            if (tracksCodecs[i].indexOf("avc") !== -1) {
                representation.codecs = tracksCodecs[i];
            }
        }*/
        if (representation.codecs === "") {
            self.debug.log("[HlsParser]", "Load initialization segment: " + request.url);
            self.fragmentLoader.load(request).then(onLoaded.bind(self, representation), onError.bind(self));
        } else {
            deferred.resolve();
        }

        return deferred.promise;
    };

    var parseBaseUrl = function(url) {
        var base = null;

        if (url.indexOf("/") !== -1) {
            if (url.indexOf("?") !== -1) {
                url = url.substring(0, url.indexOf("?"));
            }
            base = url.substring(0, url.lastIndexOf("/") + 1);
        }

        return base;
    };


    var doUpdatePlaylist = function(representation) {
        var deferred = Q.defer(),
            error = true,
            self = this;

        var onabort = function() {
            playlistRequest.aborted = true;
        };

        var onload = function() {
            if (playlistRequest.status < 200 || playlistRequest.status > 299) {
                return;
            }

            if (playlistRequest.status === 200 && playlistRequest.readyState === 4) {
                error = false;
                if (_parsePlaylist.call(self, playlistRequest.response, representation)) {
                    deferred.resolve();
                } else {
                    deferred.reject({
                        name: MediaPlayer.dependencies.ErrorHandler.prototype.MANIFEST_ERR_PARSE,
                        message: "Failed to parse variant stream playlist",
                        data: {
                            url: representation.url
                        }
                    });
                }
            }
        };

        var onreport = function() {
            if (!error) {
                return;
            }
            deferred.reject({
                name: MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_MANIFEST,
                message: "Failed to download variant stream playlist",
                data: {
                    url: representation.url
                }
            });
        };

        try {
            //this.debug.log("Start loading manifest: " + url);
            playlistRequest.onload = onload;
            playlistRequest.onloadend = onreport;
            playlistRequest.onerror = onreport;
            playlistRequest.onabort = onabort;
            playlistRequest.open("GET", representation.url, true);
            playlistRequest.send();
        } catch (e) {
            playlistRequest.onerror();
        }

        return deferred.promise;
    };

    var processManifest = function(data, baseUrl) {
        var deferred = Q.defer(),
            mpd,
            period,
            adaptationsSets = [],
            adaptationSet,
            representations = [],
            representation,
            representationId = 0,
            streams = [],
            stream,
            //requestsToDo = [],
            self = this,
            i = 0;

        if (!data || data.length <= 0 || data[0].trim() !== TAG_EXTM3U) {
            deferred.reject(new Error("Can't parse manifest"));
            return deferred.promise;
        }

        // MPD
        mpd = {};
        mpd.name = "M3U";
        mpd.isRoot = true;
        mpd.isArray = true;
        mpd.parent = null;
        // mpd.children = [];
        mpd.BaseURL = baseUrl;

        mpd.profiles = "urn:mpeg:dash:profile:isoff-live:2011";
        mpd.type = "static"; // Updated in postProcess()

        // PERIOD
        period = {};
        period.name = "Period";
        period.isRoot = false;
        period.isArray = false;
        period.parent = mpd;
        period.duration = 0; // To be set at variant playlist parsing
        period.BaseURL = mpd.BaseURL;

        mpd.Period = period;
        mpd.Period_asArray = [period];

        // ADAPTATION SET
        adaptationsSets = [];
        period.AdaptationSet = adaptationsSets;
        period.AdaptationSet_asArray = adaptationsSets;

        // Get variant streams
        streams = _getVariantStreams(data.slice(1));

        // Sort streams by bandwidth
        streams.sort(function(a, b) {
            return a.bandwidth - b.bandwidth;
        });

        // Only one adaptationSet (HLS v3)
        adaptationSet = {
            name: "AdaptationSet",
            isRoot: false,
            isArray: true,
            //parent: period,
            // children: [],
            id: "video",
            lang: "",
            contentType: "video",
            mimeType: "video/mp4",
            maxWidth: 0,
            maxHeight: 0,
            BaseURL: period.BaseURL,
            Representation: representations,
            Representation_asArray: representations
        };

        // Create representations
        for (i = 0; i < streams.length; i++) {
            // Do not consider representation with bandwidth <= 64K which corresponds to audio only variant stream
            stream = streams[i];
            if (stream.bandwidth > 64000) {
                representation = {
                    name: "Representation",
                    isRoot: false,
                    isArray: true,
                    //parent: streamAdaptationSet,
                    // children: [],
                    id: representationId.toString(),
                    mimeType: "video/mp4",
                    codecs: stream.codecs,
                    bandwidth: stream.bandwidth,
                    width: parseInt(stream.resolution.split('x')[0], 10),
                    height: parseInt(stream.resolution.split('x')[1], 10),
                    url: _isAbsoluteURI(stream.uri) ? stream.uri : (adaptationSet.BaseURL + stream.uri)
                };
                representation.BaseURL = parseBaseUrl(representation.url);
                representations.push(representation);
                representationId++;
                //requestsToDo.push({"url": representation.url, "parent": representation});
            }
        }

        if (streams.length === 0) {
            self.debug.error("[HlsParser] no stream in HLS manifest");
            deferred.reject();
            return deferred.promise;
        }

        adaptationsSets.push(adaptationSet);

        // alternative renditions of the same content (alternative audio tarcks or subtitles) #EXT-X-MEDIA
        // HLS > v3
        /*if(medias) {
            for (var j = medias.length - 1; j >= 0; j--) {
                var mediaAdaptationSet = {
                    name: "AdaptationSet",
                    isRoot: false,
                    isArray: true,
                    //parent: period,
                    // children: [],
                    id: medias[j].name,
                    lang: medias[j].language,
                    contentType: medias[j].type.toLowerCase(),
                    mimeType: "video/MP2T",
                    maxWidth: "",//FIXME
                    maxHeight: "",//FIXME
                    groupId: medias[j].groupId,
                    default: medias[j].default,
                    autoSelect: medias[j].autoSelect,
                    BaseURL: period.BaseURL
                };
                var mediaRepresentation = {
                    name: "mediaRepresentation",
                    isRoot: false,
                    isArray: true,
                    //parent: mediaAdaptationSet,
                    // children: [],
                    id: 0,
                    bandwidth: "",
                    width: "",
                    height: "",
                    codecs: "",
                    BaseURL: mediaAdaptationSet.BaseURL,
                    url: medias[j].uri.indexOf("http://") !== 1 ? medias[j].uri : (mediaAdaptationSet.BaseURL + medias[j].uri)
                };

                requestsToDo.push({"url": mediaRepresentation.url, "parent": mediaRepresentation});

                mediaAdaptationSet.Representation = mediaRepresentation;
                mediaAdaptationSet.Representation_asArray = [mediaRepresentation];
                adaptationsSet.push(mediaAdaptationSet);
            }
        }*/

        // Get representation (variant stream) playlist
        self.abrController.getPlaybackQuality("video", adaptationSet).then(
            function(result) {
                representation = adaptationSet.Representation_asArray[result.quality];
                doUpdatePlaylist.call(self, representation).then(
                    function() {
                        postProcess.call(self, mpd, result.quality).then(function() {
                            deferred.resolve(mpd);
                        });
                    },
                    function(param) {
                        deferred.reject(param);
                    }
                );
            }
        );

        return deferred.promise;
    };

    var internalParse = function(data, baseUrl) {
        this.debug.log("[HlsParser]", "Doing parse.");
        this.debug.log("[HlsParser]", data);
        return processManifest.call(this, _splitLines(data), baseUrl);
    };

    var abort = function() {
        if (playlistRequest !== null && playlistRequest.readyState > 0 && playlistRequest.readyState < 4) {
            this.debug.log("[HlsParser] Playlist manifest download abort.");
            playlistRequest.abort();
        }
    };

    return {
        debug: undefined,
        manifestModel: undefined,
        fragmentLoader: undefined,
        abrController: undefined,
        hlsDemux: undefined,

        parse: internalParse,
        updatePlaylist: doUpdatePlaylist,
        abort: abort
    };
};

Hls.dependencies.HlsParser.prototype = {
    constructor: Hls.dependencies.HlsParser
};