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

Mss.dependencies.MssFragmentController = function () {
    "use strict";

    var getIndex = function (adaptation, manifest) {

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

        processTfrf = function(tfrf, adaptation) {

            var manifest = rslt.manifestModel.getValue(),
                segmentsUpdated = false,
                // Get adaptation's segment timeline (always a SegmentTimeline in Smooth Streaming use case)
                segments = adaptation.SegmentTemplate.SegmentTimeline.S,
                entries = tfrf.entry,
                fragment_absolute_time = 0,
                fragment_duration = 0,
                segment = null,
                r = 0,
                t = 0,
                i = 0,
                availabilityStartTime = null;

            // Go through tfrf entries
            while (i < entries.length)
            {
                fragment_absolute_time = entries[i].fragment_absolute_time;
                fragment_duration = entries[i].fragment_duration;

                // Get timestamp of the last segment
                segment = segments[segments.length-1];
                r = (segment.r === undefined)?0:segment.r;
                t = segment.t + (segment.d * r);

                if (fragment_absolute_time > t)
                {
                    rslt.debug.log("[MssFragmentController] Add new segment - t = " + (fragment_absolute_time / 10000000.0));
                    if (fragment_duration === segment.d)
                    {
                        segment.r = r + 1;
                    }
                    else
                    {
                        segments.push({
                            't': fragment_absolute_time,
                            'd': fragment_duration
                        });
                    }
                    segmentsUpdated = true;
                }

                i += 1;
            }

            // In case we have added some segments, we also check if some out of date segments
            // may not been removed
            if (segmentsUpdated) {

                // Get timestamp of the last segment
                segment = segments[segments.length-1];
                r = (segment.r === undefined)?0:segment.r;
                t = segment.t + (segment.d * r);

                // Determine the segments' availability start time
                availabilityStartTime = t - (manifest.timeShiftBufferDepth * 10000000);

                // Remove segments prior to availability start time
                segment = segments[0];
                while (segment.t < availabilityStartTime)
                {
                    rslt.debug.log("[MssFragmentController] Remove segment  - t = " + (segment.t / 10000000.0));
                    if ((segment.r !== undefined) && (segment.r > 0))
                    {
                        segment.t += segment.d;
                        segment.r -= 1;
                    }
                    else
                    {
                        segments.splice(0, 1);
                    }
                    segment = segments[0];
                }
            }

            return segmentsUpdated;
        },

        convertFragment = function (data, request, adaptation) {

            var segmentsUpdated = false;

            // Get track id corresponding to adaptation set
            var manifest = rslt.manifestModel.getValue();
            var trackId = getIndex(adaptation, manifest) + 1; // +1 since track_id shall start from '1'

            // Create new fragment
            var fragment = new mp4lib.deserialize(data);

            // Get references en boxes
            var moof = mp4lib.getBoxByType(fragment, "moof");
            var mdat = mp4lib.getBoxByType(fragment, "mdat");
            var traf = mp4lib.getBoxByType(moof, "traf");
            var trun = mp4lib.getBoxByType(traf, "trun");
            var tfhd = mp4lib.getBoxByType(traf, "tfhd");
            
            //if protected content
            var sepiff = mp4lib.getBoxByType(traf,"sepiff");
            if(sepiff !== null) {

                sepiff.boxtype = "senc";
                // Create Sample Auxiliary Information Offsets Box box (saio) 
                var saio = new mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox();
                saio.version = 0;
                saio.flags = 0;
                saio.entry_count = 1;
                saio.offset = [];
                
                var saiz = new mp4lib.boxes.SampleAuxiliaryInformationSizesBox();
                saiz.version = 0;
                saiz.flags = 0;
                saiz.sample_count = sepiff.sample_count;
                saiz.default_sample_info_size = 0;

                saiz.sample_info_size = [];

                var sizedifferent = false;
                // get for each sample_info the size
                for (var i = 0; i < sepiff.sample_count; i++) {
                    saiz.sample_info_size[i] = 8+(sepiff.entry[i].NumberOfEntries*6)+2;
                    //8 (Init vector size) + NumberOfEntries*(clear (2) +crypted (4))+ 2 (numberofEntries size (2))
                    if(i>1) {
                        if (saiz.sample_info_size[i] != saiz.sample_info_size[i-1]) {
                            sizedifferent = true;
                        }
                    }
                }
                
                //all the samples have the same size
                //det default size and remove the table.
                if (sizedifferent === false) {
                    saiz.default_sample_info_size = saiz.sample_info_size[0];
                    saiz.sample_info_size = [];
                }

                //add saio and saiz box
                traf.boxes.push(saiz);
                traf.boxes.push(saio);
            }

            // Update tfhd.track_ID field
            tfhd.track_ID = trackId;

            // Process tfxd boxes
            // This box provide absolute timestamp but we take the segment start time for tfdt
            mp4lib.removeBoxByType(traf, "tfxd");

            // Create and add tfdt box
            var tfdt = mp4lib.getBoxByType(traf, "tfdt");
            if (tfdt === null) {
                tfdt = new mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox();
                tfdt.version = 1;
                tfdt.baseMediaDecodeTime = Math.floor(request.startTime * request.timescale);
                traf.boxes.push(tfdt);
            }

            // Process tfrf box
            var tfrf = mp4lib.getBoxByType(traf, "tfrf");
            if (tfrf !== null) {
                segmentsUpdated = processTfrf(tfrf, adaptation);
                mp4lib.removeBoxByType(traf, "tfrf");
            }

            // Before determining new size of the converted fragment we update some box flags related to data offset
            tfhd.flags &= 0xFFFFFE; // set tfhd.base-data-offset-present to false
            tfhd.flags |= 0x020000; // set tfhd.default-base-is-moof to true
            trun.flags |= 0x000001; // set trun.data-offset-present to true
            trun.data_offset = 0;   // Set a default value for trun.data_offset

            if(sepiff !== null) {
                //+8 => box size + type
                var moofpositionInFragment = mp4lib.getBoxPositionByType(fragment,"moof")+8;
                var trafpositionInMoof = mp4lib.getBoxPositionByType(moof,"traf")+8;
                var sencpositionInTraf = mp4lib.getBoxPositionByType(traf,"senc")+8;
                // set offset from begin fragment to the first IV in senc box
                saio.offset[0] = moofpositionInFragment+trafpositionInMoof+sencpositionInTraf+8;//flags (3) + version (1) + sampleCount (4)
            }

            // Determine new size of the converted fragment
            // and allocate new data buffer
            var lp = new mp4lib.fieldProcessors.LengthCounterBoxFieldsProcessor(fragment);
            fragment._processFields(lp);
            var new_data = new Uint8Array(lp.res);

            // updata trun.data_offset field = offset of first data byte (inside mdat box)
            trun.data_offset = lp.res - mdat.size + 8; // 8 = 'size' + 'type' mdat fields length

            // PATCH tfdt and trun samples timestamp values in case of live streams within chrome
            if ((navigator.userAgent.indexOf("Chrome") >= 0) && (manifest.type === "dynamic")) {
                tfdt.baseMediaDecodeTime /= 1000;
                for  (var i = 0; i < trun.samples_table.length; i++) {
                    if (trun.samples_table[i].sample_composition_time_offset > 0) {
                        trun.samples_table[i].sample_composition_time_offset /= 1000;
                    }
                    if (trun.samples_table[i].sample_duration > 0) {
                        trun.samples_table[i].sample_duration /= 1000;
                    }
                }
            }

            // Serialize converted fragment into output data buffer
            var sp = new mp4lib.fieldProcessors.SerializationBoxFieldsProcessor(fragment, new_data, 0);
            fragment._processFields(sp);

            return {
                bytes: new_data,
                segmentsUpdated: segmentsUpdated
            };
        };
    
    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.FragmentController);

    rslt.manifestModel = undefined;
    rslt.mp4Processor = undefined;

    rslt.process = function (bytes, request, representations) {

        var result = null,
            manifest = this.manifestModel.getValue();

        if (bytes !== null && bytes !== undefined && bytes.byteLength > 0) {
            result = new Uint8Array(bytes);
        }

        if (request && (request.type === "Media Segment") && representations && (representations.length > 0)) {
            // Get adaptation containing provided representations
            // (Note: here representations is of type Dash.vo.Representation)
            var adaptation = manifest.Period_asArray[representations[0].adaptation.period.index].AdaptationSet_asArray[representations[0].adaptation.index];
            var res = convertFragment(result, request, adaptation);
            result = res.bytes;
            if (res.segmentsUpdated === true) {
                // If some segments have been added or removed, then
                // we reset the list of segments for each representation
                for (var i = 0; i < representations.length; i++) {
                    representations[i].segments = null;
                }
            }
        }

        // PATCH timescale value in mvhd and mdhd boxes in case of live streams within chrome
        // Note: request = 'undefined' in case of initialization segments
        if ((request === undefined) && (navigator.userAgent.indexOf("Chrome") >= 0) && (manifest.type === "dynamic")) {
            var init_segment = mp4lib.deserialize(result);
            var moov = mp4lib.getBoxByType(init_segment, "moov");
            var mvhd = mp4lib.getBoxByType(moov, "mvhd");
            var trak = mp4lib.getBoxByType(moov, "trak");
            var mdia = mp4lib.getBoxByType(trak, "mdia");
            var mdhd = mp4lib.getBoxByType(mdia, "mdhd");

            mvhd.timescale /= 1000;
            mdhd.timescale /= 1000;

            result = mp4lib.serialize(init_segment);
        }

        return Q.when(result);
    };

    return rslt;
};

Mss.dependencies.MssFragmentController.prototype = {
    constructor: Mss.dependencies.MssFragmentController
};
