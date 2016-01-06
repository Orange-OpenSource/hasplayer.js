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
MediaPlayer.utils.DOMParser = function() {
    "use strict";

    var _parser = null,
        _xmlDoc = null;

    return {
        getAllSpecificNodes: function(mainNode, nodeName) {
            var i = 0,
                id,
                querySelectorResult,
                returnTab = [];

            if (mainNode) {
                querySelectorResult = mainNode.querySelectorAll(nodeName);
                if (querySelectorResult) {
                    for (i = 0; i < querySelectorResult.length; i++) {
                        id = this.getAttributeValue(querySelectorResult[i], 'xml:id');
                        if (id) {
                            returnTab[id] = querySelectorResult[i].attributes;
                        }
                    }
                }
            }

            return returnTab;
        },

        getAttributeName: function(node, attrValue) {
            var returnValue = [],
                domAttribute = null,
                i = 0,
                attribList = null;
            
            if (node && node.attributes) {
                attribList = node.attributes;
                if (attribList) {
                    for (i = 0; i < attribList.length; i++) {
                        domAttribute = attribList[i];
                        if (domAttribute.value === attrValue) {
                            returnValue.push(domAttribute.name);
                        }
                    }
                }
            }

            return returnValue;
        },

        getAttributeValue: function(node, attrName) {
            var returnValue = null,
                domElem = null,
                attribList = null;

            if (node && node.attributes) {
                attribList = node.attributes;
                if (attribList) {
                    domElem = attribList.getNamedItem(attrName);
                    if (domElem) {
                        returnValue = domElem.value;
                        return returnValue;
                    }
                }
            }

            return returnValue;
        },

        getChildNode: function(nodeParent, childName) {
            var i = 0,
                element;

            if (nodeParent && nodeParent.childNodes) {
                for (i = 0; i < nodeParent.childNodes.length; i++) {
                    element = nodeParent.childNodes[i];
                    if (element.nodeName === childName) {
                        return element;
                    }
                    element = undefined;
                }
            }

            return element;
        },

        getChildNodes: function(nodeParent, childName) {
            var i = 0,
                element = [];

            if (nodeParent && nodeParent.childNodes) {
                for (i = 0; i < nodeParent.childNodes.length; i++) {
                    if (nodeParent.childNodes[i].nodeName === childName) {
                        element.push(nodeParent.childNodes[i]);
                    }
                }
            }

            return element;
        },

        createXmlTree: function(xmlDocStr) {
            if (window.DOMParser) {
                try {
                    if (!_parser) {
                        _parser = new window.DOMParser();
                    }

                    _xmlDoc = _parser.parseFromString(xmlDocStr, "text/xml");
                    if (_xmlDoc.getElementsByTagName('parsererror').length > 0) {
                        throw new Error('Error parsing XML');
                    }
                } catch (e) {
                    _xmlDoc = null;
                }
            }
            return _xmlDoc;
        }
    };
};