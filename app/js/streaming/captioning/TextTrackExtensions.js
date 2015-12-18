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
MediaPlayer.utils.TextTrackExtensions = function() {
    "use strict";
    var Cue;

    return {
        eventBus: undefined,

        setup: function() {
            Cue = window.VTTCue || window.TextTrackCue;
        },

        subtitlesStyleChanged: function(style) {
            this.eventBus.dispatchEvent({
                type: "subtitlesStyleChanged",
                data: style
            });
        },

        addTextTrack: function(video, captionData, label, scrlang, isDefaultTrack) {
            var track = null,
                currentItem = null,
                i;

            //no function removeTextTrack is defined
            //add one, only if it's necessary
            //deleteCues will be very efficient in this case
            if (video.textTracks.length === 0) {
                //TODO: Ability to define the KIND in the MPD - ie subtitle vs caption....
                track = video.addTextTrack("subtitles", label, scrlang);
                // track.default is an object property identifier that is a reserved word
                // The following jshint directive is used to suppressed the warning "Expected an identifier and instead saw 'default' (a reserved word)"
                /*jshint -W024 */
                track.default = isDefaultTrack;
                track.mode = "showing";
            } else {
                //this.deleteCues(video);
                track = video.textTracks[0];
            }

            for (i = 0; i < captionData.length; i += 1) {
                currentItem = captionData[i];
                track.addCue(new Cue(currentItem.start, currentItem.end, currentItem.data));
            }

            return Q.when(track);
        },

        onCueEnter: function(e) {
            this.subtitlesStyleChanged(e.currentTarget.style);
        },

        // Orange: addCues added so it is possible to add cues during playback,
        //         not only during track initialization

        addCues: function(track, captionData) {
            var i = 0,
                currentItem = null,
                newCue = null;

            for (i = 0; i < captionData.length; i += 1) {
                currentItem = captionData[i];
                if (currentItem.start < currentItem.end) {
                    newCue = new Cue(currentItem.start, currentItem.end, currentItem.data);

                    newCue.onenter = this.onCueEnter.bind(this);

                    newCue.snapToLines = false;

                    newCue.line = currentItem.line;

                    if (currentItem.style) {
                        newCue.style = currentItem.style;
                    }

                    track.addCue(newCue);
                }
            }
        },

        deleteCues: function(video, disabled) {
            var track = null,
                cues = null,
                lastIdx = null,
                i = 0;

            //when multiple tracks are supported - iterate through and delete all cues from all tracks.
            if (video) {
                track = video.textTracks[0];
                if (track) {
                    cues = track.cues;
                    if (cues) {
                        lastIdx = cues.length - 1;

                        for (i = lastIdx; i >= 0; i -= 1) {
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