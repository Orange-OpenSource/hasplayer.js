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
MediaPlayer.utils.VTTParser = function () {
    "use strict";

    var REGEXP_TIMESTAMPMAP = /X-TIMESTAMP-MAP=(.+)/,
        REGEXP_ATTRIBUTES = /\s*(.+?)\s*:((?:\".*?\")|.*?)(?:,|$)/g,
        REGEXP_CUE = /(\S*)[\s]*-->[\s]*(\S*)(.*)/g,
        REGEXP_LINEBREAK = /(?:\r\n|\r|\n)/gm,

        parseTimestamp = function(stime) {
            var timeArray = stime.split(":"),
                len = timeArray.length,
                time = 0;

            for (var i = 0; i < len; i++) {
                time += parseFloat(timeArray[i], 10) * Math.pow(60, (len-i-1));
            }

            return time;
        },

        parseTimestampMap = function (data) {
            var match,
                attrs,
                name,
                value,
                local = null,
                mpegts = null;

            match = REGEXP_TIMESTAMPMAP.exec(data);

            if (!match) {
                return -1;
            }
            attrs = match[1];

            while ((match = REGEXP_ATTRIBUTES.exec(attrs)) !== null) {
                name = match[1];
                value = match[2];
                switch(name) {
                    case 'MPEGTS':
                        mpegts = parseInt(value, 10);
                        break;
                    case 'LOCAL':
                        local = parseTimestamp(value);
                }
            }

            if (local === null || mpegts === null) {
                return -1;
            }

            // var timestampMap = this.manifestModel.getValue().timestampMap;
            // if (!timestampMap) {
            //     return -1;
            // }

            // var time = timestampMap.local + ((mpegts - timestampMap.mpegts) / 90000.0);

            return {
                local: local,
                mpegts: mpegts
            };
        },

        getTimestampOffset = function (timestampMap, request) {

            if (timestampMap === -1) {
                return 0;
            }

            var streamTimestampMap = this.manifestModel.getValue().timestampMap;
            if (!streamTimestampMap) {
                // If MPEGTS timestamp mapping not yet set, then consider segment start time
                return timestampMap.local - request.startTime;
            }

            var mpegtsOffset = ((timestampMap.mpegts - streamTimestampMap.mpegts) / 90000.0);

            return (timestampMap.local - streamTimestampMap.local - mpegtsOffset);
        };

    return {
        manifestModel: undefined,

        parse: function (data, request) {
            var cues = [],
                cue = null,
                line,
                cueInfo,
                i;

            var offset = getTimestampOffset.call(this, parseTimestampMap(data), request);
            
            var lines = data.split(REGEXP_LINEBREAK);            

            for (i = 0; i < lines.length; i++) {
                line = lines[i].trim();
                if (line.length === 0) {
                    continue;
                }
                if (lines[i].match(REGEXP_CUE)) {
                    if (cue !== null) {
                        cues.push(cue);
                    }
                    // Start of new cue
                    cueInfo = lines[i].split(REGEXP_CUE);
                    cue = {
                        type: 'text',
                        line: 80,
                        start: parseTimestamp(cueInfo[1]) - offset,
                        end: parseTimestamp(cueInfo[2]) - offset,
                        // Do not set style, would need to be converted from VTT to TTML in case TTML renderer is used
                        //style: cueInfo[3].trim(),
                        data: ''
                    };
                    console.log('[text] Buffered range', cue);
                } else if (cue !== null) {
                    cue.data += ((cue.data.length === 0) ? '' : '\n') + lines[i];
                }
            }
            if (cue !== null) {
                cues.push(cue);
            }

            return cues;
        }
    };
};
