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

mpegts.Pts = function(data) {

    var low,
        high;

    //initialize an unsigned 64 bits long number
    //this.m_lPTS = goog.math.Long.fromNumber(0);

    //=> PTS is defined on 33 bits
    //=> In the first byte, bit number 2 to 4 is useful
    var bits3230 = data[0] >> 1 & 0x7;

    //thirty-third bit in the high member
    high = bits3230 >> 2;
    //32 and 31 bits in th low member, shift by 30 bits
    low = ((bits3230 & 0x3) << 30) >>> 0; //=> http://www.codeonastick.com/2013/06/javascript-convert-signed-integer-to.html unsigned int!!!!!!

    //=> In the second byte, all the bits are useful
    var bits2922 = data[1];
    low = (low | (bits2922 << 22)) >>> 0; //=> http://www.codeonastick.com/2013/06/javascript-convert-signed-integer-to.html unsigned int!!!!!!

    //=> In the third byte, bit number 2 to 8 is useful
    var bits2115 = data[2] >> 1;
    low = (low | (bits2115 << 15)) >>> 0; //=> http://www.codeonastick.com/2013/06/javascript-convert-signed-integer-to.html unsigned int!!!!!!

    //=> In the fourth byte, all the bits are useful
    var bits1407 = data[3];
    low = (low | (bits1407 << 7)) >>> 0; //=> http://www.codeonastick.com/2013/06/javascript-convert-signed-integer-to.html unsigned int!!!!!!

    //=> In the fifth byte, bit number 2 to 8 is useful
    var bits0701 = data[4] >> 1;
    low = (low | bits0701) >>> 0; //=> http://www.codeonastick.com/2013/06/javascript-convert-signed-integer-to.html unsigned int!!!!!!

    this.m_lPTS = goog.math.Long.fromBits(low, high).toNumber();
    this.m_fPTS = this.m_lPTS / mpegts.Pts.prototype.SYSTEM_CLOCK_FREQUENCY;
};

/**
 * Returns the PTS value in units of system clock frequency.
 * @return the PTS value in units of system clock frequency
 */
mpegts.Pts.prototype.getValue = function() {
    return this.m_lPTS;
};

/**
 * Returns the PTS value in seconds.
 * @return the PTS value in seconds
 */
mpegts.Pts.prototype.getValueInSeconds = function() {
    return this.m_fPTS;
};

mpegts.Pts.prototype.SYSTEM_CLOCK_FREQUENCY = 90000;