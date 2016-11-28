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
                             if (querySelectorResult[i].childNodes.length > 0) {
                                 returnTab[id].childNodes = querySelectorResult[i].childNodes;
                             }
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

         getTextNodesIn: function(nodeParent) {
             var textNodes = [],
                 i = 0,
                 nodes = null,
                 node = null,
                 nodeType = null;

             if (nodeParent) {
                 nodes = nodeParent.childNodes;
                 for (i = 0; i < nodes.length; i++) {
                     node = nodes[i];
                     nodeType = node.nodeType;
                     /*ELEMENT_NODE == 1 ( element node )
                     ATTRIBUTE_NODE == 2 ( node attribute )
                     TEXT_NODE == 3 ( text node )
                     CDATA_SECTION_NODE == 4 ( CDATA section node )
                     ENTITY_REFERENCE_NODE == 5 ( node reference to an entity )
                     ENTITY_NODE == 6 ( Feature node )
                     PROCESSING_INSTRUCTION_NODE == 7 ( processing instruction node )
                     COMMENT_NODE == 8 ( comment node )
                     DOCUMENT_NODE == 9 ( document node )
                     DOCUMENT_TYPE_NODE == 10 ( Document Type node )
                     DOCUMENT_FRAGMENT_NODE == 11 ( node document fragment )
                     NOTATION_NODE == 12 ( node notation )*/
                     if (nodeType == 3) {
                         textNodes.push(node);
                     } else if (nodeType == 1 || nodeType == 9 || nodeType == 11) {
                         textNodes = textNodes.concat(this.getTextNodesIn(node));
                     }
                 }
             }
             return textNodes;
         },

         getAttributeValue: function(node, attrName, namespace) {
             var returnValue = null;

             if (node && typeof node.getAttribute == 'function') {
                 returnValue = node.getAttribute(attrName);
                 if (returnValue === null && namespace) {
                     returnValue = node.getAttributeNS(namespace, attrName);
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