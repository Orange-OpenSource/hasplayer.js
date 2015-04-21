/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Akamai Technologies
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Akamai Technologies nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.utils.TTMLParser = function () {
    "use strict";

    /*
    * This TTML parser follows "TTML Simple Delivery Profile for Closed Captions (US)" spec - http://www.w3.org/TR/ttml10-sdp-us/
    *
    * ORANGE: Some strict limitations of US profile removed to allow for non-US TTML2 implmentations used in Europe:
    *         - no requirement for US profile
    *         - offset-style format allowed for <timeExpression>
    * */

    var SECONDS_IN_HOUR = 60 * 60,
        SECONDS_IN_MIN = 60,
        TTAF_URI = "http://www.w3.org/2006/10/ttaf1",
        TTAF_PARAMETER_URI = "http://www.w3.org/2006/10/ttaf1#parameter",
        TTAF_STYLE_URI = "http://www.w3.org/2006/10/ttaf1#styling",
        TTML_URI = "http://www.w3.org/ns/ttml",
        TTML_PARAMETER_URI = "http://www.w3.org/ns/ttml#parameter",
        TTML_STYLE_URI = "http://www.w3.org/ns/ttml#styling",
        globalPrefTTNameSpace,
        globalPrefStyleNameSpace,
        globalPrefParameterNameSpace,

        // R0028 - A document must not contain a <timeExpression> value that does not conform to the subset of clock-time that
        // matches either of the following patterns: hh:mm:ss.mss or hh:mm:ss:ff, where hh denotes hours (00-23),
        // mm denotes minutes (00-59), ss denotes seconds (00-59), mss denotes milliseconds (000-999), and ff denotes frames (00-frameRate - 1).
        // R0030 - For time expressions that use the hh:mm:ss.mss format, the following constraints apply:
        // - Exactly 2 digits must be used in each of the hours, minutes, and second components (include leading zeros).
        // - Exactly 3 decimal places must be used for the milliseconds component (include leading zeros).
        // R0031 -For time expressions that use the hh:mm:ss:ff format, the following constraints apply:
        // - Exactly 2 digits must be used in each of the hours, minutes, second, and frame components (include leading zeros).

        // Orange: the restrictions above are for US profile only.
        //         in general, TTML allows other syntax representations, see https://dvcs.w3.org/hg/ttml/raw-file/tip/ttml2/spec/ttml2.html#timing-value-timeExpression
        //         we have added support for offset-time, a pretty popular one.
        
        timingRegexClockTime = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])((\.[0-9][0-9][0-9])|(:[0-9][0-9]))$/,
        timingRegexOffsetTime = /^\d+(\.\d+|)(h|m|s|ms|f)$/,
        ttml,

        parseTimings = function(timingStr) {

            var timeParts,
                parsedTime,
                frameRate,
                metric;

            if (timingRegexClockTime.test(timingStr)) {

                timeParts = timingStr.split(":");

                parsedTime = (parseFloat(timeParts[0]) * SECONDS_IN_HOUR +
                    parseFloat(timeParts[1]) * SECONDS_IN_MIN +
                    parseFloat(timeParts[2]));

                // R0031 -For time expressions that use the hh:mm:ss:ff format, the following constraints apply:
                //  - A ttp:frameRate attribute must be present on the tt element.
                //  - A ttp:frameRateMultiplier attribute may be present on the tt element.

                // ORANGE: removed the restrictions above. 
                //         now if no frameRate is defined in tt, the :ff information is ignored.

                if (timeParts[3]) {
                    frameRate = ttml.tt.frameRate;

                    if (frameRate && !isNaN(frameRate)) {
                        parsedTime += parseFloat(timeParts[3]) / frameRate;
                    }
                }
                return parsedTime;
            }

            if (timingRegexOffsetTime.test(timingStr)) {
                
                if (timingStr.substr(timingStr.length-2)=='ms') {
                    parsedTime = parseFloat(timingStr.substr(0,timingStr.length-3));
                    metric = timingStr.substr(timingStr.length-2);
                } else {
                    parsedTime = parseFloat(timingStr.substr(0,timingStr.length-2));
                    metric = timingStr.substr(timingStr.length-1);
                }

                switch (metric) {
                    case 'h':
                        parsedTime = parsedTime*60*60;
                        break;
                    case 'm':
                        parsedTime = parsedTime*60;
                        break;
                    case 's':
                        break;
                    case 'ms':
                        parsedTime = parsedTime*0.01;
                        break;
                    case 'f':
                        frameRate = ttml.tt.frameRate;

                        if (frameRate && !isNaN(frameRate)) {
                            parsedTime = parsedTime / frameRate;
                        } else {
                            return NaN;
                        }
                        break;
                }

            return parsedTime;
            }

            return NaN;
        },

        passStructuralConstraints = function () {
            var passed = false,
                hasTt = ttml.hasOwnProperty("tt"),
                hasHead = hasTt ? ttml.tt.hasOwnProperty("head") : false,
                hasLayout = hasHead ? ttml.tt.head.hasOwnProperty("layout") : false,
                hasStyling = hasHead ? ttml.tt.head.hasOwnProperty("styling") : false,
                hasBody = hasTt ? ttml.tt.hasOwnProperty("body") : false;

            // R001 - A document must contain a tt element.
            // R002 - A document must contain both a head and body element.
            // R003 - A document must contain both a styling and a layout element.
            if (hasTt && hasHead && hasLayout && hasStyling && hasBody) {
                passed = true;
            }

            // R0008 - A document must contain a ttp:profile element where the use attribute of that element is specified as http://www.w3.org/ns/ttml/profile/sdp-us.
            // ORANGE: The R0008 requirement is removed in the parser implementation to make it work with non-US profiles

            return passed;
        },

        // ORANGE: now prefix is returned ending with ':' (if not empty), or empty string if not found.
        //         So it can be directly added to attribute name with no need to check if the 
        //         namespace exists or not

        getNamespacePrefix = function(json, ns) {
            var r = Object.keys(json)
                .filter(function(k){
                    return k.split(":")[0] === "xmlns" && json[k] === ns;
                }).map(function(k){
                    var splitValues = k.split(":");
                    if (splitValues.length > 1) {
                        return k.split(":")[1]+':';
                    }
                    else {
                        //if namespace has been detected, without prefix value.
                        return "";
                    }
                });
            if (r.length === 0) {
               r[0] = "";
            }

            return r;
        },

        getLocalNamespace = function(json, ns) {
            var localNs = null;

            switch(ns) {
                case "ttml" :
                    //define local namespace prefix for TTML
                    localNs = getNamespacePrefix(json, TTAF_URI);

                    if (localNs.length === 1 && localNs[0] === "") {
                        localNs = getNamespacePrefix(json, TTML_URI);
                    }
                    break;
                case "style"  :
                    //define local namespace prefix for style
                    localNs = getNamespacePrefix(json, TTAF_STYLE_URI);

                    if (localNs.length === 1 && localNs[0] === "") {
                        localNs = getNamespacePrefix(json, TTML_STYLE_URI);
                    }
                    break;
                case "parameter" :
                    localNs = getNamespacePrefix(json, TTML_PARAMETER_URI);
                
                    if (localNs.length === 1 && localNs[0] === "") {
                        localNs = getNamespacePrefix(json, TTAF_PARAMETER_URI);
                    }
                    break;
            }

            return localNs;
        },

        getDataInfo = function (jsonLayout, jsonArrayName,infoName) {
            var j = 0;
            if (jsonLayout) {
                for (j = 0; j < jsonLayout[jsonArrayName].length; j++) {
                    var tab = jsonLayout[jsonArrayName][j];
                    if (tab['xml:id'] === infoName) {
                        return tab;
                    }
                }
            }
            return null;
        },

        getParameterValue = function (json, prefix, parameter) {
            var j = 0;

            for (j = 0; j < prefix.length; j++) {
                if (json.hasOwnProperty(prefix[j] === ""?parameter:prefix[j]+parameter)) {
                    return json[prefix[j]+parameter];
                }
            }
            return null;
        },

        findParameterInRegion = function (json, leaf, prefTT, prefStyle, parameter) {
            var parameterValue = null,
                localPrefTT = prefTT,
                localPrefStyle = prefStyle,
                leafStyle;

            //find parameter in region referenced in the leaf
            var cueRegion = getDataInfo(json.head.layout, 'region_asArray', getParameterValue(leaf, localPrefTT, 'region'));
            if (cueRegion) {
               
                localPrefTT = getLocalNamespace(cueRegion,"ttml");
                localPrefStyle = getLocalNamespace(cueRegion,"style");
               
                localPrefStyle = globalPrefStyleNameSpace.concat(localPrefStyle);
                localPrefTT = globalPrefTTNameSpace.concat(localPrefTT);

                parameterValue = getParameterValue(cueRegion, localPrefStyle, parameter);

                if (!parameterValue) {
                    //find parameter in style referenced in the region referenced in the leaf
                    leafStyle = getDataInfo(json.head.styling, 'style_asArray', getParameterValue(cueRegion,localPrefTT,'style'));
                    while(!parameterValue && leafStyle){                    
                        parameterValue = getParameterValue(leafStyle,localPrefStyle,parameter);
                        if (!parameterValue) {
                            leafStyle = getDataInfo(json.head.styling, 'style_asArray', getParameterValue(leafStyle,localPrefTT,'style'));
                            //is there another style referenced in this style?
                            localPrefTT = getLocalNamespace(leafStyle,"ttml");
                            localPrefStyle = getLocalNamespace(leafStyle,"style");
               
                            localPrefStyle = globalPrefStyleNameSpace.concat(localPrefStyle);
                            localPrefTT = globalPrefTTNameSpace.concat(localPrefTT);
                        }
                    }
                }
            }

            return parameterValue;
        },

        findParameter = function (json, leaf, prefTT, prefStyle, parameter) {
            var parameterValue = null,
                localPrefTT = prefTT,
                localPrefStyle = prefStyle;

            //find parameter in the leaf
            parameterValue = getParameterValue(leaf,localPrefStyle,parameter);
            if (!parameterValue) {
                //find parameter in style referenced in the leaf
                var leafStyle = getDataInfo(json.head.styling, 'style_asArray', getParameterValue(leaf,localPrefTT,'style'));
                if (leafStyle) {
                    parameterValue = getParameterValue(leafStyle,localPrefStyle,parameter);
                    if (!parameterValue) {
                        //find parameter in region referenced in the leaf
                        parameterValue = findParameterInRegion(json, leaf, localPrefTT, localPrefStyle, parameter);
                    }
                }else{
                   parameterValue = findParameterInRegion(json, leaf, localPrefTT, localPrefStyle, parameter);
                }
            }
            return parameterValue;
        },

        internalParse = function(data) {
            var captionArray = [],
                converter = new X2JS([], "", false),
                errorMsg,
                cues,
                cue,
                startTime,
                endTime,
                cuePrefTTNameSpace,
                cuePrefStyleNameSpace,
                regionPrefTTNameSpace,
                regionPrefStyleNameSpace,
                cssStyle = {backgroundColor : null,
                            color: null,
                            fontSize: null,
                            fontFamily: null
                },
                caption,
                i;

            try {
                ttml = converter.xml_str2json(data);

                if (!passStructuralConstraints()) {
                    errorMsg = "TTML document has incorrect structure";
                    return Q.reject(errorMsg);
                }

                //define global namespace prefix for TTML
                globalPrefTTNameSpace = getLocalNamespace(ttml.tt,"ttml");
                //define global namespace prefix for parameter
                globalPrefParameterNameSpace =  getLocalNamespace(ttml.tt,"parameter");
                //define global namespace prefix for style
                globalPrefStyleNameSpace = getLocalNamespace(ttml.tt,"style");

                var frameRate = getParameterValue(ttml.tt,globalPrefParameterNameSpace,"frameRate");

                if (frameRate) {
                    ttml.tt.frameRate = parseInt(frameRate, 10);
                }

                if(!ttml.tt.body.div_asArray)
                {
                    errorMsg = "TTML document does not contain any div";
                    return Q.reject(errorMsg);
                }
                
                cues = ttml.tt.body.div_asArray[0].p_asArray;

                if (!cues || cues.length === 0) {
                    errorMsg = "TTML document does not contain any cues";
                    return Q.reject(errorMsg);
                }

                for (i = 0; i < cues.length; i += 1) {
                    caption = null;
                    cue = cues[i];
                    
                    cuePrefTTNameSpace = getLocalNamespace(cue,"ttml");
                    cuePrefStyleNameSpace = getLocalNamespace(cue,"style");

                    //concate all known prefix parameters for TTML
                    var prefTT = globalPrefTTNameSpace.concat(cuePrefTTNameSpace);
                   
                    startTime = parseTimings(getParameterValue(cue,prefTT,'begin'));
                    endTime = parseTimings(getParameterValue(cue,prefTT,'end'));

                    var prefStyle = globalPrefStyleNameSpace.concat(cuePrefStyleNameSpace);
                    
                    if (isNaN(startTime) || isNaN(endTime)) {
                        errorMsg = "TTML document has incorrect timing value";
                        return Q.reject(errorMsg);
                    }

                    /******************** Find style informations ***************************************
                    *   1- in the cue
                    *   2- in style element referenced in the cue
                    *   3- in region
                    *   4- in style referenced in the region referenced in the cue
                    **************************************************************************************/
                    cssStyle.backgroundColor = findParameter(ttml.tt, cue, prefTT, prefStyle, 'backgroundColor');
                    cssStyle.color = findParameter(ttml.tt, cue, prefTT, prefStyle, 'color');
                    cssStyle.fontSize = findParameter(ttml.tt, cue, prefTT, prefStyle, 'fontSize');
                    cssStyle.fontFamily = findParameter(ttml.tt, cue, prefTT, prefStyle, 'fontFamily');
                    var extent = findParameter(ttml.tt, cue, prefTT, prefStyle, 'extent');

                    if (cssStyle.fontSize[cssStyle.fontSize.length-1] ==='%' && extent) {
                        extent = extent.split(' ')[1];
                        extent = parseFloat(extent.substr(0, extent.length-1));
                        cssStyle.fontSize = (parseInt(cssStyle.fontSize.substr(0, cssStyle.fontSize.length-1))*extent)/100+"%";
                    }

                    //line and position element have no effect on IE
                    //For Chrome line = 80 is a percentage workaround to reorder subtitles
                    caption = {
                                start: startTime,
                                end: endTime,
                                data: cue.__text,
                                line:80,
                                style: cssStyle};

                    captionArray.push(caption);
                }

                return Q.when(captionArray);

            } catch (err) {
                errorMsg = err.message;
                return Q.reject(errorMsg);
            }
    };

    return {
        parse: internalParse

    };
};
