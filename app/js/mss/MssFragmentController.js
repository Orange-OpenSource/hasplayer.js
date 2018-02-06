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
Mss.dependencies.MssFragmentController = function() {
    "use strict";

    var processTfrf = function(request, tfrf, tfdt, adaptation) {
            var manifest = this.manifestModel.getValue(),
                segments = adaptation.SegmentTemplate.SegmentTimeline.S_asArray,
                timescale = adaptation.SegmentTemplate.timescale,
                entries = tfrf.entry,
                entry,
                segment = null,
                segmentTime,
                t = 0,
                availabilityStartTime = null,
                type = adaptation.type,
                range;

            // Process tfrf only for live or start-over streams
            if (!this.manifestExt.getIsDynamic(manifest) && !this.manifestExt.getIsStartOver(manifest)) {
                return;
            }

            if (entries.length === 0) {
                return;
            }

            // Consider only first tfrf entry (to avoid pre-condition failure on fragment info requests)
            entry = entries[0];

            // !! For tfrf fragment_absolute_time and fragment_duration are returned as goog.math.Long values (see mp4lib)

            // Check if time is not greater than Number.MAX_SAFE_INTEGER (2^53-1), see MssParser
            // => fragment_absolute_timeManifest = original timestamp value as a string (for constructing the fragment request url, see DashHandler)
            // => fragment_absolute_time = number value of timestamp (maybe rounded value, but only for 0.1 microsecond)
            if (entry.fragment_absolute_time.greaterThan(goog.math.Long.fromNumber(Number.MAX_SAFE_INTEGER))) {
                entry.fragment_absolute_timeManifest = entry.fragment_absolute_time.toString();
            }

            // Convert goog.math.Long to Number values
            entry.fragment_absolute_time = entry.fragment_absolute_time.toNumber();
            entry.fragment_duration = entry.fragment_duration.toNumber();

            // In case of start-over streams, check if we have reached end of original manifest duration (set in timeShiftBufferDepth)
            // => then do not update anymore timeline
            if (this.manifestExt.getIsStartOver(manifest)) {
                // Get first segment time
                segmentTime = segments[0].tManifest ? parseFloat(segments[0].tManifest) : segments[0].t;
                if (entry.fragment_absolute_time > (segmentTime + (manifest.timeShiftBufferDepth * timescale))) {
                    return;
                }                    
            }

            // Get last segment time
            segmentTime = segments[segments.length - 1].tManifest ? parseFloat(segments[segments.length - 1].tManifest) : segments[segments.length - 1].t;

            // Check if we have to append new segment to timeline
            if (entry.fragment_absolute_time <= segmentTime) {
                return;
            }

            this.debug.log("[MssFragmentController][" + type + "] Add new segment - t = " + (entry.fragment_absolute_time / timescale));
            segment = {};
            segment.t = entry.fragment_absolute_time;
            segment.d = entry.fragment_duration;
            // If timestamps starts at 0 relative to 1st segment (dynamic to static) then update segment time
            if (segments[0].tManifest) {
                segment.t -= parseFloat(segments[0].tManifest) - segments[0].t;
            }
            // Set tManifest either in case of timestamps greater then 2^53 or in case of dynamic to static streams
            if (entry.fragment_absolute_timeManifest) {
                segment.tManifest = entry.fragment_absolute_timeManifest;
            } else if (segments[0].tManifest) {
                segment.tManifest = entry.fragment_absolute_time;
            }
            segments.push(segment);

            // In case of static start-over streams, update content duration
            if (this.manifestExt.getIsStartOver(manifest)) {
                if (type === 'video') {
                    segment = segments[segments.length - 1];
                    var end = (segment.t + segment.d) / timescale;
                    if (end > this.videoModel.getDuration()) {
                        this.system.notify("sourceDurationChanged", end);
                    }    
                }
                return;
            }
            // In case of live streams, update segment timeline according to DVR window
            else if (manifest.timeShiftBufferDepth && manifest.timeShiftBufferDepth > 0) {
                // Get timestamp of the last segment
                segment = segments[segments.length - 1];
                t = segment.t;

                // Determine the segments' availability start time
                availabilityStartTime = t - (manifest.timeShiftBufferDepth * timescale);

                // Remove segments prior to availability start time
                segment = segments[0];
                while (segment.t < availabilityStartTime) {
                    this.debug.log("[MssFragmentController][" + type + "] Remove segment  - t = " + (segment.t / timescale));
                    segments.splice(0, 1);
                    segment = segments[0];
                }

                // Update DVR window range => set range's end to end time of current segment
                range = {
                    start: segments[0].t / adaptation.SegmentTemplate.timescale,
                    end: (tfdt.baseMediaDecodeTime / adaptation.SegmentTemplate.timescale) + request.duration
                };
                var dvrInfos = this.metricsModel.getMetricsFor(adaptation.type).DVRInfo;
                if (dvrInfos && dvrInfos.length > 0 && range.end > dvrInfos[dvrInfos.length - 1].range.end) {
                    this.metricsModel.addDVRInfo(adaptation.type, new Date(), range);
                }
            }

            return;
        },

        updateSegmentsList = function(bytes, request, adaptation) {
            var fragment = null,
                moof = null,
                traf = null,
                tfdt = null,
                tfrf = null,
                pos;

            // Create new fragment
            fragment = mp4lib.deserialize(bytes);
            moof = fragment.getBoxByType("moof");
            traf = moof.getBoxByType("traf");
            // Create and add tfdt box
            tfdt = traf.getBoxByType("tfdt");
            if (tfdt === null) {
                tfdt = new mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox();
                tfdt.version = 1;
                tfdt.flags = 0;
                tfdt.baseMediaDecodeTime = Math.floor(request.startTime * request.timescale);
                // Insert tfdt box just after the tfhd box (therefore before the trun box)
                pos = traf.getBoxIndexByType("tfhd");
                traf.boxes.splice(pos + 1, 0, tfdt);
            }
            // Process tfrf box
            tfrf = traf.getBoxesByType("tfrf");
            if (tfrf === null || tfrf.length === 0) {
                throw {
                    name: MediaPlayer.dependencies.ErrorHandler.prototype.MSS_NO_TFRF,
                    message: 'Missing tfrf in live FragmentInfo segment',
                    data: {
                        url: request.url
                    }
                };
            } else {
                processTfrf.call(this, request, tfrf[0], tfdt, adaptation);
            }
        },

        duplicateSample = function(fragment, segmentDuration) {
            var moof = null,
                mdat = null,
                traf = null,
                trun = null,
                tfhd,
                sepiff = null,
                saiz = null,
                i,
                trunEntries,
                trunDuration,
                mdatData;

            // This function duplicates the first sample (from KeyFrame request) to generate a full segment that lasts segmentDuration.

            // Get references on boxes
            moof = fragment.getBoxByType("moof");
            mdat = fragment.getBoxByType("mdat");
            traf = moof.getBoxByType("traf");
            trun = traf.getBoxByType("trun");
            tfhd = traf.getBoxByType("tfhd");

            // Set first sample duration (if not set)
            // (sample duration has to be set for each sample in case we have to modify last sample duration to complete the segment)
            if (!trun.samples_table[0].sample_duration) {
                trun.samples_table[0].sample_duration = tfhd.default_sample_duration;
            }

            // Update trun flags to indicate sample-duration-present flag is set (since we do set sample_duration for each sample)
            trun.flags |= 0x000100;

            // Update tfhd flags to indicate default-sample-duration-present flag is not set (since we do set sample_duration for each sample)
            tfhd.flags &= 0xFFFFF7;

            // Determine number of samples according to the segment duration
            trunEntries = Math.floor(segmentDuration / trun.samples_table[0].sample_duration);

            // Duplicate 1st sample in trun box to complete fragment
            for (i = 0; i < (trunEntries - 1); i++) {
                trun.samples_table.push(trun.samples_table[0]);
            }
            trun.sample_count = trun.samples_table.length;

            // Patch/lengthen the last sample duration if segment not complete
            trunDuration = trunEntries * trun.samples_table[0].sample_duration;
            if (trunDuration < segmentDuration) {
                trun.samples_table[trun.samples_table.length - 1].sample_duration += segmentDuration - trunDuration;
            }

            // Update PIFF Sample Encryption box
            sepiff = traf.getBoxByType("sepiff");
            if (sepiff !== null) {
                // sepiff box may have already all original samples encryption data definition
                // => we keep only first sample entry
                if (sepiff.sample_count > 1) {
                    sepiff.entry = sepiff.entry.slice(0, 1);
                }
                // Then, we duplicate this first entry
                for (i = 0; i < (trunEntries - 1); i += 1) {
                    sepiff.entry.push(sepiff.entry[0]);
                }
                sepiff.sample_count = sepiff.entry.length;
            }

            // Update saiz box
            saiz = traf.getBoxByType("saiz");
            if (saiz !== null) {
                if (saiz.default_sample_info_size === 0) {
                    // Same process as for sepiff box....
                    if (saiz.sample_count > 1) {
                        saiz.sample_info_size = saiz.sample_info_size.slice(0, 1);
                    }
                    for (i = 0; i < (trunEntries - 1); i += 1) {
                        saiz.sample_info_size.push(saiz.sample_info_size[0]);
                    }
                }
                saiz.sample_count = sepiff.entry.length;
            }

            // Duplicate mdat data
            mdatData = mdat.data;
            mdat.data = new Uint8Array(mdatData.length * trun.sample_count);
            for (i = 0; i < trun.sample_count; i++) {
                mdat.data.set(mdatData, mdatData.length * i);
            }
        },

        convertFragment = function(data, request, adaptation) {
            var i = 0,
                // Get track id corresponding to adaptation set
                manifest = this.manifestModel.getValue(),
                trackId = manifest ? this.manifestExt.getIndex(adaptation, manifest) + 1 : -1, // +1 since track_id shall start from '1'
                // Create new fragment
                fragment = mp4lib.deserialize(data),
                moof = null,
                mdat = null,
                traf = null,
                trun = null,
                tfhd = null,
                saio = null,
                sepiff = null,
                saiz = null,
                tfdt = null,
                tfrf = null,
                fragmentDuration,
                sampleDuration,
                pos = -1,
                fragment_size = 0,
                moofPosInFragment = 0,
                trafPosInMoof = 0,
                sencPosInTraf = 0,
                new_data = null;

            if (!fragment) {
                return null;
            }

            // Get references on boxes
            moof = fragment.getBoxByType("moof");
            mdat = fragment.getBoxByType("mdat");
            traf = moof.getBoxByType("traf");
            trun = traf.getBoxByType("trun");
            tfhd = traf.getBoxByType("tfhd");

            // Patch trun and mdat boxes to duplicate first sample in order to have a complete fragment
            // => use case in trick mode where we do request only Key (I) frames, while the <video> element
            // requires continuous stream to enable playback
            sampleDuration = trun.samples_table[0].sample_duration !== undefined ? trun.samples_table[0].sample_duration : tfhd.default_sample_duration;
            fragmentDuration = request.duration * request.timescale;
            if (trun.samples_table.length === 1 && sampleDuration < fragmentDuration) {
                duplicateSample(fragment, fragmentDuration);
            }

            // if (tfhd.default_sample_duration) {
            //     for (i = 0; i < trun.samples_table.length; i++) {
            //         trun.samples_table[i].sample_duration = tfhd.default_sample_duration;
            //     }
            //     trun.flags |= 0x000100;
            //     tfhd.flags &= 0xFFFFF7;
            // }

            // Update tfhd.track_ID field
            tfhd.track_ID = trackId;

            // Process tfxd boxes
            // This box provide absolute timestamp but we take the segment start time for tfdt
            traf.removeBoxByType("tfxd");

            // Create and add tfdt box
            tfdt = traf.getBoxByType("tfdt");
            if (tfdt === null) {
                tfdt = new mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox();
                tfdt.version = 1;
                tfdt.flags = 0;
                tfdt.baseMediaDecodeTime = Math.floor(request.startTime * request.timescale);
                // Insert tfdt box just after the tfhd box (therefore before the trun box)
                pos = traf.getBoxIndexByType("tfhd");
                traf.boxes.splice(pos + 1, 0, tfdt);
            }

            if (manifest.type === 'dynamic')  {
                // Process tfrf box
                tfrf = traf.getBoxesByType("tfrf");
                if (tfrf === null || tfrf.length === 0) {
                    throw {
                        name: MediaPlayer.dependencies.ErrorHandler.prototype.MSS_NO_TFRF,
                        message: 'Missing tfrf in live media segment',
                        data: {
                            url: request.url
                        }
                    };
                } else {
                    processTfrf.call(this, request, tfrf[0], tfdt, adaptation);
                    traf.removeBoxByType("tfrf");
                }
            }

            // If protected content in PIFF1.1 format (sepiff box = Sample Encryption PIFF)
            // => convert sepiff box it into a senc box
            // => create saio and saiz boxes (if not already present)
            sepiff = traf.getBoxByType("sepiff");
            if (sepiff !== null) {
                sepiff.boxtype = "senc";
                sepiff.extended_type = undefined;

                saio = traf.getBoxByType("saio");
                if (saio === null) {
                    // Create Sample Auxiliary Information Offsets Box box (saio)
                    saio = new mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox();
                    saio.version = 0;
                    saio.flags = 0;
                    saio.entry_count = 1;
                    saio.offset = [];

                    saiz = new mp4lib.boxes.SampleAuxiliaryInformationSizesBox();
                    saiz.version = 0;
                    saiz.flags = 0;
                    saiz.sample_count = sepiff.sample_count;
                    saiz.default_sample_info_size = 0;
                    saiz.sample_info_size = [];

                    if (sepiff.flags & 0x02) {
                        // Sub-sample encryption => set sample_info_size for each sample
                        for (i = 0; i < sepiff.sample_count; i += 1) {
                            // 10 = 8 (InitializationVector field size) + 2 (subsample_count field size)
                            // 6 = 2 (BytesOfClearData field size) + 4 (BytesOfEncryptedData field size)
                            saiz.sample_info_size[i] = 10 + (6 * sepiff.entry[i].NumberOfEntries);
                        }
                    } else {
                        // No sub-sample encryption => set default sample_info_size = InitializationVector field size (8)
                        saiz.default_sample_info_size = 8;
                    }

                    //add saio and saiz box
                    traf.boxes.push(saiz);
                    traf.boxes.push(saio);
                }
            }

            // Before determining new size of the converted fragment we update some box flags related to data offset
            tfhd.flags &= 0xFFFFFE; // set tfhd.base-data-offset-present to false
            tfhd.flags |= 0x020000; // set tfhd.default-base-is-moof to true
            trun.flags |= 0x000001; // set trun.data-offset-present to true
            trun.data_offset = 0; // Set a default value for trun.data_offset

            // Determine new size of the converted fragment and allocate new data buffer
            fragment_size = fragment.getLength();

            // Update trun.data_offset field = offset of first data byte (inside mdat box)
            trun.data_offset = fragment_size - mdat.size + 8; // 8 = 'size' + 'type' mdat fields length

            // Update saio box offset field according to new senc box offset
            saio = traf.getBoxByType("saio");
            if (saio !== null) {
                moofPosInFragment = fragment.getBoxOffsetByType("moof");
                trafPosInMoof = moof.getBoxOffsetByType("traf");
                sencPosInTraf = traf.getBoxOffsetByType("senc");
                // Set offset from begin fragment to the first IV field in senc box
                saio.offset[0] = moofPosInFragment + trafPosInMoof + sencPosInTraf + 16; // 16 = box header (12) + sample_count field size (4)
            }

            new_data = mp4lib.serialize(fragment);

            return new_data;
        };

    var rslt = MediaPlayer.utils.copyMethods(MediaPlayer.dependencies.FragmentController);

    rslt.manifestModel = undefined;
    rslt.manifestExt = undefined;
    rslt.metricsModel = undefined;
    rslt.videoModel = undefined;
    rslt.mediaSourceExt = undefined;

    rslt.process = function(bytes, request, representation) {
        var deferred = Q.defer(),
            result = null,
            manifest = this.manifestModel.getValue(),
            adaptation = null;

        if (bytes !== null && bytes !== undefined && bytes.byteLength > 0) {
            result = new Uint8Array(bytes);
        } else {
            deferred.resolve(null);
            return deferred.promise;
        }

        if (manifest && representation) {
            try {
                // Get adaptation containing provided representations
                // (Note: here representations is of type Dash.vo.Representation)
                adaptation = manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index];
                if (request) {
                    if (request.type === "Media Segment") {
                        result = convertFragment.call(this, result, request, adaptation);
                        deferred.resolve(!result ? null : result);
                    } else if (request.type === "FragmentInfo Segment") {
                        updateSegmentsList.call(this, result, request, adaptation);
                        deferred.resolve(result);
                    } else {
                        deferred.resolve(result);
                    }
                }
            } catch (e) {
                deferred.reject(e);
            }
        } else {
            deferred.resolve(result);
        }

        return deferred.promise;
    };

    return rslt;
};

Mss.dependencies.MssFragmentController.prototype = {
    constructor: Mss.dependencies.MssFragmentController
};