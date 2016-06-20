/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


Dash.dependencies.DashManifestExtensions = function() {
    "use strict";
    this.timelineConverter = undefined;
};

Dash.dependencies.DashManifestExtensions.prototype = {
    constructor: Dash.dependencies.DashManifestExtensions,

    getIsType: function(adaptation, type, mimeTypes) {
        "use strict";
        var i, j,
            found = false,
            col,
            representation;

        if (!adaptation) {
            return false;
        }

        if (adaptation.type === undefined) {
            adaptation.type = null;
        }
        
        col = adaptation.ContentComponent_asArray;

        if (col) {
            // Check contentType attribute at adaptation level
            for (i = 0; i < adaptation.ContentComponent_asArray.length && !found; i++) {
                if (adaptation.ContentComponent_asArray[i].contentType === type) {
                    adaptation.type = type;
                    found = true;
                }
            }
        }

        // Check mimeType attribute at adaptation level
        if (!found) {
            if (adaptation.mimeType) {
                for (i = 0; i < mimeTypes.length && !found; i++) {
                    if (adaptation.mimeType.indexOf(mimeTypes[i]) !== -1) {
                        adaptation.type = type;
                        found = true;
                    }
                }
            }
        }

        // Check mimeType attribute at representation level
        if (!found) {
            for (i = 0; i < adaptation.Representation_asArray.length && !found; i++) {
                representation = adaptation.Representation_asArray[i];
                for (j = 0; j < mimeTypes.length && !found; j++) {
                    if (representation.mimeType.indexOf(mimeTypes[j]) !== -1) {
                        adaptation.type = type;
                        found = true;
                    }
                }
            }
        }

        return found;
    },

    getIsVideo: function(adaptation) {
        return this.getIsType(adaptation, "video", ["video"]);
    },

    getIsAudio: function(adaptation) {
        return this.getIsType(adaptation, "audio", ["audio"]);
    },

    getIsText: function(adaptation) {
        return this.getIsType(adaptation, "text", ["vtt", "ttml", "application/mp4"]);
    },

    // ORANGE: added application/ttml+xml+mp4 for Smoothstreaming subtitles (ttml+xml encapsulated in mp4 binary form)
    getIsTextTrack: function(type) {
        return (type === "text/vtt" || type === "application/ttml+xml" || type === "application/ttml+xml+mp4" || type === "application/mp4");
    },

    getIsMain: function( /*adaptation*/ ) {
        "use strict";
        // TODO : Check "Role" node.
        // TODO : Use this somewhere.
        return false;
    },

    processAdaptation: function(adaptation) {
        "use strict";
        if (adaptation.Representation_asArray !== undefined && adaptation.Representation_asArray !== null) {
            adaptation.Representation_asArray.sort(function(a, b) {
                return a.bandwidth - b.bandwidth;
            });
        }

        return adaptation;
    },

    getDataForId: function(id, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray,
            i,
            len;

        for (i = 0, len = adaptations.length; i < len; i += 1) {
            if (adaptations[i].hasOwnProperty("id") && adaptations[i].id === id) {
                return adaptations[i];
            }
        }

        return null;
    },

    getDataForIndex: function(index, manifest, periodIndex) {
        "use strict";
        var adaptations;

        if (manifest && periodIndex >= 0) {
            adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;

            if (adaptations && adaptations.length > 0 && !isNaN(index)) {
                return adaptations[index];
            }
        }

        return [];
    },

    getIndex: function(adaptation, manifest) {
        var periods = manifest.Period_asArray,
            adaptations,
            i,
            j;

        for (i = 0; i < periods.length; i += 1) {
            adaptations = periods[i].AdaptationSet_asArray;
            for (j = 0; j < adaptations.length; j += 1) {
                if (adaptations[j] === adaptation) {
                    return j;
                }
            }
        }

        return -1;
    },

    getDataIndex: function(data, manifest, periodIndex) {
        "use strict";

        var adaptations,
            i,
            len;

        if (manifest && periodIndex >= 0) {
            adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;

            // ORANGE : compare data with id or string representation to avoid reference error due to manifest refresh
            if (data.id) {
                for (i = 0, len = adaptations.length; i < len; i += 1) {
                    if (adaptations[i].id && adaptations[i].id === data.id) {
                        return i;
                    }
                }
            } else {
                var strData = JSON.stringify(data);
                var strAdapt;
                for (i = 0, len = adaptations.length; i < len; i += 1) {
                    strAdapt = JSON.stringify(adaptations[i]);
                    if (strAdapt === strData) {
                        return i;
                    }
                }
            }
        }

        return -1;
    },

    getVideoData: function(manifest, periodIndex) {
        "use strict";
        //return null;
        //------------------------------------
        var adaptations,
            i;

        if (!manifest || periodIndex < 0) {
            return null;
        }

        adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;

        if (adaptations.length === 0) {
            return null;
        }

        for (i = 0; i < adaptations.length; i += 1) {
            if (this.getIsVideo(adaptations[i])) {
                return adaptations[i];
            }
        }

        return null;
    },

    getTextDatas: function(manifest, periodIndex) {
        "use strict";
        //return null;
        //------------------------------------
        var adaptations,
            datas = [],
            i;

        if (!manifest || periodIndex < 0) {
            return datas;
        }

        adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;

        if (adaptations.length === 0) {
            return datas;
        }

        for (i = 0; i < adaptations.length; i += 1) {
            if (this.getIsText(adaptations[i])) {
                datas.push(adaptations[i]);
            }
        }

        return datas;
    },

    getAudioDatas: function(manifest, periodIndex) {
        "use strict";
        //------------------------------------
        var adaptations,
            datas = [],
            i;

        //return datas;

        if (!manifest || periodIndex < 0) {
            return datas;
        }

        adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;

        if (adaptations.length === 0) {
            return datas;
        }
        
        for (i = 0; i < adaptations.length; i += 1) {
            if (this.getIsAudio(adaptations[i])) {
                datas.push(adaptations[i]);
            }
        }

        return datas;
    },

    getSpecificAudioData: function(manifest, periodIndex, language) {
        "use strict";
        var i,
            datas;


        if (!manifest || periodIndex < 0) {
            return null;
        }

        datas = this.getAudioDatas(manifest, periodIndex);
        if (datas.length === 0) {
            return null;
        }

        for (i = 0; i < datas.length; i += 1) {
            if (datas[i].lang === language) {
                return this.processAdaptation(datas[i]);
            }
        }

        //if the specific language has not been found, return the first one.
        return this.processAdaptation(datas[0]);
    },

    getSpecificTextData: function(manifest, periodIndex, language) {
        "use strict";
        var i,
            datas;

        if (!manifest || periodIndex < 0) {
            return null;
        }

        datas = this.getTextDatas(manifest, periodIndex);
        if (datas.length === 0) {
            return null;
        }

        for (i = 0; i < datas.length; i += 1) {
            if (datas[i].lang === language) {
                return this.processAdaptation(datas[i]);
            }
        }

        return this.processAdaptation(datas[0]);
    },

    getCodec: function(adaptation) {
        "use strict";
        var i = 0,
            representation,
            codec = null;

        while ((codec === null) && (i < adaptation.Representation_asArray.length)) {
            representation = adaptation.Representation_asArray[i];
            if (representation.codecs !== null && representation.codecs !== "") {
                codec = (representation.mimeType + ';codecs="' + representation.codecs + '"');
            }
            i++;
        }

        return codec;
    },

    getMimeType: function(data) {
        "use strict";
        return data.Representation_asArray[0].mimeType;
    },

    getKID: function(data) {
        "use strict";

        if (!data || !data.hasOwnProperty("cenc:default_KID")) {
            return null;
        }
        return data["cenc:default_KID"];
    },

    getContentProtectionData: function(data) {
        "use strict";
        if (!data || !data.hasOwnProperty("ContentProtection_asArray") || data.ContentProtection_asArray.length === 0) {
            return null;
        }
        return data.ContentProtection_asArray;
    },

    getIsDynamic: function(manifest) {
        "use strict";
        var isDynamic = false,
            LIVE_TYPE = "dynamic";

        if (manifest && manifest.hasOwnProperty("type")) {
            isDynamic = (manifest.type === LIVE_TYPE);
        }

        return isDynamic;
    },

    getIsDVR: function(manifest) {
        "use strict";
        var isDynamic = this.getIsDynamic(manifest),
            containsDVR,
            isDVR;

        containsDVR = !isNaN(manifest.timeShiftBufferDepth);
        isDVR = (isDynamic && containsDVR);

        return isDVR;
    },

    getIsOnDemand: function(manifest) {
        "use strict";
        var isOnDemand = false;

        if (manifest.profiles && manifest.profiles.length > 0) {
            isOnDemand = (manifest.profiles.indexOf("urn:mpeg:dash:profile:isoff-on-demand:2011") !== -1);
        }

        return isOnDemand;
    },

    getDuration: function(manifest) {
        var mpdDuration;

        //@mediaPresentationDuration specifies the duration of the entire Media Presentation.
        //If the attribute is not present, the duration of the Media Presentation is unknown.
        if (manifest && manifest.hasOwnProperty("mediaPresentationDuration")) {
            mpdDuration = manifest.mediaPresentationDuration;
        } else {
            mpdDuration = Number.POSITIVE_INFINITY;
        }

        return mpdDuration;
    },

    getBandwidth: function(representation) {
        "use strict";
        return representation.bandwidth;
    },

    getRefreshDelay: function(manifest) {
        "use strict";
        var delay = NaN,
            minDelay = 2;

        if (manifest.hasOwnProperty("minimumUpdatePeriod")) {
            delay = Math.max(parseFloat(manifest.minimumUpdatePeriod), minDelay);
        }

        return delay;
    },

    getRepresentationCount: function(adaptation) {
        "use strict";
        if (adaptation) {
            return adaptation.Representation_asArray.length;
        }

        return null;
    },

    getRepresentationFor: function(index, data) {
        "use strict";
        return data.Representation_asArray[index];
    },

    getRepresentationsForAdaptation: function(manifest, adaptation) {
        var a,
            representations = [],
            representation,
            initialization,
            segmentInfo,
            r;

        if (manifest && adaptation) {
            a = this.processAdaptation(manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index]);

            for (var i = 0; i < a.Representation_asArray.length; i += 1) {
                r = a.Representation_asArray[i];
                representation = new Dash.vo.Representation();
                representation.index = i;
                representation.adaptation = adaptation;

                if (r.hasOwnProperty("id")) {
                    representation.id = r.id;
                }

                if (r.hasOwnProperty("SegmentBase")) {
                    segmentInfo = r.SegmentBase;
                    representation.segmentInfoType = "SegmentBase";
                } else if (r.hasOwnProperty("SegmentList")) {
                    segmentInfo = r.SegmentList;
                    representation.segmentInfoType = "SegmentList";
                    representation.useCalculatedLiveEdgeTime = true;
                } else if (r.hasOwnProperty("SegmentTemplate")) {
                    segmentInfo = r.SegmentTemplate;

                    if (segmentInfo.hasOwnProperty("SegmentTimeline")) {
                        representation.segmentInfoType = "SegmentTimeline";
                    } else {
                        representation.segmentInfoType = "SegmentTemplate";
                    }

                    if (segmentInfo.hasOwnProperty("initialization")) {
                        representation.initialization = segmentInfo.initialization.split("$Bandwidth$")
                            .join(r.bandwidth).split("$RepresentationID$").join(r.id);
                    }
                } else {
                    segmentInfo = r.BaseURL;
                    representation.segmentInfoType = "BaseURL";
                }

                if (segmentInfo.hasOwnProperty("Initialization")) {
                    initialization = segmentInfo.Initialization;
                    if (initialization.hasOwnProperty("sourceURL")) {
                        representation.initialization = initialization.sourceURL;
                    } else if (initialization.hasOwnProperty("range")) {
                        representation.initialization = r.BaseURL;
                        representation.range = initialization.range;
                    }
                } else if (r.hasOwnProperty("mimeType") && this.getIsTextTrack(r.mimeType)) {
                    representation.initialization = r.BaseURL;
                    representation.range = 0;
                }

                if (segmentInfo.hasOwnProperty("timescale")) {
                    representation.timescale = segmentInfo.timescale;
                }
                if (segmentInfo.hasOwnProperty("duration")) {
                    // TODO according to the spec @maxSegmentDuration specifies the maximum duration of any Segment in any Representation in the Media Presentation
                    // It is also said that for a SegmentTimeline any @d value shall not exceed the value of MPD@maxSegmentDuration, but nothing is said about
                    // SegmentTemplate @duration attribute. We need to find out if @maxSegmentDuration should be used instead of calculated duration if the the duration
                    // exceeds @maxSegmentDuration
                    //representation.segmentDuration = Math.min(segmentInfo.duration / representation.timescale, adaptation.period.mpd.maxSegmentDuration);
                    representation.segmentDuration = segmentInfo.duration / representation.timescale;
                }
                if (segmentInfo.hasOwnProperty("startNumber")) {
                    representation.startNumber = segmentInfo.startNumber;
                }
                if (segmentInfo.hasOwnProperty("indexRange")) {
                    representation.indexRange = segmentInfo.indexRange;
                }
                if (segmentInfo.hasOwnProperty("presentationTimeOffset")) {
                    representation.presentationTimeOffset = segmentInfo.presentationTimeOffset / representation.timescale;
                }

                representation.MSETimeOffset = this.timelineConverter.calcMSETimeOffset(representation);
                representations.push(representation);
            }
        }

        return representations;
    },

    getAdaptationsForPeriod: function(manifest, period) {
        var p = manifest === null ? null : manifest.Period_asArray[period.index],
            adaptations = [],
            adaptationSet;

        if (p) {
            for (var i = 0; i < p.AdaptationSet_asArray.length; i += 1) {
                adaptationSet = new Dash.vo.AdaptationSet();
                adaptationSet.index = i;
                adaptationSet.period = period;
                adaptations.push(adaptationSet);
            }
        }

        return adaptations;
    },

    getRegularPeriods: function(manifest, mpd) {
        var periods = [],
            isDynamic = this.getIsDynamic(manifest),
            i,
            len,
            p1 = null,
            p = null,
            vo1 = null,
            vo = null;

        for (i = 0, len = manifest.Period_asArray.length; i < len; i += 1) {
            p = manifest.Period_asArray[i];

            // If the attribute @start is present in the Period, then the
            // Period is a regular Period and the PeriodStart is equal
            // to the value of this attribute.
            if (p.hasOwnProperty("start")) {
                vo = new Dash.vo.Period();
                vo.start = p.start;
            }
            // If the @start attribute is absent, but the previous Period
            // element contains a @duration attribute then then this new
            // Period is also a regular Period. The start time of the new
            // Period PeriodStart is the sum of the start time of the previous
            // Period PeriodStart and the value of the attribute @duration
            // of the previous Period.
            else if (p1 !== null && p.hasOwnProperty("duration")) {
                vo = new Dash.vo.Period();
                vo.start = vo1.start + vo1.duration;
                vo.duration = p.duration;
            }
            // If (i) @start attribute is absent, and (ii) the Period element
            // is the first in the MPD, and (iii) the MPD@type is 'static',
            // then the PeriodStart time shall be set to zero.
            else if (i === 0 && !isDynamic) {
                vo = new Dash.vo.Period();
                vo.start = 0;
            }

            // The Period extends until the PeriodStart of the next Period.
            // The difference between the PeriodStart time of a Period and
            // the PeriodStart time of the following Period.
            if (vo1 !== null && isNaN(vo1.duration)) {
                vo1.duration = vo.start - vo1.start;
            }

            if (vo !== null && p.hasOwnProperty("id")) {
                vo.id = p.id;
            }

            if (vo !== null && p.hasOwnProperty("duration")) {
                vo.duration = p.duration;
            }

            if (vo !== null) {
                vo.index = i;
                vo.mpd = mpd;
                periods.push(vo);
            }

            p1 = p;
            p = null;
            vo1 = vo;
            vo = null;
        }

        if (periods.length === 0) {
            return periods;
        }

        mpd.checkTime = this.getCheckTime(manifest, periods[0]);

        // The last Period extends until the end of the Media Presentation.
        // The difference between the PeriodStart time of the last Period
        // and the mpd duration
        if (vo1 !== null && isNaN(vo1.duration)) {
            vo1.duration = this.getEndTimeForLastPeriod(mpd) - vo1.start;
        }

        return periods;
    },

    getMpd: function(manifest) {
        var mpd = new Dash.vo.Mpd();

        if (manifest) {
            mpd.manifest = manifest;

            if (manifest.hasOwnProperty("availabilityStartTime")) {
                mpd.availabilityStartTime = new Date(manifest.availabilityStartTime.getTime());
            } else {
                mpd.availabilityStartTime = new Date(manifest.mpdLoadedTime.getTime());
            }

            if (manifest.hasOwnProperty("availabilityEndTime")) {
                mpd.availabilityEndTime = new Date(manifest.availabilityEndTime.getTime());
            }

            if (manifest.hasOwnProperty("suggestedPresentationDelay")) {
                mpd.suggestedPresentationDelay = manifest.suggestedPresentationDelay;
            }

            if (manifest.hasOwnProperty("timeShiftBufferDepth")) {
                mpd.timeShiftBufferDepth = manifest.timeShiftBufferDepth;
            }

            if (manifest.hasOwnProperty("maxSegmentDuration")) {
                mpd.maxSegmentDuration = manifest.maxSegmentDuration;
            }

            return mpd;
        }

        return null;
    },

    getFetchTime: function(manifest, period) {
        // FetchTime is defined as the time at which the server processes the request for the MPD from the client.
        // TODO The client typically should not use the time at which it actually successfully received the MPD, but should
        // take into account delay due to MPD delivery and processing. The fetch is considered successful fetching
        // either if the client obtains an updated MPD or the client verifies that the MPD has not been updated since the previous fetching.
        var fetchTime = this.timelineConverter.calcPresentationTimeFromWallTime(manifest.mpdLoadedTime, period);

        return fetchTime;
    },

    getCheckTime: function(manifest, period) {
        var checkTime = NaN;

        // If the MPD@minimumUpdatePeriod attribute in the client is provided, then the check time is defined as the
        // sum of the fetch time of this operating MPD and the value of this attribute,
        // i.e. CheckTime = FetchTime + MPD@minimumUpdatePeriod.
        if (manifest.hasOwnProperty("minimumUpdatePeriod")) {
            checkTime = this.getFetchTime(manifest, period) + manifest.minimumUpdatePeriod;
        }

        return checkTime;
    },

    getEndTimeForLastPeriod: function(mpd) {
        var periodEnd;

        // if the MPD@mediaPresentationDuration attribute is present, then PeriodEndTime is defined as the end time of the Media Presentation.
        // if the MPD@mediaPresentationDuration attribute is not present, then PeriodEndTime is defined as FetchTime + MPD@minimumUpdatePeriod

        if (mpd.manifest.mediaPresentationDuration) {
            periodEnd = mpd.manifest.mediaPresentationDuration;
        } else if (!isNaN(mpd.checkTime)) {
            // in this case the Period End Time should match CheckTime
            periodEnd = mpd.checkTime;
        } else {
            return new Error("Must have @mediaPresentationDuration or @minimumUpdatePeriod on MPD or an explicit @duration on the last period.");
        }

        return periodEnd;
    },

    getEventsForPeriod: function(manifest, period) {
        var periodArray = manifest === null ? null : manifest.Period_asArray,
            eventStreams = periodArray === null ? null : periodArray[period.index].EventStream_asArray,
            events = [];

        if (eventStreams) {
            for (var i = 0; i < eventStreams.length; i += 1) {
                var eventStream = new Dash.vo.EventStream();
                eventStream.period = period;
                eventStream.timescale = 1;

                if (eventStreams[i].hasOwnProperty("schemeIdUri")) {
                    eventStream.schemeIdUri = eventStreams[i].schemeIdUri;
                } else {
                    throw "Invalid EventStream. SchemeIdUri has to be set";
                }
                if (eventStreams[i].hasOwnProperty("timescale")) {
                    eventStream.timescale = eventStreams[i].timescale;
                }
                if (eventStreams[i].hasOwnProperty("value")) {
                    eventStream.value = eventStreams[i].value;
                }
                for (var j = 0; j < eventStreams[i].Event_asArray.length; j += 1) {
                    var event = new Dash.vo.Event();
                    event.presentationTime = 0;
                    event.eventStream = eventStream;

                    if (eventStreams[i].Event_asArray[j].hasOwnProperty("presentationTime")) {
                        event.presentationTime = eventStreams[i].Event_asArray[j].presentationTime;
                    }
                    if (eventStreams[i].Event_asArray[j].hasOwnProperty("duration")) {
                        event.duration = eventStreams[i].Event_asArray[j].duration;
                    }
                    if (eventStreams[i].Event_asArray[j].hasOwnProperty("id")) {
                        event.id = eventStreams[i].Event_asArray[j].id;
                    }
                    events.push(event);
                }
            }
        }

        return events;
    },

    getEventStreamForAdaptationSet: function(data) {

        var eventStreams = [],
            inbandStreams;

        if (data) {
            inbandStreams = data.InbandEventStream_asArray;

            if (inbandStreams) {
                for (var i = 0; i < inbandStreams.length; i += 1) {
                    var eventStream = new Dash.vo.EventStream();
                    eventStream.timescale = 1;

                    if (inbandStreams[i].hasOwnProperty("schemeIdUri")) {
                        eventStream.schemeIdUri = inbandStreams[i].schemeIdUri;
                    } else {
                        throw "Invalid EventStream. SchemeIdUri has to be set";
                    }
                    if (inbandStreams[i].hasOwnProperty("timescale")) {
                        eventStream.timescale = inbandStreams[i].timescale;
                    }
                    if (inbandStreams[i].hasOwnProperty("value")) {
                        eventStream.value = inbandStreams[i].value;
                    }
                    eventStreams.push(eventStream);
                }
            }
        }

        return eventStreams;
    },

    getEventStreamForRepresentation: function(data, representation) {

        var eventStreams = [],
            inbandStreams;

        if (data && representation) {

            inbandStreams = data.Representation_asArray[representation.index].InbandEventStream_asArray;

            if (inbandStreams) {
                for (var i = 0; i < inbandStreams.length; i++) {
                    var eventStream = new Dash.vo.EventStream();
                    eventStream.timescale = 1;
                    eventStream.representation = representation;

                    if (inbandStreams[i].hasOwnProperty("schemeIdUri")) {
                        eventStream.schemeIdUri = inbandStreams[i].schemeIdUri;
                    } else {
                        throw "Invalid EventStream. SchemeIdUri has to be set";
                    }
                    if (inbandStreams[i].hasOwnProperty("timescale")) {
                        eventStream.timescale = inbandStreams[i].timescale;
                    }
                    if (inbandStreams[i].hasOwnProperty("value")) {
                        eventStream.value = inbandStreams[i].value;
                    }
                    eventStreams.push(eventStream);
                }
            }
        }

        return eventStreams;

    },

    getRepresentationBandwidth: function(adaptation, index) {
        return this.getBandwidth(this.getRepresentationFor(index, adaptation));
    }

};