/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

MediaPlayer.dependencies.protection.CommonEncryption = {

    /**
     * Find and return the ContentProtection element in the given array
     * that indicates support for MPEG Common Encryption
     *
     * @param cpArray array of content protection elements
     * @returns the Common Encryption content protection element or
     * null if one was not found
     */
    findCencContentProtection: function(cpArray) {
        var retVal = null,
            i = 0,
            cp;
        for (i = 0; i < cpArray.length; ++i) {
            cp = cpArray[i];
            if (cp.schemeIdUri.toLowerCase() === "urn:mpeg:dash:mp4protection:2011" &&
                cp.value.toLowerCase() === "cenc")
                retVal = cp;
        }
        return retVal;
    },

    /**
     * Returns just the data portion of a single PSSH
     *
     * @param pssh {ArrayBuffer} the PSSH
     * @return {ArrayBuffer} data portion of the PSSH
     */
    getPSSHData: function(pssh) {
        var offset = 8, // Box size and type fields
            view = new DataView(pssh),
            // Read version
            version = view.getUint8(offset);

        offset += 20; // Version (1), flags (3), system ID (16)

        if (version > 0) {
            offset += 4 + (16 * view.getUint32(offset)); // Key ID count (4) and All key IDs (16*count)
        }

        offset += 4; // Data size
        return pssh.slice(offset);
    },

    /**
     * Returns the PSSH associated with the given key system from the concatenated
     * list of PSSH boxes in the given initData
     *
     * @param {MediaPlayer.dependencies.protection.KeySystem} keySystem the desired
     * key system
     * @param {ArrayBuffer} initData 'cenc' initialization data.  Concatenated list of PSSH.
     * @returns {ArrayBuffer} The PSSH box data corresponding to the given key system
     * or null if a valid association could not be found.
     */
    getPSSHForKeySystem: function(keySystem, initData) {
        var psshList = MediaPlayer.dependencies.protection.CommonEncryption.parsePSSHList(initData);
        if (psshList.hasOwnProperty(keySystem.uuid.toLowerCase())) {
            return psshList[keySystem.uuid.toLowerCase()];
        }
        return null;
    },

    /**
     * Parse a standard common encryption PSSH which contains a sinmple
     * base64-encoding of the init data
     *
     * @param cpData the ContentProtection element
     * @returns {ArrayBuffer} the init data or null if not found
     */
    parseInitDataFromContentProtection: function(cpData) {
        if (cpData && ("pssh" in cpData)) {
            return BASE64.decodeArray(cpData.pssh.__text).buffer;
        }
        return null;
    },

    readBytes: function(buf, pos, nbBytes) {
        var value = 0,
            i = 0;

        for (i = 0; i < nbBytes; i++) {
            value = value << 8;
            value = value + buf[pos];
            pos++;
        }
        return value;
    },

    /**
     * Parses list of PSSH boxes into keysystem-specific PSSH data
     *
     * @param data {ArrayBuffer} the concatenated list of PSSH boxes as provided by
     * CDM as initialization data when CommonEncryption content is detected
     * @returns {object} an object that has a property named according to each of
     * the detected key system UUIDs (e.g. 00000000-0000-0000-0000-0000000000)
     * and a ArrayBuffer (the entire PSSH box) as the property value
     */
    parsePSSHList: function(data) {

        if (data === null)
            return [];

        var buffer = data,
            done = false,
            pssh = {},
            // TODO: Need to check every data read for end of buffer
            byteCursor = 0,
            size,
            nextBox,
            version,
            systemID,
            psshDataSize,
            boxStart,
            i,
            val;

        if (!data.buffer) {
            buffer = new Uint8Array(data);
        }

        while (!done) {

            boxStart = byteCursor;

            if (byteCursor >= buffer.byteLength)
                break;

            /* Box size */
            size = this.readBytes(buffer, byteCursor, 4);
            nextBox = byteCursor + size;
            byteCursor += 4;

            /* Verify PSSH */
            if (this.readBytes(buffer, byteCursor, 4) !== 0x70737368) {
                byteCursor = nextBox;
                continue;
            }
            byteCursor += 4;

            /* Version must be 0 or 1 */
            version = this.readBytes(buffer, byteCursor, 1);
            if (version !== 0 && version !== 1) {
                byteCursor = nextBox;
                continue;
            }
            byteCursor += 1;

            byteCursor += 3; /* skip flags */

            // 16-byte UUID/SystemID
            systemID = "";

            for (i = 0; i < 4; i++) {
                val = this.readBytes(buffer, (byteCursor + i), 1).toString(16);
                systemID += (val.length === 1) ? "0" + val : val;
            }
            byteCursor += 4;
            systemID += "-";
            for (i = 0; i < 2; i++) {
                val = this.readBytes(buffer, (byteCursor + i), 1).toString(16);
                systemID += (val.length === 1) ? "0" + val : val;
            }
            byteCursor += 2;
            systemID += "-";
            for (i = 0; i < 2; i++) {
                val = this.readBytes(buffer, (byteCursor + i), 1).toString(16);
                systemID += (val.length === 1) ? "0" + val : val;
            }
            byteCursor += 2;
            systemID += "-";
            for (i = 0; i < 2; i++) {
                val = this.readBytes(buffer, (byteCursor + i), 1).toString(16);
                systemID += (val.length === 1) ? "0" + val : val;
            }
            byteCursor += 2;
            systemID += "-";
            for (i = 0; i < 6; i++) {
                val = this.readBytes(buffer, (byteCursor + i), 1).toString(16);
                systemID += (val.length === 1) ? "0" + val : val;
            }
            byteCursor += 6;

            systemID = systemID.toLowerCase();

            /* PSSH Data Size */
            psshDataSize = this.readBytes(buffer, byteCursor, 4);
            byteCursor += 4;

            /* PSSH Data */
            //pssh[systemID] = buffer.slice(boxStart, nextBox);
            pssh[systemID] = buffer.subarray(boxStart, nextBox).buffer;
            byteCursor = nextBox;
        }

        return pssh;
    },


    /**
     * Returns list of {MediaPlayer.vo.protection.KeySystemConfiguration}
     * (see: https://w3c.github.io/encrypted-media/#idl-def-MediaKeySystemConfiguration)
     *
     * @param {object} videoCodec contains relevant info about video codec
     * @param {object} audioCodec contains relevant info about audio codec
     * @param {String} sessionType the session type like "temporary" or "persistent-license"
     * @returns {Array} list of {MediaPlayer.vo.protection.KeySystemConfiguration}
     */
    getKeySystemConfigurations: function(videoCodec, audioCodec, sessionType) {
        var audioCapabilities = [],
            videoCapabilities = [];
        if (videoCodec) {
            videoCapabilities.push(new MediaPlayer.vo.protection.MediaCapability(videoCodec));
        }
        if (audioCodec) {
            audioCapabilities.push(new MediaPlayer.vo.protection.MediaCapability(audioCodec));
        }
        return [new MediaPlayer.vo.protection.KeySystemConfiguration(
            audioCapabilities, videoCapabilities, "optional", (sessionType === "temporary") ? "optional" : "required", [sessionType])];
    }
};