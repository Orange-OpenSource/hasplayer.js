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
 * Microsoft PlayReady Test License Server
 *
 * For testing content that uses the PlayReady test server at
 *
 * @implements MediaPlayer.dependencies.protection.servers.LicenseServer
 * @class
 */
MediaPlayer.dependencies.protection.servers.PlayReady = function() {
    "use strict";

    var decodeUtf8 = function(arrayBuffer) {
            var result = "",
                i = 0,
                c = 0,
                c2 = 0,
                c3 = 0,
                data = new Uint8Array(arrayBuffer);

            // If we have a BOM skip it
            if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
                i = 3;
            }

            while (i < data.length) {
                c = data[i];

                if (c < 128) {
                    result += String.fromCharCode(c);
                    i++;
                } else if (c > 191 && c < 224) {
                    if (i + 1 >= data.length) {
                        throw "UTF-8 Decode failed. Two byte character was truncated.";
                    }
                    c2 = data[i + 1];
                    result += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    i += 2;
                } else {
                    if (i + 2 >= data.length) {
                        throw "UTF-8 Decode failed. Multi byte character was truncated.";
                    }
                    c2 = data[i + 1];
                    c3 = data[i + 2];
                    result += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }
            }
            return result;
        },

        parseServerResponse = function(serverResponse) {
            var stringResponse = decodeUtf8(serverResponse),
                xmlDoc = this.domParser.createXmlTree(stringResponse),
                enveloppe = xmlDoc ? this.domParser.getChildNode(xmlDoc, "soap:Envelope") : null,
                body = enveloppe ? this.domParser.getChildNode(enveloppe, "soap:Body") : null,
                fault = body ? this.domParser.getChildNode(body, "soap:Fault") : null;

            if (fault) {
                return null;
            }

            return serverResponse;
        },

        parseErrorResponse = function(serverResponse) {
            var stringResponse = decodeUtf8(serverResponse),
                xmlDoc = this.domParser.createXmlTree(stringResponse),
                enveloppe = xmlDoc ? this.domParser.getChildNode(xmlDoc, "soap:Envelope") : null,
                body = enveloppe ? this.domParser.getChildNode(enveloppe, "soap:Body") : null,
                fault = body ? this.domParser.getChildNode(body, "soap:Fault") : null,
                detail = fault ? this.domParser.getChildNode(fault, "detail") : null,
                exception = detail ? this.domParser.getChildNode(detail, "Exception") : null,
                node = null,
                faultstring = "",
                statusCode = "",
                message = "",
                idStart = -1,
                idEnd = -1;

            if (fault === null) {
                return {
                    code: 0,
                    name: "UnknownError",
                    message: String.fromCharCode.apply(null, new Uint8Array(serverResponse))
                };
            }

            node = this.domParser.getChildNode(fault, "faultstring").firstChild;
            faultstring = node ? node.nodeValue : null;

            if (exception !== null) {
                node = this.domParser.getChildNode(exception, "StatusCode");
                statusCode = node ? node.firstChild.nodeValue : null;

                node = this.domParser.getChildNode(exception, "Message");
                message = node ? node.firstChild.nodeValue : null;
                idStart = message ? message.lastIndexOf('[') + 1 : -1;
                idEnd = message ? message.indexOf(']') : -1;
            }

            return {
                code: statusCode,
                name: faultstring,
                message: message ? message.substring(idStart, idEnd) : ""
            };
        };

    return {
        domParser: undefined,

        getServerURLFromMessage: function(url /*, message, messageType*/) { return url; },

        getHTTPMethod: function(/*messageType*/) { return 'POST'; },

        getResponseType: function(/*keySystemStr, messageType*/) { return 'arraybuffer'; },

        getLicenseMessage: function(serverResponse/*, keySystemStr, messageType*/) {
            return parseServerResponse.call(this, serverResponse);
        },

        getErrorResponse: function(serverResponse/*, keySystemStr, messageType*/) {
            return parseErrorResponse.call(this, serverResponse);
        }
    };
};

MediaPlayer.dependencies.protection.servers.PlayReady.prototype = {
    constructor: MediaPlayer.dependencies.protection.servers.PlayReady
};
