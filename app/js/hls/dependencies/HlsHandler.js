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
Hls.dependencies.HlsHandler = function() {
    var getInit = function (representation) {
            var period = null;
            var self = this;
            var presentationStartTime = null;
            var deferred = Q.defer();

            //Mss.dependencies.MssHandler.prototype.getInitRequest.call(this,quality,data).then(onGetInitRequestSuccess);
            // get the period and startTime
            period = representation.adaptation.period;
            presentationStartTime = period.start;

            var manifest = rslt.manifestModel.getValue();
            var isDynamic = rslt.manifestExt.getIsDynamic(manifest);

            var request = new MediaPlayer.vo.SegmentRequest();

            request.streamType = rslt.getType();
            request.type = "Initialization Segment";
            request.url = null;
            request.data = 1; //used to activate Loaded event in BufferControler
            request.range =  representation.range;
            request.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic);
            request.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic);

            request.quality = representation.index;
            deferred.resolve(request);
            return deferred.promise;
    };
	
	var rslt = Custom.utils.copyMethods(Dash.dependencies.DashHandler);
	
	rslt.getInitRequest = getInit;

	return rslt;
};

Hls.dependencies.HlsHandler.prototype =  {
	constructor : Hls.dependencies.HlsHandler
};