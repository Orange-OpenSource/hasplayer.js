/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014, Orange
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Akamai Technologies nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// Orange: This Source Buffer processes TTML+XML subtitles encapsulated in the mp4
//         This format is used by smoothstreaming headends

MediaPlayer.dependencies.TextTTMLXMLMP4SourceBuffer = function() {

    var video,
        mimeType,
        currentLang,
        currentId,

        // We need to simulate TimeRanges, as defined 
        // by Media Streaming Extensions.
        // start() and end() functions must be provided,
        // as player checks the buffer level using these

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
        updating: false,
        system: undefined,
        eventBus: undefined,
        buffered: buffered,
        textTrackExtensions: undefined,
        ttmlParser: undefined,
        debug: undefined,
        manifestModel: undefined,
        errHandler: undefined,

        initialize: function(type, bufferController, subtitleData) {
            mimeType = type;
            video = bufferController.getVideoModel().getElement();
            buffered.reset();
            currentLang = subtitleData.lang;
            currentId = subtitleData.id;
        },
        remove: function(start, end) {
            /*If start is negative or greater than duration, then throw an INVALID_ACCESS_ERR exception and abort these steps.
            If end is less than or equal to start, then throw an INVALID_ACCESS_ERR exception and abort these steps.
            If this object has been removed from the sourceBuffers attribute of the parent media source then throw an INVALID_STATE_ERR exception and abort these steps.
            If the updating attribute equals true, then throw an INVALID_STATE_ERR exception and abort these steps.
            If the readyState attribute of the parent media source is in the "ended" state then run the following steps:

            Set the readyState attribute of the parent media source to "open"
            Queue a task to fire a simple event named sourceopen at the parent media source .
            Set the updating attribute to true.
            Queue a task to fire a simple event named updatestart at this SourceBuffer object.
            Return control to the caller and run the rest of the steps asynchronously.
            Run the coded frame removal algorithm with start and end as the start and end of the removal range.
            Set the updating attribute to false.
            Queue a task to fire a simple event named update at this SourceBuffer object.
            Queue a task to fire a simple event named updateend at this SourceBuffer object.*/
            if (start < 0 || start >= end) {
                throw "INVALID_ACCESS_ERR";
            }

            this.getTextTrackExtensions().deleteCues(video, false, start, end);
            this.buffered.removeRange(start, end);
        },

        append: function(bytes) {
            var self = this,
                file = mp4lib.deserialize(bytes),
                moov = file.getBoxByType('moov'),
                mvhd,
                moof,
                mdat,
                traf,
                tfhd,
                tfdt,
                trun,
                subs,
                fragmentStart,
                fragmentDuration = 0,
                ttmlData,
                encoding = 'utf-8';

            //no mp4, all the subtitles are in one xml file
            if (mimeType === 'application/ttml+xml') {
                this.track = this.textTrackExtensions.addTextTrack(video, [], currentId, currentLang, true);

                //detect utf-16 encoding
                if (MediaPlayer.utils.isUTF16(bytes)) {
                    encoding = 'utf-16';
                }

                this.convertUTFToString(bytes, encoding)
                    .then(function(result) {
                        self.ttmlParser.parse(result).then(function(cues) {
                            if (cues) {

                                self.textTrackExtensions.addCues(self.track, cues);
                                self.buffered.addRange(0, video.duration);
                                self.eventBus.dispatchEvent({
                                    type: "updateend"
                                });
                            }
                        }, function(error) {
                            self.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.INTERNAL_ERROR, "Internal error while parsing TTML data", error);
                        });
                    });
                return;
            }

            if (moov) {
                // This must be an init segment, if it has a moov box.
                // We need it to read the timescale, as it will be 
                // used to compute fragments time ranges.

                mvhd = moov.getBoxByType('mvhd');
                self.timescale = mvhd.timescale;

                // Also, it is a good moment to set up a text track on videoElement
                // TODO: set up name and language 
                this.track = this.textTrackExtensions.addTextTrack(video, [], currentId, currentLang, true);
                this.eventBus.dispatchEvent({
                    type: "updateend"
                });
                return;
            }

            moof = file.getBoxByType('moof');
            if (moof) {

                // This is a subtitles track fragment
                // let's decode the data and add captions to video element
                mdat = file.getBoxByType('mdat');

                // We need to update TimeRanges.                            
                // assume that there is a single text sample in fragment
                traf = moof.getBoxByType('traf');
                tfhd = traf.getBoxByType('tfhd');
                tfdt = traf.getBoxByType('tfdt');
                trun = traf.getBoxByType('trun');
                subs = traf.getBoxByType('subs');

                fragmentStart = tfdt.baseMediaDecodeTime / self.timescale;
                fragmentDuration = 0;
                if (trun.flags & 0x000100) {
                    fragmentDuration = trun.samples_table[0].sample_duration / self.timescale;
                } else {
                    fragmentDuration = tfhd.default_sample_duration / self.timescale;
                }

                self.buffered.addRange(fragmentStart, fragmentStart + fragmentDuration);
                
                if (subs) {
                    for (var i = 0; i < subs.entry_count; i++) {
                        for (var j = 0; j < subs.entry[i].subsample_count; j++) {
                            //the first subsample is the one in which TTML text is set
                            ttmlData = mdat.data.subarray(0, subs.entry[i].subSampleEntries[0].subsample_size);
                            break;
                        }
                    }
                } else {
                    ttmlData = mdat.data;
                }

                //detect utf-16 encoding
                if (MediaPlayer.utils.isUTF16(ttmlData)) {
                    encoding = 'utf-16';
                }
                // parse data and add to cues
                self.convertUTFToString(ttmlData, encoding)
                    .then(function(result) {
                        self.ttmlParser.parse(result).then(function(cues) {
                            var i,
                            manifest = self.manifestModel.getValue();

                            if (cues) {
                                if (manifest.name === 'MSS') {
                                    for (i = 0; i < cues.length; i += 1) {
                                        cues[i].start = cues[i].start + fragmentStart;
                                        cues[i].end = cues[i].end + fragmentStart;
                                    }
                                }

                                self.textTrackExtensions.addCues(self.track, cues);

                                self.eventBus.dispatchEvent({
                                    type: "updateend"
                                });
                            }
                        }, function(error) {
                            self.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.INTERNAL_ERROR, "Internal error while parsing TTML data", error);
                        });
                    });
            }
            return;
        },

        convertUTFToString: function(buf, encoding) {
            var deferred = Q.defer(),
                blob = new Blob([buf], {
                    type: "text/xml"
                }),
                f = new FileReader();

            f.onload = function(e) {
                deferred.resolve(e.target.result);
            };
            f.readAsText(blob, encoding);

            return deferred.promise;
        },

        UpdateLang: function(id, lang){
            currentId = id;
            currentLang = lang;
        },

        abort: function() {
            this.getTextTrackExtensions().deleteCues(video, true);
        },

        getTextTrackExtensions: function() {
            return this.textTrackExtensions;
        },

        addEventListener: function(type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
            if (!this.updating)
                this.eventBus.dispatchEvent({
                    type: "updateend"
                });
        },

        removeEventListener: function(type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        }
    };
};

MediaPlayer.dependencies.TextTTMLXMLMP4SourceBuffer.prototype = {
    constructor: MediaPlayer.dependencies.TextTTMLXMLMP4SourceBuffer
};