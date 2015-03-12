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

MediaPlayer.dependencies.TextTTMLXMLMP4SourceBuffer = function () {

    var video,
        mimeType,
        currentLang,
        currentId,

        // We need to simulate TimeRanges, as defined 
        // by Media Streaming Extensions.
        // start() and end() functions must be provided,
        // as player checks the buffer level using these

        buffered = {
            length:0,
            ranges:[],

            start: function( index ) {
                return this.ranges[index].start;
            },

            end: function( index ) {
                return this.ranges[index].end;
            },

            addRange: function( start, end ) {
                this.ranges.push({
                    start: start,
                    end: end
                });
                this.length=this.length+1;

                // TimeRanges must be normalized

                this.ranges.sort(function(a,b){return a.start-b.start;});
            },

            reset: function () {
                this.length = 0;
                this.ranges = [];
            }
        };

    return {
        updating:false,
        system:undefined,
        eventBus:undefined,
        buffered: buffered,
        textTrackExtensions:undefined,
        ttmlParser:undefined,

        initialize: function (type, bufferController, subtitleData) {
            mimeType = type;
            video = bufferController.getVideoModel().getElement();
            buffered.reset();
            currentLang = subtitleData.lang;
            currentId = subtitleData.id;
        },
        remove:function (start,end) {
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
            this.abort();
        },

        append: function (bytes) {
            var self = this;
            var file = mp4lib.deserialize( bytes );
                    
            var moov = file.getBoxByType('moov');
            if (moov) {

                // This must be an init segment, if it has a moov box.
                // We need it to read the timescale, as it will be 
                // used to compute fragments time ranges.

                var mvhd = moov.getBoxByType('mvhd');
                self.timescale = mvhd.timescale;

                // Also, it is a good moment to set up a text track on videoElement
                // TODO: set up name and language 
                self.textTrackExtensions.addTextTrack(video, [], currentId, currentLang, true)
                .then(  function(track) {
                            self.track = track;
                            self.eventBus.dispatchEvent({type:"updateend"});
                        }
                    );
                return;
            }

            var moof = file.getBoxByType('moof');
            if (moof) {

                // This is a subtitles track fragment
                // let's decode the data and add captions to video element

                var mdat = file.getBoxByType('mdat');

                // We need to update TimeRanges.                            
                // assume that there is a single text sample in fragment

                var traf = moof.getBoxByType('traf');
                var tfhd = traf.getBoxByType('tfhd');
                var tfdt = traf.getBoxByType('tfdt');
                var trun = traf.getBoxByType('trun');

                var fragmentStart = tfdt.baseMediaDecodeTime/self.timescale;
                var fragmentDuration = 0;
                if (trun.flags & 0x000100) {
                    fragmentDuration = trun.samples_table[0].sample_duration/self.timescale;
                }
                else {
                    fragmentDuration = tfhd.default_sample_duration/self.timescale;
                }

                self.buffered.addRange( fragmentStart, fragmentStart+fragmentDuration );

                // parse data and add to cues

                self.convertUTF8ToString(mdat.data)
                .then ( function(result) {
                        self.ttmlParser.parse(result).then( function(cues) {
                            var i;
                            if (cues) {
                                for (i=0;i<cues.length;i++) {
                                    cues[i].start = cues[i].start+fragmentStart;
                                    cues[i].end = cues[i].end+fragmentStart;
                                }

                                self.textTrackExtensions.addCues( self.track, cues );
                               
                                self.eventBus.dispatchEvent({type:"updateend"});
                            }
                        });
                    }
                );
            }
            return;
        },

        convertUTF8ToString: function( buf ) {
            var deferred = Q.defer();
            var blob = new Blob([buf],{type:"text/xml"});
            var f = new FileReader();

            f.onload = function(e) {
                deferred.resolve(e.target.result);
            };
            f.readAsText(blob);
                        
            return deferred.promise;
        },

        abort:function() {
            this.getTextTrackExtensions().deleteCues(video);
        },

        getTextTrackExtensions:function() {
            return this.textTrackExtensions;
        },

        addEventListener: function (type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
            if (!this.updating)
                this.eventBus.dispatchEvent({type:"updateend"});
        },

        removeEventListener: function (type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        }
    };
};

MediaPlayer.dependencies.TextTTMLXMLMP4SourceBuffer.prototype = {
    constructor: MediaPlayer.dependencies.TextTTMLXMLMP4SourceBuffer
};
