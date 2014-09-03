
Mss.dependencies.MssHandler = function() {

	var isDynamic=false,
		getIndex = function (adaptation, manifest) {

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
		
		getType = function (adaptation) {

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
		},

		getAudioChannels = function (adaptation, representation) {
			var channels = 1;

			if (adaptation.AudioChannelConfiguration) {
				channels = adaptation.AudioChannelConfiguration.value;
			} else if (representation.AudioChannelConfiguration) {
				channels = representation.AudioChannelConfiguration.value;
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
					var media = {};
					media.type = rslt.getType() || 'und';
					media.trackId = adaptation.index + 1; // +1 since track_id shall start from '1'
					media.timescale = representation.timescale;
					media.duration = representation.adaptation.period.duration;
					media.codecs = realRepresentation.codecs;
					media.codecPrivateData = realRepresentation.codecPrivateData;
					media.bandwidth = realRepresentation.bandwidth;

					//DRM Protected Adaptation is detected
					if (realAdaptation.ContentProtection != undefined)
					{
						media.contentProtection = realAdaptation.ContentProtection;
					};

					// Video related informations
					media.width = realRepresentation.width || realAdaptation.maxWidth;
					media.height = realRepresentation.height || realAdaptation.maxHeight;

					// Audio related informations
					media.language = realAdaptation.lang ? realAdaptation.lang : 'und';
					media.channels = getAudioChannels(realAdaptation, realRepresentation);
					media.samplingRate = getAudioSamplingRate(realAdaptation, realRepresentation);

					representation.initData =  rslt.mp4Processor.generateInitSegment(media);
				}
				return representation.initData;
			}else{
				return null;
			}
			
	};
	
	var rslt = Custom.utils.copyMethods(Dash.dependencies.DashHandler);
	rslt.mp4Processor = undefined;

	rslt.getInitRequest = function (representation) {
			var period = null;
			var self = this; 
			var presentationStartTime = null;
			var deferred = Q.defer();
            //Mss.dependencies.MssHandler.prototype.getInitRequest.call(this,quality,data).then(onGetInitRequestSuccess);
            // get the period and startTime
            period = representation.adaptation.period;
            presentationStartTime = period.start;

            var manifest = rslt.manifestModel.getValue();
			isDynamic = rslt.manifestExt.getIsDynamic(manifest);

            var request = new MediaPlayer.vo.SegmentRequest();

            request.streamType = rslt.getType();
            request.type = "Initialization Segment";
            request.url = null;
            request.data = getInitData(representation);
            request.range =  representation.range;
            request.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic);
            request.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic);

            //request.action = "complete"; //needed to avoid to execute request
            request.quality = representation.index;
            deferred.resolve(request);
            return deferred.promise;
        };
	return rslt;
};

Mss.dependencies.MssHandler.prototype =  {
	constructor : Mss.dependencies.MssHandler
};
