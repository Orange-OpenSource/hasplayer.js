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
MediaPlayer.dependencies.TextSourceBuffer = function () {

    var video,
        data,
        mimeType,

        decodeUtf8 = function(arrayBuffer) {
            var result = "",
                i = 0,
                c = 0,
                c2 = 0,
                c3 = 0,
                data = new Uint8Array(arrayBuffer);

            // If we have a BOM skip it
            if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
                i = 3;
            }

            while (i < data.length) {
                c = data[i];

                if (c < 128) {
                    result += String.fromCharCode(c);
                    i++;
                } else if (c > 191 && c < 224) {
                    if (i + 1 >= data.length) {
                        throw "UTF-8 Decode failed. Two byte character was truncated.";
                    }
                    c2 = data[i + 1];
                    result += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    i += 2;
                } else {
                    if (i + 2 >= data.length) {
                        throw "UTF-8 Decode failed. Multi byte character was truncated.";
                    }
                    c2 = data[i + 1];
                    c3 = data[i + 2];
                    result += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }
            }
            return result;
        },

        buffered = {
            length: 0,
            ranges: [],

            start: function(index) {
                return this.ranges[index].start;
            },

            end: function(index) {
                return this.ranges[index].end;
            },

            addRange: function(start, end) {
                var i = 0,
                    rangesUpdated = false,
                    tolerance = 0.01;

                //detect discontinuity in ranges.
                for (i = 0; i < this.ranges.length; i++) {
                    if (this.ranges[i].end <= (start + tolerance) && this.ranges[i].end >= (start - tolerance)) {
                        rangesUpdated = true;
                        this.ranges[i].end = end;
                    }

                    if (this.ranges[i].start <= (end + tolerance) && this.ranges[i].start >= (end - tolerance)) {
                        rangesUpdated = true;
                        this.ranges[i].start = start;
                    }
                }

                if (!rangesUpdated) {
                    this.ranges.push({
                        start: start,
                        end: end
                    });
                    this.length = this.length + 1;

                    // TimeRanges must be normalized
                    this.ranges.sort(function(a, b) {
                        return a.start - b.start;
                    });
                }
            },

            removeRange: function(start, end) {
                var i = 0;
                for (i = this.ranges.length - 1; i >= 0; i -= 1) {
                    if (((end === undefined || end === -1) || (this.ranges[i].end <= end)) &&
                        ((start === undefined || start === -1) || (this.ranges[i].start >= start))) {
                        this.ranges.splice(i, 1);
                    }
                }

                this.length = this.ranges.length;
            },

            reset: function() {
                this.length = 0;
                this.ranges = [];
            }
        };

    return {
        system:undefined,
        eventBus:undefined,
        errHandler: undefined,
        textTrackExtensions: undefined,
        buffered: buffered,

        initialize: function (type, bufferController) {
            mimeType = type;
            video = bufferController.getVideoModel().getElement();
            data = bufferController.getData();
            buffered.reset();
        },

        remove: function(start, end) {
            if (start < 0 || start >= end) {
                throw "INVALID_ACCESS_ERR";
            }

            this.textTrackExtensions.deleteCues(video, false, start, end);
            this.buffered.removeRange(start, end);
        },

        append: function (bytes, request) {
            var self = this,
                ccContent = decodeUtf8(bytes),
                cues = self.getParser().parse(ccContent, request);

            if (video.textTracks.length === 0) {
                // We need to create the TextTrack
                self.textTrackExtensions.addTextTrack(video, [], data.Representation_asArray[0].id, data.lang, true);
            }

            if (video.textTracks.length === 0) {
                // Failed to create TextTrack, should never happen
                return;
            }

            self.textTrackExtensions.addCues(video.textTracks[0], cues);

            if (request) {
                self.buffered.addRange(request.startTime, request.startTime + request.duration);
            }
        },

        abort: function() {
            this.textTrackExtensions.deleteCues(video);
            this.buffered.reset();
        },

        getParser: function() {
            var parser;

            if (mimeType === "text/vtt") {
                parser = this.system.getObject("vttParser");
            } /*else if (mimeType === "application/ttml+xml") {
                parser = this.system.getObject("ttmlParser");
            }*/

            return parser;
        },

        addEventListener: function (type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
        },

        removeEventListener: function (type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        }
    };
};

MediaPlayer.dependencies.TextSourceBuffer.prototype = {
    constructor: MediaPlayer.dependencies.TextSourceBuffer
};
