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

/**
* UTF-16 (LE or BE)
*
* RFC2781: UTF-16, an encoding of ISO 10646
*
* @link http://www.ietf.org/rfc/rfc2781.txt
* @private
* @ignore
*/
MediaPlayer.utils.isUTF16 = function (data) {
   var i = 0;
   var len = data && data.length;
   var pos = null;
   var b1, b2, next, prev;

   if (len < 2) {
       if (data[0] > 0xFF) {
           return false;
       }
   } else {
       b1 = data[0];
       b2 = data[1];
       if (b1 === 0xFF && // BOM (little-endian)
           b2 === 0xFE) {
           return true;
       }
       if (b1 === 0xFE && // BOM (big-endian)
           b2 === 0xFF) {
           return true;
       }

       for (; i < len; i++) {
           if (data[i] === 0x00) {
               pos = i;
               break;
           } else if (data[i] > 0xFF) {
               return false;
           }
       }

       if (pos === null) {
           return false; // Non ASCII
       }

       next = data[pos + 1]; // BE
       if (next !== void 0 && next > 0x00 && next < 0x80) {
           return true;
       }

       prev = data[pos - 1]; // LE
       if (prev !== void 0 && prev > 0x00 && prev < 0x80) {
           return true;
       }
   }

   return false;
};
