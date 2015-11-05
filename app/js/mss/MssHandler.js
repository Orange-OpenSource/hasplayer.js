/*
 * The copyright in this software module is being made available under the BSD License, included below. This software module may be subject to other third party and/or contributor rights, including patent rights, and no such rights are granted under this license.
 * The whole software resulting from the execution of this software module together with its external dependent software modules from dash.js project may be subject to Orange and/or other third party rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014, Orange
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Orange nor the names of its contributors may be used to endorse or promote products derived from this software module without specific prior written permission.
 *
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
Mss.dependencies.MssHandler = function() {

    var isDynamic=false,

        /*getIndex = function (adaptation, manifest) {

            var periods = manifest.Period_asArray,
                i, j;

            for (i = 0; i < periods.length; i += 1) {
                var adaptations = periods[i].AdaptationSet_asArray;
                for (j = 0; j < adaptations.length; j += 1) {
                    if (adaptations[j] === adaptation) {
                        return j;
                    }
                }
            }

            return -1;
        },

        /*getType = function (adaptation) {

            var type = (adaptation.mimeType !== undefined) ? adaptation.mimeType : adaptation.contentType;

            if (type.indexOf("video") != -1)
            {
                return "video";
            }
            else if (type.indexOf("audio") != -1)
            {
                return "audio";
            }
            else if (type.indexOf("text") != -1)
            {
                return "text";
            }

            return "und";
        },

        getRepresentationForQuality = function (quality, adaptation) {
            var representation = null;
            if (adaptation && adaptation.Representation_asArray && adaptation.Representation_asArray.length > 0) {
                representation = adaptation.Representation_asArray[quality];
            }
            return representation;
        },


        getTimescale = function (adaptation) {
            var timescale = 1,
                segmentInfo;

            // Check for segment information at adaptation level
            segmentInfo = rslt.manifestExt.getSegmentInfoFor(adaptation);

            // Else get segment information of the first representation
            if (segmentInfo === null)
            {
                segmentInfo = rslt.manifestExt.getSegmentInfoFor(adaptation.Representation_asArray[0]);
            }

            if (segmentInfo !== null && segmentInfo !== undefined && segmentInfo.hasOwnProperty("timescale"))
            {
                timescale = segmentInfo.timescale;
            }

            return timescale;
        },

        getDuration = function (manifest, isDynamic) {
            var duration = NaN;

            if (isDynamic) {
                duration = Number.POSITIVE_INFINITY;
            } else {
                if (manifest.mediaPresentationDuration) {
                    duration = manifest.mediaPresentationDuration;
                } else if (manifest.availabilityEndTime && manifest.availabilityStartTime) {
                    duration = (manifest.availabilityEndTime.getTime() - manifest.availabilityStartTime.getTime());
                }
            }

            return duration;
        },*/

        getAudioChannels = function (adaptation, representation) {
            var channels = 1;

            if (adaptation.audioChannels) {
                channels = adaptation.audioChannels;
            } else if (representation.audioChannels) {
                channels = representation.audioChannels;
            }

            return channels;
        },

        getAudioSamplingRate = function (adaptation, representation) {
            var samplingRate = 1;

            if (adaptation.audioSamplingRate) {
                samplingRate = adaptation.audioSamplingRate;
            } else {
                samplingRate = representation.audioSamplingRate;
            }

            return samplingRate;
        },

        getInitData = function(representation) {
            var self = this;
            // return data in byte format
            // call MP4 lib to generate the init

            // Get required media information from manifest  to generate initialisation segment
            //var representation = getRepresentationForQuality(quality, adaptation);
            if(representation){
                if(!representation.initData){
                    var manifest = rslt.manifestModel.getValue();
                    var adaptation = representation.adaptation;
                    var realAdaptation = manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index];
                    var realRepresentation = realAdaptation.Representation_asArray[representation.index];

                    var track = new MediaPlayer.vo.Mp4Track();
                    track.type = rslt.getType() || 'und';
                    track.trackId = adaptation.index + 1; // +1 since track_id shall start from '1'
                    track.timescale = representation.timescale;
                    track.duration = representation.adaptation.period.duration;
                    track.codecs = realRepresentation.codecs;
                    track.codecPrivateData = realRepresentation.codecPrivateData;
                    track.bandwidth = realRepresentation.bandwidth;
                    
                    if (track.type !=='text' && !self.capabilities.supportsCodec(self.videoModel.getElement(), realRepresentation.mimeType + ';codecs="' + realRepresentation.codecs + '"')) {
                        return null;
                    }

                    // DRM Protected Adaptation is detected
                    if (realAdaptation.ContentProtection_asArray && (realAdaptation.ContentProtection_asArray.length > 0)) {
                        track.contentProtection = realAdaptation.ContentProtection_asArray;
                    }

                    // Video related informations
                    track.width = realRepresentation.width || realAdaptation.maxWidth;
                    track.height = realRepresentation.height || realAdaptation.maxHeight;

                    // Audio related informations
                    track.language = realAdaptation.lang ? realAdaptation.lang : 'und';

                    track.channels = getAudioChannels(realAdaptation, realRepresentation);
                    track.samplingRate = getAudioSamplingRate(realAdaptation, realRepresentation);

                    representation.initData =  rslt.mp4Processor.generateInitSegment([track]);
                }
                return representation.initData;
            }else{
                return null;
            }

    };

    var rslt = MediaPlayer.utils.copyMethods(Dash.dependencies.DashHandler);
    rslt.mp4Processor = undefined;

    rslt.getInitRequest = function (representation) {
            var period = null;
            var self = this;
            var presentationStartTime = null;
            var deferred = Q.defer();
            //Mss.dependencies.MssHandler.prototype.getInitRequest.call(this,quality,data).then(onGetInitRequestSuccess);
            // get the period and startTime
            if (representation) {
                period = representation.adaptation.period;
                presentationStartTime = period.start;

                var manifest = rslt.manifestModel.getValue();
                isDynamic = rslt.manifestExt.getIsDynamic(manifest);

                var request = new MediaPlayer.vo.SegmentRequest();

                request.streamType = rslt.getType();
                request.type = "Initialization Segment";
                request.url = null;
                try{
                    request.data = getInitData.call(this, representation);
                }catch(e){
                    deferred.reject(e);
                    return deferred.promise;
                }

                if (!request.data) {
                    deferred.reject({name: request.streamType, message : "codec is not supported"});
                    return deferred.promise;
                }

                request.range =  representation.range;
                request.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic);
                request.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic);

                //request.action = "complete"; //needed to avoid to execute request
                request.quality = representation.index;
                deferred.resolve(request);
            }else{
                deferred.reject({message : "representation is undefined or null"});
            }
            return deferred.promise;
        };
    return rslt;
};

Mss.dependencies.MssHandler.prototype =  {
    constructor : Mss.dependencies.MssHandler
};
