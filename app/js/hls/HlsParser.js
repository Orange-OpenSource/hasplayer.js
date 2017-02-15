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
    var REGEXP_EXTXSTREAMINF = /#EXT-X-STREAM-INF:([^\n\r]*)[\r\n]+([^\r\n]+)/g,
        REGEXP_EXTXMEDIA = /#EXT-X-MEDIA:(.*)/g,
        REGEXP_EXTXMEDIASEQUENCE = '(?:#(EXT-X-MEDIA-SEQUENCE):*(\\d+))',
        REGEXP_EXTXTARGETDURATION = '(?:#(EXT-X-TARGETDURATION):*(\\d+))',
        REGEXP_EXTXPROGRAMDATETIME = '(?:#(EXT-X-PROGRAM-DATE-TIME):*(.+))',
        REGEXP_EXTXKEY = '(?:#(EXT-X-KEY):(.+))',
        REGEXP_EXTXINF = '(?:#(EXTINF):*(\\d+(?:\\.\\d+)?)(?:,(.*))?[\r\n]*(.*))',
        REGEXP_EXTXENDLIST = '(?:#(EXT-X-ENDLIST))',
        REGEXP_ATTRIBUTES = /\s*(.+?)\s*=((?:\".*?\")|.*?)(?:,|$)/g,
        REGEXP_PLAYLIST = new RegExp('(?:' +
                                     REGEXP_EXTXMEDIASEQUENCE + '|' +
                                     REGEXP_EXTXTARGETDURATION + '|' +
                                     REGEXP_EXTXPROGRAMDATETIME + '|' +
                                     REGEXP_EXTXKEY + '|' +
                                     REGEXP_EXTXINF + '|' +
                                     REGEXP_EXTXENDLIST +
                                     ')', 'g'),
        DEFAULT_RETRY_ATTEMPTS = 2,
        DEFAULT_RETRY_INTERVAL = 500,
        retryAttempts = DEFAULT_RETRY_ATTEMPTS,
        retryInterval = DEFAULT_RETRY_INTERVAL,
        xhrLoader,

        getTagAttributes = function (attributes) {
            var attrs = {},
                match, name, value;

            while ((match = REGEXP_ATTRIBUTES.exec(attributes)) !== null) {
                name = match[1];
                value = match[2].replace(/"/g, ''); // Remove '"' characters
                attrs[name] = value;
            }
            return attrs;
        },

        getAbsoluteURI = function(uri, baseUrl) {
            if ((uri.indexOf("http://") === 0) ||
                (uri.indexOf("https://") === 0)) {
                return uri;
            }

            return baseUrl + uri;
        },

        getVariantStreams = function(manifest) {
            var streams = [], stream,
                match, attrs,
                codecs, audioCodec, videoCodec,
                resolution, width, height,
                i;

            while ((match = REGEXP_EXTXSTREAMINF.exec(manifest)) !== null) {
                attrs = getTagAttributes(match[1]);

                codecs = attrs['CODECS'] || '';

                codecs = codecs.split(',');
                audioCodec = videoCodec = '';
                for (i = 0; i < codecs.length; i++) {
                    if (codecs[i].indexOf('avc1') !== -1) {
                        videoCodec = codecs[i];
                    } else {
                        audioCodec = codecs[i];
                    }
                }

                resolution = attrs['RESOLUTION'] || '0x0';
                resolution = resolution.split('x');
                width = parseInt(resolution[0], 10);
                height = parseInt(resolution[1], 10);

                stream = {
                    programId: attrs['PROGRAM-ID'] || '',
                    bandwidth: parseInt(attrs['BANDWIDTH'] || '0', 10),
                    audioCodec: audioCodec,
                    videoCodec: videoCodec,
                    width: width,
                    height: height,
                    audioId: attrs['AUDIO'] || '',
                    subtitlesId: attrs['SUBTITLES'] || '',
                    uri: match[2]
                };
                streams.push(stream);
            }
            return streams;
        },

        getMedias = function(manifest) {
            var medias = [],
                match, attrs, type, media;

            while ((match = REGEXP_EXTXMEDIA.exec(manifest)) !== null) {
                attrs = getTagAttributes(match[1]);
                // Ignore if type attribute is not set
                type = (attrs['TYPE'] || '').toLowerCase();
                if (type.length === 0) {
                    break;
                }
                media = {
                    type: type,
                    groupId: attrs['GROUP-ID'] || '',
                    name: type + (attrs['NAME'] ? ('_' + attrs['NAME']) : ''),
                    language: attrs['LANGUAGE'] || '',
                    autoSelect: attrs['AUTO-SELECT'] === 'YES' ? true : false,
                    default: attrs['SUTITLES'] === 'YES' ? true : false,
                    uri: attrs['URI'] || ''
                };
                medias.push(media);
            }
            return medias;
        },

        removeSegments = function(segments, sequenceNumber) {
            for (var i = 0; i < segments.length; i++) {
                if (segments[i].sequenceNumber < sequenceNumber) {
                    segments.shift();
                    i--;
                } else {
                    break;
                }
            }
        },

        parsePlaylist = function(manifest, representation, adaptation) {
            var segmentList,
                segments,
                segment,
                initialization,
                decryptionInfo = null,
                duration = 0,
                sequenceNumber = 0,
                programDateTime = null,
                i;

            // Check playlist header
            if (!manifest || (manifest && manifest.length < 0)) {
                return false;
            }

            this.debug.log(manifest);

            if (manifest.indexOf('#EXTM3U') !== 0) {
                return false;
            }

            segmentList = representation['SegmentList'];
            if (!segmentList) {
                // Initialize SegmentList
                segmentList = {
                    name: 'SegmentList',
                    isRoot: false,
                    isArray: false,
                    // children: [],
                    duration: 0,
                    startNumber: 0,
                    timescale: 1,
                    BaseURL: representation.BaseURL,
                    SegmentURL_asArray: []
                };
                representation['SegmentList'] = segmentList;
            }

            segments = segmentList.SegmentURL_asArray;

            // Set representation duration, by default set to  (="dynamic")
            representation.duration = Infinity;

            var match, tag, attrs;

            while ((match = REGEXP_PLAYLIST.exec(manifest)) !== null) {
                match = match.filter(function(n) { return (n !== undefined); });
                tag = match[1];

                switch (tag) {
                    case 'EXT-X-MEDIA-SEQUENCE':
                        sequenceNumber = parseInt(match[2]);
                        segmentList.startNumber = sequenceNumber;
                        break;
                    case 'EXT-X-TARGETDURATION':
                        segmentList.duration = parseInt(match[2]);
                        break;
                    case 'EXT-X-KEY':
                        attrs = getTagAttributes(match[2]);
                        decryptionInfo = {
                            method: attrs['METHOD'] || 'NONE',
                            uri: getAbsoluteURI(attrs['URI'], segmentList.BaseURL),
                            iv: attrs['IV']
                        };
                        break;
                    case 'EXTINF':
                        segment = {
                            name: "SegmentURL",
                            isRoot: false,
                            isArray: true,
                            media: getAbsoluteURI(match[4], segmentList.BaseURL),
                            sequenceNumber: sequenceNumber,
                            time: (segments.length === 0) ? 0 : segments[segments.length - 1].time + segments[segments.length - 1].duration,
                            duration: parseFloat(match[2]),
                            decryptionInfo: decryptionInfo
                        };

                        if (segment.decryptionInfo && !segment.decryptionInfo.iv) {
                            segment.decryptionInfo.iv = segment.sequenceNumber;
                        }

                        if (segments.length === 0 || segment.sequenceNumber > segments[segments.length-1].sequenceNumber) {
                            segments.push(segment);
                        }
                        sequenceNumber++;
                        duration += segment.duration;

                        if (programDateTime) {
                            segment.programDateTime = programDateTime;
                            programDateTime += (segment.duration * 1000);
                        }

                        break;
                    case 'EXT-X-ENDLIST':
                        representation.duration = duration;
                        break;
                    case 'EXT-X-PROGRAM-DATE-TIME':
                        programDateTime = Date.parse(match[2]);
                        break;
                    default:
                        break;
                }
            }

            // Remove segments from previous playlist
            removeSegments(segments, segmentList.startNumber);

            // Correct segments timeline according to previous segment list (in case of variant stream switching)
            if (adaptation.segments) {
                // Align segment list according to sequence number
                removeSegments(segments, adaptation.segments[0].sequenceNumber);
                removeSegments(adaptation.segments, segments[0].sequenceNumber);
                if (segments[0].time !== adaptation.segments[0].time) {
                    segments[0].time = adaptation.segments[0].time;
                    for (i = 1; i < segments.length; i++) {
                        segments[i].time = segments[i - 1].time + segments[i - 1].duration;
                    }
                }
            }

            adaptation.segments = segments;

            var range = {
                start: segments[0].time,
                end: segments[segments.length - 1].time + segments[segments.length - 1].duration
            };

            if (programDateTime) {
                range.programStart = segments[0].programDateTime;
                range.programEnd = segments[segments.length - 1].programDateTime + segments[segments.length - 1].duration;
            }

            if (adaptation.contentType === 'video') {
                this.metricsModel.addDVRInfo('video', new Date(), range);
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
        },

        postProcess = function(manifest, quality) {
            var deferred = Q.defer(),
                period = manifest.Period_asArray[0],
                // Consider video AdaptationSet (always the 1st one)
                adaptationSet = period.AdaptationSet_asArray[0],
                // Consider representation of current and downloaded quality
                representation = adaptationSet.Representation_asArray[quality],
                request = new MediaPlayer.vo.SegmentRequest(),
                manifestDuration,
                mpdLoadedTime,
                maxSequenceNumber,
                i, j, k;

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
                // Set availabilityStartTime property
                mpdLoadedTime = new Date();
                manifest.availabilityStartTime = new Date(mpdLoadedTime.getTime() - (manifestDuration * 1000));

                // Set timeshift buffer depth
                manifest.timeShiftBufferDepth = manifestDuration;
            }

            // Set minBufferTime
            manifest.minBufferTime = representation.SegmentList.duration * 3; //MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME

            // Align segment lists of all adaptations
            maxSequenceNumber = Math.max.apply(null, period.AdaptationSet_asArray.map(function(adaptation) {
                var repIndex = quality > adaptation.Representation_asArray.length ? 0 : quality;
                return adaptation.Representation_asArray[repIndex].SegmentList.startNumber;
            }));
            for (i = 0; i < period.AdaptationSet_asArray.length; i++) {
                var adaptation = period.AdaptationSet_asArray[i];
                for (j = 0; j < adaptation.Representation_asArray.length; j++) {
                    if (adaptation.Representation_asArray[j].SegmentList) {
                        var segments = adaptation.Representation_asArray[j].SegmentList.SegmentURL_asArray;
                        if (segments[0].sequenceNumber < maxSequenceNumber) {
                            removeSegments(segments, maxSequenceNumber);
                            segments[0].time = 0;
                            for (k = 1; k < segments.length; k++) {
                                segments[k].time = segments[k - 1].time + segments[k - 1].duration;
                            }
                        }
                    }
                }
            }

            // Download initialization data (PSI, IDR...) of 1st representation to obtain codec information
            representation = adaptationSet.Representation_asArray[quality];
            request.type = "Initialization Segment";
            request.url = representation.SegmentList.Initialization.sourceURL;

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
                deferred.resolve();
            };

            if (representation.codecs === "") {
                this.debug.log("[HlsParser]", "Load initialization segment: " + request.url);
                this.fragmentLoader.load(request).then(onLoaded.bind(this, representation), onError.bind(this));
            } else {
                deferred.resolve();
            }

            return deferred.promise;
        },

        parseBaseUrl = function(url) {
            var base = null;

            if (url.indexOf("/") !== -1) {
                if (url.indexOf("?") !== -1) {
                    url = url.substring(0, url.indexOf("?"));
                }
                base = url.substring(0, url.lastIndexOf("/") + 1);
            }

            return base;
        },

        updatePlaylist = function(representation, adaptation) {
            var self = this,
                deferred = Q.defer();

            this.debug.log("[HlsParser]", "Load playlist manifest: " + representation.url);
            xhrLoader = new MediaPlayer.dependencies.XHRLoader();
            xhrLoader.initialize('text', retryAttempts, retryInterval);
            xhrLoader.load(representation.url).then(
                function (request) {
                    if (parsePlaylist.call(self, request.response, representation, adaptation)) {
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
                },
                function(request) {
                    if (!request || request.aborted) {
                        deferred.reject();
                    } else {
                        deferred.reject({
                            name: MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_MANIFEST,
                            message: "Failed to download variant stream playlist",
                            data: {
                                url: representation.url,
                                status: request.status
                            }
                        });
                    }
                }
            );

            return deferred.promise;
        },

        processManifest = function(manifest, baseUrl) {
            var self = this,
                deferred = Q.defer(),
                mpd,
                period,
                adaptationsSets = [],
                adaptationSet,
                representations,
                representation,
                representationId = 0,
                streams = [],
                stream,
                medias = [],
                media,
                quality,
                playlistDefers = [],
                i = 0;

            if (manifest.indexOf('#EXTM3U') !== 0) {
                this.debug.error("[HlsParser] no stream in HLS manifest");
                deferred.reject();
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
            streams = getVariantStreams(manifest);

            if (streams.length === 0) {
                this.debug.error("[HlsParser] No stream in HLS manifest");
                deferred.reject();
                return deferred.promise;
            }

            // Sort streams by bandwidth
            streams.sort(function(a, b) {
                return a.bandwidth - b.bandwidth;
            });

            // Create AdaptationSet and a representation for each variant stream
            adaptationSet = {
                name: "AdaptationSet",
                isRoot: false,
                isArray: true,
                id: "video",
                lang: "",
                contentType: "video",
                mimeType: "video/mp4",
                maxWidth: 0,
                maxHeight: 0,
                BaseURL: period.BaseURL
            };

            representations = [];
            for (i = 0; i < streams.length; i++) {
                stream = streams[i];
                // Do not consider representation with bandwidth <= 64K which corresponds to audio only variant stream
                if (stream.bandwidth <= 64000) {
                    break;
                }
                representation = {
                    name: "Representation",
                    isRoot: false,
                    isArray: true,
                    id: representationId.toString(),
                    mimeType: "video/mp4",
                    // Consider audio codec only if no alternate track for audio
                    codecs: (stream.videoCodec.length > 0) ? (stream.audioId.length > 0 ? stream.videoCodec : (stream.videoCodec + ',' + stream.audioCodec)) : "",
                    bandwidth: stream.bandwidth,
                    width: stream.width,
                    height: stream.height,
                    url: getAbsoluteURI(stream.uri, adaptationSet.BaseURL)
                };
                representation.BaseURL = parseBaseUrl(representation.url);
                representations.push(representation);
                representationId++;
            }

            adaptationSet.Representation = (representations.length > 1) ? representations : representations[0];
            adaptationSet.Representation_asArray = representations;
            adaptationsSets.push(adaptationSet);

            // Download and process representation (variant stream) playlist
            quality = this.abrController.getPlaybackQuality("video", adaptationsSets[0]).quality;
            representation = adaptationsSets[0].Representation_asArray[quality];
            playlistDefers.push(updatePlaylist.call(this, representation, adaptationSet));

            // Alternative renditions of the same content (alternative audio tracks or subtitles) #EXT-X-MEDIA
            medias = getMedias(manifest);
            for (i =0; i < medias.length; i++) {
                media = medias[i];
                adaptationSet = {
                    name: 'AdaptationSet',
                    isRoot: false,
                    isArray: true,
                    id: media.name,
                    lang: media.language,
                    contentType: media.type,
                    mimeType: media.type === 'audio' ? 'audio/mp4' : 'text/vtt',
                    maxWidth: 0,
                    maxHeight: 0,
                    BaseURL: period.BaseURL
                };

                representation = {
                    name: 'Representation',
                    isRoot: false,
                    isArray: true,
                    id: '',
                    mimeType: media.type === 'audio' ? 'audio/mp4' : 'text/vtt',
                    codecs: media.type === 'audio' ? streams[0].audioCodec : 'WebVTT',
                    bandwidth: 0,
                    width: 0,
                    height: 0,
                    url: getAbsoluteURI(media.uri, adaptationSet.BaseURL)
                };
                representation.BaseURL = parseBaseUrl(representation.url);

                adaptationSet.Representation = representation;
                adaptationSet.Representation_asArray = [representation];
                adaptationsSets.push(adaptationSet);
                playlistDefers.push(updatePlaylist.call(this, representation, adaptationSet));
            }

            // Get representation (variant stream) playlist
            Q.all(playlistDefers).then(
                function() {
                    postProcess.call(self, mpd, quality).then(function() {
                        deferred.resolve(mpd);
                    });
                },
                function(error) {
                    // error undefined in case of playlist download aborted
                    if (error) {
                        // Variant stream playlist download error
                        deferred.reject(error);
                    } else {
                        // Variant stream playlist download aborted
                        deferred.resolve(null);
                    }
                }
            );

            return deferred.promise;
        },

        internalParse = function(data, baseUrl) {
            this.hlsDemux.reset();
            this.debug.log("[HlsParser]", "Doing parse.");
            this.debug.log("[HlsParser]", data);
            return processManifest.call(this, data, baseUrl);
        },

        abort = function() {
            if (xhrLoader !== null) {
                xhrLoader.abort();
            }
        };

    return {
        debug: undefined,
        config: undefined,
        manifestModel: undefined,
        fragmentLoader: undefined,
        abrController: undefined,
        hlsDemux: undefined,
        metricsModel: undefined,

        setup: function() {
            retryAttempts = this.config.getParam("ManifestLoader.RetryAttempts", "number", DEFAULT_RETRY_ATTEMPTS);
            retryInterval = this.config.getParam("ManifestLoader.RetryInterval", "number", DEFAULT_RETRY_INTERVAL);
        },

        parse: internalParse,

        updatePlaylist: updatePlaylist,

        abort: abort
    };
};

Hls.dependencies.HlsParser.prototype = {
    constructor: Hls.dependencies.HlsParser
};