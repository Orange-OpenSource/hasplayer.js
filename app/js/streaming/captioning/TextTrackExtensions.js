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
MediaPlayer.utils.TextTrackExtensions = function () {
    "use strict";
    var Cue;

    return {
        eventBus: undefined,

        setup: function() {
            Cue = window.VTTCue || window.TextTrackCue;
        },

        subtitlesStyleChanged : function (style) {
            this.eventBus.dispatchEvent({
                type: "subtitlesStyleChanged",
                data: style
            });
        },

        addTextTrack: function(video, captionData,  label, scrlang, isDefaultTrack) {
            var track = null;

            //no function removeTextTrack is defined
            //add one, only if it's necessary
            //deleteCues will be very efficient in this case
            if (video.textTracks.length === 0) {
            //TODO: Ability to define the KIND in the MPD - ie subtitle vs caption....
                track = video.addTextTrack("subtitles", label, scrlang);
            }else {
                //this.deleteCues(video);
                track = video.textTracks[0];
            }
            // track.default is an object property identifier that is a reserved word
            // The following jshint directive is used to suppressed the warning "Expected an identifier and instead saw 'default' (a reserved word)"
            /*jshint -W024 */
            track.default = isDefaultTrack;
            track.mode = "showing";

            for(var item in captionData) {
                var currentItem = captionData[item];
                track.addCue(new Cue(currentItem.start, currentItem.end, currentItem.data));
            }

            return Q.when(track);
        },

        onCueEnter: function(e){
            this.subtitlesStyleChanged(e.currentTarget.style);
        },

        // Orange: addCues added so it is possible to add cues during playback,
        //         not only during track initialization

        addCues: function(track, captionData) {

            for(var item in captionData) {
                var currentItem = captionData[item];
                var newCue = new Cue(currentItem.start, currentItem.end, currentItem.data);

                newCue.onenter = this.onCueEnter.bind(this);

                newCue.snapToLines = false;

                if (item > 0 && currentItem.start <= captionData[item-1].end) {
                    newCue.line = captionData[item-1].line + parseFloat(currentItem.style.fontSize.substr(0, currentItem.style.fontSize.length-1))+3;
                }else {
                    newCue.line = currentItem.line;
                }

                if (currentItem.style) {
                    newCue.style = currentItem.style;
                }

                track.addCue(newCue);
            }
        },

        deleteCues: function(video, disabled) {
            //when multiple tracks are supported - iterate through and delete all cues from all tracks.
            if (video) {
                var track = video.textTracks[0];
                if (track) {
                    var cues = track.cues;
                    if (cues) {
                        var lastIdx = cues.length - 1;

                        for (var i = lastIdx; i >= 0 ; i -= 1) {
                            track.removeCue(cues[i]);
                        }
                    }
                    //noway to delete track, just disable it
                    //useful when player switchs between a stream with subtitles and an other one without.
                    if (disabled) {
                        track.mode = "disabled";
                    }
                }
            }
        }
    };
};