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
MediaPlayer.utils.TTMLRenderer = function() {
    "use strict";
    var ttmlDiv,
        subtitleDivTab = [],

        onFullScreenChange = function() {
            var i = 0;

            for (i = 0; i < subtitleDivTab.length; i++) {
                applySubtitlesCSSStyle(subtitleDivTab[i], subtitleDivTab[i].ttmlStyle, ttmlDiv);
            }
        },

        createSubtitleDiv = function() {
            var subtitleDiv = document.createElement("div");

            subtitleDiv.style.position = 'absolute';
            subtitleDiv.style.display = 'block';
            subtitleDiv.style.overflow = 'initial';
            subtitleDiv.style.pointerEvents = 'none';

            ttmlDiv.appendChild(subtitleDiv);

            return subtitleDiv;
        },

        removeSubtitleDiv = function(div) {
            if (ttmlDiv.hasChildNodes()) {
                ttmlDiv.removeChild(div);
            }
        },

        computeFontSize = function(fontSize, cellUnit) {
            var computedFontSize,
                i;
            if (fontSize && fontSize[fontSize.length - 1] === '%') {
                computedFontSize = parseFloat(fontSize.substr(0, fontSize.length - 1)) / 100 * cellUnit[1] + 'px';
            } else if (fontSize && fontSize[fontSize.length - 1] === 'x') {
                //case in pixels
                computedFontSize = fontSize;
            } else if (fontSize && fontSize[fontSize.length - 1] === 'c') {
                var cellsSize = fontSize.replace(/\s/g, '').split('c');

                for (i = 0; i < cellsSize.length; i += 1) {
                    cellsSize[i] = parseFloat(cellsSize[i]);
                }

                if (isNaN(cellsSize[1])) {
                    computedFontSize = cellsSize[0] * cellUnit[1] + 'px';
                } else {
                    computedFontSize = cellsSize[1] * cellUnit[1] + 'px';
                }
            } else { //default value defined in TTML
                computedFontSize = cellUnit[1] + 'px';
            }

            return computedFontSize;
        },

        computeTextOutline = function(textOutline, cellUnit, defaultColor) {
            var computedTextOutline = {
                    color: defaultColor,
                    width: null
                },
                formatTextOutlineWidth,
                textOutlineWidthIndex = 0;

            if (textOutline) {
                textOutline = textOutline.split(' ');

                //detect if outline color has been defined, if not, outline color should be set to color value
                if (textOutline[0] && isNaN(textOutline[0][0])) {
                    computedTextOutline.color = textOutline[0];
                    textOutlineWidthIndex = 1;
                } else {
                    computedTextOutline.color = defaultColor;
                }

                if (computedTextOutline.color && computedTextOutline.color[0] === '#') {
                    computedTextOutline.color = hex2rgba_convert(computedTextOutline.color);
                }

                //detect text outline width, the first length value
                if (textOutline[textOutlineWidthIndex]) {
                    //get the last character for text Outline width definition
                    formatTextOutlineWidth = textOutline[textOutlineWidthIndex][textOutline[textOutlineWidthIndex].length - 1];
                    switch (formatTextOutlineWidth) {
                        //definition in cell.
                        case 'c':
                            textOutline[textOutlineWidthIndex] = textOutline[textOutlineWidthIndex].split('c');
                            if (textOutline[textOutlineWidthIndex][0]) {
                                computedTextOutline.width = textOutline[textOutlineWidthIndex][0] * cellUnit[1] + 'px';
                            }
                            break;
                        case 'x':
                            //definition in pixel
                            computedTextOutline.width = textOutline[textOutlineWidthIndex];
                            break;
                    }
                }
            }
            return computedTextOutline;
        },

        hex2rgba_convert = function(hex) {
            hex = hex.replace('#', '');
            var r = parseInt(hex.substring(0, 2), 16),
                g = parseInt(hex.substring(2, 4), 16),
                b = parseInt(hex.substring(4, 6), 16),
                a = hex.length > 6 ? parseInt(hex.substring(6, 8), 16) : 255,
                result = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';

            return result;
        },

        applySubtitlesCSSStyle = function(div, cssStyle, renderingDiv) {
            var origin,
                divHeight,
                extent,
                textOutline,
                rootExtent,
                cellUnit = [renderingDiv.clientWidth / cssStyle.cellResolution[0], renderingDiv.clientHeight / cssStyle.cellResolution[1]];

            if (div) {
                if (cssStyle.backgroundColor && cssStyle.backgroundColor[0] === '#') {
                    cssStyle.backgroundColor = hex2rgba_convert(cssStyle.backgroundColor);
                }

                if (cssStyle.color && cssStyle.color[0] === '#') {
                    cssStyle.color = hex2rgba_convert(cssStyle.color);
                }

                if (cssStyle.origin && cssStyle.origin[cssStyle.origin.length - 1] === '%') {
                    origin = cssStyle.origin.split('%');
                    div.style.left = ((parseInt(origin[0], 10) * renderingDiv.clientWidth) / 100) + "px";
                    div.style.bottom = renderingDiv.clientHeight - ((parseInt(origin[1], 10) * renderingDiv.clientHeight) / 100) + "px";
                    if (cssStyle.extent && cssStyle.extent[cssStyle.extent.length - 1] === '%') {
                        extent = cssStyle.extent.split('%');
                        div.style.width = ((parseInt(extent[0], 10) * renderingDiv.clientWidth) / 100) + "px";
                        divHeight = ((parseInt(extent[1], 10) * renderingDiv.clientHeight) / 100);
                        div.style.height = divHeight + "px";
                    }
                } else if (cssStyle.origin && cssStyle.origin[cssStyle.origin.length - 1] === 'x') {
                    origin = cssStyle.origin.split('px');
                    if (cssStyle.rootExtent && cssStyle.rootExtent[cssStyle.rootExtent.length - 1] === 'x') {
                        rootExtent = cssStyle.rootExtent.split('px');
                        div.style.left = ((origin[0] / rootExtent[0]) * renderingDiv.clientWidth) + "px";
                        div.style.bottom = renderingDiv.clientHeight - ((origin[1] / rootExtent[1]) * renderingDiv.clientHeight) + "px";
                        if (cssStyle.extent && cssStyle.extent[cssStyle.extent.length - 1] === 'x') {
                            extent = cssStyle.extent.split('px');
                            div.style.width = ((extent[0] / rootExtent[0]) * renderingDiv.clientWidth) + "px";
                            div.style.height = ((extent[1] / rootExtent[1]) * renderingDiv.clientHeight) + "px";
                        }
                    } else {
                        div.style.left = origin[0] + "px";
                        div.style.top = origin[1] + "px";
                    }
                }

                textOutline = computeTextOutline(cssStyle.textOutline, cellUnit, cssStyle.color);
                div.style.webkitTextStrokeWidth = textOutline.width;
                div.style.webkitTextStroke = textOutline.color;
                switch (cssStyle.textAlign) {
                    //Values in TTML : left | center | right | start | end
                    //Values in css : left|right|center|justify|initial|inherit
                    case 'start':
                        div.style.textAlign = 'left';
                        break;
                    case 'end':
                        div.style.textAlign = 'right';
                        break;
                    default:
                        div.style.textAlign = cssStyle.textAlign;
                }

                if (cssStyle.showBackground && cssStyle.showBackground === 'whenActive') {
                    div.style.width = "auto";
                    div.style.height = "auto";
                }
                div.style.fontStyle = cssStyle.fontStyle;
                div.style.backgroundColor = cssStyle.backgroundColor;
                div.style.color = cssStyle.color;
                div.style.fontSize = computeFontSize(cssStyle.fontSize, cellUnit);
                div.style.fontFamily = cssStyle.fontFamily;
            }
        };

    return {
        initialize: function(renderingDiv) {
            ttmlDiv = renderingDiv;
            document.addEventListener('webkitfullscreenchange', onFullScreenChange.bind(this));
            document.addEventListener('mozfullscreenchange', onFullScreenChange.bind(this));
            document.addEventListener('fullscreenchange', onFullScreenChange.bind(this));
        },

        cleanSubtitles: function() {
            var i = 0;

            for (i = 0; i < subtitleDivTab.length; i++) {
                removeSubtitleDiv(subtitleDivTab[i]);
            }
            subtitleDivTab = [];
        },

        onCueEnter: function(e) {
            var newDiv = createSubtitleDiv();
           
            applySubtitlesCSSStyle(newDiv, e.currentTarget.style, ttmlDiv);

            newDiv.ttmlStyle = e.currentTarget.style;

            if (e.currentTarget.type !== 'image') {
                newDiv.innerText = e.currentTarget.text;
            } else {
                var img = new Image();
                img.style.height = 'auto';
                img.style.width = 'auto';
                img.src = e.currentTarget.text;
                newDiv.appendChild(img);
            }

            subtitleDivTab.push(newDiv);
        },

        onCueExit: function(e) {
            var i = 0;

            for (i = 0; i < subtitleDivTab.length; i++) {
                if (subtitleDivTab[i].ttmlStyle === e.currentTarget.style) {
                    break;
                }
            }
            removeSubtitleDiv(subtitleDivTab[i]);
            subtitleDivTab.splice(i, 1);
        }
    };
};