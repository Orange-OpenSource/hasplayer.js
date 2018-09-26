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

// Define Number.MAX_SAFE_INTEGER value in case it is not defined (such as in IE11)
if (!Number.MAX_SAFE_INTEGER) {
    Number.MAX_SAFE_INTEGER = 9007199254740991;
}

Mss.dependencies.MssParser = function() {
    "use strict";

    var DEFAULT_TIME_SCALE = 10000000.0,
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

        mapPeriod = function(timescale) {
            var period = {},
                adaptations = [],
                adaptation,
                smoothNode = this.domParser.getChildNode(xmlDoc, "SmoothStreamingMedia"),
                i;

            period.BaseURL = baseURL;

            // For each StreamIndex node, create an AdaptationSet element
            for (i = 0; i < smoothNode.childNodes.length; i++) {
                if (smoothNode.childNodes[i].nodeName === "StreamIndex") {
                    adaptation = mapAdaptationSet.call(this, smoothNode.childNodes[i], timescale);
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

        mapAdaptationSet = function(streamIndex, timescale) {

            var adaptationSet = {},
                representations = [],
                representation,
                segmentTemplate = {},
                qualityLevels = null,
                subType = null,
                i;

            adaptationSet.id = this.domParser.getAttributeValue(streamIndex, "Name");
            adaptationSet.lang = this.domParser.getAttributeValue(streamIndex, "Language");
            adaptationSet.contentType = this.domParser.getAttributeValue(streamIndex, "Type");
            adaptationSet.mimeType = mimeTypeMap[adaptationSet.contentType];
            adaptationSet.maxWidth = this.domParser.getAttributeValue(streamIndex, "MaxWidth");
            adaptationSet.maxHeight = this.domParser.getAttributeValue(streamIndex, "MaxHeight");
            adaptationSet.BaseURL = baseURL;

            subType = this.domParser.getAttributeValue(streamIndex, "Subtype");
            if (subType) {
                adaptationSet.subType = subType;
            }

            // Create a SegmentTemplate with a SegmentTimeline
            segmentTemplate = mapSegmentTemplate.call(this, streamIndex, timescale);

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

            return adaptationSet;
        },

        mapRepresentation = function(qualityLevel, streamIndex) {

            var representation = {},
                fourCCValue = null,
                type = this.domParser.getAttributeValue(streamIndex, "Type");

            representation.id = qualityLevel.Id;
            representation.bandwidth = parseInt(this.domParser.getAttributeValue(qualityLevel, "Bitrate"), 10);
            representation.mimeType = qualityLevel.mimeType;
            representation.width = parseInt(this.domParser.getAttributeValue(qualityLevel, "MaxWidth"), 10);
            representation.height = parseInt(this.domParser.getAttributeValue(qualityLevel, "MaxHeight"), 10);

            fourCCValue = this.domParser.getAttributeValue(qualityLevel, "FourCC");

            // If FourCC not defined at QualityLevel level, then get it from StreamIndex level
            if (fourCCValue === null || fourCCValue === "") {
                fourCCValue = this.domParser.getAttributeValue(streamIndex, "FourCC");
            }

            // If still not defined (optionnal for audio stream, see https://msdn.microsoft.com/en-us/library/ff728116%28v=vs.95%29.aspx),
            // then we consider the stream is an audio AAC stream
            if (fourCCValue === null || fourCCValue === "") {
                if (type === 'audio') {
                    fourCCValue = "AAC";
                } else {
                    this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED, type + " codec/FourCC not provided", {codec: ''});
                    return null;
                }
            }

            // Check if codec is supported
            if (SUPPORTED_CODECS.indexOf(fourCCValue.toUpperCase()) === -1) {
                // Do not send warning
                //this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED, "Codec/FourCC not supported", {codec: fourCCValue});
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

        mapSegmentTemplate = function(streamIndex, timescale) {

            var segmentTemplate = {},
                mediaUrl,
                streamIndexTimeScale;

            mediaUrl = this.domParser.getAttributeValue(streamIndex, "Url").replace('{bitrate}', '$Bandwidth$');
            mediaUrl = mediaUrl.replace('{start time}', '$Time$');

            streamIndexTimeScale = this.domParser.getAttributeValue(streamIndex, "TimeScale");
            streamIndexTimeScale = streamIndexTimeScale ? parseFloat(streamIndexTimeScale) : timescale;

            segmentTemplate.media = mediaUrl;
            segmentTemplate.timescale = streamIndexTimeScale;

            segmentTemplate.SegmentTimeline = mapSegmentTimeline.call(this, streamIndex, segmentTemplate.timescale);

            return segmentTemplate;
        },

        mapSegmentTimeline = function(streamIndex, timescale) {

            var segmentTimeline = {},
                chunks = this.domParser.getChildNodes(streamIndex, "c"),
                segments = [],
                segment,
                prevSegment,
                i, j, r,
                tManifest,
                duration = 0;

            for (i = 0; i < chunks.length; i++) {
                segment = {};

                // Get time 't' attribute value (as string in order to handle large values, i.e. > 2^53)
                tManifest = this.domParser.getAttributeValue(chunks[i], "t");

                // Check if time is not greater than 2^53
                // => segment.tManifest = original timestamp value as a string (for constructing the fragment request url, see DashHandler)
                // => segment.t = number value of timestamp (maybe rounded value, but only for 0.1 microsecond)
                if (tManifest && goog.math.Long.fromString(tManifest).greaterThan(goog.math.Long.fromNumber(Number.MAX_SAFE_INTEGER))) {
                    segment.tManifest = tManifest;
                }

                segment.t = parseFloat(tManifest);

                // Get duration 'd' attribute value
                segment.d = parseFloat(this.domParser.getAttributeValue(chunks[i], "d"));

                // If 't' not defined for first segment then t=0
                if ((i === 0) && !segment.t) {
                    segment.t = 0;
                }

                if (i > 0) {
                    prevSegment = segments[segments.length - 1];
                    // Update previous segment duration if not defined
                    if (!prevSegment.d) {
                       if (prevSegment.tManifest) {
                           prevSegment.d = goog.math.Long.fromString(tManifest).subtract(goog.math.Long.fromString(prevSegment.tManifest)).toNumber();
                       } else {
                           prevSegment.d = segment.t - prevSegment.t;
                       }
                       duration += prevSegment.d;
                    }
                    // Set segment absolute timestamp if not set in manifest
                    if (!segment.t) {
                        if (prevSegment.tManifest) {
                           segment.tManifest = goog.math.Long.fromString(prevSegment.tManifest).add(goog.math.Long.fromNumber(prevSegment.d)).toString();
                           segment.t = parseFloat(segment.tManifest);
                       } else {
                           segment.t = prevSegment.t + prevSegment.d;
                       }
                    }
                }

                if (segment.d) {
                    duration += segment.d;
                }

                // Create new segment
                segments.push(segment);

                // Support for 'r' attribute (i.e. "repeat" as in MPEG-DASH)
                r = parseFloat(this.domParser.getAttributeValue(chunks[i], "r"));
                if (r) {

                    for (j = 0; j < (r - 1); j++) {
                        prevSegment = segments[segments.length - 1];
                        segment = {};
                        segment.t = prevSegment.t + prevSegment.d;
                        segment.d = prevSegment.d;
                        if (prevSegment.tManifest) {
                            segment.tManifest  = goog.math.Long.fromString(prevSegment.tManifest).add(goog.math.Long.fromNumber(prevSegment.d)).toString();
                        }
                        duration += segment.d;
                        segments.push(segment);
                    }
                }
            }

            segmentTimeline.S = segments;
            segmentTimeline.S_asArray = segments;
            segmentTimeline.duration = duration / timescale;

            return segmentTimeline;
        },

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

        createWidevineContentProtection = function(KID) {

            var contentProtection = {},
                keySystem = this.system.getObject("ksWidevine");

            contentProtection.schemeIdUri = keySystem.schemeIdURI;
            contentProtection.value = keySystem.systemString;

            // Create Widevine CENC header (Protocol Buffer) with KID value
            var wvCencHeader = new Uint8Array(2 + KID.length);
            wvCencHeader[0] = 0x12;
            wvCencHeader[1] = 0x10;
            wvCencHeader.set(KID, 2);
    
            // Create a pssh box
            var length = 12 /* box length, type, version and flags */ + 16 /* SystemID */ + 4 /* data length */ + wvCencHeader.length,
                pssh = new Uint8Array(length),
                i = 0;
    
            // Set box length value
            pssh[i++] = (length & 0xFF000000) >> 24;
            pssh[i++] = (length & 0x00FF0000) >> 16;
            pssh[i++] = (length & 0x0000FF00) >> 8;
            pssh[i++] = (length & 0x000000FF);
    
            // Set type ('pssh'), version (0) and flags (0)
            pssh.set([0x70, 0x73, 0x73, 0x68, 0x00, 0x00, 0x00, 0x00], i);
            i += 8;
    
            // Set SystemID ('edef8ba9-79d6-4ace-a3c8-27dcd51d21ed')
            pssh.set([0xed, 0xef, 0x8b, 0xa9,  0x79, 0xd6, 0x4a, 0xce, 0xa3, 0xc8, 0x27, 0xdc, 0xd5, 0x1d, 0x21, 0xed], i);
            i += 16;
    
            // Set data length value
            pssh[i++] = (wvCencHeader.length & 0xFF000000) >> 24;
            pssh[i++] = (wvCencHeader.length & 0x00FF0000) >> 16;
            pssh[i++] = (wvCencHeader.length & 0x0000FF00) >> 8;
            pssh[i++] = (wvCencHeader.length & 0x000000FF);
    
            // Copy Widevine CENC header
            pssh.set(wvCencHeader, i);
    
            // Convert to BASE64 string
            pssh = String.fromCharCode.apply(null, pssh);
            pssh = BASE64.encodeASCII(pssh);         
            
            // Add pssh value to ContentProtection
            contentProtection.pssh = {
                __text: pssh
            };

            return contentProtection;
        },

        addDVRInfo = function(adaptationSet) {
            var segmentTemplate = adaptationSet.SegmentTemplate,
                segments = segmentTemplate.SegmentTimeline.S_asArray;

            if (segments.length === 0) {
                return;
            }

            var range = {
                start: segments[0].t / segmentTemplate.timescale,
                end: (segments[segments.length - 1].t + segments[segments.length - 1].d) / segmentTemplate.timescale
            };

            this.metricsModel.addDVRInfo(adaptationSet.contentType, new Date(), range);
        },

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
            var timescale = this.domParser.getAttributeValue(smoothNode, 'TimeScale');
            mpd.timescale = timescale ? parseFloat(timescale) : DEFAULT_TIME_SCALE;
            var isLive = this.domParser.getAttributeValue(smoothNode, 'IsLive');
            mpd.type = (isLive !== null && isLive.toLowerCase() === 'true') ? 'dynamic' : 'static';
            // var canSeek = this.domParser.getAttributeValue(smoothNode, 'CanSeek');
            var dvrWindowLength = parseFloat(this.domParser.getAttributeValue(smoothNode, 'DVRWindowLength'));
            if (isLive && (dvrWindowLength === 0 || isNaN(dvrWindowLength))) {
                dvrWindowLength = Infinity;
            }
            mpd.timeShiftBufferDepth = dvrWindowLength / mpd.timescale;
            var duration = parseFloat(this.domParser.getAttributeValue(smoothNode, 'Duration'));

            // If live manifest with Duration, we consider it as a start-over manifest
            if (mpd.type === "dynamic" && duration > 0) {
                mpd.type = "static";
                mpd.startOver = true;
                // We set timeShiftBufferDepth to initial duration, to be used by MssFragmentController to update segment timeline
                mpd.timeShiftBufferDepth = duration / mpd.timescale;
                // Duration will be set according to current segment timeline duration (see below)
            }

            // Complete manifest/mpd initialization
            mpd.mediaPresentationDuration = (duration === 0) ? Infinity : (duration / mpd.timescale);
            mpd.BaseURL = baseURL;
            mpd.minBufferTime = MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME;

            // In case of live streams, set availabilityStartTime property according to DVRWindowLength
            if (mpd.type === "dynamic" && mpd.timeShiftBufferDepth < Infinity ) {
                mpd.availabilityStartTime = new Date(manifestLoadedTime.getTime() - (mpd.timeShiftBufferDepth * 1000));
            }

            // Map period node to manifest root node
            mpd.Period = mapPeriod.call(this, mpd.timescale);
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
                if (MediaPlayer.dependencies.ProtectionController) {
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
                    contentProtection = createWidevineContentProtection.call(this, KID);
                    contentProtection["cenc:default_KID"] = KID;
                    contentProtections.push(contentProtection);

                    mpd.ContentProtection = (contentProtections.length > 1) ? contentProtections : contentProtections[0];
                    mpd.ContentProtection_asArray = contentProtections;
                } else {
                    mpd.error = {
                        name: MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_ENCRYPTED,
                        message: "protected content detected but protection module is not included."
                    };
                    return mpd;
                }
            }

            adaptations = period.AdaptationSet_asArray;

            for (i = 0; i < adaptations.length; i += 1) {
                // Propagate content protection information into each adaptation
                if (mpd.ContentProtection !== undefined) {
                    adaptations[i].ContentProtection = mpd.ContentProtection;
                    adaptations[i].ContentProtection_asArray = mpd.ContentProtection_asArray;
                }

                if (mpd.type === "dynamic") {
                    // set availabilityStartTime for infinite DVR Window from segment timeline duration
                    if (mpd.timeShiftBufferDepth === Infinity) {
                        mpd.availabilityStartTime = new Date(manifestLoadedTime.getTime() - (adaptations[1].SegmentTemplate.SegmentTimeline.duration * 1000));
                    }
                    // Match timeShiftBufferDepth to video segment timeline duration
                    if (mpd.timeShiftBufferDepth > 0 &&
                        mpd.timeShiftBufferDepth !== Infinity &&
                        adaptations[i].contentType === 'video' &&
                        mpd.timeShiftBufferDepth > adaptations[i].SegmentTemplate.SegmentTimeline.duration) {
                        mpd.timeShiftBufferDepth = adaptations[i].SegmentTemplate.SegmentTimeline.duration;
                    }

                    // Add DVRInfo for live streams
                    addDVRInfo.call(this, adaptations[i]);
                }
            }

            if (mpd.timeShiftBufferDepth < mpd.minBufferTime) {
                mpd.minBufferTime = mpd.timeShiftBufferDepth;
            }

            // Delete Content Protection under root mpd node
            delete mpd.ContentProtection;
            delete mpd.ContentProtection_asArray;

            // In case of VOD streams, check if start time is greater than 0
            // Then determine timestamp offset according to higher audio/video start time
            // (use case = live stream delinearization)
            if (mpd.type === "static") {
                // In case of start-over stream and manifest reloading (due to track switch)
                // we consider previous timestampOffset to keep timelines synchronized
                var prevManifest = this.manifestModel.getValue();
                if (prevManifest && prevManifest.timestampOffset) {
                    timestampOffset = prevManifest.timestampOffset;
                } else {
                    for (i = 0; i < adaptations.length; i++) {
                        if (adaptations[i].contentType === 'audio' || adaptations[i].contentType === 'video') {
                            segments = adaptations[i].SegmentTemplate.SegmentTimeline.S_asArray;
                            startTime = segments[0].t / adaptations[i].SegmentTemplate.timescale;
                            if (timestampOffset === undefined) {
                                timestampOffset = startTime;
                            }
                            timestampOffset = Math.min(timestampOffset, startTime);
                            // Correct content duration according to minimum adaptation's segment timeline duration
                            // in order to force <video> element sending 'ended' event
                            mpd.mediaPresentationDuration = Math.min(mpd.mediaPresentationDuration, adaptations[i].SegmentTemplate.SegmentTimeline.duration);
                        }
                    }
                }

                // Patch segment templates timestamps and determine period start time (since audio/video should not be aligned to 0)
                if (timestampOffset > 0) {
                    mpd.timestampOffset = timestampOffset;
                    for (i = 0; i < adaptations.length; i++) {
                        segments = adaptations[i].SegmentTemplate.SegmentTimeline.S_asArray;
                        for (j = 0; j < segments.length; j++) {
                            if (!segments[j].tManifest) {
                                segments[j].tManifest = segments[j].t;
                            }
                            segments[j].t -= (timestampOffset * adaptations[i].SegmentTemplate.timescale);
                        }
                        if (adaptations[i].contentType === 'audio' || adaptations[i].contentType === 'video') {
                            period.start = Math.max(segments[0].t, period.start);
                        }
                    }
                    period.start /= mpd.timescale;
                }
            }

            // Floor the duration to get around precision differences between segments timestamps and MSE buffer timestamps
            // and the avoid 'ended' event not being raised
            mpd.mediaPresentationDuration = Math.floor(mpd.mediaPresentationDuration * 1000) / 1000;
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

            if (manifest.error) {
                return Q.reject(manifest.error);
            }
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
        manifestModel: undefined,

        parse: internalParse
    };
};

Mss.dependencies.MssParser.prototype = {
    constructor: Mss.dependencies.MssParser
};
