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
        "text"  : "text/mp4"
    };

    var getCommonValuesMap = function () {
        var adaptationSet,
            representation,
            common;

        //use by parser to copy all common attributes between adaptation and representation
        common = [
            {
                name: 'profiles',
                merge: false
            },
            {
                name: 'width',
                merge: false
            },
            {
                name: 'height',
                merge: false
            },
            {
                name: 'sar',
                merge: false
            },
            {
                name: 'frameRate',
                merge: false
            },
            {
                name: 'audioSamplingRate',
                merge: false
            },
            {
                name: 'audioChannels',
                merge: false
            },
            {
                name: 'mimeType',
                merge: false
            },
            {
                name: 'segmentProfiles',
                merge: false
            },
            {
                name: 'codecs',
                merge: false
            },
            {
                name: 'maximumSAPPeriod',
                merge: false
            },
            {
                name: 'startsWithSap',
                merge: false
            },
            {
                name: 'maxPlayoutRate',
                merge: false
            },
            {
                name: 'codingDependency',
                merge: false
            },
            {
                name: 'scanType',
                merge: false
            },
            {
                name: 'FramePacking',
                merge: true
            },
            {
                name: 'AudioChannelConfiguration',
                merge: true
            },
            {
                name: 'ContentProtection',
                merge: true
            }
        ];

        adaptationSet = {};
        adaptationSet.name = "AdaptationSet";
        adaptationSet.isRoot = false;
        adaptationSet.isArray = true;
        adaptationSet.parent = null;
        adaptationSet.children = [];
        adaptationSet.properties = common;
        

        representation = {};
        representation.name = "Representation";
        representation.isRoot = false;
        representation.isArray = true;
        representation.parent = adaptationSet;
        representation.children = [];
        representation.properties = common;
        adaptationSet.children.push(representation);
/*
        subRepresentation = {};
        subRepresentation.name = "SubRepresentation";
        subRepresentation.isRoot = false;
        subRepresentation.isArray = true;
        subRepresentation.parent = representation;
        subRepresentation.children = [];
        subRepresentation.properties = common;
        representation.children.push(subRepresentation);*/

        return adaptationSet;
    };

    var getSegmentValuesMap = function () {
        var period,
            adaptationSet,
            representation,
            common;

        common = [
            {
                name: 'SegmentBase',
                merge: true
            },
            {
                name: 'SegmentTemplate',
                merge: true
            },
            {
                name: 'SegmentList',
                merge: true
            }
        ];

        period = {};
        period.name = "Period";
        period.isRoot = false;
        period.isArray = false;
        period.parent = null;
        period.children = [];
        period.properties = common;

        adaptationSet = {};
        adaptationSet.name = "AdaptationSet";
        adaptationSet.isRoot = false;
        adaptationSet.isArray = true;
        adaptationSet.parent = period;
        adaptationSet.children = [];
        adaptationSet.properties = common;
        period.children.push(adaptationSet);

        representation = {};
        representation.name = "Representation";
        representation.isRoot = false;
        representation.isArray = true;
        representation.parent = adaptationSet;
        representation.children = [];
        representation.properties = common;
        adaptationSet.children.push(representation);

        return period;
    };



    // compare quality to order the representation by quality
    var compareQuality = function(repA,repB){
            return parseInt(repA.Bitrate, 10) - parseInt(repB.Bitrate, 10);
    };

    var getBaseUrlValuesMap = function () {

        //the first mapping get tis Map, so we can also make some transformations...
        var mpd,
            period,
            adaptationSet,
            contentProtection,
            representation,
            segmentTemplate,
            segmentTimeline,
            segment,
            common;

        common = [
            {
                name: 'BaseURL',
                merge: true,
                mergeFunction: function (parentValue, childValue) {
                    var mergedValue;

                    // child is absolute, don't merge
                    if (childValue.indexOf("http://") === 0) {
                        mergedValue = childValue;
                    } else {
                        mergedValue = parentValue + childValue;
                    }

                    return mergedValue;
                }
        }];

        mpd = {};
        mpd.name = "mpd";
        mpd.isRoot = true;
        mpd.isArray = true;
        mpd.parent = null;
        mpd.children = [];
        mpd.properties = common;
        mpd.transformFunc = function(node) {
            var duration = (node.Duration === 0)?Infinity:node.Duration;
            if(this.isTransformed) {
                return node;
            }
            //used to not transfor it an other time !
            this.isTransformed = true;
            var returnNode = {
                profiles: "urn:mpeg:dash:profile:isoff-live:2011",
                type: node.IsLive ? "dynamic" : "static",
                timeShiftBufferDepth: parseFloat(node.DVRWindowLength) / TIME_SCALE_100_NANOSECOND_UNIT,
                mediaPresentationDuration : parseFloat(duration) / TIME_SCALE_100_NANOSECOND_UNIT,
                BaseURL: node.BaseURL,
                Period: node,
                Period_asArray: [node],
                minBufferTime : MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME
            };
            if(node.Protection !== undefined){
                returnNode.ContentProtection = node.Protection.ProtectionHeader;
                returnNode.ContentProtection_asArray = node.Protection_asArray;
            }
            return returnNode;
        };
        
        mpd.isTransformed = false;

        contentProtection = {};
        contentProtection.name = "ContentProtection";
        contentProtection.parent = mpd;
        contentProtection.isRoot = false;
        contentProtection.isArray = false;
        contentProtection.children = [];
        //here node is Protection
        contentProtection.transformFunc = function(node){
            node.pro = {
                    __text : node.__text,
                    __prefix : "mspr"
                };
                
            //remove {}
            if (node.SystemID[0]=="{") {
                node.SystemID = node.SystemID.substring(1,node.SystemID.length-1);
            }
            
            return{
                schemeIdUri : "urn:uuid:"+node.SystemID,
                value : 2,
                pro : node.pro,
                pro_asArray : node.pro
            };
        };
        mpd.children.push(contentProtection);

        period = {};
        period.name = "Period";
        period.isRoot = false;
        period.isArray = false;
        period.parent = null;
        period.children = [];
        period.properties = common;
        // here node is SmoothStreamingMedia node
        period.transformFunc = function(node) {
            var duration = (node.Duration === 0)?Infinity:node.Duration;
            return {
                duration: parseFloat(duration) / TIME_SCALE_100_NANOSECOND_UNIT,
                BaseURL: node.BaseURL,
                AdaptationSet: node.StreamIndex,
                AdaptationSet_asArray: node.StreamIndex_asArray
            };
        };
        mpd.children.push(period);

        adaptationSet = {};
        adaptationSet.name = "AdaptationSet";
        adaptationSet.isRoot = false;
        adaptationSet.isArray = true;
        adaptationSet.parent = period;
        adaptationSet.children = [];
        adaptationSet.properties = common;
        //here node is StreamIndex node
        adaptationSet.transformFunc = function(node) {
            var adaptTransformed = {
                id: node.Name,
                lang: node.Language,
                contentType: node.Type,
                mimeType: mimeTypeMap[node.Type],
                maxWidth: node.MaxWidth,
                maxHeight: node.MaxHeight,
                BaseURL: node.BaseURL,
                Representation: node.QualityLevel,
                Representation_asArray: node.QualityLevel_asArray.sort(compareQuality),
                SegmentTemplate : node,
                SegmentTemplate_asArray : [node]
            };

            // Add 'Id'  field on representations
            for (var i = 0; i < adaptTransformed.Representation_asArray.length; i++) {
                var rep = adaptTransformed.Representation_asArray[i];
                rep.Id = adaptTransformed.id + "_" + rep.Index;
            }

            return adaptTransformed;
        };
        period.children.push(adaptationSet);

        representation = {};
        representation.name = "Representation";
        representation.isRoot = false;
        representation.isArray = true;
        representation.parent = adaptationSet;
        representation.children = [];
        representation.properties = common;
        //here node is QualityLevel
        representation.transformFunc = function(node) {

            var mimeType = "";
            var avcoti = "";

            if (node.FourCC === "H264" || node.FourCC === "AVC1")
            {
                mimeType = "avc1";
                // Extract from the CodecPrivateData field the hexadecimal representation of the following
                // three bytes in the sequence parameter set NAL unit.
                // => Find the SPS nal header
                var nalHeader = /00000001[0-9]7/.exec(node.CodecPrivateData);
                // => Find the 6 characters after the SPS nalHeader (if it exists)
                avcoti = nalHeader && nalHeader[0] ? (node.CodecPrivateData.substr(node.CodecPrivateData.indexOf(nalHeader[0])+10, 6)) : undefined;

            }
            else
            if (node.FourCC.indexOf("AAC") >= 0)
            {
                mimeType = "mp4a";
                avcoti = "40";
                // Extract objectType from the CodecPrivateData field
                var codecPrivateDatafield = node.CodecPrivateData.toString();
                var objectType = 0;
                var arr16;
                var codecPrivateDataHex;

                //chrome problem, in implicit AAC HE definition, so when AACH is detected in FourCC
                //set objectType to 5 => strange, it should be 2
                if (node.FourCC === "AACH") {
                    objectType = 0x05;
                }

                //if codecPrivateDatafield is empty, build it :
                if (codecPrivateDatafield === "" || codecPrivateDatafield === undefined || codecPrivateDatafield === "0x") {
                    objectType = 0x02; //AAC Main Low Complexity => object Type = 2
                    var indexFreq = samplingFrequencyIndex[node.SamplingRate];
                    if (node.FourCC === "AACH") {
                        // 4 bytes :     XXXXX         XXXX          XXXX             XXXX                  XXXXX      XXX   XXXXXXX
                        //           ' ObjectType' 'Freq Index' 'Channels value'   'Extens Sampl Freq'  'ObjectType'  'GAS' 'alignment = 0'
                        objectType = 0x05; // High Efficiency AAC Profile = object Type = 5 SBR
                        codecPrivateDatafield = new Uint8Array(4);
                        var extensionSamplingFrequencyIndex = samplingFrequencyIndex[node.SamplingRate*2];// in HE AAC Extension Sampling frequence
                        // equals to SamplingRate*2
                        //Freq Index is present for 3 bits in the first byte, last bit is in the second
                        codecPrivateDatafield[0] = (objectType << 3) | (indexFreq >> 1);
                        codecPrivateDatafield[1] = (indexFreq << 7) | (node.Channels << 3) | (extensionSamplingFrequencyIndex >> 1);
                        codecPrivateDatafield[2] = (extensionSamplingFrequencyIndex << 7) | (0x02 << 2);// origin object type equals to 2 => AAC Main Low Complexity
                        codecPrivateDatafield[3] = 0x0; //alignment bits

                        arr16 = new Uint16Array(2);
                        arr16[0] = (codecPrivateDatafield[0] << 8) + codecPrivateDatafield[1];
                        arr16[1] = (codecPrivateDatafield[2] << 8) + codecPrivateDatafield[3];
                        //convert decimal to hex value
                        codecPrivateDataHex = arr16[0].toString(16);
                        codecPrivateDataHex = arr16[0].toString(16)+arr16[1].toString(16);

                    }else{
                        // 2 bytes :     XXXXX         XXXX          XXXX              XXX
                        //           ' ObjectType' 'Freq Index' 'Channels value'   'GAS = 000'
                        codecPrivateDatafield = new Uint8Array(2);
                        //Freq Index is present for 3 bits in the first byte, last bit is in the second
                        codecPrivateDatafield[0] = (objectType << 3) | (indexFreq >> 1);
                        codecPrivateDatafield[1] = (indexFreq << 7) | (node.Channels << 3);
                        // put the 2 bytes in an 16 bits array
                        arr16 = new Uint16Array(1);
                        arr16[0] = (codecPrivateDatafield[0] << 8) + codecPrivateDatafield[1];
                        //convert decimal to hex value
                        codecPrivateDataHex = arr16[0].toString(16);
                    }

                    codecPrivateDatafield = ""+codecPrivateDataHex;
                    node.CodecPrivateData = codecPrivateDatafield.toUpperCase();
                }
                else if (objectType === 0)
                    objectType = (parseInt(codecPrivateDatafield.substr(0, 2), 16) & 0xF8) >> 3;
                
                avcoti += "." + objectType;
            }

            var codecs = mimeType + "." + avcoti;
            
            return {
                id: node.Id,
                bandwidth: node.Bitrate,
                width: node.MaxWidth,
                height: node.MaxHeight,
                codecs: codecs,
                audioSamplingRate: node.SamplingRate,
                audioChannels:node.Channels,
                codecPrivateData: "" + node.CodecPrivateData,
                BaseURL: node.BaseURL
            };
        };
        adaptationSet.children.push(representation);

        segmentTemplate = {};
        segmentTemplate.name = "SegmentTemplate";
        segmentTemplate.isRoot = false;
        segmentTemplate.isArray = false;
        segmentTemplate.parent = adaptationSet;
        segmentTemplate.children = [];
        segmentTemplate.properties = common;
        //here node is StreamIndex
        segmentTemplate.transformFunc = function(node) {

            var mediaUrl = node.Url.replace('{bitrate}','$Bandwidth$');
            mediaUrl = mediaUrl.replace('{start time}','$Time$');
            return {
                media: mediaUrl,
                //duration: node.Duration,
                timescale: TIME_SCALE_100_NANOSECOND_UNIT,
                SegmentTimeline: node
            };
        };
        adaptationSet.children.push(segmentTemplate);

        segmentTimeline = {};
        segmentTimeline.name = "SegmentTimeline";
        segmentTimeline.isRoot = false;
        segmentTimeline.isArray = false;
        segmentTimeline.parent = segmentTemplate;
        segmentTimeline.children = [];
        segmentTimeline.properties = common;
        //here node is StreamIndex
        segmentTimeline.transformFunc = function(node) {

            if (node.c_asArray.length>1) {
                var groupedSegments = [];
                var segments = node.c_asArray;

                segments[0].t = segments[0].t || 0;

                groupedSegments.push({
                    d : segments[0].d,
                    r: 0,
                    t: segments[0].t
                });

                for (var i=1; i<segments.length; i++) {
                    segments[i].t = segments[i].t || (segments[i-1].t + segments[i-1].d);
                    if (segments[i].d === segments[i-1].d) {
                        // incrementation of the 'r' attributes
                        ++groupedSegments[groupedSegments.length -1].r;
                    } else {
                        groupedSegments.push({
                            d : segments[i].d,
                            r: 0,
                            t: segments[i].t
                        });
                    }
                }

                node.c_asArray = groupedSegments;
                node.c = groupedSegments;
            }

            return {
                S: node.c,
                S_asArray: node.c_asArray
            };
        };
        segmentTemplate.children.push(segmentTimeline);

        segment = {};
        segment.name = "S";
        segment.isRoot = false;
        segment.isArray = true;
        segment.parent = segmentTimeline;
        segment.children = [];
        segment.properties = common;
        //here node is c (chunk)
        segment.transformFunc = function(node) {
            return {
                d: node.d,
                r: node.r ? node.r : 0,
                t: node.t ? node.t : 0
            };
        };
        segmentTimeline.children.push(segment);
        
        return mpd;
    };

    var getDashMap = function () {
        var result = [];

        result.push(getCommonValuesMap());
        result.push(getSegmentValuesMap());
        result.push(getBaseUrlValuesMap());

        return result;
    };

    var processManifest = function (manifest) {

        var period = manifest.Period_asArray[0],
            adaptations = period.AdaptationSet_asArray,
            i,
            len;

        // In case of live streams, set availabilityStartTime property according to DVRWindowLength
        if (manifest.type === "dynamic")
        {
            var mpdLoadedTime = new Date();
            manifest.availabilityStartTime = new Date(mpdLoadedTime.getTime() - (manifest.timeShiftBufferDepth * 1000));
        }

        period.start = 0;

        // Propagate content protection information into each adaptation 
        for (i = 0, len = adaptations.length; i < len; i += 1)
        {
            // In case of VOD streams, check if start time is greater than 0.
            // Therefore, set period start time to the higher adaptation start time
            if (manifest.type === "static")
            {
                var fistSegment = adaptations[i].Representation_asArray[0].SegmentTemplate.SegmentTimeline.S_asArray[0];
                var adaptationTimeOffset = parseFloat(fistSegment.t) / TIME_SCALE_100_NANOSECOND_UNIT;
                period.start = (period.start === 0)?adaptationTimeOffset:Math.max(period.start, adaptationTimeOffset);
            }

            if (manifest.ContentProtection !== undefined)
            {
                manifest.Period.AdaptationSet[i].ContentProtection = manifest.ContentProtection;
                manifest.Period.AdaptationSet[i].ContentProtection_asArray = manifest.ContentProtection_asArray;
            }
        }

        //Content Protection under manifest object must be deleted
        delete manifest.ContentProtection;
        delete manifest.ContentProtection_asArray;
    };


    var internalParse = function(data, baseUrl) {
        this.debug.log("[MssParser]", "Doing parse.");
        
        var manifest = null;
        var converter = new X2JS(matchers, '', true);
        var iron = new Custom.utils.ObjectIron(getDashMap());

        // Process 'CodecPrivateData' attributes values so that they can be identified/processed as hexadecimal strings
        data = data.replace(/CodecPrivateData="/g, "CodecPrivateData=\"0x");
        data = data.replace(/CodecPrivateData='/g, "CodecPrivateData=\'0x");

        this.debug.log("[MssParser]", "Converting from XML.");
        manifest = converter.xml_str2json(data);

        if (manifest === null) {
            this.debug.error("[MssParser]", "Failed to parse manifest!!");
            return Q.when(null);
        }

        // set the baseUrl
        if (!manifest.hasOwnProperty("BaseURL")) {
            this.debug.log("[DashParser]", "Setting baseURL: " + baseUrl);
            manifest.BaseURL = baseUrl;
        } else {
            // Setting manifest's BaseURL to the first BaseURL
            manifest.BaseURL = manifest.BaseURL_asArray && manifest.BaseURL_asArray[0] || manifest.BaseURL;

            if (manifest.BaseURL.indexOf("http") !== 0) {
                manifest.BaseURL = baseUrl + manifest.BaseURL;
            }
        }

        this.debug.log("[MssParser]", "Flatten manifest properties.");
        manifest = iron.run(manifest);

        // Post process manifest
        processManifest.call(this, manifest);

        this.debug.log("[MssParser]", "Parsing complete.");
        //console.info("manifest",JSON.stringify(manifest) );
        return Q.when(manifest);
    };

    return {
        debug: undefined,
                
        parse: internalParse
    };
};

Mss.dependencies.MssParser.prototype =  {
    constructor: Mss.dependencies.MssParser
};
