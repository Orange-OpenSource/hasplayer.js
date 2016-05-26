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
mpegts.ts.AdaptationField = function() {
    /** adaptation field fields */
    this.m_cAFLength = null;
    this.m_bDiscontinuityInd = null;
    this.m_bRAI = null;
    this.m_bESPriority = null;

    /** Optional fields flags */
    this.m_bPCRFlag = null;
    this.m_bOPCRFlag = null;
    this.m_bSplicingPointFlag = null;
    this.m_bPrivateDataFlag = null;
    this.m_bAdaptationFieldExtFlag = null;
};

mpegts.ts.AdaptationField.prototype.getLength = function() {
    return (this.m_cAFLength + 1);
};

mpegts.ts.AdaptationField.prototype.parse = function(data) {
    this.m_cAFLength = data[0];

    if (this.m_cAFLength === 0) {
        // = exactly 1 stuffing byte
        return;
    }

    var index = 1;

    this.m_bDiscontinuityInd = mpegts.binary.getBitFromByte(data[index], 0);
    this.m_bRAI = mpegts.binary.getBitFromByte(data[index], 1);
    this.m_bESPriority = mpegts.binary.getBitFromByte(data[index], 2);
    this.m_bPCRFlag = mpegts.binary.getBitFromByte(data[index], 3);
    this.m_bOPCRFlag = mpegts.binary.getBitFromByte(data[index], 4);
    this.m_bSplicingPointFlag = mpegts.binary.getBitFromByte(data[index], 5);
    this.m_bPrivateDataFlag = mpegts.binary.getBitFromByte(data[index], 6);
    this.m_bAdaptationFieldExtFlag = mpegts.binary.getBitFromByte(data[index], 7);

    //other flags are not useful for the conversion HLS => MP4
};