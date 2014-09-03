Mss.dependencies.MssParser = function () {
    "use strict";

    var TIME_SCALE_100_NANOSECOND_UNIT = 10000000.0;

    var numericRegex = /^[-+]?[0-9]+[.]?[0-9]*([eE][-+]?[0-9]+)?$/;
    var hexadecimalRegex = /^0[xX][A-Fa-f0-9]+$/;

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
            return parseInt(repA.Bitrate) - parseInt(repB.Bitrate);
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
            audioChannelConfiguration,
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
                minBufferTime : 10
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


            if (node.Type === "audio") {
                adaptTransformed.AudioChannelConfiguration = adaptTransformed;
                adaptTransformed.Channels = node.QualityLevel && node.QualityLevel.Channels; //used by AudioChannelConfiguration
            }

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
                var objectType = (parseInt(node.CodecPrivateData.toString().substr(0, 2), 16) & 0xF8) >> 3;
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
                codecPrivateData: "" + node.CodecPrivateData,
                BaseURL: node.BaseURL
            };
        };
        adaptationSet.children.push(representation);


        //AudioChannelConfiguration for audio tracks
        audioChannelConfiguration = {};
        audioChannelConfiguration.name = "AudioChannelConfiguration";
        audioChannelConfiguration.isRoot = false;
        audioChannelConfiguration.isArray = false;
        audioChannelConfiguration.parent = adaptationSet;
        audioChannelConfiguration.children = [];
        audioChannelConfiguration.properties = common;
        audioChannelConfiguration.transformFunc = function(node) {
            return {
                schemeIdUri : 'urn:mpeg:dash:23003:3:audio_channel_configuration:2011',
                value : node.Channels
            };
        };
        adaptationSet.children.push(audioChannelConfiguration);


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
            j,
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
