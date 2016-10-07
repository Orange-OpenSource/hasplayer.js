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
        SMPTE_TT_URI = "http://www.smpte-ra.org/schemas/2052-1/2010/smpte-tt",
        globalPrefTTNameSpace = [TTML_URI, TTAF_URI],
        globalPrefStyleNameSpace =  [TTML_STYLE_URI, TTAF_STYLE_URI],
        globalPrefParameterNameSpace = [TTML_PARAMETER_URI, TTAF_PARAMETER_URI],
        globalPrefSMPTENameSpace = [SMPTE_TT_URI],

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
        tabImages = [],

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
            if (nodeTt && nodeHead && /*nodeLayout && nodeStyling &&*/ nodeBody) {
                passed = true;
            }

            // R0008 - A document must contain a ttp:profile element where the use attribute of that element is specified as http://www.w3.org/ns/ttml/profile/sdp-us.
            // ORANGE: The R0008 requirement is removed in the parser implementation to make it work with non-US profiles
            return passed;
        },

        findStyleElement = function(nodeTab, styleElementName, defaultTTMLValue) {
            var styleName,
                regionName,
                resu = null,
                i = 0;

            for (i = 0; i < nodeTab.length; i += 1) {
                //search styleElementName in node Element
                resu = findParameterElement.call(this, [nodeTab[i]], globalPrefStyleNameSpace, styleElementName);

                if (resu) {
                    return resu;
                }

                //search style reference in node Element
                styleName = findParameterElement.call(this, [nodeTab[i]], globalPrefTTNameSpace, 'style');
                if (styleName) {
                    //search if styleElementName is defined in the specific style reference
                    resu = searchInTab.call(this, tabStyles, styleName, styleElementName);
                    if (resu) {
                        return resu;
                    }

                    //search if others styles are referenced in the selected one
                    styleName = searchInTab.call(this, tabStyles, styleName, 'style');

                    while (styleName) {
                        //search in this other style
                        resu = searchInTab.call(this, tabStyles, styleName, styleElementName);
                        if (resu) {
                            return resu;
                        }
                        styleName = searchInTab.call(this, tabStyles, styleName, 'style');
                    }
                }

                //search region reference in node Element
                regionName = findParameterElement.call(this, [nodeTab[i]], globalPrefTTNameSpace, 'region');
                if (regionName) {
                    //region reference has been found in the node element, search styleElementName definition in this specified region
                    resu = searchInTab.call(this, tabRegions, regionName, styleElementName);

                    if (resu) {
                        return resu;
                    }

                    styleName = searchInTab.call(this, tabRegions, regionName, 'style');
                    //search style reference in this specified region Element

                    if (styleName) {
                        //specified style has been detected
                        //browse attributes of this style to detect styleElementName attribute
                        resu = searchInTab.call(this, tabStyles, styleName, styleElementName);
                        if (resu) {
                            return resu;
                        }

                        //search if others styles are referenced in the selected one
                        styleName = searchInTab.call(this, tabStyles, styleName, 'style');

                        while (styleName) {
                            //search in this other style
                            resu = searchInTab.call(this, tabStyles, styleName, styleElementName);
                            if (resu) {
                                return resu;
                            }
                            styleName = searchInTab.call(this, tabStyles, styleName, 'style');
                        }
                    }
                }
            }

            return defaultTTMLValue !== undefined ? defaultTTMLValue : null;
        },

        searchInTab = function(tab, elementNameReference, styleElementName) {
            var i = 0,
                returnValue = null,
                j = 0;

            for (i = 0; i < tab[elementNameReference].length; i += 1) {
                //search with style nameSpaces
                for (j = 0; j < globalPrefStyleNameSpace.length; j += 1) {
                    returnValue = tab[elementNameReference].getNamedItem(styleElementName);
                    if (!returnValue) {
                        returnValue = tab[elementNameReference].getNamedItemNS(globalPrefStyleNameSpace[j], styleElementName);
                    }
                    if (returnValue) {
                        return returnValue.nodeValue;
                    }
                }
                //search with main nameSpaces
                for (j = 0; j < globalPrefTTNameSpace.length; j += 1) {
                    returnValue = tab[elementNameReference].getNamedItem(styleElementName);
                    if (!returnValue) {
                        returnValue = tab[elementNameReference].getNamedItemNS(globalPrefTTNameSpace[j], styleElementName);
                    }
                    if (returnValue) {
                        return returnValue.nodeValue;
                    }
                }
            }

            return null;
        },

        findParameterElement = function(nodeTab, nameSpaceTab, parameterElementName) {
            var parameterValue = null,
                i = 0,
                k = 0;
            //search for each node in the noteTab, if the parameterElementName is defined
            for (i = 0; i < nodeTab.length; i += 1) {
                for (k = 0; k < nameSpaceTab.length; k += 1) {
                    parameterValue = this.domParser.getAttributeValue(nodeTab[i], parameterElementName, nameSpaceTab[k]);
                    if (parameterValue) {
                        return parameterValue;
                    }
                }
            }

            return parameterValue;
        },

        computeCellResolution = function(cellResolution) {
            if (!cellResolution) {
                //default cell resolution defined in TTML documentation
                cellResolution = '32 15';
            }

            var computedCellResolution = cellResolution,
                i = 0;

            computedCellResolution = computedCellResolution.split(' ');

            for (i = 0; i < computedCellResolution.length; i += 1) {
                computedCellResolution[i] = parseFloat(computedCellResolution[i]);
            }

            return computedCellResolution;
        },

        getStyle = function(nodeElementsTab, rootExtent){
            var cssStyle = {
                    backgroundColor: null,
                    color: null,
                    fontSize: null,
                    fontFamily: null,
                    fontStyle: null,
                    textOutline: {
                        color: null,
                        with: null
                    },
                    textAlign: null,
                    displayAlign: null,
                    origin: null,
                    extent: null,
                    cellResolution: null,
                    rootExtent: rootExtent,
                    showBackground: null
                };

            cssStyle.backgroundColor = findStyleElement.call(this, nodeElementsTab, 'backgroundColor', 'transparent');
            cssStyle.color = findStyleElement.call(this, nodeElementsTab, 'color');
            cssStyle.fontSize = findStyleElement.call(this, nodeElementsTab, 'fontSize');
            cssStyle.fontFamily = findStyleElement.call(this, nodeElementsTab, 'fontFamily');
            cssStyle.fontStyle = findStyleElement.call(this, nodeElementsTab, 'fontStyle', 'normal');
            cssStyle.textOutline = findStyleElement.call(this, nodeElementsTab, 'textOutline');
            cssStyle.extent = findStyleElement.call(this, nodeElementsTab, 'extent');
            cssStyle.origin = findStyleElement.call(this, nodeElementsTab, 'origin');
            cssStyle.textAlign = findStyleElement.call(this, nodeElementsTab, 'textAlign', 'start');
            cssStyle.displayAlign = findStyleElement.call(this, nodeElementsTab, 'displayAlign', 'before');
            cssStyle.showBackground = findStyleElement.call(this, nodeElementsTab, 'showBackground');
            cssStyle.cellResolution = findParameterElement.call(this, nodeElementsTab, globalPrefParameterNameSpace, 'cellResolution');
            cssStyle.cellResolution = computeCellResolution(cssStyle.cellResolution);

            return cssStyle;
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
                cssStyle = null,
                caption,
                divBody,
                i,
                textDatas,
                j,
                k,
                rootExtent,
                textNodes,
                textValue = "",
                imageRef,
                ttmlRenderingType = "",
                lastCaption;

            try {

                if (this.videoModel.getTTMLRenderingDiv() !== null) {
                    ttmlRenderingType = 'html';
                }

                xmlDoc = this.domParser.createXmlTree(data);

                if (!passStructuralConstraints.call(this)) {
                    errorMsg = "TTML document has incorrect structure";
                    return Q.reject(errorMsg);
                }

                for (i = 0; i < globalPrefParameterNameSpace.length; i += 1) {
                    frameRate = this.domParser.getAttributeValue(nodeTt, 'frameRate', globalPrefParameterNameSpace[i]) ? parseInt(frameRate, 10) : null;
                }

                divBody = this.domParser.getChildNodes(nodeBody, 'div');

                if (!divBody || divBody.length === 0) {
                    errorMsg = "TTML body document does not contain any div";
                    return Q.reject(errorMsg);
                }

                //get all styles informations
                tabStyles = this.domParser.getAllSpecificNodes(nodeTt, 'style');
                //get all regions informations
                tabRegions = this.domParser.getAllSpecificNodes(nodeTt, 'region');
                //get all images url
                tabImages = this.domParser.getAllSpecificNodes(nodeTt, 'image');
                //search if there is a root container size
                rootExtent = findStyleElement.call(this, [nodeTt], 'extent');

                //browse all the different div elements
                for (k = 0; k < divBody.length; k += 1) {
                    //is it images subtitles?
                    imageRef = findParameterElement.call(this, [divBody[k]], globalPrefSMPTENameSpace, 'backgroundImage');
                    if (imageRef && tabImages[imageRef.substring(1)] !== undefined) {

                        startTime = parseTimings(findParameterElement.call(this, [divBody[k]], globalPrefTTNameSpace, 'begin'));
                        endTime = parseTimings(findParameterElement.call(this, [divBody[k]], globalPrefTTNameSpace, 'end'));
                        
                        cssStyle = getStyle.call(this, [divBody[k], nodeTt], rootExtent);
                       
                        caption = {
                            start: startTime,
                            end: endTime,
                            data: 'data:image/' + tabImages[imageRef.substring(1)].imagetype.nodeValue + ';base64, ' + this.domParser.getChildNode(tabImages[imageRef.substring(1)], '#text').nodeValue,
                            type: 'image',
                            line: 80,
                            style: cssStyle
                        };
                        captionArray.push(caption);
                    }
                    regions = this.domParser.getChildNodes(divBody[k], 'p');

                    if (!regions || regions.length === 0) {
                        errorMsg = "TTML document does not contain any cues";
                    } else {
                        for (i = 0; i < regions.length; i += 1) {
                            caption = null;
                            cssStyle = null;
                            region = regions[i];

                            startTime = parseTimings(findParameterElement.call(this, [region], globalPrefTTNameSpace, 'begin'));
                            endTime = parseTimings(findParameterElement.call(this, [region], globalPrefTTNameSpace, 'end'));

                            if (isNaN(startTime) || isNaN(endTime) || (endTime < startTime)) {
                                errorMsg = "TTML document has incorrect timing value";
                            } else {
                                 //is it images subtitles?
                                imageRef = findParameterElement.call(this, [region], globalPrefSMPTENameSpace, 'backgroundImage');
                                if (imageRef && tabImages[imageRef.substring(1)] !== undefined) {
                                    cssStyle = getStyle.call(this, [region, divBody], rootExtent);
                                    caption = {
                                        start: startTime,
                                        end: endTime,
                                        data: 'data:image/' + tabImages[imageRef.substring(1)].imagetype.nodeValue + ';base64, ' + this.domParser.getChildNode(tabImages[imageRef.substring(1)], '#text').nodeValue,
                                        type: 'image',
                                        line: 80,
                                        style: cssStyle
                                    };
                                }

                                textDatas = this.domParser.getChildNodes(region, 'span');
                                //subtitles are set in span
                                if (textDatas.length > 0) {
                                    for (j = 0; j < textDatas.length; j++) {
                                        if (j > 0) {
                                            textValue += '\n';
                                        }
                                        /******************** Find style informations ***************************************
                                         *   1- in subtitle paragraph ToDo
                                         *   2- in style element referenced in the subtitle paragraph
                                         *   3- in region ToDo
                                         *   4- in style referenced in the region referenced in the subtitle paragraph
                                         *   5- in the main div ToDo
                                         *   6- in the style of the main div
                                         **************************************************************************************/
                                        //search style informations once. 
                                        if (j === 0) {
                                            cssStyle = getStyle.call(this, [textDatas[j], region, nodeBody], rootExtent);
                                        }
                                        //try to detect multi lines subtitle
                                        textValue += textDatas[j].textContent;
                                    }
                                    //line and position element have no effect on IE
                                    //For Chrome line = 80 is a percentage workaround to reorder subtitles
                                    caption = {
                                        start: startTime,
                                        end: endTime,
                                        data: textValue,
                                        type: 'text',
                                        line: 80,
                                        style: cssStyle
                                    };
                                    textValue = "";
                                    captionArray.push(caption);
                                } else {
                                    cssStyle = getStyle.call(this, [region, nodeBody], rootExtent);

                                    //line and position element have no effect on IE
                                    //For Chrome line = 80 is a percentage workaround to reorder subtitles
                                    //try to detect multi lines subtitle
                                    if (i > 0) {
                                        previousStartTime = parseTimings(findParameterElement.call(this, [regions[i - 1]], globalPrefTTNameSpace, 'begin'));
                                        previousEndTime = parseTimings(findParameterElement.call(this, [regions[i - 1]], globalPrefTTNameSpace, 'end'));
                                    }
                                    //workaround to be able to show subtitles on two lines even if startTime and endTime are not equals to the previous values.
                                    if ((startTime === previousStartTime && endTime === previousEndTime) || (startTime >= previousStartTime && endTime <= previousEndTime)) {
                                        if (region.textContent !== "") {
                                            //if rendering is done in an internal div, do not add subtitle text with the same time.
                                            if (ttmlRenderingType === 'html') {
                                                caption = {
                                                    start: startTime,
                                                    end: endTime,
                                                    data: region.textContent,
                                                    type: 'text',
                                                    line: 80,
                                                    style: cssStyle
                                                };
                                            } else {
                                                if (startTime >= previousStartTime && endTime <= previousEndTime) {
                                                    lastCaption = captionArray[captionArray.length - 1];
                                                    lastCaption.end = startTime;
                                                } else {
                                                    lastCaption = captionArray.pop();
                                                }
                                                caption = {
                                                    start: startTime,
                                                    end: endTime,
                                                    data: lastCaption.data + '\n' + region.textContent,
                                                    type: 'text',
                                                    line: 80,
                                                    style: cssStyle
                                                };
                                            }
                                        }
                                    } else {

                                        textNodes = this.domParser.getTextNodesIn(region);

                                        for (j = 0; j < textNodes.length; j += 1) {
                                            if (j > 0) {
                                                textValue += '\n';
                                            }
                                            textValue += textNodes[j].textContent;
                                        }
                                        if (textValue !== "") {
                                            caption = {
                                                start: startTime,
                                                end: endTime,
                                                data: textValue,
                                                type: 'text',
                                                line: 80,
                                                style: cssStyle
                                            };
                                            textValue = "";
                                        }
                                    }
                                    if (caption !== null) {
                                        captionArray.push(caption);
                                    }
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
        videoModel: undefined,
        parse: internalParse

    };
};