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
Mss.dependencies.MssParser = function() {
    "use strict";

    var TIME_SCALE_100_NANOSECOND_UNIT = 10000000.0,
        SUPPORTED_CODECS = ["AAC", "AACL", "AVC1", "H264", "TTML", "DFXP"],
        samplingFrequencyIndex = {
            96000: 0x0,
            88200: 0x1,
            64000: 0x2,
            48000: 0x3,
            44100: 0x4,
            32000: 0x5,
            24000: 0x6,
            22050: 0x7,
            16000: 0x8,
            12000: 0x9,
            11025: 0xA,
            8000: 0xB,
            7350: 0xC
        },
        mimeTypeMap = {
            "video": "video/mp4",
            "audio": "audio/mp4",
            "text": "application/ttml+xml+mp4"
        },
        xmlDoc = null,
        baseURL = null,

        mapPeriod = function() {
            var period = {},
                adaptations = [],
                adaptation,
                smoothNode = this.domParser.getChildNode(xmlDoc, "SmoothStreamingMedia"),
                i;

            period.BaseURL = baseURL;

            // For each StreamIndex node, create an AdaptationSet element
            for (i = 0; i < smoothNode.childNodes.length; i++) {
                if (smoothNode.childNodes[i].nodeName === "StreamIndex") {
                    adaptation = mapAdaptationSet.call(this, smoothNode.childNodes[i]);
                    if (adaptation !== null) {
                        adaptations.push(adaptation);
                    }
                }
            }

            if (adaptations.length > 0) {
                period.AdaptationSet = (adaptations.length > 1) ? adaptations : adaptations[0];
            }
            period.AdaptationSet_asArray = adaptations;

            return period;
        },

        mapAdaptationSet = function(streamIndex) {

            var adaptationSet = {},
                representations = [],
                representation,
                segmentTemplate = {},
                segments,
                qualityLevels = null,
                range,
                i;

            adaptationSet.id = this.domParser.getAttributeValue(streamIndex, "Name");
            adaptationSet.lang = this.domParser.getAttributeValue(streamIndex, "Language");
            adaptationSet.contentType = this.domParser.getAttributeValue(streamIndex, "Type");
            adaptationSet.mimeType = mimeTypeMap[adaptationSet.contentType];
            adaptationSet.subType = this.domParser.getAttributeValue(streamIndex, "Subtype");
            adaptationSet.maxWidth = this.domParser.getAttributeValue(streamIndex, "MaxWidth");
            adaptationSet.maxHeight = this.domParser.getAttributeValue(streamIndex, "MaxHeight");
            adaptationSet.BaseURL = baseURL;

            // Create a SegmentTemplate with a SegmentTimeline
            segmentTemplate = mapSegmentTemplate.call(this, streamIndex);

            qualityLevels = this.domParser.getChildNodes(streamIndex, "QualityLevel");
            // For each QualityLevel node, create a Representation element
            for (i = 0; i < qualityLevels.length; i++) {
                // Propagate BaseURL and mimeType
                qualityLevels[i].BaseURL = adaptationSet.BaseURL;
                qualityLevels[i].mimeType = adaptationSet.mimeType;

                // Set quality level id
                qualityLevels[i].Id = adaptationSet.id + "_" + this.domParser.getAttributeValue(qualityLevels[i], "Index");

                // Map Representation to QualityLevel
                representation = mapRepresentation.call(this, qualityLevels[i], streamIndex);

                if (representation !== null) {
                    // Copy SegmentTemplate into Representation
                    representation.SegmentTemplate = segmentTemplate;

                    representations.push(representation);
                }
            }

            if (representations.length === 0) {
                return null;
            }

            adaptationSet.Representation = (representations.length > 1) ? representations : representations[0];
            adaptationSet.Representation_asArray = representations;

            // Set SegmentTemplate
            adaptationSet.SegmentTemplate = segmentTemplate;

            segments = segmentTemplate.SegmentTimeline.S_asArray;

            range = {
                start: segments[0].t / segmentTemplate.timescale,
                end: (segments[segments.length - 1].t + segments[segments.length - 1].d)  / segmentTemplate.timescale
            };

            this.metricsModel.addDVRInfo(adaptationSet.contentType, new Date(), range);

            return adaptationSet;
        },

        mapRepresentation = function(qualityLevel, streamIndex) {

            var representation = {},
                fourCCValue = null;

            representation.id = qualityLevel.Id;
            representation.bandwidth = parseInt(this.domParser.getAttributeValue(qualityLevel, "Bitrate"), 10);
            representation.mimeType = qualityLevel.mimeType;
            representation.width = parseInt(this.domParser.getAttributeValue(qualityLevel, "MaxWidth"), 10);
            representation.height = parseInt(this.domParser.getAttributeValue(qualityLevel, "MaxHeight"), 10);

            fourCCValue = this.domParser.getAttributeValue(qualityLevel, "FourCC");

            // If FourCC not defined at QualityLevel level, then get it from StreamIndex level
            if (fourCCValue === null) {
                fourCCValue = this.domParser.getAttributeValue(streamIndex, "FourCC");
            }

            // If still not defined (optionnal for audio stream, see https://msdn.microsoft.com/en-us/library/ff728116%28v=vs.95%29.aspx),
            // then we consider the stream is an audio AAC stream
            if (fourCCValue === null) {
                fourCCValue = "AAC";
            }

            // Check if codec is supported
            if (SUPPORTED_CODECS.indexOf(fourCCValue.toUpperCase()) === -1) {
                // Do not send warning
                //this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED, "Codec not supported", {codec: fourCCValue});
                this.debug.warn("[MssParser] Codec not supported: " + fourCCValue);
                return null;
            }

            // Get codecs value according to FourCC field
            if (fourCCValue === "H264" || fourCCValue === "AVC1") {
                representation.codecs = getH264Codec.call(this, qualityLevel);
            } else if (fourCCValue.indexOf("AAC") >= 0) {
                representation.codecs = getAACCodec.call(this, qualityLevel, fourCCValue);
                representation.audioSamplingRate = parseInt(this.domParser.getAttributeValue(qualityLevel, "SamplingRate"), 10);
                representation.audioChannels = parseInt(this.domParser.getAttributeValue(qualityLevel, "Channels"), 10);
            }

            representation.codecPrivateData = "" + this.domParser.getAttributeValue(qualityLevel, "CodecPrivateData");
            representation.BaseURL = qualityLevel.BaseURL;

            return representation;
        },

        getH264Codec = function(qualityLevel) {
            var codecPrivateData = this.domParser.getAttributeValue(qualityLevel, "CodecPrivateData").toString(),
                nalHeader,
                avcoti;


            // Extract from the CodecPrivateData field the hexadecimal representation of the following
            // three bytes in the sequence parameter set NAL unit.
            // => Find the SPS nal header
            nalHeader = /00000001[0-9]7/.exec(codecPrivateData);
            // => Find the 6 characters after the SPS nalHeader (if it exists)
            avcoti = nalHeader && nalHeader[0] ? (codecPrivateData.substr(codecPrivateData.indexOf(nalHeader[0]) + 10, 6)) : undefined;

            return "avc1." + avcoti;
        },

        getAACCodec = function(qualityLevel, fourCCValue) {
            var objectType = 0,
                codecPrivateData = this.domParser.getAttributeValue(qualityLevel, "CodecPrivateData").toString(),
                codecPrivateDataHex,
                samplingRate = parseInt(this.domParser.getAttributeValue(qualityLevel, "SamplingRate"), 10),
                arr16,
                indexFreq,
                extensionSamplingFrequencyIndex;

            //chrome problem, in implicit AAC HE definition, so when AACH is detected in FourCC
            //set objectType to 5 => strange, it should be 2
            if (fourCCValue === "AACH") {
                objectType = 0x05;
            }
            //if codecPrivateData is empty, build it :
            if (codecPrivateData === undefined || codecPrivateData === "") {
                objectType = 0x02; //AAC Main Low Complexity => object Type = 2
                indexFreq = samplingFrequencyIndex[samplingRate];
                if (fourCCValue === "AACH") {
                    // 4 bytes :     XXXXX         XXXX          XXXX             XXXX                  XXXXX      XXX   XXXXXXX
                    //           ' ObjectType' 'Freq Index' 'Channels value'   'Extens Sampl Freq'  'ObjectType'  'GAS' 'alignment = 0'
                    objectType = 0x05; // High Efficiency AAC Profile = object Type = 5 SBR
                    codecPrivateData = new Uint8Array(4);
                    extensionSamplingFrequencyIndex = samplingFrequencyIndex[samplingRate * 2]; // in HE AAC Extension Sampling frequence
                    // equals to SamplingRate*2
                    //Freq Index is present for 3 bits in the first byte, last bit is in the second
                    codecPrivateData[0] = (objectType << 3) | (indexFreq >> 1);
                    codecPrivateData[1] = (indexFreq << 7) | (qualityLevel.Channels << 3) | (extensionSamplingFrequencyIndex >> 1);
                    codecPrivateData[2] = (extensionSamplingFrequencyIndex << 7) | (0x02 << 2); // origin object type equals to 2 => AAC Main Low Complexity
                    codecPrivateData[3] = 0x0; //alignment bits

                    arr16 = new Uint16Array(2);
                    arr16[0] = (codecPrivateData[0] << 8) + codecPrivateData[1];
                    arr16[1] = (codecPrivateData[2] << 8) + codecPrivateData[3];
                    //convert decimal to hex value
                    codecPrivateDataHex = arr16[0].toString(16);
                    codecPrivateDataHex = arr16[0].toString(16) + arr16[1].toString(16);

                } else {
                    // 2 bytes :     XXXXX         XXXX          XXXX              XXX
                    //           ' ObjectType' 'Freq Index' 'Channels value'   'GAS = 000'
                    codecPrivateData = new Uint8Array(2);
                    //Freq Index is present for 3 bits in the first byte, last bit is in the second
                    codecPrivateData[0] = (objectType << 3) | (indexFreq >> 1);
                    codecPrivateData[1] = (indexFreq << 7) | (parseInt(this.domParser.getAttributeValue(qualityLevel, "Channels"), 10) << 3);
                    // put the 2 bytes in an 16 bits array
                    arr16 = new Uint16Array(1);
                    arr16[0] = (codecPrivateData[0] << 8) + codecPrivateData[1];
                    //convert decimal to hex value
                    codecPrivateDataHex = arr16[0].toString(16);
                }

                codecPrivateData = "" + codecPrivateDataHex;
                codecPrivateData = codecPrivateData.toUpperCase();
                qualityLevel.setAttribute("CodecPrivateData", codecPrivateData);
            } else if (objectType === 0) {
                objectType = (parseInt(codecPrivateData.substr(0, 2), 16) & 0xF8) >> 3;
            }

            return "mp4a.40." + objectType;
        },

        mapSegmentTemplate = function(streamIndex) {

            var segmentTemplate = {},
                mediaUrl;

            mediaUrl = this.domParser.getAttributeValue(streamIndex, "Url").replace('{bitrate}', '$Bandwidth$');
            mediaUrl = mediaUrl.replace('{start time}', '$Time$');

            segmentTemplate.media = mediaUrl;
            segmentTemplate.timescale = TIME_SCALE_100_NANOSECOND_UNIT;

            segmentTemplate.SegmentTimeline = mapSegmentTimeline.call(this, streamIndex);

            return segmentTemplate;
        },

        mapSegmentTimeline = function(streamIndex) {

            var segmentTimeline = {},
                chunks = this.domParser.getChildNodes(streamIndex, "c"),
                segments = [],
                i,
                t, d;

            for (i = 0; i < chunks.length; i++) {
                // Get time and duration attributes
                t = parseFloat(this.domParser.getAttributeValue(chunks[i], "t"));
                d = parseFloat(this.domParser.getAttributeValue(chunks[i], "d"));

                if ((i === 0) && !t) {
                    t = 0;
                }

                if (i > 0) {
                    // Update previous segment duration if not defined
                    if (!segments[segments.length - 1].d) {
                        segments[segments.length - 1].d = t - segments[segments.length - 1].t;
                    }
                    // Set segment absolute timestamp if not set
                    if (!t) {
                        t = segments[segments.length - 1].t + segments[segments.length - 1].d;
                    }
                }

                // Create new segment
                segments.push({
                    d: d,
                    t: t
                });

            }

            segmentTimeline.S = segments;
            segmentTimeline.S_asArray = segments;

            return segmentTimeline;
        },

        /* @if PROTECTION=true */
        getKIDFromProtectionHeader = function(protectionHeader) {
            var prHeader,
                wrmHeader,
                xmlReader,
                KID;

            // Get PlayReady header as byte array (base64 decoded)
            prHeader = BASE64.decodeArray(protectionHeader.firstChild.data);

            // Get Right Management header (WRMHEADER) from PlayReady header
            wrmHeader = getWRMHeaderFromPRHeader(prHeader);

            // Convert from multi-byte to unicode
            wrmHeader = new Uint16Array(wrmHeader.buffer);

            // Convert to string
            wrmHeader = String.fromCharCode.apply(null, wrmHeader);

            // Parse <WRMHeader> to get KID field value
            xmlReader = (new DOMParser()).parseFromString(wrmHeader, "application/xml");
            KID = xmlReader.querySelector("KID").textContent;

            // Get KID (base64 decoded) as byte array
            KID = BASE64.decodeArray(KID);

            // Convert UUID from little-endian to big-endian
            convertUuidEndianness(KID);

            return KID;
        },

        getWRMHeaderFromPRHeader = function(prHeader) {
            var length,
                recordCount,
                recordType,
                recordLength,
                recordValue,
                i = 0;

            // Parse PlayReady header

            // Length - 32 bits (LE format)
            length = (prHeader[i + 3] << 24) + (prHeader[i + 2] << 16) + (prHeader[i + 1] << 8) + prHeader[i];
            i += 4;

            // Record count - 16 bits (LE format)
            recordCount = (prHeader[i + 1] << 8) + prHeader[i];
            i += 2;

            // Parse records
            while (i < prHeader.length) {
                // Record type - 16 bits (LE format)
                recordType = (prHeader[i + 1] << 8) + prHeader[i];
                i += 2;

                // Check if Rights Management header (record type = 0x01)
                if (recordType === 0x01) {

                    // Record length - 16 bits (LE format)
                    recordLength = (prHeader[i + 1] << 8) + prHeader[i];
                    i += 2;

                    // Record value => contains <WRMHEADER>
                    recordValue = new Uint8Array(recordLength);
                    recordValue.set(prHeader.subarray(i, i + recordLength));
                    return recordValue;
                }
            }

            return null;
        },

        convertUuidEndianness = function(uuid) {
            swapBytes(uuid, 0, 3);
            swapBytes(uuid, 1, 2);
            swapBytes(uuid, 4, 5);
            swapBytes(uuid, 6, 7);
        },

        swapBytes = function(bytes, pos1, pos2) {
            var temp = bytes[pos1];
            bytes[pos1] = bytes[pos2];
            bytes[pos2] = temp;
        },


        createPRContentProtection = function(protectionHeader) {

            var contentProtection = {},
                keySystem = this.system.getObject("ksPlayReady"),
                pro;

            pro = {
                __text: protectionHeader.firstChild.data,
                __prefix: "mspr"
            };

            contentProtection.schemeIdUri = keySystem.schemeIdURI;
            contentProtection.value = keySystem.systemString;
            contentProtection.pro = pro;
            contentProtection.pro_asArray = pro;

            return contentProtection;
        },

        createWidevineContentProtection = function(/*protectionHeader*/) {

            var contentProtection = {},
                keySystem = this.system.getObject("ksWidevine");

            contentProtection.schemeIdUri = keySystem.schemeIdURI;
            contentProtection.value = keySystem.systemString;

            return contentProtection;
        },
        /* @endif */

        processManifest = function(manifestLoadedTime) {
            var mpd = {},
                period,
                adaptations,
                contentProtection,
                contentProtections = [],
                smoothNode = this.domParser.getChildNode(xmlDoc, "SmoothStreamingMedia"),
                protection = this.domParser.getChildNode(smoothNode, 'Protection'),
                protectionHeader = null,
                KID,
                timestampOffset,
                startTime,
                segments,
                i, j;

            // Set mpd node properties
            mpd.name = 'MSS';
            mpd.profiles = "urn:mpeg:dash:profile:isoff-live:2011";
            var isLive = this.domParser.getAttributeValue(smoothNode, 'IsLive');
            mpd.type = (isLive !== null && isLive.toLowerCase() === 'true') ? 'dynamic' : 'static';
            mpd.timeShiftBufferDepth = parseFloat(this.domParser.getAttributeValue(smoothNode, 'DVRWindowLength')) / TIME_SCALE_100_NANOSECOND_UNIT;
            var duration = parseFloat(this.domParser.getAttributeValue(smoothNode, 'Duration'));
            mpd.mediaPresentationDuration = (duration === 0) ? Infinity : (duration / TIME_SCALE_100_NANOSECOND_UNIT);
            mpd.BaseURL = baseURL;
            mpd.minBufferTime = MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME;

            // In case of live streams, set availabilityStartTime property according to DVRWindowLength
            if (mpd.type === "dynamic") {
                mpd.availabilityStartTime = new Date(manifestLoadedTime.getTime() - (mpd.timeShiftBufferDepth * 1000));
            }

            // Map period node to manifest root node
            mpd.Period = mapPeriod.call(this);
            mpd.Period_asArray = [mpd.Period];

            period = mpd.Period;

            // Complete period initialization
            period.start = 0;

            // Test live to static
            // if (mpd.type !== 'static') {
            //     mpd.type = 'static';
            //     mpd.mediaPresentationDuration = mpd.timeShiftBufferDepth;
            // }

            // ContentProtection node
            if (protection !== undefined) {
                /* @if PROTECTION=true */
                protectionHeader = this.domParser.getChildNode(protection, 'ProtectionHeader');

                // Some packagers put newlines into the ProtectionHeader base64 string, which is not good
                // because this cannot be correctly parsed. Let's just filter out any newlines found in there.
                protectionHeader.firstChild.data = protectionHeader.firstChild.data.replace(/\n|\r/g, "");

                // Get KID (in CENC format) from protection header
                KID = getKIDFromProtectionHeader(protectionHeader);

                // Create ContentProtection for PR
                contentProtection = createPRContentProtection.call(this, protectionHeader);
                contentProtection["cenc:default_KID"] = KID;
                contentProtections.push(contentProtection);

                // Create ContentProtection for Widevine (as a CENC protection)
                contentProtection = createWidevineContentProtection.call(this, protectionHeader);
                contentProtection["cenc:default_KID"] = KID;
                contentProtections.push(contentProtection);

                mpd.ContentProtection = (contentProtections.length > 1) ? contentProtections : contentProtections[0];
                mpd.ContentProtection_asArray = contentProtections;
                /* @endif */

                /* @if PROTECTION=false */
                /* @exec sendError('MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_ENCRYPTED','"protected content detected but protection module is not included."') */
                /* @exec reject('"[MssParser] Protected content detected but protection module is not included."') */
                /* @endif */
            }

            adaptations = period.AdaptationSet_asArray;

            // Propagate content protection information into each adaptation
            for (i = 0; i < adaptations.length; i += 1) {
                if (mpd.ContentProtection !== undefined) {
                    adaptations[i].ContentProtection = mpd.ContentProtection;
                    adaptations[i].ContentProtection_asArray = mpd.ContentProtection_asArray;
                }
            }

            // Delete Content Protection under root mpd node
            delete mpd.ContentProtection;
            delete mpd.ContentProtection_asArray;

            // In case of VOD streams, check if start time is greater than 0
            // Then determine timestamp offset according to higher audio/video start time
            if (mpd.type === "static") {
                for (i = 0; i < adaptations.length; i++) {
                    if (adaptations[i].contentType === 'audio' || adaptations[i].contentType === 'video') {
                        segments = adaptations[i].SegmentTemplate.SegmentTimeline.S_asArray;
                        startTime = segments[0].t;
                        if (startTime > 0) {
                            timestampOffset = timestampOffset ? Math.min(timestampOffset, startTime) : startTime;
                        }
                        // Correct content duration according to minimum adaptation's segments duration
                        // in order to force <video> element sending 'ended' event
                        mpd.mediaPresentationDuration = Math.min(mpd.mediaPresentationDuration, ((segments[segments.length-1].t + segments[segments.length-1].d) / TIME_SCALE_100_NANOSECOND_UNIT).toFixed(3));
                    }
                }

                // Patch segment templates timestamps and determine period start time (since audio/video should not be aligned to 0)
                if (timestampOffset > 0) {
                    for (i = 0; i < adaptations.length; i++) {
                        segments = adaptations[i].SegmentTemplate.SegmentTimeline.S_asArray;
                        for (j = 0; j < segments.length; j++) {
                            segments[j].tManifest = segments[j].t;
                            segments[j].t -= timestampOffset;
                        }
                        if (adaptations[i].contentType === 'audio' || adaptations[i].contentType === 'video') {
                            period.start = Math.max(segments[0].t, period.start);
                        }
                    }
                    period.start = parseFloat(period.start) / TIME_SCALE_100_NANOSECOND_UNIT;
                }
            }

            period.duration = mpd.mediaPresentationDuration;

            return mpd;
        },

        internalParse = function(data, baseUrl) {
            this.debug.info("[MssParser]", "Doing parse.");

            var start = new Date(),
                xml = null,
                manifest = null,
                mss2dash = null;

            //this.debug.log("[MssParser]", "Converting from XML.");
            xmlDoc = this.domParser.createXmlTree(data);
            xml = new Date();

            if (xmlDoc === null) {
                return Q.reject(null);
            }

            baseURL = baseUrl;

            // Convert MSS manifest into DASH manifest
            manifest = processManifest.call(this, start);
            mss2dash = new Date();
            //this.debug.log("mpd: " + JSON.stringify(manifest, null, '\t'));

            this.debug.info("[MssParser]", "Parsing complete (xmlParser: " + (xml.getTime() - start.getTime()) + "ms, mss2dash: " + (mss2dash.getTime() - xml.getTime()) + "ms, total: " + ((new Date().getTime() - start.getTime()) / 1000) + "s)");
            //console.info("manifest",JSON.stringify(manifest) );
            return Q.when(manifest);
        };

    return {
        debug: undefined,
        system: undefined,
        errHandler: undefined,
        domParser: undefined,
        metricsModel: undefined,

        parse: internalParse
    };
};

Mss.dependencies.MssParser.prototype = {
    constructor: Mss.dependencies.MssParser
};