(function () {
    // Expect utf8decoder and utf8decoder to be TextEncoder('utf-8') and TextDecoder('utf-8') respectively
    //

    var keySystemWrappers = {
        // Key System wrappers map messages and pass to a handler, then map the response and return to caller
        //
        // function wrapper(handler, messageType, message, params)
        //
        // where:
        //      Promise<response> handler(messageType, message, responseType, headers, params);
        //

        'com.widevine.alpha': function (handler, messageType, message, params) {
            return handler.call(this, messageType, new Uint8Array(message), 'json', null, params).then(function (response) {
                return base64DecodeToUnit8Array(response.license);
            });
        },

        'com.microsoft.playready': function (handler, messageType, message, params) {
            var msg, xmlDoc;
            var licenseRequest = null;
            var headers = {};
            var parser = new DOMParser();
            var dataview = new Uint16Array(message);

            msg = String.fromCharCode.apply(null, dataview);
            xmlDoc = parser.parseFromString(msg, 'application/xml');

            if (xmlDoc.getElementsByTagName('Challenge')[0]) {
                var challenge = xmlDoc.getElementsByTagName('Challenge')[0].childNodes[0].nodeValue;
                if (challenge) {
                    licenseRequest = atob(challenge);
                }
            }

            var headerNameList = xmlDoc.getElementsByTagName('name');
            var headerValueList = xmlDoc.getElementsByTagName('value');
            for (var i = 0; i < headerNameList.length; i++) {
                headers[headerNameList[i].childNodes[0].nodeValue] = headerValueList[i].childNodes[0].nodeValue;
            }
            // some versions of the PlayReady CDM return 'Content' instead of 'Content-Type',
            // but the license server expects 'Content-Type', so we fix it up here.
            if (headers.hasOwnProperty('Content')) {
                headers['Content-Type'] = headers.Content;
                delete headers.Content;
            }

            return handler.call(this, messageType, licenseRequest, 'arraybuffer', headers, params).catch(function (response) {
                return response.text().then(function (error) {
                    throw error;
                });
            });
        }
    };

    var requestConstructors = {
        // Server request construction functions
        //
        // Promise<request> constructRequest(config, sessionType, content, messageType, message, params)
        //
        // request = { url: ..., headers: ..., body: ... }
        //
        // content = { assetId: ..., variantId: ..., key: ... }
        // params = { expiration: ... }

        'drmtoday': function (config, sessionType, content, messageType, message, headers, params) {
            var optData = JSON.stringify({
                merchant: config.merchant,
                userId: "12345",
                sessionId: ""
            });
            var crt = {};
            if (messageType === 'license-request') {
                crt = {
                    assetId: content.assetId,
                    outputProtection: {
                        digital: false,
                        analogue: false,
                        enforce: false
                    },
                    storeLicense: (sessionType === 'persistent-license')
                };

                if (!params || params.expiration === undefined) {
                    crt.profile = {
                        purchase: {}
                    };
                } else {
                    crt.profile = {
                        rental: {
                            absoluteExpiration: (new Date(params.expiration)).toISOString(),
                            playDuration: 3600000
                        }
                    };
                }

                if (content.variantId !== undefined) {
                    crt.variantId = content.variantId;
                }
            }

            return JWT.encode("HS256", {
                optData: optData,
                crt: JSON.stringify([crt])
            }, config.secret).then(function (jwt) {
                headers = headers || {};
                headers['x-dt-auth-token'] = jwt;
                return {
                    url: config.serverURL,
                    headers: headers,
                    body: message
                };
            });
        },

        'microsoft': function (config, sessionType, content, messageType, message, headers) {
            var url = config.serverURL;
            if (messageType === 'license-request') {
                url += "?";
                if (sessionType === 'temporary' || sessionType === 'persistent-usage-record') {
                    url += "UseSimpleNonPersistentLicense=1&";
                }
                if (sessionType === 'persistent-usage-record') {
                    url += "SecureStop=1&";
                }
                url += "PlayEnablers=B621D91F-EDCC-4035-8D4B-DC71760D43E9&"; // disable output protection
                url += "ContentKey=" + btoa(String.fromCharCode.apply(null, content.key));
                return url;
            }

            // TODO: Include expiration time in URL
            return Promise.resolve({
                url: url,
                headers: headers,
                body: message
            });
        }
    };

    CkMessageHandler = function (keysystem, content) {
        this._keysystem = keysystem;
        this._content = content;
        this.messagehandler = CkMessageHandler.prototype.messagehandler.bind(this);
        this.servercertificate = undefined;
    };

    CkMessageHandler.prototype.messagehandler = function messagehandler(messageType, message) {
        if (messageType === 'license-request') {
            var request = fromUtf8(message);

            var keys = request.kids.map(function (kid) {

                var key;
                for (var i = 0; i < this._content.keys.length; ++i) {
                    if (base64urlEncode(this._content.keys[i].kid) === kid) {
                        key = base64urlEncode(this._content.keys[i].key);
                        break;
                    }
                }

                return {
                    kty: 'oct',
                    kid: kid,
                    k: key
                };

            }.bind(this));

            return Promise.resolve(toUtf8({
                keys: keys
            }));
        } else if (messageType === 'license-release') {
            var release = fromUtf8(message);

            // TODO: Check the license release message here

            return Promise.resolve(toUtf8({
                kids: release.kids
            }));
        }

        throw new TypeError('Unsupported message type for ClearKey');
    };

    CkMessageHandler.prototype.createJWKSet = function createJWKSet() {
        var jwkSet = '{"keys":[';
        for (var i = 0; i < arguments.length; i++) {
            if (i !== 0) {
                jwkSet += ',';
            }
            jwkSet += arguments[i];
        }
        jwkSet += ']}';
        return jwkSet;
    };

    CkMessageHandler.prototype.createJWK = function createJWK(keyId, key) {
        var jwk = '{"kty":"oct","alg":"A128KW","kid":"';
        jwk += base64urlEncode(keyId);
        jwk += '","k":"';
        jwk += base64urlEncode(key);
        jwk += '"}';
        return jwk;
    };

    DrmMessageHandler = function (keysystem, drmconfig, content, sessionType) {
        sessionType = sessionType || "temporary";

        this._keysystem = keysystem;
        this._content = content;
        this._sessionType = sessionType;
        try {
            this._drmconfig = drmconfig[this._keysystem].filter(function (drmconfig) {
                return drmconfig.sessionTypes === undefined || (drmconfig.sessionTypes.indexOf(sessionType) !== -1);
            })[0];
            this._requestConstructor = requestConstructors[this._drmconfig.servertype];

            this.messagehandler = keySystemWrappers[keysystem].bind(this, DrmMessageHandler.prototype.messagehandler);

            if (this._drmconfig && this._drmconfig.certificate) {
                this.servercertificate = stringToUint8Array(atob(this._drmconfig.certificate));
            }
        } catch (e) {
            return null;
        }
    };

    DrmMessageHandler.prototype.messagehandler = function messagehandler(messageType, message, responseType, headers, params) {

        var variantId = params ? params.variantId : undefined;
        var key;
        if (variantId) {
            var keys = this._content.keys.filter(function (k) {
                return k.variantId === variantId;
            });
            if (keys[0]) {
                key = keys[0].key;
            }
        }
        if (!key) {
            key = this._content.keys[0].key;
        }

        var content = {
            assetId: this._content.assetId,
            variantId: variantId,
            key: key
        };

        return this._requestConstructor(this._drmconfig, this._sessionType, content, messageType, message, headers, params).then(function (request) {
            return fetch(request.url, {
                method: 'POST',
                headers: request.headers,
                body: request.body
            });
        }).then(function (fetchresponse) {
            if (fetchresponse.status !== 200) {
                throw fetchresponse;
            }

            if (responseType === 'json') {
                return fetchresponse.json();
            } else if (responseType === 'arraybuffer') {
                return fetchresponse.arrayBuffer();
            }
        });
    };

})();

(function () {

    var subtlecrypto = window.crypto.subtle;

    // Encoding / decoding utilities
    function b64pad(b64) {
        return b64 + "==".substr(0, (b64.length % 4) ? (4 - b64.length % 4) : 0);
    }

    function str2b64url(str) {
        return btoa(str).replace(/=+$/g, '').replace(/\+/g, "-").replace(/\//g, "_");
    }

    function b64url2str(b64) {
        return atob(b64pad(b64.replace(/\-/g, "+").replace(/\_/g, "/")));
    }

    function str2ab(str) {
        return Uint8Array.from(str.split(''), function (s) {
            return s.charCodeAt(0);
        });
    }

    function ab2str(ab) {
        return String.fromCharCode.apply(null, new Uint8Array(ab));
    }

    function jwt2webcrypto(alg) {
        if (alg === "HS256") {
            return {
                name: "HMAC",
                hash: "SHA-256",
                length: 256
            };
        } else if (alg === "HS384") {
            return {
                name: "HMAC",
                hash: "SHA-384",
                length: 384
            };
        } else if (alg === "HS512") {
            return {
                name: "HMAC",
                hash: "SHA-512",
                length: 512
            };
        } else {
            throw new Error("Unrecognized JWT algorithm: " + alg);
        }
    }

    JWT = {
        encode: function encode(alg, claims, secret) {
            var algorithm = jwt2webcrypto(alg);
            if (secret.byteLength !== algorithm.length / 8) {
                throw new Error("Unexpected secret length: " + secret.byteLength);
            }

            if (!claims.iat) {
                claims.iat = ((Date.now() / 1000) | 0) - 60;
            }
            if (!claims.jti) {
                var nonce = new Uint8Array(16);
                window.crypto.getRandomValues(nonce);
                claims.jti = str2b64url(ab2str(nonce));
            }

            var header = {
                typ: "JWT",
                alg: alg
            };
            var plaintext = str2b64url(JSON.stringify(header)) + '.' + str2b64url(JSON.stringify(claims));
            return subtlecrypto.importKey("raw", secret, algorithm, false, ["sign"]).then(function (key) {
                return subtlecrypto.sign(algorithm, key, str2ab(plaintext));
            }).then(function (hmac) {
                return plaintext + '.' + str2b64url(ab2str(hmac));
            });
        },

        decode: function decode(jwt, secret) {
            var jwtparts = jwt.split('.');
            var header = JSON.parse(b64url2str(jwtparts[0]));
            var claims = JSON.parse(b64url2str(jwtparts[1]));
            var hmac = str2ab(b64url2str(jwtparts[2]));
            var algorithm = jwt2webcrypto(header.alg);
            if (secret.byteLength !== algorithm.length / 8) {
                throw new Error("Unexpected secret length: " + secret.byteLength);
            }
            return subtlecrypto.importKey("raw", secret, algorithm, false, ["sign", "verify"]).then(function (key) {
                return subtlecrypto.verify(algorithm, key, hmac, str2ab(jwtparts[0] + '.' + jwtparts[1]));
            }).then(function (success) {
                if (!success) {
                    throw new Error("Invalid signature");
                }
                return claims;
            });
        }
    };
})();
