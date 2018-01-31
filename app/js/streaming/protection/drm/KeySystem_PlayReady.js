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

/**
 * Microsoft PlayReady DRM
 *
 * @class
 * @implements MediaPlayer.dependencies.protection.KeySystem
 */
MediaPlayer.dependencies.protection.KeySystem_PlayReady = function() {
    "use strict";

    var keySystemStr = "com.microsoft.playready",
        keySystemUUID = "9a04f079-9840-4286-ab92-e65be0885f95",
        PRCDMData = '<PlayReadyCDMData type="LicenseAcquisition"><LicenseAcquisition version="1.0" Proactive="false"><CustomData encoding="base64encoded">%CUSTOMDATA%</CustomData></LicenseAcquisition></PlayReadyCDMData>',
        protData,

        getRequestHeaders = function(message) {
            var msg,
                xmlDoc,
                headers = {},
                data = (message instanceof ArrayBuffer) ? message : message.buffer,
                dataview = MediaPlayer.utils.isUTF16(new Uint8Array(data)) ? new Uint16Array(data) : new Uint8Array(data),
                headerNameList,
                headerValueList,
                i = 0;

            msg = String.fromCharCode.apply(null, dataview);
            xmlDoc = this.domParser.createXmlTree(msg);

            headerNameList = xmlDoc.getElementsByTagName("name");
            headerValueList = xmlDoc.getElementsByTagName("value");
            for (i = 0; i < headerNameList.length; i += 1) {
                headers[headerNameList[i].childNodes[0].nodeValue] = headerValueList[i].childNodes[0].nodeValue;
            }
            // Some versions of the PlayReady CDM return 'Content' instead of 'Content-Type'.
            // this is NOT w3c conform and license servers may reject the request!
            // -> rename it to proper w3c definition!
            if (headers.hasOwnProperty('Content')) {
                headers['Content-Type'] = headers.Content;
                delete headers.Content;
            }

            // Some versions of the PlayReady CDM do not return headers at all, which means the Content-Type
            // does not get set and most license servers will just refuse the license request.
            // -> set it manually if is missing.
            if (!headers.hasOwnProperty('Content-Type')) {
                headers['Content-Type'] = 'text/xml; charset=utf-8';
            }

            return headers;
        },

        getLicenseRequest = function(message) {
            var msg,
                xmlDoc,
                licenseRequest = null,
                data = (message instanceof ArrayBuffer) ? message : message.buffer,
                dataview = MediaPlayer.utils.isUTF16(new Uint8Array(data)) ? new Uint16Array(data) : new Uint8Array(data),
                Challenge;

            msg = String.fromCharCode.apply(null, dataview);

            xmlDoc = this.domParser.createXmlTree(msg);

            if (xmlDoc.getElementsByTagName("Challenge")[0]) {
                Challenge = xmlDoc.getElementsByTagName("Challenge")[0].childNodes[0].nodeValue;
                if (Challenge) {
                    licenseRequest = BASE64.decode(Challenge);
                }
            }
            if (!licenseRequest) {
                // Some versions of the PlayReady CDM do not return the Microsoft-specified XML structure
                // but just return the raw license request. If we can't extract the license request, let's
                // assume it is the latter and just return the whole message.
                licenseRequest = msg;
            }
            return licenseRequest;
        },

        getLicenseServerURL = function(initData) {
            if (initData) {
                var data = new DataView(initData),
                        numRecords = data.getUint16(4, true),
                        offset = 6,
                        i = 0,
                        recordType,
                        recordLength,
                        recordData,
                        record,
                        xmlDoc,
                        laurl,
                        luiurl;

                for (i = 0; i < numRecords; i++) {
                    // Parse the PlayReady Record header
                    recordType = data.getUint16(offset, true);
                    offset += 2;
                    recordLength = data.getUint16(offset, true);
                    offset += 2;
                    if (recordType !== 0x0001) {
                        offset += recordLength;
                        continue;
                    }

                    recordData = initData.slice(offset, offset+recordLength);
                    record = String.fromCharCode.apply(null, new Uint16Array(recordData));
                    xmlDoc = this.domParser.createXmlTree(record);

                    // First try <LA_URL>
                    if (xmlDoc.getElementsByTagName("LA_URL")[0]) {
                        laurl = xmlDoc.getElementsByTagName("LA_URL")[0].childNodes[0].nodeValue;
                        if (laurl) {
                            return laurl;
                        }
                    }

                    // Optionally, try <LUI_URL>
                    if (xmlDoc.getElementsByTagName("LUI_URL")[0]) {
                        luiurl = xmlDoc.getElementsByTagName("LUI_URL")[0].childNodes[0].nodeValue;
                        if (luiurl) {
                            return luiurl;
                        }
                    }
                }
            }

            return null;

        },

        parseInitDataFromContentProtection = function(cpData) {
            // * desc@ getInitData
            // *   generate PSSH data from PROHeader defined in MPD file
            // *   PSSH format:
            // *   size (4)
            // *   box type(PSSH) (8)
            // *   Protection SystemID (16)
            // *   protection system data size (4) - length of decoded PROHeader
            // *   decoded PROHeader data from MPD file
            var byteCursor = 0,
                PROSize,
                PSSHSize,
                PSSHBoxType = new Uint8Array([0x70, 0x73, 0x73, 0x68, 0x00, 0x00, 0x00, 0x00 ]), //'PSSH' 8 bytes
                playreadySystemID = new Uint8Array([0x9a, 0x04, 0xf0, 0x79, 0x98, 0x40, 0x42, 0x86, 0xab, 0x92, 0xe6, 0x5b, 0xe0, 0x88, 0x5f, 0x95]),
                uint8arraydecodedPROHeader = null,
                PSSHBoxBuffer,
                PSSHBox,
                PSSHData;

            // Handle common encryption PSSH
            if ("pssh" in cpData) {
                return MediaPlayer.dependencies.protection.CommonEncryption.parseInitDataFromContentProtection(cpData);
            }
            // Handle native MS PlayReady ContentProtection elements
            if ("pro" in cpData) {
                uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.pro.__text);
            }
            else if ("prheader" in cpData) {
                uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.prheader.__text);
            }
            else {
                return null;
            }

            PROSize = uint8arraydecodedPROHeader.length;
            PSSHSize = 0x4 + PSSHBoxType.length + playreadySystemID.length + 0x4 + PROSize;

            PSSHBoxBuffer = new ArrayBuffer(PSSHSize);

            PSSHBox = new Uint8Array(PSSHBoxBuffer);
            PSSHData = new DataView(PSSHBoxBuffer);

            PSSHData.setUint32(byteCursor, PSSHSize);
            byteCursor += 0x4;

            PSSHBox.set(PSSHBoxType, byteCursor);
            byteCursor += PSSHBoxType.length;

            PSSHBox.set(playreadySystemID, byteCursor);
            byteCursor += playreadySystemID.length;

            PSSHData.setUint32(byteCursor, PROSize);
            byteCursor += 0x4;

            PSSHBox.set(uint8arraydecodedPROHeader, byteCursor);
            byteCursor += PROSize;

            return PSSHBox.buffer;
        },

        doGetCDMData = function () {
            var customData,
                cdmData,
                cdmDataBytes,
                i;

            if (protData && protData.cdmData) {

                // Convert custom data into multibyte string
                customData = [];
                for (i = 0; i < protData.cdmData.length; ++i) {
                    customData.push(protData.cdmData.charCodeAt(i));
                    customData.push(0);
                }
                customData = String.fromCharCode.apply(null, customData);

                // Encode in Base 64 the custom data string
                customData = BASE64.encode(customData);

                // Initialize CDM data with Base 64 encoded custom data
                // (see https://msdn.microsoft.com/en-us/library/dn457361.aspx)
                cdmData = PRCDMData.replace('%CUSTOMDATA%', customData);

                // Convert CDM data into multibyte characters
                cdmDataBytes = [];
                for (i = 0; i < cdmData.length; ++i) {
                    cdmDataBytes.push(cdmData.charCodeAt(i));
                    cdmDataBytes.push(0);
                }

                return new Uint8Array(cdmDataBytes).buffer;
            }

            return null;
        };

    return {

        schemeIdURI: "urn:uuid:" + keySystemUUID,
        systemString: keySystemStr,
        uuid: keySystemUUID,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        domParser: undefined,
        /*sessionType:"persistent-license",*/
        sessionType:"temporary",

        init: function(protectionData){
            if(protectionData){
                protData = protectionData;
                if(protData.sessionType){
                    this.sessionType = protData.sessionType;
                }
            }
        },

        getInitData: parseInitDataFromContentProtection,

        getKeySystemConfigurations: MediaPlayer.dependencies.protection.CommonEncryption.getKeySystemConfigurations,

        getRequestHeadersFromMessage: getRequestHeaders,

        getLicenseRequestFromMessage: getLicenseRequest,

        getLicenseServerURLFromInitData: getLicenseServerURL,

        getCDMData: doGetCDMData,

        getServerCertificate: function () { return null; },

    };
};

MediaPlayer.dependencies.protection.KeySystem_PlayReady.prototype = {
    constructor: MediaPlayer.dependencies.protection.KeySystem_PlayReady
};
