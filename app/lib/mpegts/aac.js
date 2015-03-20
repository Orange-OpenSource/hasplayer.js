
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

// Sampling frequency dependent on sampling_frequency_index
mpegts.aac.SAMPLING_FREQUENCY = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025,  8000, 7350];

mpegts.aac.getAudioSpecificConfig = function (data) { // data as Uint8Array

    // We need to parse the beginning of the adts_frame in order to get
    // object type, sampling frequency and channel configuration
    var profile = mpegts.binary.getValueFromByte(data[2], 0, 2);
    var sampling_frequency_index = mpegts.binary.getValueFromByte(data[2], 2, 4);
    var channel_configuration = mpegts.binary.getValueFrom2Bytes(data.subarray(2, 5), 7, 3);

    var audioSpecificConfig = new Uint8Array(2);

    // audioObjectType = profile = MPEG-4 Audio Object Type minus 1
    audioSpecificConfig[0] = (profile + 1) << 3;

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

mpegts.aac.parseADTS = function (data) { // data as Uint8Array

    var aacFrames = [],
        adtsHeader = {},
        aacFrame,
        adtsFrameIndex,
        i = 0;

    while (i < data.length) {
        // = adts_frame
        adtsFrameIndex = i;

        // == adts_fixed_header
        adtsHeader.syncword = (data[i] << 4) + ((data[i+1] & 0xF0) >> 4);
        // adtsHeader.ID
        // adtsHeader.layer
        adtsHeader.protection_absent = data[i+1] & 0x01;
        // adtsHeader.profile
        adtsHeader.sampling_frequency_index = (data[i+2] & 0x3C) >> 2;
        // adtsHeader.private_bit
        adtsHeader.channel_configuration = ((data[i+2] & 0x01) << 1) + ((data[i+3] & 0xC0) >> 6);
        // adtsHeader.original_copy
        // adtsHeader.home

        // == adts_variable_header
        // adtsHeader.copyright_identification_bit
        // adtsHeader.copyright_identification_start
        adtsHeader.aac_frame_length = ((data[i+3] & 0x03) << 11) + (data[i+4] << 3) + ((data[i+5] & 0xE0) >> 5);
        // adtsHeader.adts_buffer_fullness
        adtsHeader.number_of_raw_data_blocks_in_frame = (data[i+6] & 0x03) >> 2;

        i += 7;

        if (adtsHeader.number_of_raw_data_blocks_in_frame === 0) {
            // == adts_error_check()
            if (adtsHeader.protection_absent === 0) {
                i += 2;
            }

            // == raw_data_block() => create AAC frame
            aacFrame = {};
            aacFrame.offset = i;
            aacFrame.length = adtsHeader.aac_frame_length - (i - adtsFrameIndex);

            aacFrames.push(aacFrame);

            i += aacFrame.length;
        } else {
            // == adts_header_error_check
        }
    }

    return aacFrames;
};

