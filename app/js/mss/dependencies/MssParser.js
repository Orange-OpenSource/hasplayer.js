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
Mss.dependencies.MssParser = function () {
    "use strict";

    var TIME_SCALE_100_NANOSECOND_UNIT = 10000000.0;

    var numericRegex = /^[-+]?[0-9]+[.]?[0-9]*([eE][-+]?[0-9]+)?$/;
    var hexadecimalRegex = /^0[xX][A-Fa-f0-9]+$/;
    var samplingFrequencyIndex = {96000:0x0,
                                  88200:0x1,
                                  64000:0x2,
                                  48000:0x3,
                                  44100:0x4,
                                  32000:0x5,
                                  24000:0x6,
                                  22050:0x7,
                                  16000:0x8,
                                  12000:0x9,
                                  11025:0xA,
                                   8000:0xB,
                                   7350:0xC};

    var matchers = [
        {
            type: "numeric",
            test: function (str) {
                return numericRegex.test(str);
            },
            converter: function (str) {
                return parseFloat(str);
            }
        },
        {
            type: "hexadecimal",
            test: function (str) {
                return hexadecimalRegex.test(str);
            },
            converter: function (str) {
                // Remove '0x'
                return str.substr(2);
            }
        }
    ];

    var mimeTypeMap = {
        "video" : "video/mp4",
        "audio" : "audio/mp4",
        "text"  : "application/ttml+xml+mp4"
    };


    var mapPeriod = function (manifest) {
        var period = {},
            adaptations = [],
            i;

        period.duration = (manifest.Duration === 0) ? Infinity : parseFloat(manifest.Duration) / TIME_SCALE_100_NANOSECOND_UNIT;
        period.BaseURL = manifest.BaseURL;

        // For each StreamIndex node, create an AdaptationSet element
        for (i = 0; i < manifest.StreamIndex_asArray.length; i++) {
            // Propagate BaseURL
            manifest.StreamIndex_asArray[i].BaseURL = period.BaseURL;
            adaptations.push(mapAdaptationSet(manifest.StreamIndex_asArray[i]));
        }

        period.AdaptationSet = (adaptations.length > 1) ? adaptations : adaptations[0];
        period.AdaptationSet_asArray = adaptations;

        return period;
    };

    var mapAdaptationSet = function (streamIndex) {

        var adaptationSet = {},
            representations = [],
            representation,
            segmentTemplate = {},
            i;

        adaptationSet.id = streamIndex.Name;
        adaptationSet.lang = streamIndex.Language;
        adaptationSet.contentType = streamIndex.Type;
        adaptationSet.mimeType = mimeTypeMap[streamIndex.Type];
        adaptationSet.maxWidth = streamIndex.MaxWidth;
        adaptationSet.maxHeight = streamIndex.MaxHeight;
        adaptationSet.BaseURL = streamIndex.BaseURL;

        // Create a SegmentTemplate with a SegmentTimeline
        segmentTemplate = mapSegmentTemplate(streamIndex);

        // For each QualityLevel node, create a Representation element
        for (i = 0; i < streamIndex.QualityLevel_asArray.length; i++) {
            // Propagate BaseURL and mimeType
            streamIndex.QualityLevel_asArray[i].BaseURL = adaptationSet.BaseURL;
            streamIndex.QualityLevel_asArray[i].mimeType = adaptationSet.mimeType;

            // Set quality level id
            streamIndex.QualityLevel_asArray[i].Id = adaptationSet.id + "_" + streamIndex.QualityLevel_asArray[i].Index;

                // Map Representation to QualityLevel
                representation = mapRepresentation(streamIndex.QualityLevel_asArray[i]);

                // Copy SegmentTemplate into Representation
                representation.SegmentTemplate = segmentTemplate;

                representations.push(representation);
            }

        adaptationSet.Representation = (representations.length > 1) ? representations : representations[0];
        adaptationSet.Representation_asArray = representations;

        // Set SegmentTemplate
        adaptationSet.SegmentTemplate = segmentTemplate;

        return adaptationSet;
    };

    var mapRepresentation = function (qualityLevel) {

        var representation = {};

        representation.id = qualityLevel.Id;
        representation.bandwidth = qualityLevel.Bitrate;
        representation.mimeType = qualityLevel.mimeType;
        representation.width = qualityLevel.MaxWidth;
        representation.height = qualityLevel.MaxHeight;

        if (qualityLevel.FourCC === "H264" || qualityLevel.FourCC === "AVC1") {
            representation.codecs = getH264Codec(qualityLevel);
        } else if (qualityLevel.FourCC.indexOf("AAC") >= 0){
            representation.codecs = getAACCodec(qualityLevel);
        }

        representation.audioSamplingRate = qualityLevel.SamplingRate;
        representation.audioChannels = qualityLevel.Channels;
        representation.codecPrivateData = "" + qualityLevel.CodecPrivateData;
        representation.BaseURL = qualityLevel.BaseURL;

        return representation;
    };

    var getH264Codec = function (qualityLevel) {
        var codecPrivateData = qualityLevel.CodecPrivateData.toString(),
            nalHeader,
            avcoti;


        // Extract from the CodecPrivateData field the hexadecimal representation of the following
        // three bytes in the sequence parameter set NAL unit.
        // => Find the SPS nal header
        nalHeader = /00000001[0-9]7/.exec(codecPrivateData);
        // => Find the 6 characters after the SPS nalHeader (if it exists)
        avcoti = nalHeader && nalHeader[0] ? (codecPrivateData.substr(codecPrivateData.indexOf(nalHeader[0])+10, 6)) : undefined;

        return "avc1." + avcoti;
    };

    var getAACCodec = function (qualityLevel) {
        var objectType = 0,
            codecPrivateData = qualityLevel.CodecPrivateData.toString(),
            codecPrivateDataHex,
            arr16;

        //chrome problem, in implicit AAC HE definition, so when AACH is detected in FourCC
        //set objectType to 5 => strange, it should be 2
        if (qualityLevel.FourCC === "AACH") {
            objectType = 0x05;
        }

        //if codecPrivateData is empty, build it :
        if (codecPrivateData === undefined || codecPrivateData === "") {
            objectType = 0x02; //AAC Main Low Complexity => object Type = 2
            var indexFreq = samplingFrequencyIndex[qualityLevel.SamplingRate];
            if (qualityLevel.FourCC === "AACH") {
                // 4 bytes :     XXXXX         XXXX          XXXX             XXXX                  XXXXX      XXX   XXXXXXX
                //           ' ObjectType' 'Freq Index' 'Channels value'   'Extens Sampl Freq'  'ObjectType'  'GAS' 'alignment = 0'
                objectType = 0x05; // High Efficiency AAC Profile = object Type = 5 SBR
                codecPrivateData = new Uint8Array(4);
                var extensionSamplingFrequencyIndex = samplingFrequencyIndex[qualityLevel.SamplingRate*2];// in HE AAC Extension Sampling frequence
                // equals to SamplingRate*2
                //Freq Index is present for 3 bits in the first byte, last bit is in the second
                codecPrivateData[0] = (objectType << 3) | (indexFreq >> 1);
                codecPrivateData[1] = (indexFreq << 7) | (qualityLevel.Channels << 3) | (extensionSamplingFrequencyIndex >> 1);
                codecPrivateData[2] = (extensionSamplingFrequencyIndex << 7) | (0x02 << 2);// origin object type equals to 2 => AAC Main Low Complexity
                codecPrivateData[3] = 0x0; //alignment bits

                arr16 = new Uint16Array(2);
                arr16[0] = (codecPrivateData[0] << 8) + codecPrivateData[1];
                arr16[1] = (codecPrivateData[2] << 8) + codecPrivateData[3];
                //convert decimal to hex value
                codecPrivateDataHex = arr16[0].toString(16);
                codecPrivateDataHex = arr16[0].toString(16)+arr16[1].toString(16);

            } else {
                // 2 bytes :     XXXXX         XXXX          XXXX              XXX
                //           ' ObjectType' 'Freq Index' 'Channels value'   'GAS = 000'
                codecPrivateData = new Uint8Array(2);
                //Freq Index is present for 3 bits in the first byte, last bit is in the second
                codecPrivateData[0] = (objectType << 3) | (indexFreq >> 1);
                codecPrivateData[1] = (indexFreq << 7) | (qualityLevel.Channels << 3);
                // put the 2 bytes in an 16 bits array
                arr16 = new Uint16Array(1);
                arr16[0] = (codecPrivateData[0] << 8) + codecPrivateData[1];
                //convert decimal to hex value
                codecPrivateDataHex = arr16[0].toString(16);
            }

            codecPrivateData = "" + codecPrivateDataHex;
            codecPrivateData = codecPrivateData.toUpperCase();
            qualityLevel.CodecPrivateData = codecPrivateData;
        }
        else if (objectType === 0)
            objectType = (parseInt(codecPrivateData.substr(0, 2), 16) & 0xF8) >> 3;
        
        return "mp4a.40." + objectType;
    };


    var mapSegmentTemplate = function (streamIndex) {

        var segmentTemplate = {},
            mediaUrl;

        mediaUrl = streamIndex.Url.replace('{bitrate}','$Bandwidth$');
        mediaUrl = mediaUrl.replace('{start time}','$Time$');

        segmentTemplate.media = mediaUrl;
        segmentTemplate.timescale = TIME_SCALE_100_NANOSECOND_UNIT;

        segmentTemplate.SegmentTimeline = mapSegmentTimeline(streamIndex);

        return segmentTemplate;
    };

    var mapSegmentTimeline = function (streamIndex) {

        var segmentTimeline = {},
            chunks = streamIndex.c_asArray,
            segments = [],
            i = 0;


        if (chunks.length > 1) {

            // First pass on segments to update timestamp ('t') and duration ('d') fields
            chunks[0].t = chunks[0].t || 0;
            for (i = 1; i < chunks.length; i++) {
                chunks[i-1].d = chunks[i-1].d || (chunks[i].t - chunks[i-1].t);
                chunks[i].t = chunks[i].t || (chunks[i-1].t + chunks[i-1].d);
            }

            // Second pass to set SegmentTimeline template
            segments.push({
                d : chunks[0].d,
                r: 0,
                t: chunks[0].t
            });

            for (i = 1; i < chunks.length; i++) {
                if (chunks[i].d === chunks[i-1].d) {
                    // incrementation of the 'r' attributes
                    ++segments[segments.length -1].r;
                } else {
                    segments.push({
                        d : chunks[i].d,
                        r: 0,
                        t: chunks[i].t
                    });
                }
            }
        }

        segmentTimeline.S = segments;
        segmentTimeline.S_asArray = segments;

        return segmentTimeline;
    };

    var mapContentProtection = function (protectionHeader) {

        var contentProtection = {},
            pro,
            systemID = protectionHeader.SystemID;

        pro = {
            __text : protectionHeader.__text,
            __prefix : "mspr"
        };

        //remove {}
        if (systemID[0] === "{") {
            systemID = systemID.substring(1, systemID.length-1);
        }
        
        contentProtection.schemeIdUri = "urn:uuid:" + systemID;
        contentProtection.value = 2;
        contentProtection.pro = pro;
        contentProtection.pro_asArray = pro;
        
        return contentProtection;
    };

    var processManifest = function (manifest, manifestLoadedTime) {
        var mpd = {},
            period,
            adaptations,
            i;

        // Set mpd node properties
        mpd.profiles = "urn:mpeg:dash:profile:isoff-live:2011";
        mpd.type = manifest.IsLive ? "dynamic" : "static";
        mpd.timeShiftBufferDepth = parseFloat(manifest.DVRWindowLength) / TIME_SCALE_100_NANOSECOND_UNIT;
        mpd.mediaPresentationDuration =  (manifest.Duration === 0) ? Infinity : parseFloat(manifest.Duration) / TIME_SCALE_100_NANOSECOND_UNIT;
        mpd.BaseURL = manifest.BaseURL;
        mpd.minBufferTime = MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME;

        // In case of live streams, set availabilityStartTime property according to DVRWindowLength
        if (mpd.type === "dynamic") {
            mpd.availabilityStartTime = new Date(manifestLoadedTime.getTime() - (mpd.timeShiftBufferDepth * 1000));
        }

        // Map period node to manifest root node
        mpd.Period = mapPeriod(manifest);
        mpd.Period_asArray = [mpd.Period];

        // Initialize period start time
        period = mpd.Period;
        period.start = 0;

        // Map ContentProtection node to ProtectionHeader node
        if (manifest.Protection !== undefined) {
            mpd.ContentProtection = mapContentProtection(manifest.Protection.ProtectionHeader);
            mpd.ContentProtection_asArray = [mpd.ContentProtection];
        }

        adaptations = period.AdaptationSet_asArray;
        for (i = 0; i < adaptations.length; i += 1)
        {
            // In case of VOD streams, check if start time is greater than 0.
            // Therefore, set period start time to the higher adaptation start time
            if (mpd.type === "static") {
                var fistSegment = adaptations[i].SegmentTemplate.SegmentTimeline.S_asArray[0];
                var adaptationTimeOffset = parseFloat(fistSegment.t) / TIME_SCALE_100_NANOSECOND_UNIT;
                period.start = (period.start === 0)?adaptationTimeOffset:Math.max(period.start, adaptationTimeOffset);
            }

            // Propagate content protection information into each adaptation
            if (mpd.ContentProtection !== undefined) {
                adaptations[i].ContentProtection = mpd.ContentProtection;
                adaptations[i].ContentProtection_asArray = mpd.ContentProtection_asArray;
            }
        }

        // Delete Content Protection under root mpd node
        delete mpd.ContentProtection;
        delete mpd.ContentProtection_asArray;


        return mpd;
    };

    var internalParse = function(data, baseUrl) {
        this.debug.info("[MssParser]", "Doing parse.");
        
        var manifest = null,
            converter = new X2JS(matchers, '', true),
            start = new Date(),
            json = null,
            mss2dash = null;

        // Convert xml to json
        //this.debug.log("[MssParser]", "Converting from XML.");
        manifest = converter.xml_str2json(data);
        json = new Date();

        if (manifest === null) {
            this.debug.error("[MssParser]", "Failed to parse manifest!!");
            this.errHandler.manifestError("parsing the manifest failed", "parse", data);
            return Q.reject(null);
        }

        // Set the manifest base Url
        if (!manifest.hasOwnProperty("BaseURL")) {
            this.debug.log("[MssParser]", "Setting baseURL: " + baseUrl);
            manifest.BaseURL = baseUrl;
        } else {
            // Setting manifest's BaseURL to the first BaseURL
            manifest.BaseURL = manifest.BaseURL_asArray && manifest.BaseURL_asArray[0] || manifest.BaseURL;

            if (manifest.BaseURL.indexOf("http") !== 0) {
                manifest.BaseURL = baseUrl + manifest.BaseURL;
            }
        }

        // Convert MSS manifest into DASH manifest
        manifest = processManifest.call(this, manifest, start);
        mss2dash = new Date();
        //this.debug.log("mpd: " + JSON.stringify(manifest, null, '\t'));

        this.debug.info("[MssParser]", "Parsing complete (xml2json: " + (json.getTime() - start.getTime()) + "ms, mss2dash: " + (mss2dash.getTime() - json.getTime()) + "ms, total: " + ((new Date().getTime() - start.getTime()) / 1000) + "s)");
        //console.info("manifest",JSON.stringify(manifest) );
        return Q.when(manifest);
    };

    return {
        debug: undefined,
        errHandler: undefined,
                
        parse: internalParse
    };
};

Mss.dependencies.MssParser.prototype =  {
    constructor: Mss.dependencies.MssParser
};
