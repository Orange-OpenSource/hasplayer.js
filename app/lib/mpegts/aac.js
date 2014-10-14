
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
mpegts.aac.getAudioSpecificConfig = function (data) { // data as Uint8Array

    // We need to parse the beginning of the adts_frame in order to get
    // object type, sampling frequency and channel configuration
    var profile = mpegts.binary.getValueFromByte(data[2], 0, 2);
    var sampling_frequency_index = mpegts.binary.getValueFromByte(data[2], 2, 4);
    var channel_configuration = mpegts.binary.getValueFrom2Bytes(data.subarray(2, 5), 7, 3);

    var audioSpecificConfig = new Uint8Array(2);

    // audioObjectType = profile => profile, the MPEG-4 Audio Object Type minus 1
    audioSpecificConfig[0] = (profile+1) << 3;

    // samplingFrequencyIndex
    audioSpecificConfig[0] |= (sampling_frequency_index & 0x0E) >> 1;
    audioSpecificConfig[1] |= (sampling_frequency_index & 0x01) << 7;

    // channelConfiguration
    audioSpecificConfig[1] |= channel_configuration << 3;

   /*  code for HE AAC v2 to be tested

    var audioSpecificConfig = new Uint8Array(4);

    // audioObjectType = profile => profile, the MPEG-4 Audio Object Type minus 1
    audioSpecificConfig[0] = 29 << 3;

    // samplingFrequencyIndex
    audioSpecificConfig[0] |= (sampling_frequency_index & 0x0E) >> 1;
    audioSpecificConfig[1] |= (sampling_frequency_index & 0x01) << 7;

    // channelConfiguration
    audioSpecificConfig[1] |= channel_configuration << 3;
    
    var extensionSamplingFrequencyIndex = 5;// in HE AAC Extension Sampling frequence

    audioSpecificConfig[1] |= extensionSamplingFrequencyIndex >> 1;
       
    audioSpecificConfig[2] = (extensionSamplingFrequencyIndex << 7) | ((profile+1) << 2);// origin object type equals to 2 => AAC Main Low Complexity
    audioSpecificConfig[3] = 0x0; //alignment bits

   */

    return audioSpecificConfig;
};

mpegts.aac.demuxADTS = function (data) { // data as Uint8Array

    var i = 0,
        samples = [];

    // For each adts_frame we extract the raw frame and convert it into a sample

    // - adts_frame()
    while (i < data.length) {
        var i_frame = 0,
        blockLength;

        // -- adts_fixed_header()
        // --- sync_word
        var syncword = mpegts.binary.getValueFrom2Bytes(data[i+i_frame], 0, 12);
        i_frame++;
        var ID = mpegts.binary.getValueFromByte(data[i+i_frame], 4, 1);
        var layer = mpegts.binary.getValueFromByte(data[i+i_frame], 5, 2);
        var protection_absent = mpegts.binary.getBitFromByte(data[i+i_frame], 7);
        i_frame++;
        var profile = mpegts.binary.getValueFromByte(data[i+i_frame], 0, 2);
        var sampling_frequency_index = mpegts.binary.getValueFromByte(data[i+i_frame], 2, 4);
        var channel_configuration = mpegts.binary.getValueFrom2Bytes(data[i+i_frame], 7, 3);
        i_frame++;

        // -- adts_variable_header()
        var aac_frame_length = mpegts.binary.getValueFrom3Bytes(data[i+i_frame], 6, 13);
        i_frame+=3;
        var num_raw_data_blocks = mpegts.binary.getValueFromByte(data[i+i_frame], 6);
        i_frame++;

        if (num_raw_data_blocks === 0) {
            // ---- adts_error_check()
            if (protection_absent === 0) {
                i += 2;
            }
            // ---- raw_data_block()
            blockLength = aac_frame_length - i_frame;

            // Create AAC frame
            samples.push(new Uint8Array(data, i+i_frame, blockLength));

            /*sample = new Sample();
            sample.dts = sample.pts = pes.getPts();
            sample.duration = (1.0 / AAC_SAMPLING_FREQUENCY[sampling_frequency_index]) * 1024.0 * timescale;
            sample.size = 0;
            sample.data = new Uint8Array(data, i+i_frame, blockLength);

            pts += sample.duration;*/
            i_frame+=blockLength;

            /*SAUSample aacFrame;
            aacFrame.CTS = aacFrame.DTS = sampleTime;
            aacFrame.duration = (unsigned long)((1.0 / (double)g_SamplingFrequency[sampling_frequency_index])
                                                * 1024.0
                                                * (double)TIME_SCALE_100_NANOSECOND_UNIT);
            aacFrame.disc = i == 0?pSample->disc:FALSE;
            aacFrame.sync = TRUE;
            aacFrame.quality_level_index = pSample->quality_level_index;
            aacFrame.size = blockLength;
            aacFrame.data = pFrame + i_frame;
            COutputPin::ProcessAccessUnit(&aacFrame);

            sampleTime += aacFrame.duration;
            i_frame+=blockLength;*/
        }
        else {
            var raw_data_block_position = new Array(num_raw_data_blocks);
            var j;

            // ---- adts_header_error_check()
            if (protection_absent === 0) {
                for (j = 1; j <= num_raw_data_blocks; j++) {
                    raw_data_block_position[j] = mpegts.binary.getValueFrom2Bytes(data[i+i_frame]);
                    i_frame+=2;
                }
                // ----- crc_check
                i_frame+=2;
            }

            for (j = 1; j <= num_raw_data_blocks; j++) {
                // ---- raw_data_block()
                blockLength = (j === num_raw_data_blocks)?
                    (raw_data_block_position[j+1] - raw_data_block_position[j]):
                    (aac_frame_length - raw_data_block_position[j]);
                i_frame+=blockLength;
            }
        }

        i += aac_frame_length;
    }

};

mpegts.aac.SAMPLING_FREQUENCY = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025,  8000, 7350];

