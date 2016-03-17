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
MediaPlayer.utils.TTMLParser = function() {
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
        globalPrefTTNameSpace = "",
        globalPrefStyleNameSpace = "",
        globalPrefParameterNameSpace = "",
        //regionPrefTTNameSpace = "",
        //regionPrefStyleNameSpace = "",
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
        xmlDoc = null,
        nodeTt = null,
        nodeHead = null,
        nodeLayout = null,
        nodeStyling = null,
        nodeBody = null,
        frameRate = null,
        tabStyles = [],
        tabRegions = [],

        parseTimings = function(timingStr) {

            var timeParts,
                parsedTime,
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
                    if (frameRate && !isNaN(frameRate)) {
                        parsedTime += parseFloat(timeParts[3]) / frameRate;
                    }
                }
                return parsedTime;
            }

            if (timingRegexOffsetTime.test(timingStr)) {

                if (timingStr.substr(timingStr.length - 2) == 'ms') {
                    parsedTime = parseFloat(timingStr.substr(0, timingStr.length - 3));
                    metric = timingStr.substr(timingStr.length - 2);
                } else {
                    parsedTime = parseFloat(timingStr.substr(0, timingStr.length - 2));
                    metric = timingStr.substr(timingStr.length - 1);
                }

                switch (metric) {
                    case 'h':
                        parsedTime = parsedTime * 60 * 60;
                        break;
                    case 'm':
                        parsedTime = parsedTime * 60;
                        break;
                    case 's':
                        break;
                    case 'ms':
                        parsedTime = parsedTime * 0.01;
                        break;
                    case 'f':
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

        passStructuralConstraints = function() {
            var passed = false;

            nodeTt = xmlDoc ? this.domParser.getChildNode(xmlDoc, "tt") : null;
            nodeHead = nodeTt ? this.domParser.getChildNode(nodeTt, "head") : null;
            nodeLayout = nodeHead ? this.domParser.getChildNode(nodeHead, "layout") : null;
            nodeStyling = nodeHead ? this.domParser.getChildNode(nodeHead, "styling") : null;
            nodeBody = nodeTt ? this.domParser.getChildNode(nodeTt, "body") : null;

            // R001 - A document must contain a tt element.
            // R002 - A document must contain both a head and body element.
            // R003 - A document must contain both a styling and a layout element.
            if (nodeTt && nodeHead && nodeLayout && nodeStyling && nodeBody) {
                passed = true;
            }

            // R0008 - A document must contain a ttp:profile element where the use attribute of that element is specified as http://www.w3.org/ns/ttml/profile/sdp-us.
            // ORANGE: The R0008 requirement is removed in the parser implementation to make it work with non-US profiles
            return passed;
        },

        findStyleElement = function(nodeTab, styleElementName) {
            var styleName,
                regionName,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0;

            for (j = 0; j < nodeTab.length; j += 1) {
                //search styleElementName in node Element
                for (k = 0; k < globalPrefStyleNameSpace.length; k += 1) {
                    styleName = this.domParser.getAttributeValue(nodeTab[j], globalPrefStyleNameSpace[k] + styleElementName);
                    if (styleName) {
                        return styleName;
                    }
                }

                //search style in node Element
                for (k = 0; k < globalPrefTTNameSpace.length; k += 1) {
                    styleName = this.domParser.getAttributeValue(nodeTab[j], globalPrefTTNameSpace[k] + 'style');
                    if (styleName) {
                        for (i = 0; i < tabStyles[styleName].length; i += 1) {
                            for (l = 0; l < globalPrefStyleNameSpace.length; l += 1) {
                                if (tabStyles[styleName][i].name === globalPrefStyleNameSpace[l] + styleElementName) {
                                    return tabStyles[styleName][i].nodeValue;
                                }
                            }
                        }
                    }
                }

                for (k = 0; k < globalPrefTTNameSpace.length; k += 1) {
                    //search region in node Element
                    regionName = this.domParser.getAttributeValue(nodeTab[j], globalPrefTTNameSpace[k] + 'region');
                    if (regionName) {
                        for (i = 0; i < tabRegions[regionName].length; i += 1) {
                            for (l = 0; l < globalPrefStyleNameSpace.length; l += 1) {
                                if (tabRegions[regionName][i].name === globalPrefStyleNameSpace[l] + styleElementName) {
                                    return tabRegions[regionName][i].nodeValue;
                                }
                            }

                            //search style in region Element
                            for (m = 0; m < globalPrefTTNameSpace.length; m += 1) {
                                styleName = tabRegions[regionName][i].nodeName === globalPrefTTNameSpace[m] + 'style' ? tabRegions[regionName][i].nodeValue : null;
                                if (styleName) {
                                    for (n = 0; n < tabStyles[styleName].length; n += 1) {
                                        for (o = 0; o < globalPrefStyleNameSpace.length; o += 1) {
                                            if (tabStyles[styleName][n].name === globalPrefStyleNameSpace[o] + styleElementName) {
                                                return tabStyles[styleName][n].nodeValue;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return null;
        },

        findParameterElement = function(nodeTab, parameterElementName) {
            var parameterValue = null,
                i = 0,
                k = 0;

            for (i = 0; i < nodeTab.length; i++) {
                for (k = 0; k < globalPrefParameterNameSpace.length; k += 1) {
                    parameterValue = this.domParser.getAttributeValue(nodeTab[i], globalPrefParameterNameSpace[k] + parameterElementName);
                    if (parameterValue) {
                        return parameterValue;
                    }
                }
            }

            return parameterValue;
        },

        getNameSpace = function(node, type) {
            var nameSpace = null,
                TTAFUrl = null,
                TTMLUrl = null,
                i = 0;

            switch (type) {
                case "style":
                    TTAFUrl = TTAF_STYLE_URI;
                    TTMLUrl = TTML_STYLE_URI;
                    break;
                case "parameter":
                    TTAFUrl = TTAF_PARAMETER_URI;
                    TTMLUrl = TTML_PARAMETER_URI;
                    break;
                case "main":
                    TTAFUrl = TTAF_URI;
                    TTMLUrl = TTML_URI;
                    break;
            }

            if (TTAFUrl && TTMLUrl) {
                nameSpace = this.domParser.getAttributeName(node, TTAFUrl);

                if (nameSpace.length === 0) {
                    nameSpace = this.domParser.getAttributeName(node, TTMLUrl);
                }

                if (nameSpace.length > 0) {
                    for (i = 0; i < nameSpace.length; i += 1) {
                        nameSpace[i] = nameSpace[i].split(':').length > 1 ? nameSpace[i].split(':')[1] + ':' : "";
                    }
                }
            }

            return nameSpace;
        },

        getTimeValue = function(node, parameter) {
            var returnTime = NaN,
                i = 0;

            for (i = 0; i < globalPrefTTNameSpace.length && isNaN(returnTime); i += 1) {
                returnTime = parseTimings(this.domParser.getAttributeValue(node, globalPrefTTNameSpace[i] + parameter));
            }

            return returnTime;
        },

        internalParse = function(data) {
            var captionArray = [],
                errorMsg,
                regions,
                region,
                previousStartTime = null,
                previousEndTime = null,
                startTime,
                endTime,
                cssStyle = {
                    backgroundColor: null,
                    color: null,
                    fontSize: null,
                    fontFamily: null
                },
                caption,
                divBody,
                i,
                textDatas,
                j,
                k,
                cellsSize,
                cellResolution,
                extent;

            try {

                xmlDoc = this.domParser.createXmlTree(data);

                if (!passStructuralConstraints.call(this)) {
                    errorMsg = "TTML document has incorrect structure";
                    return Q.reject(errorMsg);
                }

                //define global namespace prefix for TTML
                globalPrefTTNameSpace = getNameSpace.call(this, nodeTt, 'main');
                //define global namespace prefix for parameter
                globalPrefParameterNameSpace = getNameSpace.call(this, nodeTt, 'parameter');
                //define global namespace prefix for style
                globalPrefStyleNameSpace = getNameSpace.call(this, nodeTt, 'style');
                for (i = 0; i < globalPrefParameterNameSpace.length; i += 1) {
                    frameRate = this.domParser.getAttributeValue(nodeTt, globalPrefParameterNameSpace[i] + "frameRate") ? parseInt(frameRate, 10) : null;
                }

                divBody = this.domParser.getChildNodes(nodeBody, 'div');

                if (!divBody || divBody.length === 0) {
                    errorMsg = "TTML body document does not contain any div";
                    return Q.reject(errorMsg);
                }

                for (k = 0; k < divBody.length; k += 1) {
                    regions = this.domParser.getChildNodes(divBody[k], 'p');

                    if (!regions || regions.length === 0) {
                        errorMsg = "TTML document does not contain any cues";
                    } else {
                        //get all styles informations
                        tabStyles = this.domParser.getAllSpecificNodes(nodeTt, 'style');

                        //get all regions informations
                        tabRegions = this.domParser.getAllSpecificNodes(nodeTt, 'region');

                        for (i = 0; i < regions.length; i += 1) {
                            caption = null;
                            region = regions[i];

                            globalPrefTTNameSpace = globalPrefTTNameSpace.concat(getNameSpace.call(this, region, 'main'));

                            globalPrefStyleNameSpace = globalPrefStyleNameSpace.concat(getNameSpace.call(this, region, 'style'));

                            startTime = getTimeValue.call(this, region, 'begin');

                            endTime = getTimeValue.call(this, region, 'end');

                            if (isNaN(startTime) || isNaN(endTime)) {
                                errorMsg = "TTML document has incorrect timing value";
                            } else {
                                textDatas = this.domParser.getChildNodes(region, 'span');
                                //subtitles are set in span 
                                if (textDatas.length > 0) {
                                    for (j = 0; j < textDatas.length; j++) {
                                        /******************** Find style informations ***************************************
                                         *   1- in subtitle paragraph ToDo
                                         *   2- in style element referenced in the subtitle paragraph
                                         *   3- in region ToDo
                                         *   4- in style referenced in the region referenced in the subtitle paragraph
                                         *   5- in the main div ToDo
                                         *   6- in the style of the main div
                                         **************************************************************************************/

                                        cssStyle.backgroundColor = findStyleElement.call(this, [textDatas[j], region, divBody], 'backgroundColor');
                                        cssStyle.color = findStyleElement.call(this, [textDatas[j], region, divBody], 'color');
                                        cssStyle.fontSize = findStyleElement.call(this, [textDatas[j], region, divBody], 'fontSize');
                                        cssStyle.fontFamily = findStyleElement.call(this, [textDatas[j], region, divBody], 'fontFamily');

                                        extent = findStyleElement.call(this, [textDatas[j], region, divBody], 'extent');

                                        if (cssStyle.fontSize && cssStyle.fontSize[cssStyle.fontSize.length - 1] === '%' && extent) {
                                            extent = extent.split(' ')[1];
                                            extent = parseFloat(extent.substr(0, extent.length - 1));
                                            cssStyle.fontSize = (parseInt(cssStyle.fontSize.substr(0, cssStyle.fontSize.length - 1), 10) * extent) / 100 + "%";
                                        } else if (cssStyle.fontSize && cssStyle.fontSize[cssStyle.fontSize.length - 1] === 'c' && extent) {
                                            cellsSize = cssStyle.fontSize.replace(/\s/g, '').split('c');
                                            cellResolution = findParameterElement.call(this, [textDatas[j], region, divBody, nodeTt], 'cellResolution').split(' ');
                                            if (cellsSize.length > 1) {
                                                cssStyle.fontSize = cellResolution[1] / cellsSize[1] + 'px';
                                            } else {
                                                cssStyle.fontSize = cellResolution[1] / cellsSize[0] + 'px';
                                            }
                                        }

                                        //line and position element have no effect on IE
                                        //For Chrome line = 80 is a percentage workaround to reorder subtitles
                                        if (j === 0) {
                                            caption = {
                                                start: startTime,
                                                end: endTime,
                                                data: textDatas[j].textContent,
                                                line: 80,
                                                style: cssStyle
                                            };
                                        } else {
                                            //try to detect multi lines subtitle
                                            caption = {
                                                start: startTime,
                                                end: endTime,
                                                data: textDatas[j - 1].textContent + '\n' + textDatas[j].textContent,
                                                line: 80,
                                                style: cssStyle
                                            };
                                        }
                                    }
                                    captionArray.push(caption);
                                } else {
                                    cssStyle.backgroundColor = findStyleElement.call(this, [region, divBody], 'backgroundColor');
                                    cssStyle.color = findStyleElement.call(this, [region, divBody], 'color');
                                    cssStyle.fontSize = findStyleElement.call(this, [region, divBody], 'fontSize');
                                    cssStyle.fontFamily = findStyleElement.call(this, [region, divBody], 'fontFamily');

                                    extent = findStyleElement.call(this, [region, divBody], 'extent');

                                    if (cssStyle.fontSize && cssStyle.fontSize[cssStyle.fontSize.length - 1] === '%' && extent) {
                                        extent = extent.split(' ')[1];
                                        extent = parseFloat(extent.substr(0, extent.length - 1));
                                        cssStyle.fontSize = (parseInt(cssStyle.fontSize.substr(0, cssStyle.fontSize.length - 1), 10) * extent) / 100 + "%";
                                    }
                                    //line and position element have no effect on IE
                                    //For Chrome line = 80 is a percentage workaround to reorder subtitles
                                    //try to detect multi lines subtitle
                                    if (i > 0) {
                                        previousStartTime = getTimeValue.call(this, regions[i - 1], 'begin');
                                        previousEndTime = getTimeValue.call(this, regions[i - 1], 'end');
                                    }

                                    if (startTime === previousStartTime && endTime === previousEndTime) {
                                        captionArray.pop();
                                        caption = {
                                            start: startTime,
                                            end: endTime,
                                            data: regions[i - 1].textContent + '\n' + region.textContent,
                                            line: 80,
                                            style: cssStyle
                                        };
                                    } else {
                                        caption = {
                                            start: startTime,
                                            end: endTime,
                                            data: region.textContent,
                                            line: 80,
                                            style: cssStyle
                                        };
                                    }
                                    captionArray.push(caption);
                                }
                            }
                        }
                    }
                }
                if (captionArray.length > 0) {
                    return Q.when(captionArray);
                } else {
                    return Q.reject(errorMsg);
                }

            } catch (err) {
                errorMsg = err.message;
                return Q.reject(errorMsg);
            }
        };

    return {
        domParser: undefined,
        parse: internalParse

    };
};