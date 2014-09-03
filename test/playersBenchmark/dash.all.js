function X2JS(matchers, attrPrefix, ignoreRoot) {
    function getNodeLocalName(node) {
        var nodeLocalName = node.localName;
        return null == nodeLocalName && (nodeLocalName = node.baseName), (null == nodeLocalName || "" == nodeLocalName) && (nodeLocalName = node.nodeName), 
        nodeLocalName;
    }
    function getNodePrefix(node) {
        return node.prefix;
    }
    function escapeXmlChars(str) {
        return "string" == typeof str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;") : str;
    }
    function unescapeXmlChars(str) {
        return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/");
    }
    function parseDOMChildren(node) {
        if (node.nodeType == DOMNodeTypes.DOCUMENT_NODE) {
            var result, i, len, child = node.firstChild;
            for (i = 0, len = node.childNodes.length; len > i; i += 1) if (node.childNodes[i].nodeType !== DOMNodeTypes.COMMENT_NODE) {
                child = node.childNodes[i];
                break;
            }
            if (ignoreRoot) result = parseDOMChildren(child); else {
                result = {};
                var childName = getNodeLocalName(child);
                result[childName] = parseDOMChildren(child);
            }
            return result;
        }
        if (node.nodeType == DOMNodeTypes.ELEMENT_NODE) {
            var result = new Object();
            result.__cnt = 0;
            for (var nodeChildren = node.childNodes, cidx = 0; cidx < nodeChildren.length; cidx++) {
                var child = nodeChildren.item(cidx), childName = getNodeLocalName(child);
                if (result.__cnt++, null == result[childName]) result[childName] = parseDOMChildren(child), 
                result[childName + "_asArray"] = new Array(1), result[childName + "_asArray"][0] = result[childName]; else {
                    if (null != result[childName] && !(result[childName] instanceof Array)) {
                        var tmpObj = result[childName];
                        result[childName] = new Array(), result[childName][0] = tmpObj, result[childName + "_asArray"] = result[childName];
                    }
                    for (var aridx = 0; null != result[childName][aridx]; ) aridx++;
                    result[childName][aridx] = parseDOMChildren(child);
                }
            }
            for (var aidx = 0; aidx < node.attributes.length; aidx++) {
                var attr = node.attributes.item(aidx);
                result.__cnt++;
                for (var value2 = attr.value, m = 0, ml = matchers.length; ml > m; m++) {
                    var matchobj = matchers[m];
                    matchobj.test.call(this, attr.value) && (value2 = matchobj.converter.call(this, attr.value));
                }
                result[attrPrefix + attr.name] = value2;
            }
            var nodePrefix = getNodePrefix(node);
            return null != nodePrefix && "" != nodePrefix && (result.__cnt++, result.__prefix = nodePrefix), 
            1 == result.__cnt && null != result["#text"] && (result = result["#text"]), null != result["#text"] && (result.__text = result["#text"], 
            escapeMode && (result.__text = unescapeXmlChars(result.__text)), delete result["#text"], 
            delete result["#text_asArray"]), null != result["#cdata-section"] && (result.__cdata = result["#cdata-section"], 
            delete result["#cdata-section"], delete result["#cdata-section_asArray"]), (null != result.__text || null != result.__cdata) && (result.toString = function() {
                return (null != this.__text ? this.__text : "") + (null != this.__cdata ? this.__cdata : "");
            }), result;
        }
        return node.nodeType == DOMNodeTypes.TEXT_NODE || node.nodeType == DOMNodeTypes.CDATA_SECTION_NODE ? node.nodeValue : node.nodeType == DOMNodeTypes.COMMENT_NODE ? null : void 0;
    }
    function startTag(jsonObj, element, attrList, closed) {
        var resultStr = "<" + (null != jsonObj && null != jsonObj.__prefix ? jsonObj.__prefix + ":" : "") + element;
        if (null != attrList) for (var aidx = 0; aidx < attrList.length; aidx++) {
            var attrName = attrList[aidx], attrVal = jsonObj[attrName];
            resultStr += " " + attrName.substr(1) + "='" + attrVal + "'";
        }
        return resultStr += closed ? "/>" : ">";
    }
    function endTag(jsonObj, elementName) {
        return "</" + (null != jsonObj.__prefix ? jsonObj.__prefix + ":" : "") + elementName + ">";
    }
    function endsWith(str, suffix) {
        return -1 !== str.indexOf(suffix, str.length - suffix.length);
    }
    function jsonXmlSpecialElem(jsonObj, jsonObjField) {
        return endsWith(jsonObjField.toString(), "_asArray") || 0 == jsonObjField.toString().indexOf("_") || jsonObj[jsonObjField] instanceof Function ? !0 : !1;
    }
    function jsonXmlElemCount(jsonObj) {
        var elementsCnt = 0;
        if (jsonObj instanceof Object) for (var it in jsonObj) jsonXmlSpecialElem(jsonObj, it) || elementsCnt++;
        return elementsCnt;
    }
    function parseJSONAttributes(jsonObj) {
        var attrList = [];
        if (jsonObj instanceof Object) for (var ait in jsonObj) -1 == ait.toString().indexOf("__") && 0 == ait.toString().indexOf("_") && attrList.push(ait);
        return attrList;
    }
    function parseJSONTextAttrs(jsonTxtObj) {
        var result = "";
        return null != jsonTxtObj.__cdata && (result += "<![CDATA[" + jsonTxtObj.__cdata + "]]>"), 
        null != jsonTxtObj.__text && (result += escapeMode ? escapeXmlChars(jsonTxtObj.__text) : jsonTxtObj.__text), 
        result;
    }
    function parseJSONTextObject(jsonTxtObj) {
        var result = "";
        return jsonTxtObj instanceof Object ? result += parseJSONTextAttrs(jsonTxtObj) : null != jsonTxtObj && (result += escapeMode ? escapeXmlChars(jsonTxtObj) : jsonTxtObj), 
        result;
    }
    function parseJSONArray(jsonArrRoot, jsonArrObj, attrList) {
        var result = "";
        if (0 == jsonArrRoot.length) result += startTag(jsonArrRoot, jsonArrObj, attrList, !0); else for (var arIdx = 0; arIdx < jsonArrRoot.length; arIdx++) result += startTag(jsonArrRoot[arIdx], jsonArrObj, parseJSONAttributes(jsonArrRoot[arIdx]), !1), 
        result += parseJSONObject(jsonArrRoot[arIdx]), result += endTag(jsonArrRoot[arIdx], jsonArrObj);
        return result;
    }
    function parseJSONObject(jsonObj) {
        var result = "", elementsCnt = jsonXmlElemCount(jsonObj);
        if (elementsCnt > 0) for (var it in jsonObj) if (!jsonXmlSpecialElem(jsonObj, it)) {
            var subObj = jsonObj[it], attrList = parseJSONAttributes(subObj);
            if (null == subObj || void 0 == subObj) result += startTag(subObj, it, attrList, !0); else if (subObj instanceof Object) if (subObj instanceof Array) result += parseJSONArray(subObj, it, attrList); else {
                var subObjElementsCnt = jsonXmlElemCount(subObj);
                subObjElementsCnt > 0 || null != subObj.__text || null != subObj.__cdata ? (result += startTag(subObj, it, attrList, !1), 
                result += parseJSONObject(subObj), result += endTag(subObj, it)) : result += startTag(subObj, it, attrList, !0);
            } else result += startTag(subObj, it, attrList, !1), result += parseJSONTextObject(subObj), 
            result += endTag(subObj, it);
        }
        return result += parseJSONTextObject(jsonObj);
    }
    (null === attrPrefix || void 0 === attrPrefix) && (attrPrefix = "_"), (null === ignoreRoot || void 0 === ignoreRoot) && (ignoreRoot = !1);
    var VERSION = "1.0.11", escapeMode = !1, DOMNodeTypes = {
        ELEMENT_NODE: 1,
        TEXT_NODE: 3,
        CDATA_SECTION_NODE: 4,
        COMMENT_NODE: 8,
        DOCUMENT_NODE: 9
    };
    this.parseXmlString = function(xmlDocStr) {
        var xmlDoc;
        if (window.DOMParser) try {
            var parser = new window.DOMParser();
            xmlDoc = parser.parseFromString(xmlDocStr, "text/xml");
        } catch (e) {
            return null;
        } else if (0 == xmlDocStr.indexOf("<?") && (xmlDocStr = xmlDocStr.substr(xmlDocStr.indexOf("?>") + 2)), 
        xmlDoc = new ActiveXObject("Microsoft.XMLDOM"), xmlDoc.async = "false", xmlDoc.loadXML(xmlDocStr), 
        0 != xmlDoc.parseError.errorCode) return null;
        return xmlDoc;
    }, this.xml2json = function(xmlDoc) {
        return parseDOMChildren(xmlDoc);
    }, this.xml_str2json = function(xmlDocStr) {
        var xmlDoc = this.parseXmlString(xmlDocStr);
        return this.xml2json(xmlDoc);
    }, this.json2xml_str = function(jsonObj) {
        return parseJSONObject(jsonObj);
    }, this.json2xml = function(jsonObj) {
        var xmlDocStr = this.json2xml_str(jsonObj);
        return this.parseXmlString(xmlDocStr);
    }, this.getVersion = function() {
        return VERSION;
    }, this.escapeMode = function(enabled) {
        escapeMode = enabled;
    };
}

function ObjectIron(map) {
    var lookup;
    for (lookup = [], i = 0, len = map.length; len > i; i += 1) lookup.push(map[i].isRoot ? "root" : map[i].name);
    var mergeValues = function(parentItem, childItem) {
        var name;
        if (null !== parentItem && null !== childItem) for (name in parentItem) parentItem.hasOwnProperty(name) && (childItem.hasOwnProperty(name) || (childItem[name] = parentItem[name]));
    }, mapProperties = function(properties, parent, child) {
        var i, len, property, parentValue, childValue;
        if (null !== properties && 0 !== properties.length) for (i = 0, len = properties.length; len > i; i += 1) property = properties[i], 
        parent.hasOwnProperty(property.name) && (child.hasOwnProperty(property.name) ? property.merge && (parentValue = parent[property.name], 
        childValue = child[property.name], "object" == typeof parentValue && "object" == typeof childValue ? mergeValues(parentValue, childValue) : child[property.name] = null != property.mergeFunction ? property.mergeFunction(parentValue, childValue) : parentValue + childValue) : child[property.name] = parent[property.name]);
    }, mapItem = function(obj, node) {
        var i, len, v, len2, array, childItem, childNode, item = obj;
        if (null !== item.children && 0 !== item.children.length) for (i = 0, len = item.children.length; len > i; i += 1) if (childItem = item.children[i], 
        node.hasOwnProperty(childItem.name)) if (childItem.isArray) for (array = node[childItem.name + "_asArray"], 
        v = 0, len2 = array.length; len2 > v; v += 1) childNode = array[v], mapProperties(item.properties, node, childNode), 
        mapItem(childItem, childNode); else childNode = node[childItem.name], mapProperties(item.properties, node, childNode), 
        mapItem(childItem, childNode);
    }, performMapping = function(source) {
        var i, len, pi, pp, item, node, array;
        if (null === source) return source;
        if ("object" != typeof source) return source;
        for (i = 0, len = lookup.length; len > i; i += 1) "root" === lookup[i] && (item = map[i], 
        node = source, mapItem(item, node));
        for (pp in source) if (source.hasOwnProperty(pp)) {
            if (pi = lookup.indexOf(pp), -1 !== pi) if (item = map[pi], item.isArray) for (array = source[pp + "_asArray"], 
            i = 0, len = array.length; len > i; i += 1) node = array[i], mapItem(item, node); else node = source[pp], 
            mapItem(item, node);
            performMapping(source[pp]);
        }
        return source;
    };
    return {
        run: performMapping
    };
}

if (function(definition) {
    Q = definition();
}(function() {
    "use strict";
    function uncurryThis(f) {
        var call = Function.call;
        return function() {
            return call.apply(f, arguments);
        };
    }
    function isStopIteration(exception) {
        return "[object StopIteration]" === object_toString(exception) || exception instanceof QReturnValue;
    }
    function makeStackTraceLong(error, promise) {
        promise.stack && "object" == typeof error && null !== error && error.stack && -1 === error.stack.indexOf(STACK_JUMP_SEPARATOR) && (error.stack = filterStackString(error.stack) + "\n" + STACK_JUMP_SEPARATOR + "\n" + filterStackString(promise.stack));
    }
    function filterStackString(stackString) {
        for (var lines = stackString.split("\n"), desiredLines = [], i = 0; i < lines.length; ++i) {
            var line = lines[i];
            isInternalFrame(line) || isNodeFrame(line) || desiredLines.push(line);
        }
        return desiredLines.join("\n");
    }
    function isNodeFrame(stackLine) {
        return -1 !== stackLine.indexOf("(module.js:") || -1 !== stackLine.indexOf("(node.js:");
    }
    function isInternalFrame(stackLine) {
        var pieces = /at .+ \((.*):(\d+):\d+\)/.exec(stackLine);
        if (!pieces) return !1;
        var fileName = pieces[1], lineNumber = pieces[2];
        return fileName === qFileName && lineNumber >= qStartingLine && qEndingLine >= lineNumber;
    }
    function captureLine() {
        if (Error.captureStackTrace) {
            var fileName, lineNumber, oldPrepareStackTrace = Error.prepareStackTrace;
            return Error.prepareStackTrace = function(error, frames) {
                fileName = frames[1].getFileName(), lineNumber = frames[1].getLineNumber();
            }, new Error().stack, Error.prepareStackTrace = oldPrepareStackTrace, qFileName = fileName, 
            lineNumber;
        }
    }
    function Q(value) {
        return resolve(value);
    }
    function defer() {
        function become(resolvedValue) {
            pending && (value = resolve(resolvedValue), array_reduce(pending, function(undefined, pending) {
                nextTick(function() {
                    value.promiseDispatch.apply(value, pending);
                });
            }, void 0), pending = void 0, progressListeners = void 0);
        }
        var value, pending = [], progressListeners = [], deferred = object_create(defer.prototype), promise = object_create(makePromise.prototype);
        return promise.promiseDispatch = function(resolve, op, operands) {
            var args = array_slice(arguments);
            pending ? (pending.push(args), "when" === op && operands[1] && progressListeners.push(operands[1])) : nextTick(function() {
                value.promiseDispatch.apply(value, args);
            });
        }, promise.valueOf = function() {
            return pending ? promise : value = valueOf(value);
        }, Error.captureStackTrace && Q.longStackJumpLimit > 0 && (Error.captureStackTrace(promise, defer), 
        promise.stack = promise.stack.substring(promise.stack.indexOf("\n") + 1)), deferred.promise = promise, 
        deferred.resolve = become, deferred.fulfill = function(value) {
            become(fulfill(value));
        }, deferred.reject = function(exception) {
            become(reject(exception));
        }, deferred.notify = function(progress) {
            pending && array_reduce(progressListeners, function(undefined, progressListener) {
                nextTick(function() {
                    progressListener(progress);
                });
            }, void 0);
        }, deferred;
    }
    function promise(makePromise) {
        var deferred = defer();
        return fcall(makePromise, deferred.resolve, deferred.reject, deferred.notify).fail(deferred.reject), 
        deferred.promise;
    }
    function makePromise(descriptor, fallback, valueOf, exception, isException) {
        void 0 === fallback && (fallback = function(op) {
            return reject(new Error("Promise does not support operation: " + op));
        });
        var promise = object_create(makePromise.prototype);
        return promise.promiseDispatch = function(resolve, op, args) {
            var result;
            try {
                result = descriptor[op] ? descriptor[op].apply(promise, args) : fallback.call(promise, op, args);
            } catch (exception) {
                result = reject(exception);
            }
            resolve && resolve(result);
        }, valueOf && (promise.valueOf = valueOf), isException && (promise.exception = exception), 
        promise;
    }
    function valueOf(value) {
        return isPromise(value) ? value.valueOf() : value;
    }
    function isPromise(object) {
        return object && "function" == typeof object.promiseDispatch;
    }
    function isPromiseAlike(object) {
        return object && "function" == typeof object.then;
    }
    function isPending(object) {
        return !isFulfilled(object) && !isRejected(object);
    }
    function isFulfilled(object) {
        return !isPromiseAlike(valueOf(object));
    }
    function isRejected(object) {
        return object = valueOf(object), isPromise(object) && "exception" in object;
    }
    function displayErrors() {
        !errorsDisplayed && "undefined" != typeof window && window.console;
    }
    function reject(exception) {
        var rejection = makePromise({
            when: function(rejected) {
                if (rejected) {
                    var at = array_indexOf(rejections, this);
                    -1 !== at && (errors.splice(at, 1), rejections.splice(at, 1));
                }
                return rejected ? rejected(exception) : this;
            }
        }, function() {
            return reject(exception);
        }, function() {
            return this;
        }, exception, !0);
        return rejections.push(rejection), errors.push(exception), displayErrors(), rejection;
    }
    function fulfill(object) {
        return makePromise({
            when: function() {
                return object;
            },
            get: function(name) {
                return object[name];
            },
            set: function(name, value) {
                object[name] = value;
            },
            "delete": function(name) {
                delete object[name];
            },
            post: function(name, args) {
                return null == name ? object.apply(void 0, args) : object[name].apply(object, args);
            },
            apply: function(thisP, args) {
                return object.apply(thisP, args);
            },
            keys: function() {
                return object_keys(object);
            }
        }, void 0, function() {
            return object;
        });
    }
    function resolve(value) {
        return isPromise(value) ? value : (value = valueOf(value), isPromiseAlike(value) ? coerce(value) : fulfill(value));
    }
    function coerce(promise) {
        var deferred = defer();
        return nextTick(function() {
            try {
                promise.then(deferred.resolve, deferred.reject, deferred.notify);
            } catch (exception) {
                deferred.reject(exception);
            }
        }), deferred.promise;
    }
    function master(object) {
        return makePromise({
            isDef: function() {}
        }, function(op, args) {
            return dispatch(object, op, args);
        }, function() {
            return valueOf(object);
        });
    }
    function when(value, fulfilled, rejected, progressed) {
        function _fulfilled(value) {
            try {
                return "function" == typeof fulfilled ? fulfilled(value) : value;
            } catch (exception) {
                return reject(exception);
            }
        }
        function _rejected(exception) {
            if ("function" == typeof rejected) {
                makeStackTraceLong(exception, resolvedValue);
                try {
                    return rejected(exception);
                } catch (newException) {
                    return reject(newException);
                }
            }
            return reject(exception);
        }
        function _progressed(value) {
            return "function" == typeof progressed ? progressed(value) : value;
        }
        var deferred = defer(), done = !1, resolvedValue = resolve(value);
        return nextTick(function() {
            resolvedValue.promiseDispatch(function(value) {
                done || (done = !0, deferred.resolve(_fulfilled(value)));
            }, "when", [ function(exception) {
                done || (done = !0, deferred.resolve(_rejected(exception)));
            } ]);
        }), resolvedValue.promiseDispatch(void 0, "when", [ void 0, function(value) {
            var newValue, threw = !1;
            try {
                newValue = _progressed(value);
            } catch (e) {
                if (threw = !0, !Q.onerror) throw e;
                Q.onerror(e);
            }
            threw || deferred.notify(newValue);
        } ]), deferred.promise;
    }
    function spread(promise, fulfilled, rejected) {
        return when(promise, function(valuesOrPromises) {
            return all(valuesOrPromises).then(function(values) {
                return fulfilled.apply(void 0, values);
            }, rejected);
        }, rejected);
    }
    function async(makeGenerator) {
        return function() {
            function continuer(verb, arg) {
                var result;
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return isStopIteration(exception) ? exception.value : reject(exception);
                }
                return when(result, callback, errback);
            }
            var generator = makeGenerator.apply(this, arguments), callback = continuer.bind(continuer, "send"), errback = continuer.bind(continuer, "throw");
            return callback();
        };
    }
    function _return(value) {
        throw new QReturnValue(value);
    }
    function promised(callback) {
        return function() {
            return spread([ this, all(arguments) ], function(self, args) {
                return callback.apply(self, args);
            });
        };
    }
    function dispatch(object, op, args) {
        var deferred = defer();
        return nextTick(function() {
            resolve(object).promiseDispatch(deferred.resolve, op, args);
        }), deferred.promise;
    }
    function dispatcher(op) {
        return function(object) {
            var args = array_slice(arguments, 1);
            return dispatch(object, op, args);
        };
    }
    function send(value, name) {
        var args = array_slice(arguments, 2);
        return post(value, name, args);
    }
    function fapply(value, args) {
        return dispatch(value, "apply", [ void 0, args ]);
    }
    function fcall(value) {
        var args = array_slice(arguments, 1);
        return fapply(value, args);
    }
    function fbind(value) {
        var args = array_slice(arguments, 1);
        return function() {
            var allArgs = args.concat(array_slice(arguments));
            return dispatch(value, "apply", [ this, allArgs ]);
        };
    }
    function all(promises) {
        return when(promises, function(promises) {
            var countDown = promises.length;
            if (0 === countDown) return resolve(promises);
            var deferred = defer();
            return array_reduce(promises, function(undefined, promise, index) {
                isFulfilled(promise) ? (promises[index] = valueOf(promise), 0 === --countDown && deferred.resolve(promises)) : when(promise, function(value) {
                    promises[index] = value, 0 === --countDown && deferred.resolve(promises);
                }).fail(deferred.reject);
            }, void 0), deferred.promise;
        });
    }
    function allResolved(promises) {
        return when(promises, function(promises) {
            return promises = array_map(promises, resolve), when(all(array_map(promises, function(promise) {
                return when(promise, noop, noop);
            })), function() {
                return promises;
            });
        });
    }
    function fail(promise, rejected) {
        return when(promise, void 0, rejected);
    }
    function progress(promise, progressed) {
        return when(promise, void 0, void 0, progressed);
    }
    function fin(promise, callback) {
        return when(promise, function(value) {
            return when(callback(), function() {
                return value;
            });
        }, function(exception) {
            return when(callback(), function() {
                return reject(exception);
            });
        });
    }
    function done(promise, fulfilled, rejected, progress) {
        var onUnhandledError = function(error) {
            nextTick(function() {
                if (makeStackTraceLong(error, promise), !Q.onerror) throw error;
                Q.onerror(error);
            });
        }, promiseToHandle = fulfilled || rejected || progress ? when(promise, fulfilled, rejected, progress) : promise;
        "object" == typeof process && process && process.domain && (onUnhandledError = process.domain.bind(onUnhandledError)), 
        fail(promiseToHandle, onUnhandledError);
    }
    function timeout(promise, ms) {
        var deferred = defer(), timeoutId = setTimeout(function() {
            deferred.reject(new Error("Timed out after " + ms + " ms"));
        }, ms);
        return when(promise, function(value) {
            clearTimeout(timeoutId), deferred.resolve(value);
        }, function(exception) {
            clearTimeout(timeoutId), deferred.reject(exception);
        }), deferred.promise;
    }
    function delay(promise, timeout) {
        void 0 === timeout && (timeout = promise, promise = void 0);
        var deferred = defer();
        return setTimeout(function() {
            deferred.resolve(promise);
        }, timeout), deferred.promise;
    }
    function nfapply(callback, args) {
        var nodeArgs = array_slice(args), deferred = defer();
        return nodeArgs.push(deferred.makeNodeResolver()), fapply(callback, nodeArgs).fail(deferred.reject), 
        deferred.promise;
    }
    function nfcall(callback) {
        var nodeArgs = array_slice(arguments, 1), deferred = defer();
        return nodeArgs.push(deferred.makeNodeResolver()), fapply(callback, nodeArgs).fail(deferred.reject), 
        deferred.promise;
    }
    function nfbind(callback) {
        var baseArgs = array_slice(arguments, 1);
        return function() {
            var nodeArgs = baseArgs.concat(array_slice(arguments)), deferred = defer();
            return nodeArgs.push(deferred.makeNodeResolver()), fapply(callback, nodeArgs).fail(deferred.reject), 
            deferred.promise;
        };
    }
    function nbind(callback) {
        var baseArgs = array_slice(arguments, 1);
        return function() {
            function bound() {
                return callback.apply(thisArg, arguments);
            }
            var nodeArgs = baseArgs.concat(array_slice(arguments)), deferred = defer();
            nodeArgs.push(deferred.makeNodeResolver());
            var thisArg = this;
            return fapply(bound, nodeArgs).fail(deferred.reject), deferred.promise;
        };
    }
    function npost(object, name, args) {
        var nodeArgs = array_slice(args || []), deferred = defer();
        return nodeArgs.push(deferred.makeNodeResolver()), post(object, name, nodeArgs).fail(deferred.reject), 
        deferred.promise;
    }
    function nsend(object, name) {
        var nodeArgs = array_slice(arguments, 2), deferred = defer();
        return nodeArgs.push(deferred.makeNodeResolver()), post(object, name, nodeArgs).fail(deferred.reject), 
        deferred.promise;
    }
    function nodeify(promise, nodeback) {
        return nodeback ? void promise.then(function(value) {
            nextTick(function() {
                nodeback(null, value);
            });
        }, function(error) {
            nextTick(function() {
                nodeback(error);
            });
        }) : promise;
    }
    var qFileName, nextTick, qStartingLine = captureLine(), noop = function() {};
    "undefined" != typeof process ? nextTick = process.nextTick : "function" == typeof setImmediate ? nextTick = "undefined" != typeof window ? setImmediate.bind(window) : setImmediate : !function() {
        function onTick() {
            if (--pendingTicks, ++usedTicks >= maxPendingTicks) {
                usedTicks = 0, maxPendingTicks *= 4;
                for (var expectedTicks = queuedTasks && Math.min(queuedTasks - 1, maxPendingTicks); expectedTicks > pendingTicks; ) ++pendingTicks, 
                requestTick();
            }
            for (;queuedTasks; ) {
                --queuedTasks, head = head.next;
                var task = head.task;
                head.task = void 0, task();
            }
            usedTicks = 0;
        }
        var requestTick, head = {
            task: void 0,
            next: null
        }, tail = head, maxPendingTicks = 2, pendingTicks = 0, queuedTasks = 0, usedTicks = 0;
        if (nextTick = function(task) {
            tail = tail.next = {
                task: task,
                next: null
            }, pendingTicks < ++queuedTasks && maxPendingTicks > pendingTicks && (++pendingTicks, 
            requestTick());
        }, "undefined" != typeof MessageChannel) {
            var channel = new MessageChannel();
            channel.port1.onmessage = onTick, requestTick = function() {
                channel.port2.postMessage(0);
            };
        } else requestTick = function() {
            setTimeout(onTick, 0);
        };
    }();
    var QReturnValue, array_slice = uncurryThis(Array.prototype.slice), array_reduce = uncurryThis(Array.prototype.reduce || function(callback, basis) {
        var index = 0, length = this.length;
        if (1 === arguments.length) for (;;) {
            if (index in this) {
                basis = this[index++];
                break;
            }
            if (++index >= length) throw new TypeError();
        }
        for (;length > index; index++) index in this && (basis = callback(basis, this[index], index));
        return basis;
    }), array_indexOf = uncurryThis(Array.prototype.indexOf || function(value) {
        for (var i = 0; i < this.length; i++) if (this[i] === value) return i;
        return -1;
    }), array_map = uncurryThis(Array.prototype.map || function(callback, thisp) {
        var self = this, collect = [];
        return array_reduce(self, function(undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0), collect;
    }), object_create = Object.create || function(prototype) {
        function Type() {}
        return Type.prototype = prototype, new Type();
    }, object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty), object_keys = Object.keys || function(object) {
        var keys = [];
        for (var key in object) object_hasOwnProperty(object, key) && keys.push(key);
        return keys;
    }, object_toString = uncurryThis(Object.prototype.toString);
    QReturnValue = "undefined" != typeof ReturnValue ? ReturnValue : function(value) {
        this.value = value;
    }, Q.longStackJumpLimit = 1;
    var STACK_JUMP_SEPARATOR = "From previous event:";
    Q.nextTick = nextTick, Q.defer = defer, defer.prototype.makeNodeResolver = function() {
        var self = this;
        return function(error, value) {
            error ? self.reject(error) : self.resolve(arguments.length > 2 ? array_slice(arguments, 1) : value);
        };
    }, Q.promise = promise, Q.makePromise = makePromise, makePromise.prototype.then = function(fulfilled, rejected, progressed) {
        return when(this, fulfilled, rejected, progressed);
    }, makePromise.prototype.thenResolve = function(value) {
        return when(this, function() {
            return value;
        });
    }, array_reduce([ "isFulfilled", "isRejected", "isPending", "dispatch", "when", "spread", "get", "put", "set", "del", "delete", "post", "send", "invoke", "keys", "fapply", "fcall", "fbind", "all", "allResolved", "timeout", "delay", "catch", "finally", "fail", "fin", "progress", "done", "nfcall", "nfapply", "nfbind", "denodeify", "nbind", "ncall", "napply", "nbind", "npost", "nsend", "ninvoke", "nodeify" ], function(undefined, name) {
        makePromise.prototype[name] = function() {
            return Q[name].apply(Q, [ this ].concat(array_slice(arguments)));
        };
    }, void 0), makePromise.prototype.toSource = function() {
        return this.toString();
    }, makePromise.prototype.toString = function() {
        return "[object Promise]";
    }, Q.nearer = valueOf, Q.isPromise = isPromise, Q.isPromiseAlike = isPromiseAlike, 
    Q.isPending = isPending, Q.isFulfilled = isFulfilled, Q.isRejected = isRejected;
    var errorsDisplayed, rejections = [], errors = [];
    "undefined" != typeof process && process.on && process.on("exit", function() {
        for (var i = 0; i < errors.length; i++) {
            var error = errors[i];
            error && "undefined" != typeof error.stack;
        }
    }), Q.reject = reject, Q.fulfill = fulfill, Q.resolve = resolve, Q.master = master, 
    Q.when = when, Q.spread = spread, Q.async = async, Q["return"] = _return, Q.promised = promised, 
    Q.dispatch = dispatch, Q.dispatcher = dispatcher, Q.get = dispatcher("get"), Q.set = dispatcher("set"), 
    Q["delete"] = Q.del = dispatcher("delete");
    var post = Q.post = dispatcher("post");
    Q.send = send, Q.invoke = send, Q.fapply = fapply, Q["try"] = fcall, Q.fcall = fcall, 
    Q.fbind = fbind, Q.keys = dispatcher("keys"), Q.all = all, Q.allResolved = allResolved, 
    Q["catch"] = Q.fail = fail, Q.progress = progress, Q["finally"] = Q.fin = fin, Q.done = done, 
    Q.timeout = timeout, Q.delay = delay, Q.nfapply = nfapply, Q.nfcall = nfcall, Q.nfbind = nfbind, 
    Q.denodeify = Q.nfbind, Q.nbind = nbind, Q.npost = npost, Q.nsend = nsend, Q.ninvoke = Q.nsend, 
    Q.nodeify = nodeify;
    var qEndingLine = captureLine();
    return Q;
}), function(scope) {
    "use strict";
    var dijon = {
        VERSION: "0.5.3"
    };
    dijon.System = function() {
        this._mappings = {}, this._outlets = {}, this._handlers = {}, this.strictInjections = !0, 
        this.autoMapOutlets = !1, this.postInjectionHook = "setup";
    }, dijon.System.prototype = {
        _createAndSetupInstance: function(key, Clazz) {
            var instance = new Clazz();
            return this.injectInto(instance, key), instance;
        },
        _retrieveFromCacheOrCreate: function(key, overrideRules) {
            "undefined" == typeof overrideRules && (overrideRules = !1);
            var output;
            if (!this._mappings.hasOwnProperty(key)) throw new Error(1e3);
            var config = this._mappings[key];
            return !overrideRules && config.isSingleton ? (null == config.object && (config.object = this._createAndSetupInstance(key, config.clazz)), 
            output = config.object) : output = config.clazz ? this._createAndSetupInstance(key, config.clazz) : config.object, 
            output;
        },
        mapOutlet: function(sourceKey, targetKey, outletName) {
            if ("undefined" == typeof sourceKey) throw new Error(1010);
            return targetKey = targetKey || "global", outletName = outletName || sourceKey, 
            this._outlets.hasOwnProperty(targetKey) || (this._outlets[targetKey] = {}), this._outlets[targetKey][outletName] = sourceKey, 
            this;
        },
        getObject: function(key) {
            if ("undefined" == typeof key) throw new Error(1020);
            return this._retrieveFromCacheOrCreate(key);
        },
        mapValue: function(key, useValue) {
            if ("undefined" == typeof key) throw new Error(1030);
            return this._mappings[key] = {
                clazz: null,
                object: useValue,
                isSingleton: !0
            }, this.autoMapOutlets && this.mapOutlet(key), this.hasMapping(key) && this.injectInto(useValue, key), 
            this;
        },
        hasMapping: function(key) {
            if ("undefined" == typeof key) throw new Error(1040);
            return this._mappings.hasOwnProperty(key);
        },
        mapClass: function(key, clazz) {
            if ("undefined" == typeof key) throw new Error(1050);
            if ("undefined" == typeof clazz) throw new Error(1051);
            return this._mappings[key] = {
                clazz: clazz,
                object: null,
                isSingleton: !1
            }, this.autoMapOutlets && this.mapOutlet(key), this;
        },
        mapSingleton: function(key, clazz) {
            if ("undefined" == typeof key) throw new Error(1060);
            if ("undefined" == typeof clazz) throw new Error(1061);
            return this._mappings[key] = {
                clazz: clazz,
                object: null,
                isSingleton: !0
            }, this.autoMapOutlets && this.mapOutlet(key), this;
        },
        instantiate: function(key) {
            if ("undefined" == typeof key) throw new Error(1070);
            return this._retrieveFromCacheOrCreate(key, !0);
        },
        injectInto: function(instance, key) {
            if ("undefined" == typeof instance) throw new Error(1080);
            if ("object" == typeof instance) {
                var o = [];
                this._outlets.hasOwnProperty("global") && o.push(this._outlets.global), "undefined" != typeof key && this._outlets.hasOwnProperty(key) && o.push(this._outlets[key]);
                for (var i in o) {
                    var l = o[i];
                    for (var outlet in l) {
                        var source = l[outlet];
                        (!this.strictInjections || outlet in instance) && (instance[outlet] = this.getObject(source));
                    }
                }
                "setup" in instance && instance.setup.call(instance);
            }
            return this;
        },
        unmap: function(key) {
            if ("undefined" == typeof key) throw new Error(1090);
            return delete this._mappings[key], this;
        },
        unmapOutlet: function(target, outlet) {
            if ("undefined" == typeof target) throw new Error(1100);
            if ("undefined" == typeof outlet) throw new Error(1101);
            return delete this._outlets[target][outlet], this;
        },
        mapHandler: function(eventName, key, handler, oneShot, passEvent) {
            if ("undefined" == typeof eventName) throw new Error(1110);
            return key = key || "global", handler = handler || eventName, "undefined" == typeof oneShot && (oneShot = !1), 
            "undefined" == typeof passEvent && (passEvent = !1), this._handlers.hasOwnProperty(eventName) || (this._handlers[eventName] = {}), 
            this._handlers[eventName].hasOwnProperty(key) || (this._handlers[eventName][key] = []), 
            this._handlers[eventName][key].push({
                handler: handler,
                oneShot: oneShot,
                passEvent: passEvent
            }), this;
        },
        unmapHandler: function(eventName, key, handler) {
            if ("undefined" == typeof eventName) throw new Error(1120);
            if (key = key || "global", handler = handler || eventName, this._handlers.hasOwnProperty(eventName) && this._handlers[eventName].hasOwnProperty(key)) {
                var handlers = this._handlers[eventName][key];
                for (var i in handlers) {
                    var config = handlers[i];
                    if (config.handler === handler) {
                        handlers.splice(i, 1);
                        break;
                    }
                }
            }
            return this;
        },
        notify: function(eventName) {
            if ("undefined" == typeof eventName) throw new Error(1130);
            var argsWithEvent = Array.prototype.slice.call(arguments), argsClean = argsWithEvent.slice(1);
            if (this._handlers.hasOwnProperty(eventName)) {
                var handlers = this._handlers[eventName];
                for (var key in handlers) {
                    var instance, configs = handlers[key];
                    "object" == typeof key ? instance = key : "global" !== key && (instance = this.getObject(key));
                    var i, n, toBeDeleted = [];
                    for (i = 0, n = configs.length; n > i; i++) {
                        var handler, config = configs[i];
                        handler = instance && "string" == typeof config.handler ? instance[config.handler] : config.handler, 
                        config.oneShot && toBeDeleted.unshift(i), config.passEvent ? handler.apply(instance, argsWithEvent) : handler.apply(instance, argsClean);
                    }
                    for (i = 0, n = toBeDeleted.length; n > i; i++) configs.splice(toBeDeleted[i], 1);
                }
            }
            return this;
        }
    }, scope.dijon = dijon;
}(this), "undefined" == typeof utils) var utils = {};

"undefined" == typeof utils.Math && (utils.Math = {}), utils.Math.to64BitNumber = function(low, high) {
    var highNum, lowNum, expected;
    return highNum = new goog.math.Long(0, high), lowNum = new goog.math.Long(low, 0), 
    expected = highNum.add(lowNum), expected.toNumber();
}, goog = {}, goog.math = {}, goog.math.Long = function(low, high) {
    this.low_ = 0 | low, this.high_ = 0 | high;
}, goog.math.Long.IntCache_ = {}, goog.math.Long.fromInt = function(value) {
    if (value >= -128 && 128 > value) {
        var cachedObj = goog.math.Long.IntCache_[value];
        if (cachedObj) return cachedObj;
    }
    var obj = new goog.math.Long(0 | value, 0 > value ? -1 : 0);
    return value >= -128 && 128 > value && (goog.math.Long.IntCache_[value] = obj), 
    obj;
}, goog.math.Long.fromNumber = function(value) {
    return isNaN(value) || !isFinite(value) ? goog.math.Long.ZERO : value <= -goog.math.Long.TWO_PWR_63_DBL_ ? goog.math.Long.MIN_VALUE : value + 1 >= goog.math.Long.TWO_PWR_63_DBL_ ? goog.math.Long.MAX_VALUE : 0 > value ? goog.math.Long.fromNumber(-value).negate() : new goog.math.Long(value % goog.math.Long.TWO_PWR_32_DBL_ | 0, value / goog.math.Long.TWO_PWR_32_DBL_ | 0);
}, goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
}, goog.math.Long.fromString = function(str, opt_radix) {
    if (0 == str.length) throw Error("number format error: empty string");
    var radix = opt_radix || 10;
    if (2 > radix || radix > 36) throw Error("radix out of range: " + radix);
    if ("-" == str.charAt(0)) return goog.math.Long.fromString(str.substring(1), radix).negate();
    if (str.indexOf("-") >= 0) throw Error('number format error: interior "-" character: ' + str);
    for (var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8)), result = goog.math.Long.ZERO, i = 0; i < str.length; i += 8) {
        var size = Math.min(8, str.length - i), value = parseInt(str.substring(i, i + size), radix);
        if (8 > size) {
            var power = goog.math.Long.fromNumber(Math.pow(radix, size));
            result = result.multiply(power).add(goog.math.Long.fromNumber(value));
        } else result = result.multiply(radixToPower), result = result.add(goog.math.Long.fromNumber(value));
    }
    return result;
}, goog.math.Long.TWO_PWR_16_DBL_ = 65536, goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24, 
goog.math.Long.TWO_PWR_32_DBL_ = goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_, 
goog.math.Long.TWO_PWR_31_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ / 2, goog.math.Long.TWO_PWR_48_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_, 
goog.math.Long.TWO_PWR_64_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_, 
goog.math.Long.TWO_PWR_63_DBL_ = goog.math.Long.TWO_PWR_64_DBL_ / 2, goog.math.Long.ZERO = goog.math.Long.fromInt(0), 
goog.math.Long.ONE = goog.math.Long.fromInt(1), goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1), 
goog.math.Long.MAX_VALUE = goog.math.Long.fromBits(-1, 2147483647), goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, -2147483648), 
goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24), goog.math.Long.prototype.toInt = function() {
    return this.low_;
}, goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ + this.getLowBitsUnsigned();
}, goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (2 > radix || radix > 36) throw Error("radix out of range: " + radix);
    if (this.isZero()) return "0";
    if (this.isNegative()) {
        if (this.equals(goog.math.Long.MIN_VALUE)) {
            var radixLong = goog.math.Long.fromNumber(radix), div = this.div(radixLong), rem = div.multiply(radixLong).subtract(this);
            return div.toString(radix) + rem.toInt().toString(radix);
        }
        return "-" + this.negate().toString(radix);
    }
    for (var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6)), rem = this, result = ""; ;) {
        var remDiv = rem.div(radixToPower), intval = rem.subtract(remDiv.multiply(radixToPower)).toInt(), digits = intval.toString(radix);
        if (rem = remDiv, rem.isZero()) return digits + result;
        for (;digits.length < 6; ) digits = "0" + digits;
        result = "" + digits + result;
    }
}, goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
}, goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
}, goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return this.low_ >= 0 ? this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
}, goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) return this.equals(goog.math.Long.MIN_VALUE) ? 64 : this.negate().getNumBitsAbs();
    for (var val = 0 != this.high_ ? this.high_ : this.low_, bit = 31; bit > 0 && 0 == (val & 1 << bit); bit--) ;
    return 0 != this.high_ ? bit + 33 : bit + 1;
}, goog.math.Long.prototype.isZero = function() {
    return 0 == this.high_ && 0 == this.low_;
}, goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
}, goog.math.Long.prototype.isOdd = function() {
    return 1 == (1 & this.low_);
}, goog.math.Long.prototype.equals = function(other) {
    return this.high_ == other.high_ && this.low_ == other.low_;
}, goog.math.Long.prototype.notEquals = function(other) {
    return this.high_ != other.high_ || this.low_ != other.low_;
}, goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
}, goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
}, goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
}, goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
}, goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) return 0;
    var thisNeg = this.isNegative(), otherNeg = other.isNegative();
    return thisNeg && !otherNeg ? -1 : !thisNeg && otherNeg ? 1 : this.subtract(other).isNegative() ? -1 : 1;
}, goog.math.Long.prototype.negate = function() {
    return this.equals(goog.math.Long.MIN_VALUE) ? goog.math.Long.MIN_VALUE : this.not().add(goog.math.Long.ONE);
}, goog.math.Long.prototype.add = function(other) {
    var a48 = this.high_ >>> 16, a32 = 65535 & this.high_, a16 = this.low_ >>> 16, a00 = 65535 & this.low_, b48 = other.high_ >>> 16, b32 = 65535 & other.high_, b16 = other.low_ >>> 16, b00 = 65535 & other.low_, c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    return c00 += a00 + b00, c16 += c00 >>> 16, c00 &= 65535, c16 += a16 + b16, c32 += c16 >>> 16, 
    c16 &= 65535, c32 += a32 + b32, c48 += c32 >>> 16, c32 &= 65535, c48 += a48 + b48, 
    c48 &= 65535, goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32);
}, goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
}, goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) return goog.math.Long.ZERO;
    if (other.isZero()) return goog.math.Long.ZERO;
    if (this.equals(goog.math.Long.MIN_VALUE)) return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    if (other.equals(goog.math.Long.MIN_VALUE)) return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    if (this.isNegative()) return other.isNegative() ? this.negate().multiply(other.negate()) : this.negate().multiply(other).negate();
    if (other.isNegative()) return this.multiply(other.negate()).negate();
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) && other.lessThan(goog.math.Long.TWO_PWR_24_)) return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    var a48 = this.high_ >>> 16, a32 = 65535 & this.high_, a16 = this.low_ >>> 16, a00 = 65535 & this.low_, b48 = other.high_ >>> 16, b32 = 65535 & other.high_, b16 = other.low_ >>> 16, b00 = 65535 & other.low_, c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    return c00 += a00 * b00, c16 += c00 >>> 16, c00 &= 65535, c16 += a16 * b00, c32 += c16 >>> 16, 
    c16 &= 65535, c16 += a00 * b16, c32 += c16 >>> 16, c16 &= 65535, c32 += a32 * b00, 
    c48 += c32 >>> 16, c32 &= 65535, c32 += a16 * b16, c48 += c32 >>> 16, c32 &= 65535, 
    c32 += a00 * b32, c48 += c32 >>> 16, c32 &= 65535, c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48, 
    c48 &= 65535, goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32);
}, goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) throw Error("division by zero");
    if (this.isZero()) return goog.math.Long.ZERO;
    if (this.equals(goog.math.Long.MIN_VALUE)) {
        if (other.equals(goog.math.Long.ONE) || other.equals(goog.math.Long.NEG_ONE)) return goog.math.Long.MIN_VALUE;
        if (other.equals(goog.math.Long.MIN_VALUE)) return goog.math.Long.ONE;
        var halfThis = this.shiftRight(1), approx = halfThis.div(other).shiftLeft(1);
        if (approx.equals(goog.math.Long.ZERO)) return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
        var rem = this.subtract(other.multiply(approx)), result = approx.add(rem.div(other));
        return result;
    }
    if (other.equals(goog.math.Long.MIN_VALUE)) return goog.math.Long.ZERO;
    if (this.isNegative()) return other.isNegative() ? this.negate().div(other.negate()) : this.negate().div(other).negate();
    if (other.isNegative()) return this.div(other.negate()).negate();
    for (var res = goog.math.Long.ZERO, rem = this; rem.greaterThanOrEqual(other); ) {
        for (var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber())), log2 = Math.ceil(Math.log(approx) / Math.LN2), delta = 48 >= log2 ? 1 : Math.pow(2, log2 - 48), approxRes = goog.math.Long.fromNumber(approx), approxRem = approxRes.multiply(other); approxRem.isNegative() || approxRem.greaterThan(rem); ) approx -= delta, 
        approxRes = goog.math.Long.fromNumber(approx), approxRem = approxRes.multiply(other);
        approxRes.isZero() && (approxRes = goog.math.Long.ONE), res = res.add(approxRes), 
        rem = rem.subtract(approxRem);
    }
    return res;
}, goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
}, goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
}, goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_, this.high_ & other.high_);
}, goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_, this.high_ | other.high_);
}, goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_, this.high_ ^ other.high_);
}, goog.math.Long.prototype.shiftLeft = function(numBits) {
    if (numBits &= 63, 0 == numBits) return this;
    var low = this.low_;
    if (32 > numBits) {
        var high = this.high_;
        return goog.math.Long.fromBits(low << numBits, high << numBits | low >>> 32 - numBits);
    }
    return goog.math.Long.fromBits(0, low << numBits - 32);
}, goog.math.Long.prototype.shiftRight = function(numBits) {
    if (numBits &= 63, 0 == numBits) return this;
    var high = this.high_;
    if (32 > numBits) {
        var low = this.low_;
        return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >> numBits);
    }
    return goog.math.Long.fromBits(high >> numBits - 32, high >= 0 ? 0 : -1);
}, goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    if (numBits &= 63, 0 == numBits) return this;
    var high = this.high_;
    if (32 > numBits) {
        var low = this.low_;
        return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >>> numBits);
    }
    return 32 == numBits ? goog.math.Long.fromBits(high, 0) : goog.math.Long.fromBits(high >>> numBits - 32, 0);
};

var UTF8 = {};

UTF8.encode = function(s) {
    for (var u = [], i = 0; i < s.length; ++i) {
        var c = s.charCodeAt(i);
        128 > c ? u.push(c) : 2048 > c ? (u.push(192 | c >> 6), u.push(128 | 63 & c)) : 65536 > c ? (u.push(224 | c >> 12), 
        u.push(128 | 63 & c >> 6), u.push(128 | 63 & c)) : (u.push(240 | c >> 18), u.push(128 | 63 & c >> 12), 
        u.push(128 | 63 & c >> 6), u.push(128 | 63 & c));
    }
    return u;
}, UTF8.decode = function(u) {
    for (var a = [], i = 0; i < u.length; ) {
        var v = u[i++];
        128 > v || (224 > v ? (v = (31 & v) << 6, v |= 63 & u[i++]) : 240 > v ? (v = (15 & v) << 12, 
        v |= (63 & u[i++]) << 6, v |= 63 & u[i++]) : (v = (7 & v) << 18, v |= (63 & u[i++]) << 12, 
        v |= (63 & u[i++]) << 6, v |= 63 & u[i++])), a.push(String.fromCharCode(v));
    }
    return a.join("");
};

var BASE64 = {};

if (function(T) {
    var encodeArray = function(u) {
        for (var i = 0, a = [], n = 0 | u.length / 3; 0 < n--; ) {
            var v = (u[i] << 16) + (u[i + 1] << 8) + u[i + 2];
            i += 3, a.push(T.charAt(63 & v >> 18)), a.push(T.charAt(63 & v >> 12)), a.push(T.charAt(63 & v >> 6)), 
            a.push(T.charAt(63 & v));
        }
        if (2 == u.length - i) {
            var v = (u[i] << 16) + (u[i + 1] << 8);
            a.push(T.charAt(63 & v >> 18)), a.push(T.charAt(63 & v >> 12)), a.push(T.charAt(63 & v >> 6)), 
            a.push("=");
        } else if (1 == u.length - i) {
            var v = u[i] << 16;
            a.push(T.charAt(63 & v >> 18)), a.push(T.charAt(63 & v >> 12)), a.push("==");
        }
        return a.join("");
    }, R = function() {
        for (var a = [], i = 0; i < T.length; ++i) a[T.charCodeAt(i)] = i;
        return a["=".charCodeAt(0)] = 0, a;
    }(), decodeArray = function(s) {
        for (var i = 0, u = [], n = 0 | s.length / 4; 0 < n--; ) {
            var v = (R[s.charCodeAt(i)] << 18) + (R[s.charCodeAt(i + 1)] << 12) + (R[s.charCodeAt(i + 2)] << 6) + R[s.charCodeAt(i + 3)];
            u.push(255 & v >> 16), u.push(255 & v >> 8), u.push(255 & v), i += 4;
        }
        return u && ("=" == s.charAt(i - 2) ? (u.pop(), u.pop()) : "=" == s.charAt(i - 1) && u.pop()), 
        u;
    }, ASCII = {};
    ASCII.encode = function(s) {
        for (var u = [], i = 0; i < s.length; ++i) u.push(s.charCodeAt(i));
        return u;
    }, ASCII.decode = function() {
        for (var i = 0; i < s.length; ++i) a[i] = String.fromCharCode(a[i]);
        return a.join("");
    }, BASE64.decodeArray = function(s) {
        var u = decodeArray(s);
        return new Uint8Array(u);
    }, BASE64.encodeASCII = function(s) {
        var u = ASCII.encode(s);
        return encodeArray(u);
    }, BASE64.decodeASCII = function(s) {
        var a = decodeArray(s);
        return ASCII.decode(a);
    }, BASE64.encode = function(s) {
        var u = UTF8.encode(s);
        return encodeArray(u);
    }, BASE64.decode = function(s) {
        var u = decodeArray(s);
        return UTF8.decode(u);
    };
}("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), void 0 === btoa) var btoa = BASE64.encode;

if (void 0 === atob) var atob = BASE64.decode;

var mp4lib = {};

mp4lib.boxes = {}, mp4lib.helpers = {}, mp4lib.fieldProcessors = {}, mp4lib.fields = {}, 
mp4lib.boxes.File = function() {}, mp4lib.boxes.File.prototype._processFields = function(processor) {
    processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box = function() {
    this.size = null, this.boxtype = null;
}, mp4lib.boxes.Box.prototype._processFields = function(processor) {
    processor.eat("size", mp4lib.fields.FIELD_UINT32), processor.eat("boxtype", mp4lib.fields.FIELD_ID), 
    1 == this.size && processor.eat("largesize", mp4lib.fields.FIELD_INT64), "uuid" == this.boxtype && processor.eat("usertype", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16));
}, mp4lib.boxes.Box.prototype.boxPrototypes = {}, mp4lib.boxes.Box.prototype.uuidToBoxTypes = {}, 
mp4lib.boxes.Box.prototype.registerBoxType = function(boxPrototype) {
    mp4lib.boxes.Box.prototype.boxPrototypes[boxPrototype.prototype.boxtype] = boxPrototype, 
    boxPrototype.prototype.uuid && (mp4lib.boxes.Box.prototype.uuidToBoxTypes[JSON.stringify(boxPrototype.prototype.uuid)] = boxPrototype.prototype.boxtype);
}, mp4lib.boxes.FullBox = function() {}, mp4lib.boxes.FullBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("version", mp4lib.fields.FIELD_INT8), 
    processor.eat("flags", mp4lib.fields.FIELD_BIT24);
}, mp4lib.boxes.UnknownBox = function() {}, mp4lib.boxes.UnknownBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("unrecognized_data", new mp4lib.boxes.BoxFillingDataField());
}, mp4lib.boxes.FileTypeBox = function() {}, mp4lib.boxes.FileTypeBox.prototype.boxtype = "ftyp", 
mp4lib.boxes.FileTypeBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("major_brand", mp4lib.fields.FIELD_INT32), 
    processor.eat("minor_brand", mp4lib.fields.FIELD_INT32), processor.eat("compatible_brands", new mp4lib.fields.BoxFillingArrayField(mp4lib.fields.FIELD_INT32));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.FileTypeBox), mp4lib.boxes.MovieBox = function() {}, 
mp4lib.boxes.MovieBox.prototype.boxtype = "moov", mp4lib.boxes.MovieBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MovieBox), mp4lib.boxes.MovieFragmentBox = function() {}, 
mp4lib.boxes.MovieFragmentBox.prototype.boxtype = "moof", mp4lib.boxes.MovieFragmentBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MovieFragmentBox), mp4lib.boxes.MovieFragmentRandomAccessBox = function() {}, 
mp4lib.boxes.MovieFragmentRandomAccessBox.prototype.boxtype = "mfra", mp4lib.boxes.MovieFragmentRandomAccessBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MovieFragmentRandomAccessBox), 
mp4lib.boxes.UserDataBox = function() {}, mp4lib.boxes.UserDataBox.prototype.boxtype = "udta", 
mp4lib.boxes.UserDataBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.UserDataBox), mp4lib.boxes.TrackBox = function() {}, 
mp4lib.boxes.TrackBox.prototype.boxtype = "trak", mp4lib.boxes.TrackBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.TrackBox), mp4lib.boxes.EditBox = function() {}, 
mp4lib.boxes.EditBox.prototype.boxtype = "edts", mp4lib.boxes.EditBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.EditBox), mp4lib.boxes.MediaBox = function() {}, 
mp4lib.boxes.MediaBox.prototype.boxtype = "mdia", mp4lib.boxes.MediaBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MediaBox), mp4lib.boxes.MediaInformationBox = function() {}, 
mp4lib.boxes.MediaInformationBox.prototype.boxtype = "minf", mp4lib.boxes.MediaInformationBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MediaInformationBox), 
mp4lib.boxes.DataInformationBox = function() {}, mp4lib.boxes.DataInformationBox.prototype.boxtype = "dinf", 
mp4lib.boxes.DataInformationBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.DataInformationBox), 
mp4lib.boxes.SampleTableBox = function() {}, mp4lib.boxes.SampleTableBox.prototype.boxtype = "stbl", 
mp4lib.boxes.SampleTableBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.SampleTableBox), mp4lib.boxes.MovieExtendsBox = function() {}, 
mp4lib.boxes.MovieExtendsBox.prototype.boxtype = "mvex", mp4lib.boxes.MovieExtendsBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MovieExtendsBox), mp4lib.boxes.TrackFragmentBox = function() {}, 
mp4lib.boxes.TrackFragmentBox.prototype.boxtype = "traf", mp4lib.boxes.TrackFragmentBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.TrackFragmentBox), mp4lib.boxes.MetaBox = function() {}, 
mp4lib.boxes.MetaBox.prototype.boxtype = "meta", mp4lib.boxes.MetaBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MetaBox), mp4lib.boxes.MovieHeaderBox = function() {}, 
mp4lib.boxes.MovieHeaderBox.prototype.boxtype = "mvhd", mp4lib.boxes.MovieHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), 1 == this.version ? (processor.eat("creation_time", mp4lib.fields.FIELD_UINT64), 
    processor.eat("modification_time", mp4lib.fields.FIELD_UINT64), processor.eat("timescale", mp4lib.fields.FIELD_UINT32), 
    processor.eat("duration", mp4lib.fields.FIELD_UINT64)) : (processor.eat("creation_time", mp4lib.fields.FIELD_UINT32), 
    processor.eat("modification_time", mp4lib.fields.FIELD_UINT32), processor.eat("timescale", mp4lib.fields.FIELD_UINT32), 
    processor.eat("duration", mp4lib.fields.FIELD_UINT32)), processor.eat("rate", mp4lib.fields.FIELD_INT32), 
    processor.eat("volume", mp4lib.fields.FIELD_INT16), processor.eat("reserved", mp4lib.fields.FIELD_INT16), 
    processor.eat("reserved_2", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT32, 2)), 
    processor.eat("matrix", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT32, 9)), 
    processor.eat("pre_defined", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_BIT32, 6)), 
    processor.eat("next_track_ID", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MovieHeaderBox), mp4lib.boxes.MediaDataBox = function() {}, 
mp4lib.boxes.MediaDataBox.prototype.boxtype = "mdat", mp4lib.boxes.MediaDataBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("data", mp4lib.fields.FIELD_BOX_FILLING_DATA);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MediaDataBox), mp4lib.boxes.FreeSpaceBox = function() {}, 
mp4lib.boxes.FreeSpaceBox.prototype.boxtype = "free", mp4lib.boxes.FreeSpaceBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("data", mp4lib.fields.FIELD_BOX_FILLING_DATA);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.FreeSpaceBox), mp4lib.boxes.SegmentIndexBox = function() {}, 
mp4lib.boxes.SegmentIndexBox.prototype.boxtype = "sidx", mp4lib.boxes.SegmentIndexBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("reference_ID", mp4lib.fields.FIELD_UINT32), 
    processor.eat("timescale", mp4lib.fields.FIELD_UINT32), 1 == this.version ? (processor.eat("earliest_presentation_time", mp4lib.fields.FIELD_UINT64), 
    processor.eat("first_offset", mp4lib.fields.FIELD_UINT64)) : (processor.eat("earliest_presentation_time", mp4lib.fields.FIELD_UINT32), 
    processor.eat("first_offset", mp4lib.fields.FIELD_UINT32)), processor.eat("reserved", mp4lib.fields.FIELD_UINT16), 
    processor.isDeserializing || (this.reference_count = this.references.length), processor.eat("reference_count", mp4lib.fields.FIELD_UINT16);
    var referenceField = new mp4lib.fields.StructureField(this, SegmentIndexBox.prototype._processReference), a = new mp4lib.fields.ArrayField(referenceField, this.reference_count);
    processor.eat("references", a);
}, mp4lib.boxes.SegmentIndexBox.prototype._processReference = function(box, processor) {
    processor.eat("reference_info", mp4lib.fields.FIELD_UINT64), processor.eat("SAP", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.SegmentIndexBox), mp4lib.boxes.TrackHeaderBox = function() {}, 
mp4lib.boxes.TrackHeaderBox.prototype.boxtype = "tkhd", mp4lib.boxes.TrackHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), 1 == this.version ? (processor.eat("creation_time", mp4lib.fields.FIELD_UINT64), 
    processor.eat("modification_time", mp4lib.fields.FIELD_UINT64), processor.eat("track_id", mp4lib.fields.FIELD_UINT32), 
    processor.eat("reserved", mp4lib.fields.FIELD_UINT32), processor.eat("duration", mp4lib.fields.FIELD_UINT64)) : (processor.eat("creation_time", mp4lib.fields.FIELD_UINT32), 
    processor.eat("modification_time", mp4lib.fields.FIELD_UINT32), processor.eat("track_id", mp4lib.fields.FIELD_UINT32), 
    processor.eat("reserved", mp4lib.fields.FIELD_UINT32), processor.eat("duration", mp4lib.fields.FIELD_UINT32)), 
    processor.eat("reserved_2", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT32, 2)), 
    processor.eat("layer", mp4lib.fields.FIELD_INT16), processor.eat("alternate_group", mp4lib.fields.FIELD_INT16), 
    processor.eat("volume", mp4lib.fields.FIELD_INT16), processor.eat("reserved_3", mp4lib.fields.FIELD_INT16), 
    processor.eat("matrix", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT32, 9)), 
    processor.eat("width", mp4lib.fields.FIELD_INT32), processor.eat("height", mp4lib.fields.FIELD_INT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.TrackHeaderBox), mp4lib.boxes.MediaHeaderBox = function() {}, 
mp4lib.boxes.MediaHeaderBox.prototype.boxtype = "mdhd", mp4lib.boxes.MediaHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), 1 == this.version ? (processor.eat("creation_time", mp4lib.fields.FIELD_UINT64), 
    processor.eat("modification_time", mp4lib.fields.FIELD_UINT64), processor.eat("timescale", mp4lib.fields.FIELD_UINT32), 
    processor.eat("duration", mp4lib.fields.FIELD_UINT64)) : (processor.eat("creation_time", mp4lib.fields.FIELD_UINT32), 
    processor.eat("modification_time", mp4lib.fields.FIELD_UINT32), processor.eat("timescale", mp4lib.fields.FIELD_UINT32), 
    processor.eat("duration", mp4lib.fields.FIELD_UINT32)), processor.eat("language", mp4lib.fields.FIELD_UINT16), 
    processor.eat("reserved", mp4lib.fields.FIELD_UINT16);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MediaHeaderBox), mp4lib.boxes.MovieExtendsHeaderBox = function() {}, 
mp4lib.boxes.MovieExtendsHeaderBox.prototype.boxtype = "mehd", mp4lib.boxes.MovieExtendsHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), 1 == this.version ? processor.eat("fragment_duration", mp4lib.fields.FIELD_UINT64) : processor.eat("fragment_duration", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MovieExtendsHeaderBox), 
mp4lib.boxes.HandlerBox = function() {}, mp4lib.boxes.HandlerBox.prototype.boxtype = "hdlr", 
mp4lib.boxes.HandlerBox.prototype.HANDLERTYPEVIDEO = "vide", mp4lib.boxes.HandlerBox.prototype.HANDLERTYPEAUDIO = "soun", 
mp4lib.boxes.HandlerBox.prototype.HANDLERTYPETEXT = "meta", mp4lib.boxes.HandlerBox.prototype.HANDLERVIDEONAME = "Video Track", 
mp4lib.boxes.HandlerBox.prototype.HANDLERAUDIONAME = "Audio Track", mp4lib.boxes.HandlerBox.prototype.HANDLERTEXTNAME = "Text Track", 
mp4lib.boxes.HandlerBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("pre_defined", mp4lib.fields.FIELD_UINT32), 
    processor.eat("handler_type", mp4lib.fields.FIELD_UINT32), processor.eat("reserved", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT32, 3)), 
    processor.eat("name", mp4lib.fields.FIELD_STRING);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.HandlerBox), mp4lib.boxes.TimeToSampleBox = function() {}, 
mp4lib.boxes.TimeToSampleBox.prototype.boxtype = "stts", mp4lib.boxes.TimeToSampleBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.isDeserializing || (this.entry_count = this.entry.length), 
    processor.eat("entry_count", mp4lib.fields.FIELD_UINT_32);
    var entryField = new mp4lib.fields.StructureField(this, mp4lib.boxes.TimeToSampleBox.prototype._processEntry), a = new mp4lib.fields.ArrayField(entryField, this.entry_count);
    processor.eat("entry", a);
}, mp4lib.boxes.TimeToSampleBox.prototype._processEntry = function(box, processor) {
    processor.eat("sample_count", mp4lib.fields.FIELD_UINT32), processor.eat("sample_delta", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.TimeToSampleBox), mp4lib.boxes.SampleToChunkBox = function() {}, 
mp4lib.boxes.SampleToChunkBox.prototype.boxtype = "stsc", mp4lib.boxes.SampleToChunkBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.isDeserializing || (this.entry_count = this.entry.length), 
    processor.eat("entry_count", mp4lib.fields.FIELD_UINT32);
    var entryField = new mp4lib.fields.StructureField(this, mp4lib.boxes.SampleToChunkBox.prototype._processEntry), a = new mp4lib.fields.ArrayField(entryField, this.entry_count);
    processor.eat("entry", a);
}, mp4lib.boxes.SampleToChunkBox.prototype._processEntry = function(box, processor) {
    processor.eat("first_chunk", mp4lib.fields.FIELD_UINT32), processor.eat("samples_per_chunk", mp4lib.fields.FIELD_UINT32), 
    processor.eat("samples_description_index", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.SampleToChunkBox), mp4lib.boxes.ChunkOffsetBox = function() {}, 
mp4lib.boxes.ChunkOffsetBox.prototype.boxtype = "stco", mp4lib.boxes.ChunkOffsetBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.isDeserializing || (this.entry_count = this.chunk_offset.length), 
    processor.eat("entry_count", mp4lib.fields.FIELD_UINT32);
    var a = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT32, this.entry_count);
    processor.eat("chunk_offset", a);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.ChunkOffsetBox), mp4lib.boxes.TrackExtendsBox = function() {}, 
mp4lib.boxes.TrackExtendsBox.prototype.boxtype = "trex", mp4lib.boxes.TrackExtendsBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("track_ID", mp4lib.fields.FIELD_UINT32), 
    processor.eat("default_sample_description_index", mp4lib.fields.FIELD_UINT32), processor.eat("default_sample_duration", mp4lib.fields.FIELD_UINT32), 
    processor.eat("default_sample_size", mp4lib.fields.FIELD_UINT32), processor.eat("default_sample_flags", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.TrackExtendsBox), mp4lib.boxes.VideoMediaHeaderBox = function() {}, 
mp4lib.boxes.VideoMediaHeaderBox.prototype.boxtype = "vmhd", mp4lib.boxes.VideoMediaHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("graphicsmode", mp4lib.fields.FIELD_INT16), 
    processor.eat("opcolor", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT16, 3));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.VideoMediaHeaderBox), 
mp4lib.boxes.SoundMediaHeaderBox = function() {}, mp4lib.boxes.SoundMediaHeaderBox.prototype.boxtype = "smhd", 
mp4lib.boxes.SoundMediaHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("balance", mp4lib.fields.FIELD_INT16), 
    processor.eat("reserved", mp4lib.fields.FIELD_UINT16);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.SoundMediaHeaderBox), 
mp4lib.boxes.DataReferenceBox = function() {}, mp4lib.boxes.DataReferenceBox.prototype.boxtype = "dref", 
mp4lib.boxes.DataReferenceBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.isDeserializing || (this.entry_count = this.boxes.length), 
    processor.eat("entry_count", mp4lib.fields.FIELD_UINT32), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.DataReferenceBox), mp4lib.boxes.DataEntryUrlBox = function() {}, 
mp4lib.boxes.DataEntryUrlBox.prototype.boxtype = "url ", mp4lib.boxes.DataEntryUrlBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.isDeserializing ? this.flags & !1 && processor.eat("location", mp4lib.fields.FIELD_STRING) : "location" in this && (this.flags = 1 | this.flags, 
    processor.eat("location", mp4lib.fields.FIELD_STRING));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.DataEntryUrlBox), mp4lib.boxes.DataEntryUrnBox = function() {}, 
mp4lib.boxes.DataEntryUrnBox.prototype.boxtype = "urn ", mp4lib.boxes.DataEntryUrnBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), this.flags & !1 && (processor.eat("name", mp4lib.fields.FIELD_STRING), 
    processor.eat("location", mp4lib.fields.FIELD_STRING));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.DataEntryUrnBox), mp4lib.boxes.MovieFragmentHeaderBox = function() {}, 
mp4lib.boxes.MovieFragmentHeaderBox.prototype.boxtype = "mfhd", mp4lib.boxes.MovieFragmentHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("sequence_number", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MovieFragmentHeaderBox), 
mp4lib.boxes.TrackFragmentHeaderBox = function() {}, mp4lib.boxes.TrackFragmentHeaderBox.prototype.boxtype = "tfhd", 
mp4lib.boxes.TrackFragmentHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("track_ID", mp4lib.fields.FIELD_UINT32), 
    processor.eat_flagged(this, "flags", 1, "base_data_offset", mp4lib.fields.FIELD_UINT64), 
    processor.eat_flagged(this, "flags", 2, "sample_description_index", mp4lib.fields.FIELD_UINT32), 
    processor.eat_flagged(this, "flags", 8, "default_sample_duration", mp4lib.fields.FIELD_UINT32), 
    processor.eat_flagged(this, "flags", 16, "default_sample_size", mp4lib.fields.FIELD_UINT32), 
    processor.eat_flagged(this, "flags", 32, "default_sample_flags", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.TrackFragmentHeaderBox), 
mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox = function() {}, mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype.boxtype = "tfdt", 
mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), 1 == this.version ? processor.eat("baseMediaDecodeTime", mp4lib.fields.FIELD_UINT64) : processor.eat("baseMediaDecodeTime", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox), 
mp4lib.boxes.TrackFragmentRunBox = function() {}, mp4lib.boxes.TrackFragmentRunBox.prototype.boxtype = "trun", 
mp4lib.boxes.TrackFragmentRunBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.isDeserializing || (this.sample_count = this.samples_table.length), 
    processor.eat("sample_count", mp4lib.fields.FIELD_UINT32), processor.eat_flagged(this, "flags", 1, "data_offset", mp4lib.fields.FIELD_INT32), 
    processor.eat_flagged(this, "flags", 4, "first_sample_flags", mp4lib.fields.FIELD_UINT32);
    var entryField = new mp4lib.fields.StructureField(this, mp4lib.boxes.TrackFragmentRunBox.prototype._processEntry);
    processor.eat("samples_table", new mp4lib.fields.ArrayField(entryField, this.sample_count));
}, mp4lib.boxes.TrackFragmentRunBox.prototype._processEntry = function(box, processor) {
    processor.eat_flagged(box, "flags", 256, "sample_duration", mp4lib.fields.FIELD_UINT32), 
    processor.eat_flagged(box, "flags", 512, "sample_size", mp4lib.fields.FIELD_UINT32), 
    processor.eat_flagged(box, "flags", 1024, "sample_flags", mp4lib.fields.FIELD_UINT32), 
    1 == box.version ? processor.eat_flagged(box, "flags", 2048, "sample_composition_time_offset", mp4lib.fields.FIELD_INT32) : processor.eat_flagged(box, "flags", 2048, "sample_composition_time_offset", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.TrackFragmentRunBox), 
mp4lib.boxes.TimeToSampleBox = function() {}, mp4lib.boxes.TimeToSampleBox.prototype.boxtype = "stts", 
mp4lib.boxes.TimeToSampleBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.isDeserializing || (this.entry_count = this.entry.length), 
    processor.eat("entry_count", mp4lib.fields.FIELD_UINT32);
    var entryField = new mp4lib.fields.StructureField(this, mp4lib.boxes.TimeToSampleBox.prototype._processEntry), a = new mp4lib.fields.ArrayField(entryField, this.entry_count);
    processor.eat("entry", a);
}, mp4lib.boxes.TimeToSampleBox.prototype._processEntry = function(box, processor) {
    processor.eat("sample_count", mp4lib.fields.FIELD_UINT32), processor.eat("sample_delta", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.TimeToSampleBox), mp4lib.boxes.SampleDescriptionBox = function() {}, 
mp4lib.boxes.SampleDescriptionBox.prototype.boxtype = "stsd", mp4lib.boxes.SampleDescriptionBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.isDeserializing || (this.entry_count = this.boxes.length), 
    processor.eat("entry_count", mp4lib.fields.FIELD_UINT32), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.SampleDescriptionBox), 
mp4lib.boxes.SampleDependencyTableBox = function() {}, mp4lib.boxes.SampleDependencyTableBox.prototype.boxtype = "sdtp", 
mp4lib.boxes.SampleDependencyTableBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("sample_dependency_array", new mp4lib.fields.BoxFillingArrayField(mp4lib.fields.FIELD_UINT8));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.SampleDependencyTableBox), 
mp4lib.boxes.SampleEntryBox = function() {}, mp4lib.boxes.SampleEntryBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("reserved", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT8, 6)), 
    processor.eat("data_reference_index", mp4lib.fields.FIELD_UINT16);
}, mp4lib.boxes.VisualSampleEntryBox = function() {}, mp4lib.boxes.VisualSampleEntryBox.prototype._processFields = function(processor) {
    mp4lib.boxes.SampleEntryBox.prototype._processFields.call(this, processor), processor.eat("pre_defined", mp4lib.fields.FIELD_UINT16), 
    processor.eat("reserved_2", mp4lib.fields.FIELD_UINT16), processor.eat("pre_defined_2", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT32, 3)), 
    processor.eat("width", mp4lib.fields.FIELD_UINT16), processor.eat("height", mp4lib.fields.FIELD_UINT16), 
    processor.eat("horizresolution", mp4lib.fields.FIELD_UINT32), processor.eat("vertresolution", mp4lib.fields.FIELD_UINT32), 
    processor.eat("reserved_3", mp4lib.fields.FIELD_UINT32), processor.eat("frame_count", mp4lib.fields.FIELD_UINT16), 
    processor.eat("compressorname", new mp4lib.fields.FixedLenStringField(32)), processor.eat("depth", mp4lib.fields.FIELD_UINT16), 
    processor.eat("pre_defined_3", mp4lib.fields.FIELD_INT16), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.AVC1VisualSampleEntryBox = function() {}, mp4lib.boxes.AVC1VisualSampleEntryBox.prototype.boxtype = "avc1", 
mp4lib.boxes.AVC1VisualSampleEntryBox.prototype._processFields = function(processor) {
    mp4lib.boxes.VisualSampleEntryBox.prototype._processFields.call(this, processor);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.AVC1VisualSampleEntryBox), 
mp4lib.boxes.EncryptedVideoBox = function() {}, mp4lib.boxes.EncryptedVideoBox.prototype.boxtype = "encv", 
mp4lib.boxes.EncryptedVideoBox.prototype._processFields = function(processor) {
    mp4lib.boxes.VisualSampleEntryBox.prototype._processFields.call(this, processor);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.EncryptedVideoBox), mp4lib.boxes.AVCConfigurationBox = function() {}, 
mp4lib.boxes.AVCConfigurationBox.prototype.boxtype = "avcC", mp4lib.boxes.AVCConfigurationBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("configurationVersion", mp4lib.fields.FIELD_UINT8), 
    processor.eat("AVCProfileIndication", mp4lib.fields.FIELD_UINT8), processor.eat("profile_compatibility", mp4lib.fields.FIELD_UINT8), 
    processor.eat("AVCLevelIndication", mp4lib.fields.FIELD_UINT8), processor.isDeserializing ? (processor.eat("temp", mp4lib.fields.FIELD_UINT8), 
    this.lengthSizeMinusOne = 3 & this.temp, processor.eat("numOfSequenceParameterSets_tmp", mp4lib.fields.FIELD_UINT8), 
    this.numOfSequenceParameterSets = 31 & this.numOfSequenceParameterSets_tmp) : (this.temp = 252 | this.lengthSizeMinusOne, 
    processor.eat("temp", mp4lib.fields.FIELD_UINT8), this.numOfSequenceParameterSets = this.SPS_NAL.length, 
    this.numOfSequenceParameterSets_tmp = 224 | this.numOfSequenceParameterSets, processor.eat("numOfSequenceParameterSets_tmp", mp4lib.fields.FIELD_UINT8)), 
    processor.eat("SPS_NAL", new mp4lib.fields.VariableElementSizeArrayField(new mp4lib.fields.StructureField(this, mp4lib.boxes.AVCConfigurationBox.prototype._processNAL), this.numOfSequenceParameterSets)), 
    processor.eat("numOfPictureParameterSets", mp4lib.fields.FIELD_UINT8), processor.eat("PPS_NAL", new mp4lib.fields.VariableElementSizeArrayField(new mp4lib.fields.StructureField(this, mp4lib.boxes.AVCConfigurationBox.prototype._processNAL), this.numOfPictureParameterSets));
}, mp4lib.boxes.AVCConfigurationBox.prototype._processNAL = function(box, processor) {
    processor.eat("NAL_length", mp4lib.fields.FIELD_UINT16), processor.eat("NAL", new mp4lib.fields.DataField(this.NAL_length));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.AVCConfigurationBox), 
mp4lib.boxes.PixelAspectRatioBox = function() {}, mp4lib.boxes.PixelAspectRatioBox.prototype.boxtype = "pasp", 
mp4lib.boxes.PixelAspectRatioBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("hSpacing", mp4lib.fields.FIELD_INT32), 
    processor.eat("vSpacing", mp4lib.fields.FIELD_INT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.PixelAspectRatioBox), 
mp4lib.boxes.AudioSampleEntryBox = function() {}, mp4lib.boxes.AudioSampleEntryBox.prototype._processFields = function(processor) {
    mp4lib.boxes.SampleEntryBox.prototype._processFields.call(this, processor), processor.eat("reserved_2", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT32, 2)), 
    processor.eat("channelcount", mp4lib.fields.FIELD_UINT16), processor.eat("samplesize", mp4lib.fields.FIELD_UINT16), 
    processor.eat("pre_defined", mp4lib.fields.FIELD_UINT16), processor.eat("reserved_3", mp4lib.fields.FIELD_UINT16), 
    processor.eat("samplerate", mp4lib.fields.FIELD_UINT32), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.MP4AudioSampleEntryBox = function() {}, mp4lib.boxes.MP4AudioSampleEntryBox.prototype.boxtype = "mp4a", 
mp4lib.boxes.MP4AudioSampleEntryBox.prototype._processFields = function(processor) {
    mp4lib.boxes.AudioSampleEntryBox.prototype._processFields.call(this, processor);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.MP4AudioSampleEntryBox), 
mp4lib.boxes.EncryptedAudioBox = function() {}, mp4lib.boxes.EncryptedAudioBox.prototype.boxtype = "enca", 
mp4lib.boxes.EncryptedAudioBox.prototype._processFields = function(processor) {
    mp4lib.boxes.AudioSampleEntryBox.prototype._processFields.call(this, processor);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.EncryptedAudioBox), mp4lib.boxes.ESDBox = function() {}, 
mp4lib.boxes.ESDBox.prototype.boxtype = "esds", mp4lib.boxes.ESDBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("ES_tag", mp4lib.fields.FIELD_UINT8), 
    processor.eat("ES_length", mp4lib.fields.FIELD_UINT8), processor.eat("ES_data", new mp4lib.fields.DataField(this.ES_length));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.ESDBox), mp4lib.boxes.SampleSizeBox = function() {}, 
mp4lib.boxes.SampleSizeBox.prototype.boxtype = "stsz", mp4lib.boxes.SampleSizeBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("sample_size", mp4lib.fields.FIELD_UINT32), 
    processor.eat("sample_count", mp4lib.fields.FIELD_UINT32);
    new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT32, this.sample_count);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.SampleSizeBox), mp4lib.boxes.ProtectionSystemSpecificHeaderBox = function() {}, 
mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype.boxtype = "pssh", mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("SystemID", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT8, 16)), 
    processor.eat("DataSize", mp4lib.fields.FIELD_UINT32), processor.eat("Data", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT8, this.DataSize));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.ProtectionSystemSpecificHeaderBox), 
mp4lib.boxes.SampleAuxiliaryInformationSizesBox = function() {}, mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype.boxtype = "saiz", 
mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), 1 & this.flags && (processor.eat("aux_info_type", mp4lib.fields.FIELD_UINT32), 
    processor.eat("aux_info_type_parameter", mp4lib.fields.FIELD_UINT32)), processor.eat("default_sample_info_size", mp4lib.fields.FIELD_UINT8), 
    processor.eat("sample_count", mp4lib.fields.FIELD_UINT32), 0 == this.default_sample_info_size && processor.eat("sample_info_size", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT8, this.sample_count));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.SampleAuxiliaryInformationSizesBox), 
mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox = function() {}, mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype.boxtype = "saio", 
mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), 1 & this.flags && (processor.eat("aux_info_type", mp4lib.fields.FIELD_UINT32), 
    processor.eat("aux_info_type_parameter", mp4lib.fields.FIELD_UINT32)), processor.eat("entry_count", mp4lib.fields.FIELD_UINT32), 
    0 == this.version ? processor.eat("offset", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT32, this.entry_count)) : processor.eat("offset", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT64, this.entry_count));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox), 
mp4lib.boxes.ProtectionSchemeInformationBox = function() {}, mp4lib.boxes.ProtectionSchemeInformationBox.prototype.boxtype = "sinf", 
mp4lib.boxes.ProtectionSchemeInformationBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.ProtectionSchemeInformationBox), 
mp4lib.boxes.SchemeInformationBox = function() {}, mp4lib.boxes.SchemeInformationBox.prototype.boxtype = "schi", 
mp4lib.boxes.SchemeInformationBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("boxes", mp4lib.fields.FIELD_CONTAINER_CHILDREN);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.SchemeInformationBox), 
mp4lib.boxes.TrackEncryptionBox = function() {}, mp4lib.boxes.TrackEncryptionBox.prototype.boxtype = "tenc", 
mp4lib.boxes.TrackEncryptionBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("default_IsEncrypted", mp4lib.fields.FIELD_BIT24), 
    processor.eat("default_IV_size", mp4lib.fields.FIELD_UINT8), processor.eat("default_KID", new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT8, 16));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.TrackEncryptionBox), 
mp4lib.boxes.SchemeTypeBox = function() {}, mp4lib.boxes.SchemeTypeBox.prototype.boxtype = "schm", 
mp4lib.boxes.SchemeTypeBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("scheme_type", mp4lib.fields.FIELD_UINT32), 
    processor.eat("scheme_version", mp4lib.fields.FIELD_UINT32), 1 & this.flags;
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.SchemeTypeBox), mp4lib.boxes.OriginalFormatBox = function() {}, 
mp4lib.boxes.OriginalFormatBox.prototype.boxtype = "frma", mp4lib.boxes.OriginalFormatBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this, processor), processor.eat("data_format", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.OriginalFormatBox), mp4lib.boxes.PiffSampleEncryptionBox = function() {}, 
mp4lib.boxes.PiffSampleEncryptionBox.prototype.boxtype = "sepiff", mp4lib.boxes.PiffSampleEncryptionBox.prototype.uuid = [ 162, 57, 79, 82, 90, 155, 79, 20, 162, 68, 108, 66, 124, 100, 141, 244 ], 
mp4lib.boxes.PiffSampleEncryptionBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("sample_count", mp4lib.fields.FIELD_UINT32), 
    1 & this.flags && processor.eat("IV_size", mp4lib.fields.FIELD_UINT8);
    var entryField = new mp4lib.fields.StructureField(this, mp4lib.boxes.PiffSampleEncryptionBox.prototype._processEntry), a = new mp4lib.fields.VariableElementSizeArrayField(entryField, this.sample_count);
    processor.eat("entry", a);
}, mp4lib.boxes.PiffSampleEncryptionBox.prototype._processEntry = function(box, processor) {
    if (processor.eat("InitializationVector", new mp4lib.fields.DataField(8)), 2 & box.flags) {
        processor.eat("NumberOfEntries", mp4lib.fields.FIELD_UINT16);
        var entryField = new mp4lib.fields.StructureField(this, mp4lib.boxes.PiffSampleEncryptionBox.prototype._processClearEntry), a = new mp4lib.fields.ArrayField(entryField, this.NumberOfEntries);
        processor.eat("clearAndCryptedData", a);
    }
}, mp4lib.boxes.PiffSampleEncryptionBox.prototype._processClearEntry = function(box, processor) {
    processor.eat("BytesOfClearData", mp4lib.fields.FIELD_UINT16), processor.eat("BytesOfEncryptedData", mp4lib.fields.FIELD_UINT32);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.PiffSampleEncryptionBox), 
mp4lib.boxes.PiffTrackEncryptionBox = function() {}, mp4lib.boxes.PiffTrackEncryptionBox.prototype.boxtype = "tepiff", 
mp4lib.boxes.PiffTrackEncryptionBox.prototype.uuid = [ 137, 116, 219, 206, 123, 231, 76, 81, 132, 249, 113, 72, 249, 136, 37, 84 ], 
mp4lib.boxes.PiffTrackEncryptionBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.PiffTrackEncryptionBox), 
mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox = function() {}, mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox.prototype.boxtype = "psshpiff", 
mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox.prototype.uuid = [ 208, 138, 79, 24, 16, 243, 74, 130, 182, 200, 50, 216, 171, 161, 131, 211 ], 
mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor);
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox), 
mp4lib.boxes.TfxdBox = function() {}, mp4lib.boxes.TfxdBox.prototype.boxtype = "tfxd", 
mp4lib.boxes.TfxdBox.prototype.uuid = [ 109, 29, 155, 5, 66, 213, 68, 230, 128, 226, 20, 29, 175, 247, 87, 178 ], 
mp4lib.boxes.TfxdBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), 1 == this.version ? (processor.eat("fragment_absolute_time", mp4lib.fields.FIELD_UINT64), 
    processor.eat("fragment_duration", mp4lib.fields.FIELD_UINT64)) : (processor.eat("fragment_absolute_time", mp4lib.fields.FIELD_UINT32), 
    processor.eat("fragment_duration", mp4lib.fields.FIELD_UINT32));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.TfxdBox), mp4lib.boxes.TfrfBox = function() {}, 
mp4lib.boxes.TfrfBox.prototype.boxtype = "tfrf", mp4lib.boxes.TfrfBox.prototype.uuid = [ 212, 128, 126, 242, 202, 57, 70, 149, 142, 84, 38, 203, 158, 70, 167, 159 ], 
mp4lib.boxes.TfrfBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this, processor), processor.eat("fragment_count", mp4lib.fields.FIELD_UINT8);
    var entryField = new mp4lib.fields.StructureField(this, mp4lib.boxes.TfrfBox.prototype._processEntry), a = new mp4lib.fields.ArrayField(entryField, this.fragment_count);
    processor.eat("entry", a);
}, mp4lib.boxes.TfrfBox.prototype._processEntry = function(box, processor) {
    1 == box.version ? (processor.eat("fragment_absolute_time", mp4lib.fields.FIELD_UINT64), 
    processor.eat("fragment_duration", mp4lib.fields.FIELD_UINT64)) : (processor.eat("fragment_absolute_time", mp4lib.fields.FIELD_UINT32), 
    processor.eat("fragment_duration", mp4lib.fields.FIELD_UINT32));
}, mp4lib.boxes.Box.prototype.registerBoxType(mp4lib.boxes.TfrfBox), mp4lib.fieldProcessors.SerializationBoxFieldsProcessor = function(box, buf, pos) {
    this.box = box, this.buf = buf, this.pos = pos, this.isDeserializing = !1;
}, mp4lib.fieldProcessors.SerializationBoxFieldsProcessor.prototype.eat = function(fieldname, fieldtype) {
    fieldtype.write(this.buf, this.pos, this.box[fieldname]), this.pos += fieldtype.getLength(this.box[fieldname]);
}, mp4lib.fieldProcessors.SerializationBoxFieldsProcessor.prototype.eat_flagged = function(flagbox, flagsfieldname, flag, fieldname, fieldtype) {
    0 != (flagbox[flagsfieldname] & flag) && this.eat(fieldname, fieldtype);
}, mp4lib.fieldProcessors.DeserializationBoxFieldsProcessor = function(box, buf, pos, end) {
    this.box = box, this.buf = buf, this.pos = pos, this.bufferStart = pos, this.bufferEnd = end, 
    this.end = end, this.isDeserializing = !0;
}, mp4lib.fieldProcessors.DeserializationBoxFieldsProcessor.prototype.eat = function(fieldname, fieldtype) {
    var val = fieldtype.read(this.buf, this.pos, this.end);
    if (this.box[fieldname] = val, "size" == fieldname && (this.end = this.bufferStart + val, 
    this.end > this.bufferEnd)) throw "Deserialization error: Box size exceeds buffer (" + this.box.boxtype + ")";
    this.pos += fieldtype.getLength(val);
}, mp4lib.fieldProcessors.DeserializationBoxFieldsProcessor.prototype.eat_optional = function(fieldname, fieldtype) {
    this.pos < this.end && this.eat(fieldname, fieldtype);
}, mp4lib.fieldProcessors.DeserializationBoxFieldsProcessor.prototype.eat_flagged = function(flagbox, flagsfieldname, flag, fieldname, fieldtype) {
    0 != (flagbox[flagsfieldname] & flag) && this.eat(fieldname, fieldtype);
}, mp4lib.fieldProcessors.LengthCounterBoxFieldsProcessor = function(box) {
    this.box = box, this.res = 0, this.isDeserializing = !1;
}, mp4lib.fieldProcessors.LengthCounterBoxFieldsProcessor.prototype.eat = function(fieldname, fieldtype) {
    var val = fieldtype.getLength(this.box[fieldname]);
    isNaN(val), this.res += val;
}, mp4lib.fieldProcessors.LengthCounterBoxFieldsProcessor.prototype.eat_flagged = function(flagbox, flagsfieldname, flag, fieldname, fieldtype) {
    fieldname in this.box && this.eat(fieldname, fieldtype);
}, mp4lib.fields.readBytes = function(buf, pos, nbBytes) {
    for (var value = 0, i = 0; nbBytes > i; i++) value <<= 8, value += buf[pos], pos++;
    return value;
}, mp4lib.fields.writeBytes = function(buf, pos, nbBytes, value) {
    for (var i = 0; nbBytes > i; i++) buf[pos + nbBytes - i - 1] = 255 & value, value >>= 8;
}, mp4lib.fields.NumberField = function(bits, signed) {
    this.bits = bits, this.signed = signed;
}, mp4lib.fields.NumberField.prototype.read = function(buf, pos) {
    return mp4lib.fields.readBytes(buf, pos, this.bits / 8);
}, mp4lib.fields.NumberField.prototype.write = function(buf, pos, val) {
    mp4lib.fields.writeBytes(buf, pos, this.bits / 8, val);
}, mp4lib.fields.NumberField.prototype.getLength = function() {
    return this.bits / 8;
}, mp4lib.fields.LongNumberField = function() {}, mp4lib.fields.LongNumberField.prototype.read = function(buf, pos) {
    var high = mp4lib.fields.readBytes(buf, pos, 4), low = mp4lib.fields.readBytes(buf, pos + 4, 4);
    return goog.math.Long.fromBits(low, high).toNumber();
}, mp4lib.fields.LongNumberField.prototype.write = function(buf, pos, val) {
    var longNumber = goog.math.Long.fromNumber(val), low = longNumber.getLowBits(), high = longNumber.getHighBits();
    mp4lib.fields.writeBytes(buf, pos, 4, high), mp4lib.fields.writeBytes(buf, pos + 4, 4, low);
}, mp4lib.fields.LongNumberField.prototype.getLength = function() {
    return 8;
}, mp4lib.fields.FixedLenStringField = function(size) {
    this.size = size;
}, mp4lib.fields.FixedLenStringField.prototype.read = function(buf, pos) {
    for (var res = "", i = 0; i < this.size; i++) res += String.fromCharCode(buf[pos + i]);
    return res;
}, mp4lib.fields.FixedLenStringField.prototype.write = function(buf, pos, val) {
    for (var i = 0; i < this.size; i++) buf[pos + i] = val.charCodeAt(i);
}, mp4lib.fields.FixedLenStringField.prototype.getLength = function() {
    return this.size;
}, mp4lib.fields.StringField = function() {}, mp4lib.fields.StringField.prototype.read = function(buf, pos, end) {
    for (var res = "", i = pos; end > i; i++) if (res += String.fromCharCode(buf[i]), 
    0 == buf[i]) return res;
    throw "expected null-terminated string, but end of field reached without termination, read so far:" + res;
}, mp4lib.fields.StringField.prototype.write = function(buf, pos, val) {
    for (var i = 0; i < val.length; i++) buf[pos + i] = val.charCodeAt(i);
    buf[pos + val.length] = 0;
}, mp4lib.fields.StringField.prototype.getLength = function(val) {
    return val.length;
}, mp4lib.fields.BoxFillingDataField = function() {}, mp4lib.fields.BoxFillingDataField.prototype.read = function(buf, pos, end) {
    var res = buf.subarray(pos, end);
    return res;
}, mp4lib.fields.BoxFillingDataField.prototype.write = function(buf, pos, val) {
    buf.set(val, pos);
}, mp4lib.fields.BoxFillingDataField.prototype.getLength = function(val) {
    return val.length;
}, mp4lib.fields.DataField = function(len) {
    this.len = len;
}, mp4lib.fields.DataField.prototype.read = function(buf, pos) {
    var res = buf.subarray(pos, pos + this.len);
    return res;
}, mp4lib.fields.DataField.prototype.write = function(buf, pos, val) {
    buf.set(val, pos);
}, mp4lib.fields.DataField.prototype.getLength = function() {
    return this.len;
}, mp4lib.fields.ArrayField = function(innerField, size) {
    this.innerField = innerField, this.size = size;
}, mp4lib.fields.ArrayField.prototype.read = function(buf, pos) {
    for (var innerFieldLength = -1, res = [], i = 0; i < this.size; i++) res.push(this.innerField.read(buf, pos)), 
    -1 == innerFieldLength && (innerFieldLength = this.innerField.getLength(res[i])), 
    pos += innerFieldLength;
    return res;
}, mp4lib.fields.ArrayField.prototype.write = function(buf, pos, val) {
    var innerFieldLength = 0;
    this.size > 0 && (innerFieldLength = this.innerField.getLength(val[0]));
    for (var i = 0; i < this.size; i++) this.innerField.write(buf, pos, val[i]), pos += innerFieldLength;
}, mp4lib.fields.ArrayField.prototype.getLength = function(val) {
    var innerFieldLength = 0;
    return this.size > 0 && (innerFieldLength = this.innerField.getLength(val[0])), 
    this.size * innerFieldLength;
}, mp4lib.fields.VariableElementSizeArrayField = function(innerField, size) {
    this.innerField = innerField, this.size = size;
}, mp4lib.fields.VariableElementSizeArrayField.prototype.read = function(buf, pos) {
    for (var res = [], i = 0; i < this.size; i++) res.push(this.innerField.read(buf, pos)), 
    pos += this.innerField.getLength(res[i]);
    return res;
}, mp4lib.fields.VariableElementSizeArrayField.prototype.write = function(buf, pos, val) {
    for (var i = 0; i < this.size; i++) this.innerField.write(buf, pos, val[i]), pos += this.innerField.getLength(val[i]);
}, mp4lib.fields.VariableElementSizeArrayField.prototype.getLength = function(val) {
    for (var res = 0, i = 0; i < this.size; i++) res += this.innerField.getLength(val[i]);
    return res;
}, mp4lib.fields.BoxFillingArrayField = function(innerField) {
    this.innerField = innerField, this.innerFieldLength = innerField.getLength();
}, mp4lib.fields.BoxFillingArrayField.prototype.read = function(buf, pos, end) {
    for (var res = [], size = (end - pos) / this.innerFieldLength, i = 0; size > i; i++) res.push(this.innerField.read(buf, pos)), 
    pos += this.innerFieldLength;
    return res;
}, mp4lib.fields.BoxFillingArrayField.prototype.write = function(buf, pos, val) {
    for (var i = 0; i < val.length; i++) this.innerField.write(buf, pos, val[i]), pos += this.innerFieldLength;
}, mp4lib.fields.BoxFillingArrayField.prototype.getLength = function(val) {
    return val.length * this.innerFieldLength;
}, mp4lib.fields.StructureField = function(box, _processStructureFields) {
    this.box = box, this._processStructureFields = _processStructureFields;
}, mp4lib.fields.StructureField.prototype.read = function(buf, pos, end) {
    var struct = {}, p = new mp4lib.fieldProcessors.DeserializationBoxFieldsProcessor(struct, buf, pos, end);
    return this._processStructureFields.call(struct, this.box, p), struct;
}, mp4lib.fields.StructureField.prototype.write = function(buf, pos, val) {
    var p = new mp4lib.fieldProcessors.SerializationBoxFieldsProcessor(val, buf, pos);
    this._processStructureFields.call(val, this.box, p);
}, mp4lib.fields.StructureField.prototype.getLength = function(val) {
    var p = new mp4lib.fieldProcessors.LengthCounterBoxFieldsProcessor(val);
    return this._processStructureFields.call(val, this.box, p), isNaN(p.res) && void 0 === val, 
    p.res;
}, mp4lib.fields.BoxesListField = function() {}, mp4lib.fields.readString = function(buf, pos, count) {
    for (var res = "", i = pos; pos + count > i; i++) res += String.fromCharCode(buf[i]);
    return res;
}, mp4lib.fields.BoxesListField.prototype.read = function(buf, pos, end) {
    for (var res = []; end > pos; ) {
        var size = mp4lib.fields.FIELD_BIT32.read(buf, pos), boxtype = mp4lib.fields.readString(buf, pos + 4, 4);
        if ("uuid" == boxtype) {
            var uuidFieldPos = 1 == size ? 16 : 8, uuid = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16).read(buf, pos + uuidFieldPos, pos + uuidFieldPos + 16);
            boxtype = mp4lib.boxes.Box.prototype.uuidToBoxTypes[JSON.stringify(uuid)], void 0 === boxtype && (boxtype = "uuid");
        }
        var box;
        box = boxtype in mp4lib.boxes.Box.prototype.boxPrototypes ? new mp4lib.boxes.Box.prototype.boxPrototypes[boxtype]() : new mp4lib.boxes.UnknownBox();
        var p = new mp4lib.fieldProcessors.DeserializationBoxFieldsProcessor(box, buf, pos, end);
        if (box._processFields(p), box.__sourceBuffer = buf.subarray(pos, pos + box.size), 
        box.boxtype = boxtype, res.push(box), pos += box.size, 0 == box.size) return;
    }
    return res;
}, mp4lib.fields.BoxesListField.prototype.write = function(buf, pos, val) {
    for (var i = 0; i < val.length; i++) {
        var box = val[i], sp = new mp4lib.fieldProcessors.SerializationBoxFieldsProcessor(box, buf, pos);
        box._processFields(sp), pos += box.size;
    }
}, mp4lib.fields.BoxesListField.prototype.getLength = function(val) {
    var i, res = 0;
    for (i = 0; i < val.length; i++) {
        var box = val[i], p = new mp4lib.fieldProcessors.LengthCounterBoxFieldsProcessor(box);
        box._processFields(p), box.size = p.res, res += p.res;
    }
    return res;
}, mp4lib.fields.FIELD_INT8 = new mp4lib.fields.NumberField(8, !0), mp4lib.fields.FIELD_INT16 = new mp4lib.fields.NumberField(16, !0), 
mp4lib.fields.FIELD_INT32 = new mp4lib.fields.NumberField(32, !0), mp4lib.fields.FIELD_INT64 = new mp4lib.fields.LongNumberField(), 
mp4lib.fields.FIELD_UINT8 = new mp4lib.fields.NumberField(8, !1), mp4lib.fields.FIELD_UINT16 = new mp4lib.fields.NumberField(16, !1), 
mp4lib.fields.FIELD_UINT32 = new mp4lib.fields.NumberField(32, !1), mp4lib.fields.FIELD_UINT64 = new mp4lib.fields.LongNumberField(), 
mp4lib.fields.FIELD_BIT8 = new mp4lib.fields.NumberField(8, !1), mp4lib.fields.FIELD_BIT16 = new mp4lib.fields.NumberField(16, !1), 
mp4lib.fields.FIELD_BIT24 = new mp4lib.fields.NumberField(24, !1), mp4lib.fields.FIELD_BIT32 = new mp4lib.fields.NumberField(32, !1), 
mp4lib.fields.FIELD_ID = new mp4lib.fields.FixedLenStringField(4), mp4lib.fields.FIELD_CONTAINER_CHILDREN = new mp4lib.fields.BoxesListField(), 
mp4lib.fields.FIELD_STRING = new mp4lib.fields.StringField(), mp4lib.fields.FIELD_BOX_FILLING_DATA = new mp4lib.fields.BoxFillingDataField(), 
mp4lib.helpers.compareBoxes = function(box1, box2, prefix) {
    if ("udta" != box1.boxtype && "udta" != box2.boxtype) {
        var lp1 = new mp4lib.fieldProcessors.LengthCounterBoxFieldsProcessor(box1);
        box1._processFields(lp1);
        var lp1size = lp1.res, buf1 = new Uint8Array(lp1size), sp1 = new mp4lib.fieldProcessors.SerializationBoxFieldsProcessor(box1, buf1, 0);
        box1._processFields(sp1);
        var lp2 = new mp4lib.fieldProcessors.LengthCounterBoxFieldsProcessor(box2);
        box2._processFields(lp2);
        var lp2size = lp2.res, buf2 = new Uint8Array(lp2size), sp2 = new mp4lib.fieldProcessors.SerializationBoxFieldsProcessor(box2, buf2, 0);
        if (box2._processFields(sp2), lp1size != lp2size) ; else {
            var i, different = 0, firstdifference = -1;
            for (i = 0; lp1size > i; i++) buf1[i] != buf2[i] && (different += 1, firstdifference = i);
        }
        if (void 0 !== box1.boxes) for (var i = 0; i < box1.boxes.length; i++) mp4lib.helpers.compareBoxes(box1.boxes[i], box2.boxes[i], "    " + prefix);
    }
}, mp4lib.helpers.getBoxByType = function(box, boxType) {
    for (var i = 0; i < box.boxes.length; i++) if (box.boxes[i].boxtype === boxType) return box.boxes[i];
    return null;
}, mp4lib.helpers.getBoxPositionByType = function(box, boxType) {
    for (var position = 0, i = 0; i < box.boxes.length; i++) {
        if (box.boxes[i].boxtype === boxType) return position;
        position += box.boxes[i].size;
    }
    return null;
}, mp4lib.helpers.removeBoxByType = function(box, boxType) {
    for (var i = 0; i < box.boxes.length; i++) box.boxes[i].boxtype === boxType && box.boxes.splice(i, 1);
}, MediaPlayer = function(aContext) {
    "use strict";
    var system, element, source, sourceBackUrl, streamController, videoModel, VERSION = "1.1.0", context = aContext, initialized = !1, playing = !1, autoPlay = !0, scheduleWhilePaused = !1, bufferMax = MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED, isReady = function() {
        return !!element && !!source;
    }, play = function() {
        if (!initialized) throw "MediaPlayer not initialized!";
        if (!this.capabilities.supportsMediaSource()) return void this.errHandler.capabilityError("mediasource");
        if (!element || !source) throw "Missing view or source.";
        playing = !0, streamController = system.getObject("streamController"), streamController.setVideoModel(videoModel), 
        streamController.setAutoPlay(autoPlay), streamController.load(source, sourceBackUrl), 
        system.mapValue("scheduleWhilePaused", scheduleWhilePaused), system.mapOutlet("scheduleWhilePaused", "stream"), 
        system.mapValue("bufferMax", bufferMax), system.injectInto(this.bufferExt, "bufferMax");
    }, doAutoPlay = function() {
        isReady() && play.call(this);
    };
    return system = new dijon.System(), system.mapValue("system", system), system.mapOutlet("system"), 
    system.injectInto(context), {
        debug: void 0,
        eventBus: void 0,
        capabilities: void 0,
        abrController: void 0,
        metricsModel: void 0,
        metricsExt: void 0,
        bufferExt: void 0,
        addEventListener: function(type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
        },
        removeEventListener: function(type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        },
        getVersion: function() {
            return VERSION;
        },
        startup: function() {
            initialized || (system.injectInto(this), initialized = !0);
        },
        getDebug: function() {
            return this.debug;
        },
        getVideoModel: function() {
            return videoModel;
        },
        setAutoPlay: function(value) {
            autoPlay = value;
        },
        getAutoPlay: function() {
            return autoPlay;
        },
        setScheduleWhilePaused: function(value) {
            scheduleWhilePaused = value;
        },
        getScheduleWhilePaused: function() {
            return scheduleWhilePaused;
        },
        setBufferMax: function(value) {
            bufferMax = value;
        },
        getBufferMax: function() {
            return bufferMax;
        },
        getMetricsExt: function() {
            return this.metricsExt;
        },
        getMetricsFor: function(type) {
            var metrics = this.metricsModel.getReadOnlyMetricsFor(type);
            return metrics;
        },
        getQualityFor: function(type) {
            return this.abrController.getQualityFor(type);
        },
        setQualityFor: function(type, value) {
            this.abrController.setPlaybackQuality(type, value);
        },
        getAutoSwitchQuality: function() {
            return this.abrController.getAutoSwitchBitrate();
        },
        setAutoSwitchQuality: function(value) {
            this.abrController.setAutoSwitchBitrate(value);
        },
        setQualityBoundariesFor: function(type, min, max) {
            this.metricsModel.addRepresentationBoundaries(type, new Date(), min, max);
        },
        setAudioTrack: function(audioTrack) {
            streamController.setAudioTrack(audioTrack);
        },
        getAudioTracks: function() {
            return streamController.getAudioTracks();
        },
        attachView: function(view) {
            if (!initialized) throw "MediaPlayer not initialized!";
            element = view, videoModel = null, element && (videoModel = system.getObject("videoModel"), 
            videoModel.setElement(element)), playing && streamController && (streamController.reset(), 
            streamController = null, playing = !1), isReady.call(this) && doAutoPlay.call(this);
        },
        attachSource: function(url, backUrl) {
            if (!initialized) throw "MediaPlayer not initialized!";
            source = url, sourceBackUrl = backUrl, this.setQualityFor("video", 0), this.setQualityFor("audio", 0), 
            playing && streamController && (streamController.reset(), streamController = null, 
            playing = !1), isReady.call(this) && doAutoPlay.call(this);
        },
        reset: function() {
            this.attachSource(null), this.attachView(null);
        },
        play: play,
        isReady: isReady
    };
}, MediaPlayer.prototype = {
    constructor: MediaPlayer
}, MediaPlayer.dependencies = {}, MediaPlayer.utils = {}, MediaPlayer.models = {}, 
MediaPlayer.vo = {}, MediaPlayer.vo.metrics = {}, MediaPlayer.rules = {}, MediaPlayer.di = {}, 
MediaPlayer.di.Context = function() {
    "use strict";
    return {
        system: void 0,
        setup: function() {
            this.system.autoMapOutlets = !0, this.system.mapSingleton("debug", MediaPlayer.utils.Debug), 
            this.system.mapSingleton("eventBus", MediaPlayer.utils.EventBus), this.system.mapSingleton("capabilities", MediaPlayer.utils.Capabilities), 
            this.system.mapSingleton("textTrackExtensions", MediaPlayer.utils.TextTrackExtensions), 
            this.system.mapSingleton("vttParser", MediaPlayer.utils.VTTParser), this.system.mapClass("videoModel", MediaPlayer.models.VideoModel), 
            this.system.mapSingleton("manifestModel", MediaPlayer.models.ManifestModel), this.system.mapSingleton("metricsModel", MediaPlayer.models.MetricsModel), 
            this.system.mapClass("protectionModel", MediaPlayer.models.ProtectionModel), this.system.mapSingleton("textVTTSourceBuffer", MediaPlayer.dependencies.TextVTTSourceBuffer), 
            this.system.mapSingleton("mediaSourceExt", MediaPlayer.dependencies.MediaSourceExtensions), 
            this.system.mapSingleton("sourceBufferExt", MediaPlayer.dependencies.SourceBufferExtensions), 
            this.system.mapSingleton("bufferExt", MediaPlayer.dependencies.BufferExtensions), 
            this.system.mapSingleton("abrController", MediaPlayer.dependencies.AbrController), 
            this.system.mapSingleton("errHandler", MediaPlayer.dependencies.ErrorHandler), this.system.mapSingleton("protectionExt", MediaPlayer.dependencies.ProtectionExtensions), 
            this.system.mapClass("protectionController", MediaPlayer.dependencies.ProtectionController), 
            this.system.mapClass("metrics", MediaPlayer.models.MetricsList), this.system.mapClass("downloadRatioRule", MediaPlayer.rules.DownloadRatioRule), 
            this.system.mapClass("insufficientBufferRule", MediaPlayer.rules.InsufficientBufferRule), 
            this.system.mapClass("limitSwitchesRule", MediaPlayer.rules.LimitSwitchesRule), 
            this.system.mapClass("abrRulesCollection", MediaPlayer.rules.BaseRulesCollection), 
            this.system.mapClass("textController", MediaPlayer.dependencies.TextController), 
            this.system.mapClass("bufferController", MediaPlayer.dependencies.BufferController), 
            this.system.mapClass("manifestLoader", MediaPlayer.dependencies.ManifestLoader), 
            this.system.mapClass("manifestUpdater", MediaPlayer.dependencies.ManifestUpdater), 
            this.system.mapClass("fragmentController", MediaPlayer.dependencies.FragmentController), 
            this.system.mapClass("fragmentLoader", MediaPlayer.dependencies.FragmentLoader), 
            this.system.mapClass("fragmentModel", MediaPlayer.dependencies.FragmentModel), this.system.mapSingleton("streamController", MediaPlayer.dependencies.StreamController), 
            this.system.mapClass("stream", MediaPlayer.dependencies.Stream), this.system.mapClass("requestScheduler", MediaPlayer.dependencies.RequestScheduler), 
            this.system.mapSingleton("schedulerExt", MediaPlayer.dependencies.SchedulerExtensions), 
            this.system.mapClass("schedulerModel", MediaPlayer.dependencies.SchedulerModel);
        }
    };
}, Dash = function() {
    "use strict";
    return {
        modules: {},
        dependencies: {},
        vo: {},
        di: {}
    };
}(), Dash.di.DashContext = function() {
    "use strict";
    return {
        system: void 0,
        setup: function() {
            Dash.di.DashContext.prototype.setup.call(this), this.system.mapClass("parser", Dash.dependencies.DashParser), 
            this.system.mapClass("indexHandler", Dash.dependencies.DashHandler), this.system.mapClass("baseURLExt", Dash.dependencies.BaseURLExtensions), 
            this.system.mapClass("fragmentExt", Dash.dependencies.FragmentExtensions), this.system.mapSingleton("manifestExt", Dash.dependencies.DashManifestExtensions), 
            this.system.mapSingleton("metricsExt", Dash.dependencies.DashMetricsExtensions), 
            this.system.mapSingleton("timelineConverter", Dash.dependencies.TimelineConverter);
        }
    };
}, Dash.di.DashContext.prototype = new MediaPlayer.di.Context(), Dash.di.DashContext.prototype.constructor = Dash.di.DashContext, 
Mss = function() {
    "use strict";
    return {
        dependencies: {}
    };
}(), Custom = function() {
    "use strict";
    return {
        dependencies: {},
        di: {},
        models: {},
        modules: {},
        utils: {},
        rules: {}
    };
}(), Custom.di.CustomContext = function() {
    "use strict";
    return {
        system: void 0,
        setup: function() {
            Custom.di.CustomContext.prototype.setup.call(this), this.system.mapClass("parser", Custom.dependencies.CustomParser), 
            this.system.mapClass("dashParser", Dash.dependencies.DashParser), this.system.mapClass("mssParser", Mss.dependencies.MssParser), 
            this.system.mapSingleton("contextManager", Custom.modules.ContextManager), this.system.mapClass("fragmentLoader", Custom.dependencies.CustomFragmentLoader), 
            this.system.mapSingleton("metricsModel", Custom.models.CustomMetricsModel), this.system.mapSingleton("metricsExt", Custom.dependencies.CustomMetricsExtensions), 
            this.system.mapSingleton("abrController", Custom.dependencies.CustomAbrController), 
            this.system.mapClass("bufferController", Custom.dependencies.CustomBufferController), 
            this.system.mapHandler("setContext", "contextManager", "setContext");
        }
    };
}, Custom.di.CustomContext.prototype = new Dash.di.DashContext(), Custom.di.CustomContext.prototype.constructor = Custom.di.CustomContext, 
Custom.dependencies.CustomAbrController = function() {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.AbrController);
    return rslt.metricsExt = void 0, rslt.debug = void 0, rslt.getPlaybackQuality = function(type, data) {
        var self = this, deferred = Q.defer();
        return self.parent.getMetricsFor.call(self, data).then(function(metrics) {
            self.parent.getPlaybackQuality.call(self, type, data).then(function(result) {
                var repBoundaries = self.metricsExt.getCurrentRepresentationBoundaries(metrics), newQuality = result.quality;
                null !== repBoundaries && (newQuality < repBoundaries.min && (newQuality = repBoundaries.min, 
                self.parent.setPlaybackQuality.call(self, type, newQuality)), newQuality > repBoundaries.max && (newQuality = repBoundaries.max, 
                self.parent.setPlaybackQuality.call(self, type, newQuality))), deferred.resolve({
                    quality: newQuality,
                    confidence: result.confidence
                });
            });
        }), deferred.promise;
    }, rslt;
}, Custom.dependencies.CustomAbrController.prototype = {
    constructor: Custom.dependencies.CustomAbrController
}, Custom.dependencies.CustomBufferController = function() {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.BufferController);
    rslt.fragmentController = void 0, rslt.sourceBufferExt = void 0;
    var mediaSource;
    return rslt.initialize = function(type, periodInfo, data, buffer, videoModel, scheduler, fragmentController, source) {
        mediaSource = source, this.parent.initialize.apply(this, arguments);
    }, rslt.emptyBuffer = function() {
        var removeEnd, deferred = Q.defer(), currentTime = this.videoModel.getCurrentTime(), removeStart = 0, selfParent = rslt.parent, buffer = selfParent.getBuffer(), fragmentModel = rslt.fragmentController.attachBufferController(rslt);
        if (buffer.buffered.length > 0) {
            var end = buffer.buffered.end(buffer.buffered.length - 1);
            removeEnd = end;
        } else removeEnd = currentTime + 5;
        return rslt.sourceBufferExt.remove(buffer, removeStart, currentTime - 1, selfParent.getPeriodInfo().duration, mediaSource).then(function() {
            rslt.sourceBufferExt.remove(buffer, currentTime + 3, removeEnd, selfParent.getPeriodInfo().duration, mediaSource).then(function() {
                rslt.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, removeEnd), 
                deferred.resolve();
            });
        }), deferred.promise;
    }, rslt;
}, Custom.dependencies.CustomBufferController.prototype = {
    constructor: Custom.dependencies.CustomBufferController
}, Custom.dependencies.CustomFragmentLoader = function() {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.FragmentLoader);
    return rslt.load = function(req) {
        var deferred = Q.defer();
        return "Initialization Segment" == req.type && req.data ? deferred.resolve(req, {
            data: req.data
        }) : deferred.promise = this.parent.load.call(this, req), deferred.promise;
    }, rslt;
}, Custom.dependencies.CustomFragmentLoader.prototype = {
    constructor: Custom.dependencies.CustomFragmentLoader
}, Custom.dependencies.CustomMetricsExtensions = function() {
    "use strict";
    var h264ProfileMap = {
        "42": "Baseline",
        "4D": "Main",
        "58": "Extended",
        "64": "High"
    }, findRepresentionInPeriodArray = function(periodArray, representationId) {
        var period, adaptationSet, adaptationSetArray, representation, representationArray, periodArrayIndex, adaptationSetArrayIndex, representationArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex += 1) for (period = periodArray[periodArrayIndex], 
        adaptationSetArray = period.AdaptationSet_asArray, adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex += 1) for (adaptationSet = adaptationSetArray[adaptationSetArrayIndex], 
        representationArray = adaptationSet.Representation_asArray, representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex += 1) if (representation = representationArray[representationArrayIndex], 
        representationId === representation.id) return representation;
        return null;
    }, adaptationIsType = function(adaptation, bufferType) {
        var found = !1;
        return "video" === bufferType ? (this.manifestExt.getIsVideo(adaptation), "video" === adaptation.type && (found = !0)) : "audio" === bufferType ? (this.manifestExt.getIsAudio(adaptation), 
        "audio" === adaptation.type && (found = !0)) : found = !1, found;
    }, rslt = Custom.utils.copyMethods(Dash.dependencies.DashMetricsExtensions);
    return rslt.getVideoWidthForRepresentation = function(representationId) {
        var representation, self = this, manifest = self.manifestModel.getValue(), periodArray = manifest.Period_asArray;
        return representation = findRepresentionInPeriodArray.call(self, periodArray, representationId), 
        null === representation ? null : representation.width;
    }, rslt.getVideoHeightForRepresentation = function(representationId) {
        var representation, self = this, manifest = self.manifestModel.getValue(), periodArray = manifest.Period_asArray;
        return representation = findRepresentionInPeriodArray.call(self, periodArray, representationId), 
        null === representation ? null : representation.height;
    }, rslt.getCodecsForRepresentation = function(representationId) {
        var representation, self = this, manifest = self.manifestModel.getValue(), periodArray = manifest.Period_asArray;
        return representation = findRepresentionInPeriodArray.call(self, periodArray, representationId), 
        null === representation ? null : representation.codecs;
    }, rslt.getH264ProfileLevel = function(codecs) {
        if (codecs.indexOf("avc1") < 0) return "";
        var profile = h264ProfileMap[codecs.substr(5, 2)], level = parseInt(codecs.substr(9, 2), 16) / 10;
        return profile + "@" + level.toString();
    }, rslt.getBitratesForType = function(type) {
        var period, periodArrayIndex, adaptationSet, adaptationSetArray, representation, representationArray, adaptationSetArrayIndex, representationArrayIndex, self = this, manifest = self.manifestModel.getValue(), periodArray = manifest.Period_asArray, bitrateArray = new Array();
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex += 1) for (period = periodArray[periodArrayIndex], 
        adaptationSetArray = period.AdaptationSet_asArray, adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex += 1) if (adaptationSet = adaptationSetArray[adaptationSetArrayIndex], 
        adaptationIsType.call(self, adaptationSet, type)) {
            for (representationArray = adaptationSet.Representation_asArray, representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex += 1) representation = representationArray[representationArrayIndex], 
            bitrateArray.push(representation.bandwidth);
            return bitrateArray;
        }
        return bitrateArray;
    }, rslt.getCurrentRepresentationBoundaries = function(metrics) {
        if (null === metrics) return null;
        var repBoundaries = metrics.RepBoundariesList;
        return null === repBoundaries || repBoundaries.length <= 0 ? null : repBoundaries[repBoundaries.length - 1];
    }, rslt;
}, Custom.dependencies.CustomMetricsExtensions.prototype = {
    constructor: Custom.dependencies.CustomMetricsExtensions
}, Custom.dependencies.CustomParser = function() {
    "use strict";
    var customParse = function(data, baseUrl) {
        var parser = null;
        if (data.indexOf("SmoothStreamingMedia") > -1) this.system.notify("setContext", "MSS"), 
        parser = this.mssParser; else {
            if (!(data.indexOf("MPD") > -1)) return Q.when(null);
            this.system.notify("setContext", "MPD"), parser = this.dashParser;
        }
        return parser.parse(data, baseUrl);
    };
    return {
        debug: void 0,
        system: void 0,
        dashParser: void 0,
        mssParser: void 0,
        metricsModel: void 0,
        parse: customParse
    };
}, Custom.dependencies.CustomParser.prototype = {
    constructor: Custom.dependencies.CustomParser
}, Custom.models.CustomMetricsModel = function() {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.models.MetricsModel);
    return rslt.addRepresentationBoundaries = function(streamType, t, min, max) {
        var vo = new MediaPlayer.vo.metrics.RepresentationBoundaries();
        return vo.t = t, vo.min = min, vo.max = max, this.parent.getMetricsFor(streamType).RepBoundariesList.push(vo), 
        vo;
    }, rslt;
}, Custom.models.CustomMetricsModel.prototype = {
    constructor: Custom.models.CustomMetricsModel
}, Custom.modules.ContextManager = function() {
    "use strict";
    return {
        system: void 0,
        debug: void 0,
        setContext: function(ctx) {
            "MSS" === ctx ? (this.system.mapClass("mp4Processor", MediaPlayer.dependencies.Mp4Processor), 
            this.system.mapClass("indexHandler", Mss.dependencies.MssHandler), this.system.mapClass("fragmentController", Mss.dependencies.MssFragmentController)) : (this.system.mapClass("fragmentController", MediaPlayer.dependencies.FragmentController), 
            this.system.mapClass("indexHandler", Dash.dependencies.DashHandler));
        }
    };
}, Custom.modules.ContextManager.prototype = {
    constructor: Custom.modules.ContextManager
}, Custom.rules.CustomDownloadRatioRule = function() {
    "use strict";
    var checkRatio = function(newIdx, currentBandwidth, data) {
        var self = this, deferred = Q.defer();
        return self.manifestExt.getRepresentationFor(newIdx, data).then(function(rep) {
            self.manifestExt.getBandwidth(rep).then(function(newBandwidth) {
                deferred.resolve(newBandwidth / currentBandwidth);
            });
        }), deferred.promise;
    };
    return {
        debug: void 0,
        manifestExt: void 0,
        metricsExt: void 0,
        checkIndex: function(current, metrics, data) {
            var lastRequest, downloadTime, totalTime, downloadRatio, totalRatio, switchRatio, deferred, funcs, i, len, self = this, httpRequests = metrics.HttpList, minBitrateIdx = this.metricsExt.getMinBitrateIdx(), maxBitrateIdx = this.metricsExt.getMaxBitrateIdx(), DOWNLOAD_RATIO_SAFETY_FACTOR = .75;
            return metrics ? null === httpRequests || void 0 === httpRequests || 0 === httpRequests.length ? Q.when(new MediaPlayer.rules.SwitchRequest()) : (lastRequest = httpRequests[httpRequests.length - 1], 
            totalTime = (lastRequest.tfinish.getTime() - lastRequest.trequest.getTime()) / 1e3, 
            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1e3, 
            0 >= totalTime ? Q.when(new MediaPlayer.rules.SwitchRequest()) : null === lastRequest.mediaduration || void 0 === lastRequest.mediaduration || lastRequest.mediaduration <= 0 ? Q.when(new MediaPlayer.rules.SwitchRequest()) : (minBitrateIdx = minBitrateIdx ? minBitrateIdx : 0, 
            deferred = Q.defer(), totalRatio = lastRequest.mediaduration / totalTime, downloadRatio = lastRequest.mediaduration / downloadTime * DOWNLOAD_RATIO_SAFETY_FACTOR, 
            isNaN(downloadRatio) || isNaN(totalRatio) ? Q.when(new MediaPlayer.rules.SwitchRequest()) : (self.manifestExt.getRepresentationCount(data).then(function(max) {
                max -= 1, minBitrateIdx = minBitrateIdx ? minBitrateIdx : 0, maxBitrateIdx = maxBitrateIdx && max > maxBitrateIdx ? maxBitrateIdx : max, 
                isNaN(downloadRatio) ? deferred.resolve(new MediaPlayer.rules.SwitchRequest()) : 1 > downloadRatio || current > maxBitrateIdx ? current > minBitrateIdx ? self.manifestExt.getRepresentationFor(current - 1, data).then(function(representation1) {
                    self.manifestExt.getBandwidth(representation1).then(function(oneDownBandwidth) {
                        self.manifestExt.getRepresentationFor(current, data).then(function(representation2) {
                            self.manifestExt.getBandwidth(representation2).then(function(currentBandwidth) {
                                switchRatio = oneDownBandwidth / currentBandwidth, deferred.resolve(switchRatio > downloadRatio ? new MediaPlayer.rules.SwitchRequest(0) : new MediaPlayer.rules.SwitchRequest(current - 1));
                            });
                        });
                    });
                }) : deferred.resolve(new MediaPlayer.rules.SwitchRequest(current)) : maxBitrateIdx > current ? self.manifestExt.getRepresentationFor(current + 1, data).then(function(representation1) {
                    self.manifestExt.getBandwidth(representation1).then(function(oneUpBandwidth) {
                        self.manifestExt.getRepresentationFor(current, data).then(function(representation2) {
                            self.manifestExt.getBandwidth(representation2).then(function(currentBandwidth) {
                                if (switchRatio = oneUpBandwidth / currentBandwidth, downloadRatio >= switchRatio) if (downloadRatio > 1e3) deferred.resolve(new MediaPlayer.rules.SwitchRequest(max - 1)); else if (downloadRatio > 100) deferred.resolve(new MediaPlayer.rules.SwitchRequest(current + 1)); else {
                                    for (i = -1, funcs = []; (i += 1) < max; ) funcs.push(checkRatio.call(self, i, currentBandwidth, data));
                                    Q.all(funcs).then(function(results) {
                                        for (i = 0, len = results.length; len > i && !(downloadRatio < results[i]); i += 1) ;
                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(i));
                                    });
                                } else deferred.resolve(new MediaPlayer.rules.SwitchRequest());
                            });
                        });
                    });
                }) : deferred.resolve(new MediaPlayer.rules.SwitchRequest(max));
            }), deferred.promise))) : Q.when(new MediaPlayer.rules.SwitchRequest());
        }
    };
}, Custom.rules.CustomDownloadRatioRule.prototype = {
    constructor: Custom.rules.CustomDownloadRatioRule
}, Custom.utils.copyMethods = function(clazz) {
    var rslt = new clazz();
    rslt.parent = {};
    for (var key in rslt) rslt.parent[key] = rslt[key];
    return rslt.setup = function() {
        for (var att in this.parent) void 0 === this.parent[att] && (this.parent[att] = this[att]);
    }, rslt;
}, Custom.utils.ObjectIron = function(map) {
    var lookup;
    lookup = [];
    for (var i = 0, len = map.length; len > i; i += 1) lookup.push(map[i].isRoot ? "root" : map[i].name);
    var mergeValues = function(parentItem, childItem) {
        var name;
        if (null !== parentItem && null !== childItem) for (name in parentItem) parentItem.hasOwnProperty(name) && (childItem.hasOwnProperty(name) || (childItem[name] = parentItem[name]));
    }, mapProperties = function(properties, parent, child) {
        var i, len, property, parentValue, childValue;
        if (null !== properties && 0 !== properties.length) for (i = 0, len = properties.length; len > i; i += 1) property = properties[i], 
        parent.hasOwnProperty(property.name) && (child.hasOwnProperty(property.name) ? property.merge && (parentValue = parent[property.name], 
        childValue = child[property.name], "object" == typeof parentValue && "object" == typeof childValue ? mergeValues(parentValue, childValue) : child[property.name] = null != property.mergeFunction ? property.mergeFunction(parentValue, childValue) : parentValue + childValue) : child[property.name] = parent[property.name]);
    }, mapItem = function(obj, node) {
        var i, len, v, len2, array, childItem, childNode, item = obj;
        if (obj.transformFunc && (node = obj.transformFunc(node)), null === item.children || 0 === item.children.length) return node;
        for (i = 0, len = item.children.length; len > i; i += 1) {
            childItem = item.children[i];
            var itemMapped = null;
            if (node.hasOwnProperty(childItem.name)) if (childItem.isArray) for (array = node[childItem.name + "_asArray"], 
            v = 0, len2 = array.length; len2 > v; v += 1) childNode = array[v], mapProperties(item.properties, node, childNode), 
            itemMapped = mapItem(childItem, childNode), node[childItem.name + "_asArray"][v] = itemMapped, 
            node[childItem.name][v] = itemMapped; else childNode = node[childItem.name], mapProperties(item.properties, node, childNode), 
            itemMapped = mapItem(childItem, childNode), node[childItem.name] = itemMapped, node[childItem.name + "_asArray"] = [ itemMapped ];
        }
        return node;
    }, performMapping = function(source) {
        var i, len, pi, pp, item, node, array;
        if (null === source) return source;
        if ("object" != typeof source) return source;
        for (i = 0, len = lookup.length; len > i; i += 1) "root" === lookup[i] && (item = map[i], 
        node = source, source = mapItem(item, node));
        for (pp in source) if (source.hasOwnProperty(pp)) {
            if (pi = lookup.indexOf(pp), -1 !== pi) if (item = map[pi], item.isArray) for (array = source[pp + "_asArray"], 
            i = 0, len = array.length; len > i; i += 1) node = array[i], source[pp][i] = mapItem(item, node), 
            source[pp + "_asArray"][i] = mapItem(item, node); else node = source[pp], source[pp] = mapItem(item, node), 
            source[pp + "_asArray"] = [ mapItem(item, node) ];
            source[pp] = performMapping(source[pp]);
        }
        return source;
    };
    return {
        run: performMapping
    };
}, Dash.dependencies.BaseURLExtensions = function() {
    "use strict";
    var parseSIDX = function(ab, ab_first_byte_offset) {
        for (var offset, time, sidxEnd, i, ref_type, ref_size, ref_dur, type, size, charCode, d = new DataView(ab), sidx = {}, pos = 0; "sidx" !== type && pos < d.byteLength; ) {
            for (size = d.getUint32(pos), pos += 4, type = "", i = 0; 4 > i; i += 1) charCode = d.getInt8(pos), 
            type += String.fromCharCode(charCode), pos += 1;
            "moof" !== type && "traf" !== type && "sidx" !== type ? pos += size - 8 : "sidx" === type && (pos -= 8);
        }
        if (sidxEnd = d.getUint32(pos, !1) + pos, sidxEnd > ab.byteLength) throw "sidx terminates after array buffer";
        for (sidx.version = d.getUint8(pos + 8), pos += 12, sidx.timescale = d.getUint32(pos + 4, !1), 
        pos += 8, 0 === sidx.version ? (sidx.earliest_presentation_time = d.getUint32(pos, !1), 
        sidx.first_offset = d.getUint32(pos + 4, !1), pos += 8) : (sidx.earliest_presentation_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, !1), d.getUint32(pos, !1)), 
        sidx.first_offset = (d.getUint32(pos + 8, !1) << 32) + d.getUint32(pos + 12, !1), 
        pos += 16), sidx.first_offset += sidxEnd + (ab_first_byte_offset || 0), sidx.reference_count = d.getUint16(pos + 2, !1), 
        pos += 4, sidx.references = [], offset = sidx.first_offset, time = sidx.earliest_presentation_time, 
        i = 0; i < sidx.reference_count; i += 1) ref_size = d.getUint32(pos, !1), ref_type = ref_size >>> 31, 
        ref_size = 2147483647 & ref_size, ref_dur = d.getUint32(pos + 4, !1), pos += 12, 
        sidx.references.push({
            size: ref_size,
            type: ref_type,
            offset: offset,
            duration: ref_dur,
            time: time,
            timescale: sidx.timescale
        }), offset += ref_size, time += ref_dur;
        if (pos !== sidxEnd) throw "Error: final pos " + pos + " differs from SIDX end " + sidxEnd;
        return sidx;
    }, parseSegments = function(data, media, offset) {
        var parsed, ref, segments, segment, i, len, start, end;
        for (parsed = parseSIDX.call(this, data, offset), ref = parsed.references, segments = [], 
        i = 0, len = ref.length; len > i; i += 1) segment = new Dash.vo.Segment(), segment.duration = ref[i].duration, 
        segment.media = media, segment.startTime = ref[i].time, segment.timescale = ref[i].timescale, 
        start = ref[i].offset, end = ref[i].offset + ref[i].size - 1, segment.mediaRange = start + "-" + end, 
        segments.push(segment);
        return Q.when(segments);
    }, findInit = function(data, info) {
        for (var start, end, bytesAvailable, i, c, request, irange, deferred = Q.defer(), d = new DataView(data), pos = 0, type = "", size = 0, loaded = !1, self = this; "moov" !== type && pos < d.byteLength; ) {
            for (size = d.getUint32(pos), pos += 4, type = "", i = 0; 4 > i; i += 1) c = d.getInt8(pos), 
            type += String.fromCharCode(c), pos += 1;
            "moov" !== type && (pos += size - 8);
        }
        return bytesAvailable = d.byteLength - pos, "moov" !== type ? (info.range.start = 0, 
        info.range.end = info.bytesLoaded + info.bytesToLoad, request = new XMLHttpRequest(), 
        request.onloadend = function() {
            loaded || deferred.reject("Error loading initialization.");
        }, request.onload = function() {
            loaded = !0, info.bytesLoaded = info.range.end, findInit.call(self, request.response).then(function(segments) {
                deferred.resolve(segments);
            });
        }, request.onerror = function() {
            deferred.reject("Error loading initialization.");
        }, request.open("GET", info.url), request.responseType = "arraybuffer", request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end), 
        request.send(null)) : (start = pos - 8, end = start + size - 1, irange = start + "-" + end, 
        deferred.resolve(irange)), deferred.promise;
    }, loadInit = function(media) {
        var deferred = Q.defer(), request = new XMLHttpRequest(), needFailureReport = !0, self = this, info = {
            url: media,
            range: {},
            searching: !1,
            bytesLoaded: 0,
            bytesToLoad: 1500,
            request: request
        };
        return info.range.start = 0, info.range.end = info.bytesToLoad, request.onload = function() {
            request.status < 200 || request.status > 299 || (needFailureReport = !1, info.bytesLoaded = info.range.end, 
            findInit.call(self, request.response, info).then(function(range) {
                deferred.resolve(range);
            }));
        }, request.onloadend = request.onerror = function() {
            needFailureReport && (needFailureReport = !1, self.errHandler.downloadError("initialization", info.url, request), 
            deferred.reject(request));
        }, request.open("GET", info.url), request.responseType = "arraybuffer", request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end), 
        request.send(null), deferred.promise;
    }, findSIDX = function(data, info) {
        for (var bytesAvailable, sidxBytes, sidxSlice, sidxOut, i, c, parsed, ref, deferred = Q.defer(), d = new DataView(data), request = new XMLHttpRequest(), pos = 0, type = "", size = 0, needFailureReport = !0, loadMultiSidx = !1, self = this; "sidx" !== type && pos < d.byteLength; ) {
            for (size = d.getUint32(pos), pos += 4, type = "", i = 0; 4 > i; i += 1) c = d.getInt8(pos), 
            type += String.fromCharCode(c), pos += 1;
            "sidx" !== type && (pos += size - 8);
        }
        if (bytesAvailable = d.byteLength - pos, "sidx" !== type) deferred.reject(); else if (size - 8 > bytesAvailable) info.range.start = 0, 
        info.range.end = info.bytesLoaded + (size - bytesAvailable), request.onload = function() {
            request.status < 200 || request.status > 299 || (needFailureReport = !1, info.bytesLoaded = info.range.end, 
            findSIDX.call(self, request.response, info).then(function(segments) {
                deferred.resolve(segments);
            }));
        }, request.onloadend = request.onerror = function() {
            needFailureReport && (needFailureReport = !1, self.errHandler.downloadError("SIDX", info.url, request), 
            deferred.reject(request));
        }, request.open("GET", info.url), request.responseType = "arraybuffer", request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end), 
        request.send(null); else if (info.range.start = pos - 8, info.range.end = info.range.start + size, 
        sidxBytes = new ArrayBuffer(info.range.end - info.range.start), sidxOut = new Uint8Array(sidxBytes), 
        sidxSlice = new Uint8Array(data, info.range.start, info.range.end - info.range.start), 
        sidxOut.set(sidxSlice), parsed = this.parseSIDX.call(this, sidxBytes, info.range.start), 
        ref = parsed.references, null !== ref && void 0 !== ref && ref.length > 0 && (loadMultiSidx = 1 === ref[0].type), 
        loadMultiSidx) {
            var j, len, ss, se, r, segs, funcs = [];
            for (j = 0, len = ref.length; len > j; j += 1) ss = ref[j].offset, se = ref[j].offset + ref[j].size - 1, 
            r = ss + "-" + se, funcs.push(this.loadSegments.call(self, info.url, r));
            Q.all(funcs).then(function(results) {
                for (segs = [], j = 0, len = results.length; len > j; j += 1) segs = segs.concat(results[j]);
                deferred.resolve(segs);
            }, function(httprequest) {
                deferred.reject(httprequest);
            });
        } else parseSegments.call(self, sidxBytes, info.url, info.range.start).then(function(segments) {
            deferred.resolve(segments);
        });
        return deferred.promise;
    }, loadSegments = function(media, theRange) {
        var parts, deferred = Q.defer(), request = new XMLHttpRequest(), needFailureReport = !0, self = this, info = {
            url: media,
            range: {},
            searching: !1,
            bytesLoaded: 0,
            bytesToLoad: 1500,
            request: request
        };
        return null === theRange ? (info.searching = !0, info.range.start = 0, info.range.end = info.bytesToLoad) : (parts = theRange.split("-"), 
        info.range.start = parseFloat(parts[0]), info.range.end = parseFloat(parts[1])), 
        request.onload = function() {
            request.status < 200 || request.status > 299 || (needFailureReport = !1, info.searching ? (info.bytesLoaded = info.range.end, 
            findSIDX.call(self, request.response, info).then(function(segments) {
                deferred.resolve(segments);
            })) : parseSegments.call(self, request.response, info.url, info.range.start).then(function(segments) {
                deferred.resolve(segments);
            }));
        }, request.onloadend = request.onerror = function() {
            needFailureReport && (needFailureReport = !1, self.errHandler.downloadError("SIDX", info.url, request), 
            deferred.reject(request));
        }, request.open("GET", info.url), request.responseType = "arraybuffer", request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end), 
        request.send(null), deferred.promise;
    };
    return {
        debug: void 0,
        errHandler: void 0,
        loadSegments: loadSegments,
        loadInitialization: loadInit,
        parseSegments: parseSegments,
        parseSIDX: parseSIDX,
        findSIDX: findSIDX
    };
}, Dash.dependencies.BaseURLExtensions.prototype = {
    constructor: Dash.dependencies.BaseURLExtensions
}, Dash.dependencies.DashHandler = function() {
    "use strict";
    var isDynamic, type, index = -1, replaceNumberForTemplate = function(url, value) {
        var v = value.toString();
        return url.split("$Number$").join(v);
    }, replaceTimeForTemplate = function(url, value) {
        var v = value.toString();
        return url.split("$Time$").join(v);
    }, replaceBandwidthForTemplate = function(url, value) {
        var v = value.toString();
        return url.split("$Bandwidth$").join(v);
    }, replaceIDForTemplate = function(url, value) {
        if (null === value || -1 === url.indexOf("$RepresentationID$")) return url;
        var v = value.toString();
        return url.split("$RepresentationID$").join(v);
    }, getNumberForSegment = function(segment, segmentIndex) {
        return segment.representation.startNumber + segmentIndex;
    }, getRequestUrl = function(destination, representation) {
        var url, baseURL = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL;
        return url = destination === baseURL ? destination : -1 !== destination.indexOf("http://") ? destination : baseURL + destination;
    }, generateInitRequest = function(representation, streamType) {
        var period, presentationStartTime, self = this, request = new MediaPlayer.vo.SegmentRequest();
        return period = representation.adaptation.period, request.streamType = streamType, 
        request.type = "Initialization Segment", request.url = getRequestUrl(representation.initialization, representation), 
        request.range = representation.range, presentationStartTime = period.start, request.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic), 
        request.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic), 
        request.quality = representation.index, request;
    }, getInit = function(representation) {
        var deferred = Q.defer(), request = null, url = null, self = this;
        return representation ? (representation.initialization ? (request = generateInitRequest.call(self, representation, type), 
        deferred.resolve(request)) : (url = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL, 
        self.baseURLExt.loadInitialization(url).then(function(theRange) {
            representation.range = theRange, representation.initialization = url, request = generateInitRequest.call(self, representation, type), 
            deferred.resolve(request);
        }, function(httprequest) {
            deferred.reject(httprequest);
        })), deferred.promise) : Q.reject("no represenation");
    }, isMediaFinished = function(representation) {
        var sDuration, seg, fTime, period = representation.adaptation.period, isFinished = !1;
        return isDynamic ? isFinished = !1 : 0 > index ? isFinished = !1 : index < representation.segments.length ? (seg = representation.segments[index], 
        fTime = seg.presentationStartTime - period.start, sDuration = representation.adaptation.period.duration, 
        isFinished = fTime >= sDuration) : isFinished = !0, Q.when(isFinished);
    }, getIndexBasedSegment = function(representation, index) {
        var seg, duration, presentationStartTime, presentationEndTime, self = this;
        return duration = representation.segmentDuration, presentationStartTime = representation.adaptation.period.start + index * duration, 
        presentationEndTime = presentationStartTime + duration, seg = new Dash.vo.Segment(), 
        seg.representation = representation, seg.duration = duration, seg.presentationStartTime = presentationStartTime, 
        seg.mediaStartTime = self.timelineConverter.calcMediaTimeFromPresentationTime(seg.presentationStartTime, representation), 
        seg.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(seg.presentationStartTime, representation.adaptation.period.mpd, isDynamic), 
        seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic), 
        seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg, isDynamic), 
        seg.replacementNumber = getNumberForSegment(seg, index), seg;
    }, getSegmentsFromTimeline = function(representation) {
        var fragments, frag, i, len, j, repeat, repeatEndTime, nextFrag, seg, fTimescale, self = this, template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate, timeline = template.SegmentTimeline, segments = [], time = 0, count = 0;
        for (fTimescale = representation.timescale, fragments = timeline.S_asArray, i = 0, 
        len = fragments.length; len > i; i += 1) for (frag = fragments[i], repeat = 0, frag.hasOwnProperty("r") && (repeat = frag.r), 
        frag.hasOwnProperty("t") && (time = frag.t), 0 > repeat && (nextFrag = fragments[i + 1], 
        repeatEndTime = nextFrag && nextFrag.hasOwnProperty("t") ? nextFrag.t / fTimescale : representation.adaptation.period.duration, 
        repeat = (repeatEndTime - time / fTimescale) / (frag.d / fTimescale) - 1), j = 0; repeat >= j; j += 1) seg = getTimeBasedSegment.call(self, representation, time, frag.d, fTimescale, template.media, frag.mediaRange, count), 
        segments.push(seg), seg = null, time += frag.d, count += 1;
        return Q.when(segments);
    }, getSegmentsFromTemplate = function(representation) {
        var i, periodStart, duration, range, start, segments = [], template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate, startIdx = 0, endIdx = representation.adaptation.period.duration / representation.segmentDuration, seg = null, url = null;
        for (start = representation.startNumber, range = representation.segmentAvailabilityRange || this.timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic), 
        range && (periodStart = representation.adaptation.period.start, duration = representation.segmentDuration, 
        startIdx = Math.floor((range.start - periodStart) / duration), endIdx = Math.round((range.end - periodStart) / duration)), 
        i = startIdx; endIdx > i; i += 1) seg = getIndexBasedSegment.call(this, representation, i), 
        seg.replacementTime = (start + i - 1) * representation.segmentDuration, url = template.media, 
        url = replaceNumberForTemplate(url, seg.replacementNumber), url = replaceTimeForTemplate(url, seg.replacementTime), 
        seg.media = url, segments.push(seg), seg = null;
        return Q.when(segments);
    }, getTimeBasedSegment = function(representation, time, duration, fTimescale, url, range, index) {
        var presentationStartTime, presentationEndTime, seg, self = this, scaledTime = time / fTimescale, scaledDuration = Math.min(duration / fTimescale, representation.adaptation.period.mpd.maxSegmentDuration);
        return presentationStartTime = self.timelineConverter.calcPresentationTimeFromMediaTime(scaledTime, representation), 
        presentationEndTime = presentationStartTime + scaledDuration, seg = new Dash.vo.Segment(), 
        seg.representation = representation, seg.duration = scaledDuration, seg.mediaStartTime = scaledTime, 
        seg.presentationStartTime = presentationStartTime, seg.availabilityStartTime = representation.adaptation.period.mpd.manifest.mpdLoadedTime, 
        seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic), 
        seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg, isDynamic), 
        seg.replacementTime = time, seg.replacementNumber = getNumberForSegment(seg, index), 
        url = replaceNumberForTemplate(url, seg.replacementNumber), url = replaceTimeForTemplate(url, seg.replacementTime), 
        seg.media = url, seg.mediaRange = range, seg;
    }, getSegmentsFromList = function(representation) {
        var i, len, seg, s, start, segments = [], list = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentList;
        for (start = representation.startNumber, i = 0, len = list.SegmentURL_asArray.length; len > i; i += 1) s = list.SegmentURL_asArray[i], 
        seg = getIndexBasedSegment.call(this, representation, i), seg.replacementTime = (start + i - 1) * representation.segmentDuration, 
        seg.media = s.media, seg.mediaRange = s.mediaRange, seg.index = s.index, seg.indexRange = s.indexRange, 
        segments.push(seg), seg = null;
        return Q.when(segments);
    }, getSegmentsFromSource = function(representation) {
        var s, i, len, seg, self = this, baseURL = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL, deferred = Q.defer(), segments = [], count = 0, range = null;
        return representation.indexRange && (range = representation.indexRange), this.baseURLExt.loadSegments(baseURL, range).then(function(fragments) {
            for (i = 0, len = fragments.length; len > i; i += 1) s = fragments[i], seg = getTimeBasedSegment.call(self, representation, s.startTime, s.duration, s.timescale, s.media, s.mediaRange, count), 
            segments.push(seg), seg = null, count += 1;
            deferred.resolve(segments);
        }), deferred.promise;
    }, getSegments = function(representation) {
        var segmentPromise, lastIdx, deferred = Q.defer(), self = this;
        return representation.segments ? Q.when(representation.segments) : (segmentPromise = "SegmentTimeline" === representation.segmentInfoType ? getSegmentsFromTimeline.call(self, representation) : "SegmentTemplate" === representation.segmentInfoType ? getSegmentsFromTemplate.call(self, representation) : "SegmentList" === representation.segmentInfoType ? getSegmentsFromList.call(self, representation) : getSegmentsFromSource.call(self, representation), 
        Q.when(segmentPromise).then(function(segments) {
            representation.segments = segments, lastIdx = segments.length - 1, isDynamic && isNaN(representation.adaptation.period.liveEdge) && (representation.adaptation.period.liveEdge = segments[lastIdx].presentationStartTime), 
            representation.segmentAvailabilityRange = {
                start: segments[0].presentationStartTime,
                end: segments[lastIdx].presentationStartTime
            }, deferred.resolve(segments);
        }), deferred.promise);
    }, getIndexForSegments = function(time, segments) {
        var frag, ft, fd, i, segmentLastIdx = segments.length - 1, idx = -1;
        if (segments && segments.length > 0) for (i = segmentLastIdx; i >= 0; i--) {
            if (frag = segments[i], ft = frag.presentationStartTime, fd = frag.duration, time + Dash.dependencies.DashHandler.EPSILON >= ft && time - Dash.dependencies.DashHandler.EPSILON <= ft + fd) {
                idx = i;
                break;
            }
            -1 === idx && time - Dash.dependencies.DashHandler.EPSILON > ft + fd && (idx = i + 1);
        }
        return Q.when(idx);
    }, getRequestForSegment = function(segment) {
        if (null === segment || void 0 === segment) return Q.when(null);
        var url, request = new MediaPlayer.vo.SegmentRequest(), representation = segment.representation, bandwidth = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].bandwidth;
        return url = getRequestUrl(segment.media, representation), url = replaceNumberForTemplate(url, segment.replacementNumber), 
        url = replaceTimeForTemplate(url, segment.replacementTime), url = replaceBandwidthForTemplate(url, bandwidth), 
        url = replaceIDForTemplate(url, representation.id), request.streamType = type, request.type = "Media Segment", 
        request.url = url, request.range = segment.mediaRange, request.startTime = segment.presentationStartTime, 
        request.duration = segment.duration, request.timescale = representation.timescale, 
        request.availabilityStartTime = segment.availabilityStartTime, request.availabilityEndTime = segment.availabilityEndTime, 
        request.wallStartTime = segment.wallStartTime, request.quality = representation.index, 
        request.index = index, Q.when(request);
    }, getForTime = function(representation, time) {
        var deferred, request, segment, self = this;
        return representation ? (deferred = Q.defer(), getSegments.call(self, representation).then(function(segments) {
            var segmentsPromise;
            return segmentsPromise = getIndexForSegments.call(self, time, segments);
        }).then(function(newIndex) {
            return index = newIndex, isMediaFinished.call(self, representation);
        }).then(function(finished) {
            var requestPromise = null;
            return finished ? (request = new MediaPlayer.vo.SegmentRequest(), request.action = request.ACTION_COMPLETE, 
            request.index = index, deferred.resolve(request)) : (segment = representation.segments[index], 
            requestPromise = getRequestForSegment.call(self, segment)), requestPromise;
        }).then(function(request) {
            deferred.resolve(request);
        }), deferred.promise) : Q.reject("no represenation");
    }, getNext = function(representation) {
        var deferred, request, segment, self = this;
        if (!representation) return Q.reject("no represenation");
        if (-1 === index) throw "You must call getSegmentRequestForTime first.";
        return index += 1, deferred = Q.defer(), isMediaFinished.call(self, representation).then(function(finished) {
            finished ? (request = new MediaPlayer.vo.SegmentRequest(), request.action = request.ACTION_COMPLETE, 
            request.index = index, deferred.resolve(request)) : getSegments.call(self, representation).then(function(segments) {
                var segmentsPromise;
                return segment = representation.segments[index], segmentsPromise = getRequestForSegment.call(self, segment);
            }).then(function(request) {
                deferred.resolve(request);
            });
        }), deferred.promise;
    }, getSegmentCountForDuration = function(representation, requiredDuration, bufferedDuration) {
        var segmentDuration, self = this, remainingDuration = Math.max(requiredDuration - bufferedDuration, 0), deferred = Q.defer(), segmentCount = 0;
        return representation ? (getSegments.call(self, representation).then(function(segments) {
            segmentDuration = segments[0].duration, segmentCount = Math.ceil(remainingDuration / segmentDuration), 
            deferred.resolve(segmentCount);
        }, function() {
            deferred.resolve(0);
        }), deferred.promise) : Q.reject("no represenation");
    }, getCurrentTime = function(representation) {
        var time, bufferedIndex, self = this, deferred = Q.defer();
        return representation ? (bufferedIndex = index, getSegments.call(self, representation).then(function(segments) {
            0 > bufferedIndex ? time = self.timelineConverter.calcPresentationStartTime(representation.adaptation.period) : (bufferedIndex = Math.min(segments.length - 1, bufferedIndex), 
            time = segments[bufferedIndex].presentationStartTime), deferred.resolve(time);
        }, function() {
            deferred.reject();
        }), deferred.promise) : Q.reject("no represenation");
    };
    return {
        debug: void 0,
        baseURLExt: void 0,
        manifestModel: void 0,
        manifestExt: void 0,
        errHandler: void 0,
        timelineConverter: void 0,
        getType: function() {
            return type;
        },
        setType: function(value) {
            type = value;
        },
        getIsDynamic: function() {
            return isDynamic;
        },
        setIsDynamic: function(value) {
            isDynamic = value;
        },
        getInitRequest: getInit,
        getSegmentRequestForTime: getForTime,
        getNextSegmentRequest: getNext,
        getCurrentTime: getCurrentTime,
        getSegmentCountForDuration: getSegmentCountForDuration
    };
}, Dash.dependencies.DashHandler.EPSILON = .003, Dash.dependencies.DashHandler.prototype = {
    constructor: Dash.dependencies.DashHandler
}, Dash.dependencies.DashManifestExtensions = function() {
    "use strict";
    this.timelineConverter = void 0;
}, Dash.dependencies.DashManifestExtensions.prototype = {
    constructor: Dash.dependencies.DashManifestExtensions,
    getIsAudio: function(adaptation) {
        "use strict";
        var i, len, representation, col = adaptation.ContentComponent_asArray, result = !1, found = !1;
        if (col) for (i = 0, len = col.length; len > i; i += 1) "audio" === col[i].contentType && (result = !0, 
        found = !0);
        if (adaptation.hasOwnProperty("mimeType") && (result = -1 !== adaptation.mimeType.indexOf("audio"), 
        found = !0), !found) for (i = 0, len = adaptation.Representation_asArray.length; !found && len > i; ) representation = adaptation.Representation_asArray[i], 
        representation.hasOwnProperty("mimeType") && (result = -1 !== representation.mimeType.indexOf("audio"), 
        found = !0), i += 1;
        return result && (adaptation.type = "audio"), Q.when(result);
    },
    getIsVideo: function(adaptation) {
        "use strict";
        var i, len, representation, col = adaptation.ContentComponent_asArray, result = !1, found = !1;
        if (col) for (i = 0, len = col.length; len > i; i += 1) "video" === col[i].contentType && (result = !0, 
        found = !0);
        if (adaptation.hasOwnProperty("mimeType") && (result = -1 !== adaptation.mimeType.indexOf("video"), 
        found = !0), !found) for (i = 0, len = adaptation.Representation_asArray.length; !found && len > i; ) representation = adaptation.Representation_asArray[i], 
        representation.hasOwnProperty("mimeType") && (result = -1 !== representation.mimeType.indexOf("video"), 
        found = !0), i += 1;
        return result && (adaptation.type = "video"), Q.when(result);
    },
    getIsText: function(adaptation) {
        "use strict";
        var i, len, representation, col = adaptation.ContentComponent_asArray, result = !1, found = !1;
        if (col) for (i = 0, len = col.length; len > i; i += 1) "text" === col[i].contentType && (result = !0, 
        found = !0);
        if (adaptation.hasOwnProperty("mimeType") && (result = -1 !== adaptation.mimeType.indexOf("text"), 
        found = !0), !found) for (i = 0, len = adaptation.Representation_asArray.length; !found && len > i; ) representation = adaptation.Representation_asArray[i], 
        representation.hasOwnProperty("mimeType") && (result = -1 !== representation.mimeType.indexOf("text"), 
        found = !0), i += 1;
        return Q.when(result);
    },
    getIsTextTrack: function(type) {
        return "text/vtt" === type || "application/ttml+xml" === type;
    },
    getIsMain: function() {
        "use strict";
        return Q.when(!1);
    },
    processAdaptation: function(adaptation) {
        "use strict";
        return void 0 !== adaptation.Representation_asArray && null !== adaptation.Representation_asArray && adaptation.Representation_asArray.sort(function(a, b) {
            return a.bandwidth - b.bandwidth;
        }), adaptation;
    },
    getDataForId: function(id, manifest, periodIndex) {
        "use strict";
        var i, len, adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;
        for (i = 0, len = adaptations.length; len > i; i += 1) if (adaptations[i].hasOwnProperty("id") && adaptations[i].id === id) return Q.when(adaptations[i]);
        return Q.when(null);
    },
    getDataForIndex: function(index, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;
        return Q.when(adaptations[index]);
    },
    getDataIndex: function(data, manifest, periodIndex) {
        "use strict";
        var i, len, adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;
        for (i = 0, len = adaptations.length; len > i; i += 1) if (adaptations[i] === data) return Q.when(i);
        return Q.when(-1);
    },
    getVideoData: function(manifest, periodIndex) {
        "use strict";
        var i, len, self = this, adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, deferred = Q.defer(), funcs = [];
        for (i = 0, len = adaptations.length; len > i; i += 1) funcs.push(this.getIsVideo(adaptations[i]));
        return Q.all(funcs).then(function(results) {
            var found = !1;
            for (i = 0, len = results.length; len > i; i += 1) results[i] === !0 && (found = !0, 
            deferred.resolve(self.processAdaptation(adaptations[i])));
            found || deferred.resolve(null);
        }), deferred.promise;
    },
    getTextData: function(manifest, periodIndex) {
        "use strict";
        var i, len, self = this, adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, deferred = Q.defer(), funcs = [];
        for (i = 0, len = adaptations.length; len > i; i += 1) funcs.push(this.getIsText(adaptations[i]));
        return Q.all(funcs).then(function(results) {
            var found = !1;
            for (i = 0, len = results.length; len > i; i += 1) results[i] === !0 && (found = !0, 
            deferred.resolve(self.processAdaptation(adaptations[i])));
            found || deferred.resolve(null);
        }), deferred.promise;
    },
    getAudioDatas: function(manifest, periodIndex) {
        "use strict";
        var i, len, self = this, adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, deferred = Q.defer(), funcs = [];
        for (i = 0, len = adaptations.length; len > i; i += 1) funcs.push(this.getIsAudio(adaptations[i]));
        return Q.all(funcs).then(function(results) {
            var datas = [];
            for (i = 0, len = results.length; len > i; i += 1) results[i] === !0 && datas.push(self.processAdaptation(adaptations[i]));
            deferred.resolve(datas);
        }), deferred.promise;
    },
    getPrimaryAudioData: function(manifest, periodIndex) {
        "use strict";
        var i, len, deferred = Q.defer(), funcs = [], self = this;
        return this.getAudioDatas(manifest, periodIndex).then(function(datas) {
            for (datas && 0 !== datas.length || deferred.resolve(null), i = 0, len = datas.length; len > i; i += 1) funcs.push(self.getIsMain(datas[i]));
            Q.all(funcs).then(function(results) {
                var found = !1;
                for (i = 0, len = results.length; len > i; i += 1) results[i] === !0 && (found = !0, 
                deferred.resolve(self.processAdaptation(datas[i])));
                found || deferred.resolve(datas[0]);
            });
        }), deferred.promise;
    },
    getCodec: function(data) {
        "use strict";
        var representation = data.Representation_asArray[0], codec = representation.mimeType + ';codecs="' + representation.codecs + '"';
        return Q.when(codec);
    },
    getMimeType: function(data) {
        "use strict";
        return Q.when(data.Representation_asArray[0].mimeType);
    },
    getKID: function(data) {
        "use strict";
        return data && data.hasOwnProperty("cenc:default_KID") ? data["cenc:default_KID"] : null;
    },
    getContentProtectionData: function(data) {
        "use strict";
        return Q.when(data && data.hasOwnProperty("ContentProtection_asArray") && 0 !== data.ContentProtection_asArray.length ? data.ContentProtection_asArray : null);
    },
    getIsDynamic: function(manifest) {
        "use strict";
        var isDynamic = !1, LIVE_TYPE = "dynamic";
        return manifest.hasOwnProperty("type") && (isDynamic = manifest.type === LIVE_TYPE), 
        isDynamic;
    },
    getIsDVR: function(manifest) {
        "use strict";
        var containsDVR, isDVR, isDynamic = this.getIsDynamic(manifest);
        return containsDVR = !isNaN(manifest.timeShiftBufferDepth), isDVR = isDynamic && containsDVR, 
        Q.when(isDVR);
    },
    getIsOnDemand: function(manifest) {
        "use strict";
        var isOnDemand = !1;
        return manifest.profiles && manifest.profiles.length > 0 && (isOnDemand = -1 !== manifest.profiles.indexOf("urn:mpeg:dash:profile:isoff-on-demand:2011")), 
        Q.when(isOnDemand);
    },
    getDuration: function(manifest) {
        var mpdDuration;
        return mpdDuration = manifest.hasOwnProperty("mediaPresentationDuration") ? manifest.mediaPresentationDuration : Number.POSITIVE_INFINITY, 
        Q.when(mpdDuration);
    },
    getBandwidth: function(representation) {
        "use strict";
        return Q.when(representation.bandwidth);
    },
    getRefreshDelay: function(manifest) {
        "use strict";
        var delay = 0/0;
        return manifest.hasOwnProperty("minimumUpdatePeriod") && (delay = parseFloat(manifest.minimumUpdatePeriod)), 
        Q.when(delay);
    },
    getRepresentationCount: function(adaptation) {
        "use strict";
        return Q.when(adaptation.Representation_asArray.length);
    },
    getRepresentationFor: function(index, data) {
        "use strict";
        return Q.when(data.Representation_asArray[index]);
    },
    getRepresentationsForAdaptation: function(manifest, adaptation) {
        for (var representation, initialization, segmentInfo, r, a = manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index], self = this, representations = [], deferred = Q.defer(), i = 0; i < a.Representation_asArray.length; i += 1) r = a.Representation_asArray[i], 
        representation = new Dash.vo.Representation(), representation.index = i, representation.adaptation = adaptation, 
        r.hasOwnProperty("id") && (representation.id = r.id), r.hasOwnProperty("SegmentBase") ? (segmentInfo = r.SegmentBase, 
        representation.segmentInfoType = "SegmentBase") : r.hasOwnProperty("SegmentList") ? (segmentInfo = r.SegmentList, 
        representation.segmentInfoType = "SegmentList") : r.hasOwnProperty("SegmentTemplate") ? (segmentInfo = r.SegmentTemplate, 
        representation.segmentInfoType = segmentInfo.hasOwnProperty("SegmentTimeline") ? "SegmentTimeline" : "SegmentTemplate", 
        segmentInfo.hasOwnProperty("initialization") && (representation.initialization = segmentInfo.initialization.split("$Bandwidth$").join(r.bandwidth).split("$RepresentationID$").join(r.id))) : (segmentInfo = r.BaseURL, 
        representation.segmentInfoType = "BaseURL"), segmentInfo.hasOwnProperty("Initialization") ? (initialization = segmentInfo.Initialization, 
        initialization.hasOwnProperty("sourceURL") ? representation.initialization = initialization.sourceURL : initialization.hasOwnProperty("range") && (representation.initialization = r.BaseURL, 
        representation.range = initialization.range)) : r.hasOwnProperty("mimeType") && self.getIsTextTrack(r.mimeType) && (representation.initialization = r.BaseURL, 
        representation.range = 0), segmentInfo.hasOwnProperty("timescale") && (representation.timescale = segmentInfo.timescale), 
        segmentInfo.hasOwnProperty("duration") && (representation.segmentDuration = segmentInfo.duration / representation.timescale), 
        segmentInfo.hasOwnProperty("startNumber") && (representation.startNumber = segmentInfo.startNumber), 
        segmentInfo.hasOwnProperty("indexRange") && (representation.indexRange = segmentInfo.indexRange), 
        segmentInfo.hasOwnProperty("presentationTimeOffset") && (representation.presentationTimeOffset = segmentInfo.presentationTimeOffset / representation.timescale), 
        representation.MSETimeOffset = self.timelineConverter.calcMSETimeOffset(representation), 
        representations.push(representation);
        return deferred.resolve(representations), deferred.promise;
    },
    getAdaptationsForPeriod: function(manifest, period) {
        for (var adaptationSet, p = manifest.Period_asArray[period.index], adaptations = [], i = 0; i < p.AdaptationSet_asArray.length; i += 1) adaptationSet = new Dash.vo.AdaptationSet(), 
        adaptationSet.index = i, adaptationSet.period = period, adaptations.push(adaptationSet);
        return Q.when(adaptations);
    },
    getRegularPeriods: function(manifest, mpd) {
        var i, len, self = this, deferred = Q.defer(), periods = [], isDynamic = self.getIsDynamic(manifest), p1 = null, p = null, vo1 = null, vo = null;
        for (i = 0, len = manifest.Period_asArray.length; len > i; i += 1) p = manifest.Period_asArray[i], 
        p.hasOwnProperty("start") ? (vo = new Dash.vo.Period(), vo.start = p.start) : null !== p1 && p.hasOwnProperty("duration") ? (vo = new Dash.vo.Period(), 
        vo.start = vo1.start + vo1.duration, vo.duration = p.duration) : 0 !== i || isDynamic || (vo = new Dash.vo.Period(), 
        vo.start = 0), null !== vo1 && isNaN(vo1.duration) && (vo1.duration = vo.start - vo1.start), 
        null !== vo && p.hasOwnProperty("id") && (vo.id = p.id), null !== vo && (vo.index = i, 
        vo.mpd = mpd, periods.push(vo)), p1 = p, p = null, vo1 = vo, vo = null;
        return self.getCheckTime(manifest, periods[0]).then(function(checkTime) {
            mpd.checkTime = checkTime, null !== vo1 && isNaN(vo1.duration) ? self.getEndTimeForLastPeriod(mpd).then(function(periodEndTime) {
                vo1.duration = periodEndTime - vo1.start, deferred.resolve(periods);
            }) : deferred.resolve(periods);
        }), Q.when(deferred.promise);
    },
    getMpd: function(manifest) {
        var mpd = new Dash.vo.Mpd();
        return mpd.manifest = manifest, mpd.availabilityStartTime = new Date(manifest.hasOwnProperty("availabilityStartTime") ? manifest.availabilityStartTime.getTime() : manifest.mpdLoadedTime.getTime()), 
        manifest.hasOwnProperty("availabilityEndTime") && (mpd.availabilityEndTime = new Date(manifest.availabilityEndTime.getTime())), 
        manifest.hasOwnProperty("suggestedPresentationDelay") && (mpd.suggestedPresentationDelay = manifest.suggestedPresentationDelay), 
        manifest.hasOwnProperty("timeShiftBufferDepth") && (mpd.timeShiftBufferDepth = manifest.timeShiftBufferDepth), 
        manifest.hasOwnProperty("maxSegmentDuration") && (mpd.maxSegmentDuration = manifest.maxSegmentDuration), 
        Q.when(mpd);
    },
    getFetchTime: function(manifest, period) {
        var fetchTime = this.timelineConverter.calcPresentationTimeFromWallTime(manifest.mpdLoadedTime, period, !0);
        return Q.when(fetchTime);
    },
    getCheckTime: function(manifest, period) {
        var self = this, deferred = Q.defer(), checkTime = 0/0;
        return manifest.hasOwnProperty("minimumUpdatePeriod") ? self.getFetchTime(manifest, period).then(function(fetchTime) {
            checkTime = fetchTime + manifest.minimumUpdatePeriod, deferred.resolve(checkTime);
        }) : deferred.resolve(checkTime), deferred.promise;
    },
    getEndTimeForLastPeriod: function(mpd) {
        var periodEnd;
        return periodEnd = mpd.manifest.mediaPresentationDuration ? mpd.manifest.mediaPresentationDuration : mpd.checkTime, 
        Q.when(periodEnd);
    }
}, Dash.dependencies.DashMetricsExtensions = function() {
    "use strict";
    var findRepresentationIndexInPeriodArray = function(periodArray, representationId) {
        var period, adaptationSet, adaptationSetArray, representation, representationArray, periodArrayIndex, adaptationSetArrayIndex, representationArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex += 1) for (period = periodArray[periodArrayIndex], 
        adaptationSetArray = period.AdaptationSet_asArray, adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex += 1) for (adaptationSet = adaptationSetArray[adaptationSetArrayIndex], 
        representationArray = adaptationSet.Representation_asArray, representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex += 1) if (representation = representationArray[representationArrayIndex], 
        representationId === representation.id) return representationArrayIndex;
        return -1;
    }, findRepresentionInPeriodArray = function(periodArray, representationId) {
        var period, adaptationSet, adaptationSetArray, representation, representationArray, periodArrayIndex, adaptationSetArrayIndex, representationArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex += 1) for (period = periodArray[periodArrayIndex], 
        adaptationSetArray = period.AdaptationSet_asArray, adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex += 1) for (adaptationSet = adaptationSetArray[adaptationSetArrayIndex], 
        representationArray = adaptationSet.Representation_asArray, representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex += 1) if (representation = representationArray[representationArrayIndex], 
        representationId === representation.id) return representation;
        return null;
    }, adaptationIsType = function(adaptation, bufferType) {
        var found = !1;
        return "video" === bufferType ? (this.manifestExt.getIsVideo(adaptation), "video" === adaptation.type && (found = !0)) : "audio" === bufferType ? (this.manifestExt.getIsAudio(adaptation), 
        "audio" === adaptation.type && (found = !0)) : found = !1, found;
    }, findMaxBufferIndex = function(periodArray, bufferType) {
        var period, adaptationSet, adaptationSetArray, representationArray, periodArrayIndex, adaptationSetArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex += 1) for (period = periodArray[periodArrayIndex], 
        adaptationSetArray = period.AdaptationSet_asArray, adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex += 1) if (adaptationSet = adaptationSetArray[adaptationSetArrayIndex], 
        representationArray = adaptationSet.Representation_asArray, adaptationIsType.call(this, adaptationSet, bufferType)) return representationArray.length;
        return -1;
    }, getBandwidthForRepresentation = function(representationId) {
        var representation, self = this, manifest = self.manifestModel.getValue(), periodArray = manifest.Period_asArray;
        return representation = findRepresentionInPeriodArray.call(self, periodArray, representationId), 
        null === representation ? null : representation.bandwidth;
    }, getIndexForRepresentation = function(representationId) {
        var representationIndex, self = this, manifest = self.manifestModel.getValue(), periodArray = manifest.Period_asArray;
        return representationIndex = findRepresentationIndexInPeriodArray.call(self, periodArray, representationId);
    }, getMaxIndexForBufferType = function(bufferType) {
        var maxIndex, self = this, manifest = self.manifestModel.getValue(), periodArray = manifest.Period_asArray;
        return maxIndex = findMaxBufferIndex.call(this, periodArray, bufferType);
    }, getCurrentRepresentationSwitch = function(metrics) {
        if (null === metrics) return null;
        var repSwitchLength, repSwitchLastIndex, currentRepSwitch, repSwitch = metrics.RepSwitchList;
        return null === repSwitch || repSwitch.length <= 0 ? null : (repSwitchLength = repSwitch.length, 
        repSwitchLastIndex = repSwitchLength - 1, currentRepSwitch = repSwitch[repSwitchLastIndex]);
    }, getCurrentBufferLevel = function(metrics) {
        if (null === metrics) return null;
        var bufferLevelLength, bufferLevelLastIndex, currentBufferLevel, bufferLevel = metrics.BufferLevel;
        return null === bufferLevel || bufferLevel.length <= 0 ? null : (bufferLevelLength = bufferLevel.length, 
        bufferLevelLastIndex = bufferLevelLength - 1, currentBufferLevel = bufferLevel[bufferLevelLastIndex]);
    }, getCurrentHttpRequest = function(metrics) {
        if (null === metrics) return null;
        var httpListLength, httpListLastIndex, currentHttpList, httpList = metrics.HttpList;
        return null === httpList || httpList.length <= 0 ? null : (httpListLength = httpList.length, 
        httpListLastIndex = httpListLength - 1, currentHttpList = httpList[httpListLastIndex]);
    }, getCurrentDroppedFrames = function(metrics) {
        if (null === metrics) return null;
        var droppedFramesLength, droppedFramesLastIndex, currentDroppedFrames, droppedFrames = metrics.DroppedFrames;
        return null === droppedFrames || droppedFrames.length <= 0 ? null : (droppedFramesLength = droppedFrames.length, 
        droppedFramesLastIndex = droppedFramesLength - 1, currentDroppedFrames = droppedFrames[droppedFramesLastIndex]);
    };
    return {
        manifestModel: void 0,
        manifestExt: void 0,
        getBandwidthForRepresentation: getBandwidthForRepresentation,
        getIndexForRepresentation: getIndexForRepresentation,
        getMaxIndexForBufferType: getMaxIndexForBufferType,
        getCurrentRepresentationSwitch: getCurrentRepresentationSwitch,
        getCurrentBufferLevel: getCurrentBufferLevel,
        getCurrentHttpRequest: getCurrentHttpRequest,
        getCurrentDroppedFrames: getCurrentDroppedFrames
    };
}, Dash.dependencies.DashMetricsExtensions.prototype = {
    constructor: Dash.dependencies.DashMetricsExtensions
}, Dash.dependencies.DashParser = function() {
    "use strict";
    var SECONDS_IN_YEAR = 31536e3, SECONDS_IN_MONTH = 2592e3, SECONDS_IN_DAY = 86400, SECONDS_IN_HOUR = 3600, SECONDS_IN_MIN = 60, MINUTES_IN_HOUR = 60, MILLISECONDS_IN_SECONDS = 1e3, durationRegex = /^P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/, datetimeRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(?::([0-9]*)(\.[0-9]*)?)?(?:([+-])([0-9]{2})([0-9]{2}))?/, numericRegex = /^[-+]?[0-9]+[.]?[0-9]*([eE][-+]?[0-9]+)?$/, matchers = [ {
        type: "duration",
        test: function(str) {
            return durationRegex.test(str);
        },
        converter: function(str) {
            var match = durationRegex.exec(str);
            return parseFloat(match[2] || 0) * SECONDS_IN_YEAR + parseFloat(match[4] || 0) * SECONDS_IN_MONTH + parseFloat(match[6] || 0) * SECONDS_IN_DAY + parseFloat(match[8] || 0) * SECONDS_IN_HOUR + parseFloat(match[10] || 0) * SECONDS_IN_MIN + parseFloat(match[12] || 0);
        }
    }, {
        type: "datetime",
        test: function(str) {
            return datetimeRegex.test(str);
        },
        converter: function(str) {
            var utcDate, match = datetimeRegex.exec(str);
            if (utcDate = Date.UTC(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), parseInt(match[4], 10), parseInt(match[5], 10), match[6] && parseInt(match[6], 10) || 0, match[7] && parseFloat(match[7]) * MILLISECONDS_IN_SECONDS || 0), 
            match[9] && match[10]) {
                var timezoneOffset = parseInt(match[9], 10) * MINUTES_IN_HOUR + parseInt(match[10], 10);
                utcDate += ("+" === match[8] ? -1 : 1) * timezoneOffset * SECONDS_IN_MIN * MILLISECONDS_IN_SECONDS;
            }
            return new Date(utcDate);
        }
    }, {
        type: "numeric",
        test: function(str) {
            return numericRegex.test(str);
        },
        converter: function(str) {
            return parseFloat(str);
        }
    } ], getCommonValuesMap = function() {
        var adaptationSet, representation, subRepresentation, common;
        return common = [ {
            name: "profiles",
            merge: !1
        }, {
            name: "width",
            merge: !1
        }, {
            name: "height",
            merge: !1
        }, {
            name: "sar",
            merge: !1
        }, {
            name: "frameRate",
            merge: !1
        }, {
            name: "audioSamplingRate",
            merge: !1
        }, {
            name: "mimeType",
            merge: !1
        }, {
            name: "segmentProfiles",
            merge: !1
        }, {
            name: "codecs",
            merge: !1
        }, {
            name: "maximumSAPPeriod",
            merge: !1
        }, {
            name: "startsWithSap",
            merge: !1
        }, {
            name: "maxPlayoutRate",
            merge: !1
        }, {
            name: "codingDependency",
            merge: !1
        }, {
            name: "scanType",
            merge: !1
        }, {
            name: "FramePacking",
            merge: !0
        }, {
            name: "AudioChannelConfiguration",
            merge: !0
        }, {
            name: "ContentProtection",
            merge: !0
        } ], adaptationSet = {}, adaptationSet.name = "AdaptationSet", adaptationSet.isRoot = !1, 
        adaptationSet.isArray = !0, adaptationSet.parent = null, adaptationSet.children = [], 
        adaptationSet.properties = common, representation = {}, representation.name = "Representation", 
        representation.isRoot = !1, representation.isArray = !0, representation.parent = adaptationSet, 
        representation.children = [], representation.properties = common, adaptationSet.children.push(representation), 
        subRepresentation = {}, subRepresentation.name = "SubRepresentation", subRepresentation.isRoot = !1, 
        subRepresentation.isArray = !0, subRepresentation.parent = representation, subRepresentation.children = [], 
        subRepresentation.properties = common, representation.children.push(subRepresentation), 
        adaptationSet;
    }, getSegmentValuesMap = function() {
        var period, adaptationSet, representation, common;
        return common = [ {
            name: "SegmentBase",
            merge: !0
        }, {
            name: "SegmentTemplate",
            merge: !0
        }, {
            name: "SegmentList",
            merge: !0
        } ], period = {}, period.name = "Period", period.isRoot = !1, period.isArray = !0, 
        period.parent = null, period.children = [], period.properties = common, adaptationSet = {}, 
        adaptationSet.name = "AdaptationSet", adaptationSet.isRoot = !1, adaptationSet.isArray = !0, 
        adaptationSet.parent = period, adaptationSet.children = [], adaptationSet.properties = common, 
        period.children.push(adaptationSet), representation = {}, representation.name = "Representation", 
        representation.isRoot = !1, representation.isArray = !0, representation.parent = adaptationSet, 
        representation.children = [], representation.properties = common, adaptationSet.children.push(representation), 
        period;
    }, getBaseUrlValuesMap = function() {
        var mpd, period, adaptationSet, representation, common;
        return common = [ {
            name: "BaseURL",
            merge: !0,
            mergeFunction: function(parentValue, childValue) {
                var mergedValue;
                return mergedValue = 0 === childValue.indexOf("http://") ? childValue : parentValue + childValue;
            }
        } ], mpd = {}, mpd.name = "mpd", mpd.isRoot = !0, mpd.isArray = !0, mpd.parent = null, 
        mpd.children = [], mpd.properties = common, period = {}, period.name = "Period", 
        period.isRoot = !1, period.isArray = !0, period.parent = null, period.children = [], 
        period.properties = common, mpd.children.push(period), adaptationSet = {}, adaptationSet.name = "AdaptationSet", 
        adaptationSet.isRoot = !1, adaptationSet.isArray = !0, adaptationSet.parent = period, 
        adaptationSet.children = [], adaptationSet.properties = common, period.children.push(adaptationSet), 
        representation = {}, representation.name = "Representation", representation.isRoot = !1, 
        representation.isArray = !0, representation.parent = adaptationSet, representation.children = [], 
        representation.properties = common, adaptationSet.children.push(representation), 
        mpd;
    }, getDashMap = function() {
        var result = [];
        return result.push(getCommonValuesMap()), result.push(getSegmentValuesMap()), result.push(getBaseUrlValuesMap()), 
        result;
    }, internalParse = function(data, baseUrl) {
        var manifest, converter = new X2JS(matchers, "", !0), iron = new ObjectIron(getDashMap());
        return manifest = converter.xml_str2json(data), null == manifest ? Q.when(null) : (manifest.hasOwnProperty("BaseURL") ? (manifest.BaseURL = manifest.BaseURL_asArray[0], 
        0 !== manifest.BaseURL.indexOf("http") && (manifest.BaseURL = baseUrl + manifest.BaseURL)) : manifest.BaseURL = baseUrl, 
        iron.run(manifest), Q.when(manifest));
    };
    return {
        debug: void 0,
        parse: internalParse
    };
}, Dash.dependencies.DashParser.prototype = {
    constructor: Dash.dependencies.DashParser
}, Dash.dependencies.FragmentExtensions = function() {
    "use strict";
    var parseTFDT = function(ab) {
        for (var base_media_decode_time, version, size, type, i, c, deferred = Q.defer(), d = new DataView(ab), pos = 0; "tfdt" !== type && pos < d.byteLength; ) {
            for (size = d.getUint32(pos), pos += 4, type = "", i = 0; 4 > i; i += 1) c = d.getInt8(pos), 
            type += String.fromCharCode(c), pos += 1;
            "moof" !== type && "traf" !== type && "tfdt" !== type && (pos += size - 8);
        }
        if (pos === d.byteLength) throw "Error finding live offset.";
        return version = d.getUint8(pos), 0 === version ? (pos += 4, base_media_decode_time = d.getUint32(pos, !1)) : (pos += size - 16, 
        base_media_decode_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, !1), d.getUint32(pos, !1))), 
        deferred.resolve({
            version: version,
            base_media_decode_time: base_media_decode_time
        }), deferred.promise;
    }, parseSIDX = function(ab) {
        for (var version, timescale, earliest_presentation_time, i, type, size, charCode, d = new DataView(ab), pos = 0; "sidx" !== type && pos < d.byteLength; ) {
            for (size = d.getUint32(pos), pos += 4, type = "", i = 0; 4 > i; i += 1) charCode = d.getInt8(pos), 
            type += String.fromCharCode(charCode), pos += 1;
            "moof" !== type && "traf" !== type && "sidx" !== type ? pos += size - 8 : "sidx" === type && (pos -= 8);
        }
        return version = d.getUint8(pos + 8), pos += 12, timescale = d.getUint32(pos + 4, !1), 
        pos += 8, earliest_presentation_time = 0 === version ? d.getUint32(pos, !1) : utils.Math.to64BitNumber(d.getUint32(pos + 4, !1), d.getUint32(pos, !1)), 
        Q.when({
            earliestPresentationTime: earliest_presentation_time,
            timescale: timescale
        });
    }, loadFragment = function(media) {
        var url, errorStr, parsed, deferred = Q.defer(), request = new XMLHttpRequest(), loaded = !1;
        return url = media, request.onloadend = function() {
            loaded || (errorStr = "Error loading fragment: " + url, deferred.reject(errorStr));
        }, request.onload = function() {
            loaded = !0, parsed = parseTFDT(request.response), deferred.resolve(parsed);
        }, request.onerror = function() {
            errorStr = "Error loading fragment: " + url, deferred.reject(errorStr);
        }, request.responseType = "arraybuffer", request.open("GET", url), request.send(null), 
        deferred.promise;
    };
    return {
        debug: void 0,
        loadFragment: loadFragment,
        parseTFDT: parseTFDT,
        parseSIDX: parseSIDX
    };
}, Dash.dependencies.FragmentExtensions.prototype = {
    constructor: Dash.dependencies.FragmentExtensions
}, Dash.dependencies.TimelineConverter = function() {
    "use strict";
    var calcAvailabilityTimeFromPresentationTime = function(presentationTime, mpd, isDynamic, calculateEnd) {
        var availabilityTime = 0/0;
        return availabilityTime = calculateEnd ? isDynamic && mpd.timeShiftBufferDepth != Number.POSITIVE_INFINITY ? new Date(mpd.availabilityStartTime.getTime() + 1e3 * (presentationTime + mpd.timeShiftBufferDepth)) : mpd.availabilityEndTime : isDynamic ? new Date(mpd.availabilityStartTime.getTime() + 1e3 * presentationTime) : mpd.availabilityStartTime;
    }, calcAvailabilityStartTimeFromPresentationTime = function(presentationTime, mpd, isDynamic) {
        return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic);
    }, calcAvailabilityEndTimeFromPresentationTime = function(presentationTime, mpd, isDynamic) {
        return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic, !0);
    }, calcPresentationStartTime = function(period) {
        var presentationStartTime, isDynamic;
        return isDynamic = "dynamic" === period.mpd.manifest.type, presentationStartTime = isDynamic ? period.liveEdge : period.start;
    }, calcPresentationTimeFromWallTime = function(wallTime, period, isDynamic) {
        var periodAvailabilityStartTime = calcAvailabilityStartTimeFromPresentationTime.call(this, period.start, period.mpd, isDynamic);
        return (wallTime.getTime() - periodAvailabilityStartTime.getTime()) / 1e3;
    }, calcPresentationTimeFromMediaTime = function(mediaTime, representation) {
        var periodStart = representation.adaptation.period.start, presentationOffset = representation.presentationTimeOffset;
        return periodStart - presentationOffset + mediaTime;
    }, calcMediaTimeFromPresentationTime = function(presentationTime, representation) {
        var periodStart = representation.adaptation.period.start, presentationOffset = representation.presentationTimeOffset;
        return periodStart + presentationOffset + presentationTime;
    }, calcWallTimeForSegment = function(segment, isDynamic) {
        var suggestedPresentationDelay, displayStartTime, wallTime;
        return isDynamic && (suggestedPresentationDelay = segment.representation.adaptation.period.mpd.suggestedPresentationDelay, 
        displayStartTime = segment.presentationStartTime + suggestedPresentationDelay, wallTime = new Date(segment.availabilityStartTime.getTime() + 1e3 * displayStartTime)), 
        wallTime;
    }, calcSegmentAvailabilityRange = function(representation, isDynamic) {
        var checkTime, duration, now, start, end, range = null;
        return isDynamic && (checkTime = representation.adaptation.period.mpd.checkTime, 
        duration = representation.segmentDuration, now = calcPresentationTimeFromWallTime(new Date(), representation.adaptation.period, isDynamic) - representation.adaptation.period.mpd.suggestedPresentationDelay, 
        start = Math.max(now - representation.adaptation.period.mpd.timeShiftBufferDepth - duration, 0), 
        end = isNaN(checkTime) ? now : Math.min(checkTime, now), range = {
            start: start,
            end: end
        }), range;
    }, calcMSETimeOffset = function(representation) {
        var periodStart = representation.adaptation.period.start, presentationOffset = representation.presentationTimeOffset;
        return periodStart - presentationOffset;
    };
    return {
        system: void 0,
        debug: void 0,
        calcAvailabilityStartTimeFromPresentationTime: calcAvailabilityStartTimeFromPresentationTime,
        calcAvailabilityEndTimeFromPresentationTime: calcAvailabilityEndTimeFromPresentationTime,
        calcPresentationTimeFromWallTime: calcPresentationTimeFromWallTime,
        calcPresentationTimeFromMediaTime: calcPresentationTimeFromMediaTime,
        calcPresentationStartTime: calcPresentationStartTime,
        calcMediaTimeFromPresentationTime: calcMediaTimeFromPresentationTime,
        calcSegmentAvailabilityRange: calcSegmentAvailabilityRange,
        calcWallTimeForSegment: calcWallTimeForSegment,
        calcMSETimeOffset: calcMSETimeOffset
    };
}, Dash.dependencies.TimelineConverter.prototype = {
    constructor: Dash.dependencies.TimelineConverter
}, Dash.vo.AdaptationSet = function() {
    "use strict";
    this.period = null, this.index = -1;
}, Dash.vo.AdaptationSet.prototype = {
    constructor: Dash.vo.AdaptationSet
}, Dash.vo.Mpd = function() {
    "use strict";
    this.manifest = null, this.suggestedPresentationDelay = 0, this.availabilityStartTime = null, 
    this.availabilityEndTime = Number.POSITIVE_INFINITY, this.timeShiftBufferDepth = Number.POSITIVE_INFINITY, 
    this.maxSegmentDuration = Number.POSITIVE_INFINITY, this.checkTime = 0/0;
}, Dash.vo.Mpd.prototype = {
    constructor: Dash.vo.Mpd
}, Dash.vo.Period = function() {
    "use strict";
    this.id = null, this.index = -1, this.duration = 0/0, this.start = 0/0, this.mpd = null, 
    this.liveEdge = 0/0;
}, Dash.vo.Period.prototype = {
    constructor: Dash.vo.Period
}, Dash.vo.Representation = function() {
    "use strict";
    this.id = null, this.index = -1, this.adaptation = null, this.segmentInfoType = null, 
    this.initialization = null, this.segmentDuration = 0/0, this.timescale = 1, this.startNumber = 1, 
    this.indexRange = null, this.range = null, this.presentationTimeOffset = 0, this.MSETimeOffset = 0/0, 
    this.segmentAvailabilityRange = null;
}, Dash.vo.Representation.prototype = {
    constructor: Dash.vo.Representation
}, Dash.vo.Segment = function() {
    "use strict";
    this.indexRange = null, this.index = null, this.mediaRange = null, this.media = null, 
    this.duration = 0/0, this.replacementTime = null, this.replacementNumber = 0/0, 
    this.mediaStartTime = 0/0, this.presentationStartTime = 0/0, this.availabilityStartTime = 0/0, 
    this.availabilityEndTime = 0/0, this.wallStartTime = 0/0, this.representation = null;
}, Dash.vo.Segment.prototype = {
    constructor: Dash.vo.Segment
}, Mss.dependencies.MssFragmentController = function() {
    "use strict";
    var getIndex = function(adaptation, manifest) {
        var i, j, periods = manifest.Period_asArray;
        for (i = 0; i < periods.length; i += 1) {
            var adaptations = periods[i].AdaptationSet_asArray;
            for (j = 0; j < adaptations.length; j += 1) if (adaptations[j] === adaptation) return j;
        }
        return -1;
    }, processTfrf = function(tfrf, adaptation) {
        for (var segmentsUpdated = !1, segments = adaptation.SegmentTemplate.SegmentTimeline.S, entries = tfrf.entry, i = 0; i < entries.length; i++) {
            var fragment_absolute_time = entries[i].fragment_absolute_time, fragment_duration = entries[i].fragment_duration, lastSegment = segments[segments.length - 1], r = void 0 === lastSegment.r ? 0 : lastSegment.r, t = lastSegment.t + lastSegment.d * r;
            fragment_absolute_time > t && (fragment_duration === lastSegment.d ? lastSegment.r = r + 1 : segments.push({
                t: fragment_absolute_time,
                d: fragment_duration
            }), segmentsUpdated = !0);
        }
        if (segmentsUpdated) {
            var manifest = rslt.manifestModel.getValue(), currentTime = new Date(), presentationStartTime = currentTime.getTime() - manifest.mpdLoadedTime.getTime();
            presentationStartTime = 1e4 * presentationStartTime + adaptation.SegmentTemplate.presentationTimeOffset;
            for (var segment = segments[0]; segment.t < presentationStartTime; ) void 0 !== segment.r && segment.r > 0 ? (segment.t += segment.d, 
            segment.r -= 1) : segments.splice(0, 1), segment = segments[0];
        }
        return segmentsUpdated;
    }, convertFragment = function(data, request, adaptation) {
        var segmentsUpdated = !1, manifest = rslt.manifestModel.getValue(), trackId = getIndex(adaptation, manifest) + 1, fragment = new mp4lib.boxes.File(), processor = new mp4lib.fieldProcessors.DeserializationBoxFieldsProcessor(fragment, data, 0, data.length);
        fragment._processFields(processor);
        var moof = mp4lib.helpers.getBoxByType(fragment, "moof"), mdat = mp4lib.helpers.getBoxByType(fragment, "mdat"), traf = mp4lib.helpers.getBoxByType(moof, "traf"), trun = mp4lib.helpers.getBoxByType(traf, "trun"), tfhd = mp4lib.helpers.getBoxByType(traf, "tfhd"), sepiff = mp4lib.helpers.getBoxByType(traf, "sepiff");
        if (null !== sepiff) {
            sepiff.boxtype = "senc";
            var saio = new mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox();
            saio.version = 0, saio.flags = 0, saio.entry_count = 1, saio.offset = [];
            var saiz = new mp4lib.boxes.SampleAuxiliaryInformationSizesBox();
            saiz.version = 0, saiz.flags = 0, saiz.sample_count = sepiff.sample_count, saiz.default_sample_info_size = 0, 
            saiz.sample_info_size = [];
            for (var sizedifferent = !1, i = 0; i < sepiff.sample_count; i++) saiz.sample_info_size[i] = 8 + 6 * sepiff.entry[i].NumberOfEntries + 2, 
            i > 1 && saiz.sample_info_size[i] != saiz.sample_info_size[i - 1] && (sizedifferent = !0);
            sizedifferent === !1 && (saiz.default_sample_info_size = saiz.sample_info_size[0], 
            saiz.sample_info_size = []), traf.boxes.push(saiz), traf.boxes.push(saio);
        }
        tfhd.track_ID = trackId, mp4lib.helpers.removeBoxByType(traf, "tfxd");
        var tfdt = mp4lib.helpers.getBoxByType(traf, "tfdt");
        null === tfdt && (tfdt = new mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox(), 
        tfdt.version = 1, tfdt.baseMediaDecodeTime = Math.floor(request.startTime * request.timescale), 
        traf.boxes.push(tfdt));
        var tfrf = mp4lib.helpers.getBoxByType(traf, "tfrf");
        if (null !== tfrf && (segmentsUpdated = processTfrf(tfrf, adaptation), mp4lib.helpers.removeBoxByType(traf, "tfrf")), 
        tfhd.flags &= 16777214, tfhd.flags |= 131072, trun.flags |= 1, trun.data_offset = 0, 
        null !== sepiff) {
            var moofpositionInFragment = mp4lib.helpers.getBoxPositionByType(fragment, "moof") + 8, trafpositionInMoof = mp4lib.helpers.getBoxPositionByType(moof, "traf") + 8, sencpositionInTraf = mp4lib.helpers.getBoxPositionByType(traf, "senc") + 8;
            saio.offset[0] = moofpositionInFragment + trafpositionInMoof + sencpositionInTraf + 8;
        }
        var lp = new mp4lib.fieldProcessors.LengthCounterBoxFieldsProcessor(fragment);
        fragment._processFields(lp);
        var new_data = new Uint8Array(lp.res);
        if (trun.data_offset = lp.res - mdat.size + 8, navigator.userAgent.indexOf("Chrome") >= 0 && "dynamic" === manifest.type) {
            tfdt.baseMediaDecodeTime /= 1e3;
            for (var i = 0; i < trun.samples_table.length; i++) trun.samples_table[i].sample_composition_time_offset > 0 && (trun.samples_table[i].sample_composition_time_offset /= 1e3), 
            trun.samples_table[i].sample_duration > 0 && (trun.samples_table[i].sample_duration /= 1e3);
        }
        var sp = new mp4lib.fieldProcessors.SerializationBoxFieldsProcessor(fragment, new_data, 0);
        return fragment._processFields(sp), {
            bytes: new_data,
            segmentsUpdated: segmentsUpdated
        };
    }, rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.FragmentController);
    return rslt.manifestModel = void 0, rslt.mp4Processor = void 0, rslt.process = function(bytes, request, representations) {
        var result = null, manifest = this.manifestModel.getValue();
        if (null !== bytes && void 0 !== bytes && bytes.byteLength > 0 && (result = new Uint8Array(bytes)), 
        request && "Media Segment" === request.type && representations && representations.length > 0) {
            var adaptation = manifest.Period_asArray[representations[0].adaptation.period.index].AdaptationSet_asArray[representations[0].adaptation.index], res = convertFragment(result, request, adaptation);
            if (result = res.bytes, res.segmentsUpdated === !0) for (var i = 0; i < representations.length; i++) representations[i].segments = null;
        }
        if (void 0 === request && navigator.userAgent.indexOf("Chrome") >= 0 && "dynamic" === manifest.type) {
            var init_segment = new mp4lib.boxes.File(), processor = new mp4lib.fieldProcessors.DeserializationBoxFieldsProcessor(init_segment, result, 0, result.length);
            init_segment._processFields(processor);
            var sp = new mp4lib.fieldProcessors.SerializationBoxFieldsProcessor(init_segment, result, 0);
            init_segment._processFields(sp);
        }
        return Q.when(result);
    }, rslt;
}, Mss.dependencies.MssFragmentController.prototype = {
    constructor: Mss.dependencies.MssFragmentController
}, Mss.dependencies.MssHandler = function() {
    var isDynamic = !1, getAudioChannels = function(adaptation, representation) {
        var channels = 1;
        return adaptation.AudioChannelConfiguration ? channels = adaptation.AudioChannelConfiguration.value : representation.AudioChannelConfiguration && (channels = representation.AudioChannelConfiguration.value), 
        channels;
    }, getAudioSamplingRate = function(adaptation, representation) {
        var samplingRate = 1;
        return samplingRate = adaptation.audioSamplingRate ? adaptation.audioSamplingRate : representation.audioSamplingRate;
    }, getInitData = function(representation) {
        if (representation) {
            if (!representation.initData) {
                var manifest = rslt.manifestModel.getValue(), adaptation = representation.adaptation, realAdaptation = manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index], realRepresentation = realAdaptation.Representation_asArray[representation.index], media = {};
                media.type = rslt.getType() || "und", media.trackId = adaptation.index + 1, media.timescale = representation.timescale, 
                media.duration = representation.adaptation.period.duration, media.codecs = realRepresentation.codecs, 
                media.codecPrivateData = realRepresentation.codecPrivateData, media.bandwidth = realRepresentation.bandwidth, 
                void 0 != realAdaptation.ContentProtection && (media.contentProtection = realAdaptation.ContentProtection), 
                media.width = realRepresentation.width || realAdaptation.maxWidth, media.height = realRepresentation.height || realAdaptation.maxHeight, 
                media.language = realAdaptation.lang ? realAdaptation.lang : "und", media.channels = getAudioChannels(realAdaptation, realRepresentation), 
                media.samplingRate = getAudioSamplingRate(realAdaptation, realRepresentation), representation.initData = rslt.mp4Processor.generateInitSegment(media);
            }
            return representation.initData;
        }
        return null;
    }, period = null, presentationStartTime = null, request = null, rslt = Custom.utils.copyMethods(Dash.dependencies.DashHandler);
    return rslt.mp4Processor = void 0, rslt.getInitRequest = function(representation) {
        var deferred = Q.defer();
        period = representation.adaptation.period, presentationStartTime = period.start;
        var manifest = rslt.manifestModel.getValue();
        return isDynamic = rslt.manifestExt.getIsDynamic(manifest), request = new MediaPlayer.vo.SegmentRequest(), 
        request.streamType = rslt.getType(), request.type = "Initialization Segment", request.url = null, 
        request.data = getInitData(representation), request.range = representation.range, 
        request.availabilityStartTime = this.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic), 
        request.availabilityEndTime = this.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic), 
        request.quality = representation.index, deferred.resolve(request), deferred.promise;
    }, rslt;
}, Mss.dependencies.MssHandler.prototype = {
    constructor: Mss.dependencies.MssHandler
}, Mss.dependencies.MssParser = function() {
    "use strict";
    var TIME_SCALE_100_NANOSECOND_UNIT = 1e7, numericRegex = /^[-+]?[0-9]+[.]?[0-9]*([eE][-+]?[0-9]+)?$/, hexadecimalRegex = /^0[xX][A-Fa-f0-9]+$/, matchers = [ {
        type: "numeric",
        test: function(str) {
            return numericRegex.test(str);
        },
        converter: function(str) {
            return parseFloat(str);
        }
    }, {
        type: "hexadecimal",
        test: function(str) {
            return hexadecimalRegex.test(str);
        },
        converter: function(str) {
            return str.substr(2);
        }
    } ], mimeTypeMap = {
        video: "video/mp4",
        audio: "audio/mp4",
        text: "text/mp4"
    }, getCommonValuesMap = function() {
        var adaptationSet, representation, common;
        return common = [ {
            name: "profiles",
            merge: !1
        }, {
            name: "width",
            merge: !1
        }, {
            name: "height",
            merge: !1
        }, {
            name: "sar",
            merge: !1
        }, {
            name: "frameRate",
            merge: !1
        }, {
            name: "audioSamplingRate",
            merge: !1
        }, {
            name: "mimeType",
            merge: !1
        }, {
            name: "segmentProfiles",
            merge: !1
        }, {
            name: "codecs",
            merge: !1
        }, {
            name: "maximumSAPPeriod",
            merge: !1
        }, {
            name: "startsWithSap",
            merge: !1
        }, {
            name: "maxPlayoutRate",
            merge: !1
        }, {
            name: "codingDependency",
            merge: !1
        }, {
            name: "scanType",
            merge: !1
        }, {
            name: "FramePacking",
            merge: !0
        }, {
            name: "AudioChannelConfiguration",
            merge: !0
        }, {
            name: "ContentProtection",
            merge: !0
        } ], adaptationSet = {}, adaptationSet.name = "AdaptationSet", adaptationSet.isRoot = !1, 
        adaptationSet.isArray = !0, adaptationSet.parent = null, adaptationSet.children = [], 
        adaptationSet.properties = common, representation = {}, representation.name = "Representation", 
        representation.isRoot = !1, representation.isArray = !0, representation.parent = adaptationSet, 
        representation.children = [], representation.properties = common, adaptationSet.children.push(representation), 
        adaptationSet;
    }, getSegmentValuesMap = function() {
        var period, adaptationSet, representation, common;
        return common = [ {
            name: "SegmentBase",
            merge: !0
        }, {
            name: "SegmentTemplate",
            merge: !0
        }, {
            name: "SegmentList",
            merge: !0
        } ], period = {}, period.name = "Period", period.isRoot = !1, period.isArray = !1, 
        period.parent = null, period.children = [], period.properties = common, adaptationSet = {}, 
        adaptationSet.name = "AdaptationSet", adaptationSet.isRoot = !1, adaptationSet.isArray = !0, 
        adaptationSet.parent = period, adaptationSet.children = [], adaptationSet.properties = common, 
        period.children.push(adaptationSet), representation = {}, representation.name = "Representation", 
        representation.isRoot = !1, representation.isArray = !0, representation.parent = adaptationSet, 
        representation.children = [], representation.properties = common, adaptationSet.children.push(representation), 
        period;
    }, getBaseUrlValuesMap = function() {
        var mpd, period, adaptationSet, contentProtection, representation, segmentTemplate, segmentTimeline, audioChannelConfiguration, segment, common;
        return common = [ {
            name: "BaseURL",
            merge: !0,
            mergeFunction: function(parentValue, childValue) {
                var mergedValue;
                return mergedValue = 0 === childValue.indexOf("http://") ? childValue : parentValue + childValue;
            }
        } ], mpd = {}, mpd.name = "mpd", mpd.isRoot = !0, mpd.isArray = !0, mpd.parent = null, 
        mpd.children = [], mpd.properties = common, mpd.transformFunc = function(node) {
            var duration = 0 === node.Duration ? 1/0 : node.Duration;
            return this.isTransformed ? node : (this.isTransformed = !0, void 0 !== node.Protection ? {
                profiles: "urn:mpeg:dash:profile:isoff-live:2011",
                type: node.IsLive ? "dynamic" : "static",
                timeShiftBufferDepth: parseFloat(node.DVRWindowLength) / TIME_SCALE_100_NANOSECOND_UNIT,
                mediaPresentationDuration: parseFloat(duration) / TIME_SCALE_100_NANOSECOND_UNIT,
                BaseURL: node.BaseURL,
                Period: node,
                Period_asArray: [ node ],
                minBufferTime: 10,
                ContentProtection: node.Protection.ProtectionHeader,
                ContentProtection_asArray: node.Protection_asArray
            } : {
                profiles: "urn:mpeg:dash:profile:isoff-live:2011",
                type: node.IsLive ? "dynamic" : "static",
                timeShiftBufferDepth: parseFloat(node.DVRWindowLength) / TIME_SCALE_100_NANOSECOND_UNIT,
                mediaPresentationDuration: parseFloat(duration) / TIME_SCALE_100_NANOSECOND_UNIT,
                BaseURL: node.BaseURL,
                Period: node,
                Period_asArray: [ node ],
                minBufferTime: 10
            });
        }, mpd.isTransformed = !1, contentProtection = {}, contentProtection.name = "ContentProtection", 
        contentProtection.parent = mpd, contentProtection.isRoot = !1, contentProtection.isArray = !1, 
        contentProtection.children = [], contentProtection.transformFunc = function(node) {
            return node.pro = {
                __text: node.__text,
                __prefix: "mspr"
            }, "{" == node.SystemID[0] && (node.SystemID = node.SystemID.substring(1, node.SystemID.length - 1)), 
            {
                schemeIdUri: "urn:uuid:" + node.SystemID,
                value: 2,
                pro: node.pro,
                pro_asArray: node.pro
            };
        }, mpd.children.push(contentProtection), period = {}, period.name = "Period", period.isRoot = !1, 
        period.isArray = !1, period.parent = null, period.children = [], period.properties = common, 
        period.transformFunc = function(node) {
            var duration = 0 === node.Duration ? 1/0 : node.Duration;
            return {
                duration: parseFloat(duration) / TIME_SCALE_100_NANOSECOND_UNIT,
                BaseURL: node.BaseURL,
                AdaptationSet: node.StreamIndex,
                AdaptationSet_asArray: node.StreamIndex_asArray
            };
        }, mpd.children.push(period), adaptationSet = {}, adaptationSet.name = "AdaptationSet", 
        adaptationSet.isRoot = !1, adaptationSet.isArray = !0, adaptationSet.parent = period, 
        adaptationSet.children = [], adaptationSet.properties = common, adaptationSet.transformFunc = function(node) {
            var adaptTransformed = {
                id: node.Name,
                lang: node.Language,
                contentType: node.Type,
                mimeType: mimeTypeMap[node.Type],
                maxWidth: node.MaxWidth,
                maxHeight: node.MaxHeight,
                BaseURL: node.BaseURL,
                Representation: node.QualityLevel,
                Representation_asArray: node.QualityLevel_asArray,
                SegmentTemplate: node,
                SegmentTemplate_asArray: [ node ]
            };
            "audio" === node.Type && (adaptTransformed.AudioChannelConfiguration = adaptTransformed, 
            adaptTransformed.Channels = node.QualityLevel && node.QualityLevel.Channels);
            for (var i = 0; i < adaptTransformed.Representation_asArray.length; i++) {
                var rep = adaptTransformed.Representation_asArray[i];
                rep.Id = adaptTransformed.id + "_" + rep.Index;
            }
            return adaptTransformed;
        }, period.children.push(adaptationSet), representation = {}, representation.name = "Representation", 
        representation.isRoot = !1, representation.isArray = !0, representation.parent = adaptationSet, 
        representation.children = [], representation.properties = common, representation.transformFunc = function(node) {
            var mimeType = "", avcoti = "";
            if ("H264" === node.FourCC || "AVC1" === node.FourCC) {
                mimeType = "avc1";
                var nalHeader = /00000001[0-9]7/.exec(node.CodecPrivateData);
                avcoti = nalHeader && nalHeader[0] ? node.CodecPrivateData.substr(node.CodecPrivateData.indexOf(nalHeader[0]) + 10, 6) : void 0;
            } else if (node.FourCC.indexOf("AAC") >= 0) {
                mimeType = "mp4a", avcoti = "40";
                var objectType = (248 & parseInt(node.CodecPrivateData.toString().substr(0, 2), 16)) >> 3;
                avcoti += "." + objectType;
            }
            var codecs = mimeType + "." + avcoti;
            return {
                id: node.Id,
                bandwidth: node.Bitrate,
                width: node.MaxWidth,
                height: node.MaxHeight,
                codecs: codecs,
                audioSamplingRate: node.SamplingRate,
                codecPrivateData: "" + node.CodecPrivateData,
                BaseURL: node.BaseURL
            };
        }, adaptationSet.children.push(representation), audioChannelConfiguration = {}, 
        audioChannelConfiguration.name = "AudioChannelConfiguration", audioChannelConfiguration.isRoot = !1, 
        audioChannelConfiguration.isArray = !1, audioChannelConfiguration.parent = adaptationSet, 
        audioChannelConfiguration.children = [], audioChannelConfiguration.properties = common, 
        audioChannelConfiguration.transformFunc = function(node) {
            return {
                schemeIdUri: "urn:mpeg:dash:23003:3:audio_channel_configuration:2011",
                value: node.Channels
            };
        }, adaptationSet.children.push(audioChannelConfiguration), segmentTemplate = {}, 
        segmentTemplate.name = "SegmentTemplate", segmentTemplate.isRoot = !1, segmentTemplate.isArray = !1, 
        segmentTemplate.parent = adaptationSet, segmentTemplate.children = [], segmentTemplate.properties = common, 
        segmentTemplate.transformFunc = function(node) {
            var mediaUrl = node.Url.replace("{bitrate}", "$Bandwidth$");
            return mediaUrl = mediaUrl.replace("{start time}", "$Time$"), {
                media: mediaUrl,
                timescale: TIME_SCALE_100_NANOSECOND_UNIT,
                SegmentTimeline: node
            };
        }, adaptationSet.children.push(segmentTemplate), segmentTimeline = {}, segmentTimeline.name = "SegmentTimeline", 
        segmentTimeline.isRoot = !1, segmentTimeline.isArray = !1, segmentTimeline.parent = segmentTemplate, 
        segmentTimeline.children = [], segmentTimeline.properties = common, segmentTimeline.transformFunc = function(node) {
            if (node.c_asArray.length > 1) {
                var groupedSegments = [], segments = node.c_asArray;
                segments[0].t = segments[0].t || 0, groupedSegments.push({
                    d: segments[0].d,
                    r: 0,
                    t: segments[0].t
                });
                for (var i = 1; i < segments.length; i++) segments[i].t = segments[i].t || segments[i - 1].t + segments[i - 1].d, 
                segments[i].d === segments[i - 1].d ? ++groupedSegments[groupedSegments.length - 1].r : groupedSegments.push({
                    d: segments[i].d,
                    r: 0,
                    t: segments[i].t
                });
                node.c_asArray = groupedSegments, node.c = groupedSegments;
            }
            return {
                S: node.c,
                S_asArray: node.c_asArray
            };
        }, segmentTemplate.children.push(segmentTimeline), segment = {}, segment.name = "S", 
        segment.isRoot = !1, segment.isArray = !0, segment.parent = segmentTimeline, segment.children = [], 
        segment.properties = common, segment.transformFunc = function(node) {
            return {
                d: node.d,
                r: node.r ? node.r : 0,
                t: node.t ? node.t : 0
            };
        }, segmentTimeline.children.push(segment), mpd;
    }, getDashMap = function() {
        var result = [];
        return result.push(getCommonValuesMap()), result.push(getSegmentValuesMap()), result.push(getBaseUrlValuesMap()), 
        result;
    }, processManifest = function(manifest) {
        var i, len, period = manifest.Period_asArray[0], adaptations = period.AdaptationSet_asArray;
        if ("dynamic" === manifest.type) {
            var mpdLoadedTime = new Date();
            manifest.availabilityStartTime = new Date(mpdLoadedTime.getTime() - 1e3 * manifest.timeShiftBufferDepth);
        }
        for (period.start = 0, i = 0, len = adaptations.length; len > i; i += 1) void 0 !== manifest.ContentProtection && (manifest.Period.AdaptationSet[i].ContentProtection = manifest.ContentProtection, 
        manifest.Period.AdaptationSet[i].ContentProtection_asArray = manifest.ContentProtection_asArray);
        delete manifest.ContentProtection, delete manifest.ContentProtection_asArray;
    }, internalParse = function(data, baseUrl) {
        var manifest = null, converter = new X2JS(matchers, "", !0), iron = new Custom.utils.ObjectIron(getDashMap());
        return data = data.replace(/CodecPrivateData="/g, 'CodecPrivateData="0x'), manifest = converter.xml_str2json(data), 
        null === manifest ? (this.debug.error("[MssParser]", "Failed to parse manifest!!"), 
        Q.when(null)) : (manifest.hasOwnProperty("BaseURL") ? (manifest.BaseURL = manifest.BaseURL_asArray && manifest.BaseURL_asArray[0] || manifest.BaseURL, 
        0 !== manifest.BaseURL.indexOf("http") && (manifest.BaseURL = baseUrl + manifest.BaseURL)) : manifest.BaseURL = baseUrl, 
        manifest = iron.run(manifest), processManifest.call(this, manifest), Q.when(manifest));
    };
    return {
        debug: void 0,
        parse: internalParse
    };
}, Mss.dependencies.MssParser.prototype = {
    constructor: Mss.dependencies.MssParser
}, MediaPlayer.dependencies.AbrController = function() {
    "use strict";
    var autoSwitchBitrate = !0, qualityDict = {}, confidenceDict = {}, getInternalQuality = function(type) {
        var quality;
        return qualityDict.hasOwnProperty(type) || (qualityDict[type] = 0), quality = qualityDict[type];
    }, setInternalQuality = function(type, value) {
        qualityDict[type] = value;
    }, getInternalConfidence = function(type) {
        var confidence;
        return confidenceDict.hasOwnProperty(type) || (confidenceDict[type] = 0), confidence = confidenceDict[type];
    }, setInternalConfidence = function(type, value) {
        confidenceDict[type] = value;
    };
    return {
        debug: void 0,
        abrRulesCollection: void 0,
        manifestExt: void 0,
        metricsModel: void 0,
        getAutoSwitchBitrate: function() {
            return autoSwitchBitrate;
        },
        setAutoSwitchBitrate: function(value) {
            autoSwitchBitrate = value;
        },
        getMetricsFor: function(data) {
            var deferred = Q.defer(), self = this;
            return self.manifestExt.getIsVideo(data).then(function(isVideo) {
                isVideo ? deferred.resolve(self.metricsModel.getMetricsFor("video")) : self.manifestExt.getIsAudio(data).then(function(isAudio) {
                    deferred.resolve(isAudio ? self.metricsModel.getMetricsFor("audio") : self.metricsModel.getMetricsFor("stream"));
                });
            }), deferred.promise;
        },
        getPlaybackQuality: function(type, data) {
            var i, len, req, values, quality, confidence, self = this, deferred = Q.defer(), newQuality = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, newConfidence = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, funcs = [];
            return quality = getInternalQuality(type), confidence = getInternalConfidence(type), 
            autoSwitchBitrate ? self.getMetricsFor(data).then(function(metrics) {
                self.abrRulesCollection.getRules().then(function(rules) {
                    for (i = 0, len = rules.length; len > i; i += 1) funcs.push(rules[i].checkIndex(quality, metrics, data));
                    Q.all(funcs).then(function(results) {
                        for (values = {}, values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, 
                        values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, 
                        values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, 
                        i = 0, len = results.length; len > i; i += 1) req = results[i], req.quality !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && (values[req.priority] = Math.min(values[req.priority], req.quality));
                        values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && (newConfidence = MediaPlayer.rules.SwitchRequest.prototype.WEAK, 
                        newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.WEAK]), values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && (newConfidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT, 
                        newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT]), values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && (newConfidence = MediaPlayer.rules.SwitchRequest.prototype.STRONG, 
                        newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.STRONG]), newQuality !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && void 0 !== newQuality && (quality = newQuality), 
                        newConfidence !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && void 0 !== newConfidence && (confidence = newConfidence), 
                        self.manifestExt.getRepresentationCount(data).then(function(max) {
                            0 > quality && (quality = 0), quality >= max && (quality = max - 1), confidence != MediaPlayer.rules.SwitchRequest.prototype.STRONG && confidence != MediaPlayer.rules.SwitchRequest.prototype.WEAK && (confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT), 
                            setInternalQuality(type, quality), setInternalConfidence(type, confidence), deferred.resolve({
                                quality: quality,
                                confidence: confidence
                            });
                        });
                    });
                });
            }) : deferred.resolve({
                quality: quality,
                confidence: confidence
            }), deferred.promise;
        },
        setPlaybackQuality: function(type, newPlaybackQuality) {
            var quality = getInternalQuality(type);
            newPlaybackQuality !== quality && setInternalQuality(type, newPlaybackQuality);
        },
        getQualityFor: function(type) {
            return getInternalQuality(type);
        }
    };
}, MediaPlayer.dependencies.AbrController.prototype = {
    constructor: MediaPlayer.dependencies.AbrController
}, MediaPlayer.dependencies.BufferController = function() {
    "use strict";
    var availableRepresentations, currentRepresentation, playingTime, mediaSource, deferredLiveEdge, type, minBufferTime, STALL_THRESHOLD = .5, QUOTA_EXCEEDED_ERROR_CODE = 22, WAITING = "WAITING", READY = "READY", VALIDATING = "VALIDATING", LOADING = "LOADING", state = WAITING, ready = !1, started = !1, waitingForBuffer = !1, initialPlayback = !0, initializationData = [], seeking = !1, seekTarget = -1, dataChanged = !0, lastQuality = -1, stalled = !1, isDynamic = !1, isBufferingCompleted = !1, deferredAppends = [], deferredInitAppend = null, deferredStreamComplete = Q.defer(), deferredRejectedDataAppend = null, deferredBuffersFlatten = null, periodInfo = null, fragmentsToLoad = 0, fragmentModel = null, bufferLevel = 0, isQuotaExceeded = !1, rejectedBytes = null, fragmentDuration = 0, rejectTime = null, liveEdgeSearchRange = null, liveEdgeInitialSearchPosition = null, liveEdgeSearchStep = null, useBinarySearch = !1, data = null, buffer = null, playListMetrics = null, playListTraceMetrics = null, playListTraceMetricsClosed = !0, setState = function(value) {
        var self = this;
        state = value, null !== fragmentModel && self.fragmentController.onBufferControllerStateChange();
    }, clearPlayListTraceMetrics = function(endTime, stopreason) {
        var duration = 0, startTime = null;
        playListTraceMetricsClosed === !1 && (startTime = playListTraceMetrics.start, duration = endTime.getTime() - startTime.getTime(), 
        playListTraceMetrics.duration = duration, playListTraceMetrics.stopreason = stopreason, 
        playListTraceMetricsClosed = !0);
    }, startPlayback = function() {
        ready && started && (setState.call(this, READY), this.requestScheduler.startScheduling(this, validate), 
        fragmentModel = this.fragmentController.attachBufferController(this));
    }, doStart = function() {
        var currentTime;
        this.requestScheduler.isScheduled(this) || (seeking === !1 && (currentTime = new Date(), 
        clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON), 
        playListMetrics = this.metricsModel.addPlayList(type, currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON)), 
        started = !0, waitingForBuffer = !0, startPlayback.call(this));
    }, doSeek = function(time) {
        var currentTime;
        seeking = !0, seekTarget = time, currentTime = new Date(), clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON), 
        playListMetrics = this.metricsModel.addPlayList(type, currentTime, seekTarget, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON), 
        doStart.call(this);
    }, doStop = function() {
        state !== WAITING && (setState.call(this, WAITING), this.requestScheduler.stopScheduling(this), 
        this.fragmentController.cancelPendingRequestsForModel(fragmentModel), started = !1, 
        waitingForBuffer = !1, clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON));
    }, updateRepresentations = function(data, periodInfo) {
        var self = this, deferred = Q.defer(), manifest = self.manifestModel.getValue();
        return self.manifestExt.getDataIndex(data, manifest, periodInfo.index).then(function(idx) {
            self.manifestExt.getAdaptationsForPeriod(manifest, periodInfo).then(function(adaptations) {
                self.manifestExt.getRepresentationsForAdaptation(manifest, adaptations[idx]).then(function(representations) {
                    deferred.resolve(representations);
                });
            });
        }), deferred.promise;
    }, getRepresentationForQuality = function(quality) {
        return availableRepresentations[quality];
    }, finishValidation = function() {
        var self = this;
        state === LOADING && (stalled && (stalled = !1, this.videoModel.stallStream(type, stalled)), 
        setState.call(self, READY));
    }, onBytesLoadingStart = function(request) {
        if (this.fragmentController.isInitializationRequest(request)) setState.call(this, READY); else {
            setState.call(this, LOADING);
            var self = this, time = self.fragmentController.getLoadingTime(self);
            setTimeout(function() {
                (data || buffer) && (setState.call(self, READY), requestNewFragment.call(self));
            }, time);
        }
    }, onBytesLoaded = function(request, response) {
        this.fragmentController.isInitializationRequest(request) ? onInitializationLoaded.call(this, request, response) : onMediaLoaded.call(this, request, response);
    }, onMediaLoaded = function(request, response) {
        var self = this;
        fragmentDuration || isNaN(request.duration) || (fragmentDuration = request.duration), 
        self.fragmentController.process(response.data, request, availableRepresentations).then(function(data) {
            if (null !== data && null !== deferredInitAppend) {
                if (request.quality !== lastQuality) return void self.fragmentController.removeExecutedRequest(fragmentModel, request);
                Q.when(deferredInitAppend.promise).then(function() {
                    appendToBuffer.call(self, data, request.quality).then(function() {
                        deferredStreamComplete.promise.then(function(lastRequest) {
                            lastRequest.index - 1 !== request.index || isBufferingCompleted || (isBufferingCompleted = !0, 
                            setState.call(self, READY), self.system.notify("bufferingCompleted"));
                        });
                    });
                });
            }
        });
    }, appendToBuffer = function(data, quality) {
        var self = this, isAppendingRejectedData = data == rejectedBytes, deferred = isAppendingRejectedData ? deferredRejectedDataAppend : Q.defer(), ln = isAppendingRejectedData ? deferredAppends.length : deferredAppends.push(deferred), idx = deferredAppends.indexOf(deferred), currentVideoTime = self.videoModel.getCurrentTime(), currentTime = new Date();
        return playListTraceMetricsClosed === !0 && state !== WAITING && -1 !== lastQuality && (playListTraceMetricsClosed = !1, 
        playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, currentRepresentation.id, null, currentTime, currentVideoTime, null, 1, null)), 
        Q.when(isAppendingRejectedData || 2 > ln || deferredAppends[ln - 2].promise).then(function() {
            buffer && clearBuffer.call(self).then(function() {
                return quality !== lastQuality ? (deferred.resolve(), void (isAppendingRejectedData && (deferredRejectedDataAppend = null, 
                rejectedBytes = null))) : void Q.when(deferredBuffersFlatten ? deferredBuffersFlatten.promise : !0).then(function() {
                    self.sourceBufferExt.append(buffer, data, self.videoModel).then(function() {
                        isAppendingRejectedData && (deferredRejectedDataAppend = null, rejectedBytes = null), 
                        state === WAITING && idx + 1 === deferredAppends.length && doStart.call(self), isQuotaExceeded = !1;
                        var updateBuffer = function() {
                            updateBufferLevel.call(self).then(function() {
                                deferred.resolve();
                            });
                        };
                        isDynamic ? self.sourceBufferExt.remove(buffer, 0, self.videoModel.getCurrentTime() - 4, periodInfo.duration, mediaSource).then(function() {
                            updateBuffer();
                        }) : updateBuffer(), buffer && self.sourceBufferExt.getAllRanges(buffer).then(function(ranges) {
                            if (ranges && ranges.length > 0) {
                                var i, len;
                                for (i = 0, len = ranges.length; len > i; i += 1) ;
                            }
                        });
                    }, function(result) {
                        result.err.code === QUOTA_EXCEEDED_ERROR_CODE && (rejectedBytes = data, deferredRejectedDataAppend = deferred, 
                        isQuotaExceeded = !0, rejectTime = self.videoModel.getCurrentTime(), fragmentsToLoad = 0, 
                        doStop.call(self));
                    });
                });
            });
        }), deferred.promise;
    }, updateBufferLevel = function() {
        if (!data && !buffer) return Q.when(!1);
        var self = this, deferred = Q.defer(), currentTime = getWorkingTime.call(self);
        return self.sourceBufferExt.getBufferLength(buffer, currentTime).then(function(bufferLength) {
            bufferLevel = bufferLength, self.metricsModel.addBufferLevel(type, new Date(), bufferLevel), 
            checkGapBetweenBuffers.call(self), checkIfSufficientBuffer.call(self), deferred.resolve();
        }), deferred.promise;
    }, checkGapBetweenBuffers = function() {
        var leastLevel = this.bufferExt.getLeastBufferLevel(), acceptableGap = 2 * fragmentDuration, actualGap = bufferLevel - leastLevel;
        actualGap > acceptableGap && !deferredBuffersFlatten ? (fragmentsToLoad = 0, deferredBuffersFlatten = Q.defer()) : acceptableGap > actualGap && deferredBuffersFlatten && (deferredBuffersFlatten.resolve(), 
        deferredBuffersFlatten = null);
    }, clearBuffer = function() {
        var removeEnd, req, self = this, deferred = Q.defer(), currentTime = self.videoModel.getCurrentTime(), removeStart = 0;
        return isQuotaExceeded ? (req = self.fragmentController.getExecutedRequestForTime(fragmentModel, currentTime), 
        removeEnd = req && !isNaN(req.startTime) ? req.startTime : Math.floor(currentTime), 
        fragmentDuration = req && !isNaN(req.duration) ? req.duration : 1, self.sourceBufferExt.getBufferRange(buffer, currentTime).then(function(range) {
            null === range && seekTarget === currentTime && buffer.buffered.length > 0 && (removeEnd = buffer.buffered.end(buffer.buffered.length - 1)), 
            self.sourceBufferExt.remove(buffer, removeStart, removeEnd, periodInfo.duration, mediaSource).then(function() {
                self.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, removeEnd), 
                deferred.resolve();
            });
        }), deferred.promise) : Q.when(!0);
    }, onInitializationLoaded = function(request, response) {
        var self = this, initData = response.data, quality = request.quality;
        self.fragmentController.process(initData).then(function(data) {
            null !== data && (initializationData[quality] = data, quality === lastQuality && appendToBuffer.call(self, data, request.quality).then(function() {
                deferredInitAppend.resolve();
            }));
        });
    }, onBytesError = function() {
        state === LOADING && setState.call(this, READY), this.system.notify("segmentLoadingFailed");
    }, searchForLiveEdge = function() {
        var self = this, availabilityRange = currentRepresentation.segmentAvailabilityRange, searchTimeSpan = 43200;
        return liveEdgeInitialSearchPosition = availabilityRange.end, liveEdgeSearchRange = {
            start: Math.max(0, liveEdgeInitialSearchPosition - searchTimeSpan),
            end: liveEdgeInitialSearchPosition + searchTimeSpan
        }, liveEdgeSearchStep = Math.floor((availabilityRange.end - availabilityRange.start) / 2), 
        self.indexHandler.getSegmentRequestForTime(currentRepresentation, liveEdgeInitialSearchPosition).then(findLiveEdge.bind(self, liveEdgeInitialSearchPosition)), 
        deferredLiveEdge = Q.defer(), deferredLiveEdge.promise;
    }, findLiveEdge = function(searchTime, request) {
        var self = this;
        null === request ? (currentRepresentation.segments = null, currentRepresentation.segmentAvailabilityRange = {
            start: searchTime - liveEdgeSearchStep,
            end: searchTime + liveEdgeSearchStep
        }, self.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(self, searchTime))) : self.fragmentController.isFragmentExists(request).then(function(isExist) {
            isExist ? onSearchForSegmentSucceeded.call(self, request) : onSearchForSegmentFailed.call(self, request);
        });
    }, onSearchForSegmentFailed = function(request) {
        var searchTime, searchInterval, startTime = request.startTime;
        return useBinarySearch ? void binarySearch.call(this, !1, startTime) : (searchInterval = startTime - liveEdgeInitialSearchPosition, 
        searchTime = searchInterval > 0 ? liveEdgeInitialSearchPosition - searchInterval : liveEdgeInitialSearchPosition + Math.abs(searchInterval) + liveEdgeSearchStep, 
        void (searchTime < liveEdgeSearchRange.start && searchTime > liveEdgeSearchRange.end ? this.system.notify("segmentLoadingFailed") : (setState.call(this, READY), 
        this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(this, searchTime)))));
    }, onSearchForSegmentSucceeded = function(request) {
        var startTime = request.startTime;
        if (!useBinarySearch) {
            if (0 === fragmentDuration) return void deferredLiveEdge.resolve(startTime);
            useBinarySearch = !0, liveEdgeSearchRange.end = startTime + 2 * liveEdgeSearchStep;
        }
        binarySearch.call(this, !0, startTime);
    }, binarySearch = function(lastSearchSucceeded, lastSearchTime) {
        var isSearchCompleted, searchTime;
        lastSearchSucceeded ? liveEdgeSearchRange.start = lastSearchTime : liveEdgeSearchRange.end = lastSearchTime, 
        isSearchCompleted = Math.floor(liveEdgeSearchRange.end - liveEdgeSearchRange.start) <= fragmentDuration, 
        isSearchCompleted ? deferredLiveEdge.resolve(lastSearchSucceeded ? lastSearchTime : lastSearchTime - fragmentDuration) : (searchTime = (liveEdgeSearchRange.start + liveEdgeSearchRange.end) / 2, 
        this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(this, searchTime)));
    }, signalStreamComplete = function(request) {
        clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON), 
        doStop.call(this), deferredStreamComplete.resolve(request);
    }, loadInitialization = function(qualityChanged, currentQuality) {
        var quality, initializationPromise = null, topQuality = this.bufferExt.getTopQualityIndex(type), funcs = [];
        if (initialPlayback && (seeking || (seeking = !0, seekTarget = 0), initialPlayback = !1), 
        dataChanged) {
            for (deferredInitAppend = Q.defer(), initializationData = [], quality = 0; topQuality >= quality; quality += 1) funcs.push(this.indexHandler.getInitRequest(availableRepresentations[quality]));
            lastQuality = currentQuality, initializationPromise = Q.all(funcs);
        } else initializationPromise = Q.when(null), qualityChanged && (deferredInitAppend = Q.defer(), 
        lastQuality = currentQuality, initializationData[currentQuality] && appendToBuffer.call(this, initializationData[currentQuality], currentQuality).then(function() {
            deferredInitAppend.resolve();
        }));
        return initializationPromise;
    }, loadNextFragment = function() {
        var promise, self = this;
        if (dataChanged && !seeking) promise = self.indexHandler.getSegmentRequestForTime(currentRepresentation, playingTime); else {
            var deferred = Q.defer(), segmentTime = self.videoModel.getCurrentTime();
            promise = deferred.promise, self.sourceBufferExt.getBufferRange(buffer, segmentTime).then(function(range) {
                return Q.when(seeking ? seekTarget : self.indexHandler.getCurrentTime(currentRepresentation)).then(function(time) {
                    segmentTime = time, seeking = !1, null !== range && (segmentTime = range.end), self.indexHandler.getSegmentRequestForTime(currentRepresentation, segmentTime).then(function(request) {
                        deferred.resolve(request);
                    }, function() {
                        deferred.reject();
                    });
                }, function() {
                    deferred.reject();
                });
            }, function() {
                deferred.reject();
            });
        }
        return promise;
    }, onFragmentRequest = function(request) {
        var self = this;
        null !== request ? self.fragmentController.isFragmentLoadedOrPending(self, request) ? "complete" !== request.action ? self.indexHandler.getNextSegmentRequest(currentRepresentation).then(onFragmentRequest.bind(self)) : (doStop.call(self), 
        setState.call(self, READY)) : Q.when(deferredBuffersFlatten ? deferredBuffersFlatten.promise : !0).then(function() {
            self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, signalStreamComplete).then(function() {
                setState.call(self, READY);
            });
        }) : setState.call(self, READY);
    }, checkIfSufficientBuffer = function() {
        waitingForBuffer && (minBufferTime > bufferLevel ? stalled || (stalled = !0, this.videoModel.stallStream(type, stalled)) : (waitingForBuffer = !1, 
        stalled = !1, this.videoModel.stallStream(type, stalled)));
    }, getWorkingTime = function() {
        var time = -1;
        return time = this.videoModel.getCurrentTime();
    }, getRequiredFragmentCount = function() {
        var self = this, playbackRate = self.videoModel.getPlaybackRate(), actualBufferedDuration = bufferLevel / Math.max(playbackRate, 1), deferred = Q.defer();
        return self.bufferExt.getRequiredBufferLength(waitingForBuffer, self.requestScheduler.getExecuteInterval(self) / 1e3, isDynamic, periodInfo.duration).then(function(requiredBufferLength) {
            self.indexHandler.getSegmentCountForDuration(currentRepresentation, requiredBufferLength, actualBufferedDuration).then(function(count) {
                deferred.resolve(count);
            });
        }), deferred.promise;
    }, requestNewFragment = function() {
        var self = this, pendingRequests = self.fragmentController.getPendingRequests(self), loadingRequests = self.fragmentController.getLoadingRequests(self), ln = (pendingRequests ? pendingRequests.length : 0) + (loadingRequests ? loadingRequests.length : 0);
        fragmentsToLoad - ln > 0 ? (fragmentsToLoad--, loadNextFragment.call(self).then(onFragmentRequest.bind(self))) : (state === VALIDATING && setState.call(self, READY), 
        finishValidation.call(self));
    }, validate = function() {
        {
            var newQuality, self = this, qualityChanged = !1, now = new Date(), currentVideoTime = self.videoModel.getCurrentTime();
            getWorkingTime.call(self);
        }
        if (checkIfSufficientBuffer.call(self), state === LOADING && STALL_THRESHOLD > bufferLevel) stalled || (clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON), 
        stalled = !0, waitingForBuffer = !0, self.videoModel.stallStream(type, stalled)); else if (state === READY) {
            setState.call(self, VALIDATING);
            var manifestMinBufferTime = self.manifestModel.getValue().minBufferTime;
            self.bufferExt.decideBufferLength(manifestMinBufferTime, periodInfo.duration, waitingForBuffer).then(function(time) {
                self.setMinBufferTime(time), self.requestScheduler.adjustExecuteInterval();
            }), self.abrController.getPlaybackQuality(type, data).then(function(result) {
                var quality = result.quality;
                if (void 0 !== quality && (newQuality = quality), qualityChanged = quality !== lastQuality, 
                qualityChanged === !0) {
                    if (self.fragmentController.abortRequestsForModel(fragmentModel), currentRepresentation = getRepresentationForQuality.call(self, newQuality), 
                    null === currentRepresentation || void 0 === currentRepresentation) throw "Unexpected error!";
                    buffer.timestampOffset !== currentRepresentation.MSETimeOffset && (buffer.timestampOffset = currentRepresentation.MSETimeOffset), 
                    clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON), 
                    self.metricsModel.addRepresentationSwitch(type, now, currentVideoTime, currentRepresentation.id);
                }
                return getRequiredFragmentCount.call(self, quality);
            }).then(function(count) {
                fragmentsToLoad = count, loadInitialization.call(self, qualityChanged, newQuality).then(function(initializationRequests) {
                    if (null !== initializationRequests) {
                        var request, i, ln = initializationRequests.length;
                        for (i = 0; ln > i; i += 1) request = initializationRequests[i], self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, signalStreamComplete).then(function() {
                            setState.call(self, READY);
                        });
                        dataChanged = !1;
                    }
                }), requestNewFragment.call(self);
            });
        } else state === VALIDATING && setState.call(self, READY);
    };
    return {
        videoModel: void 0,
        metricsModel: void 0,
        manifestExt: void 0,
        manifestModel: void 0,
        bufferExt: void 0,
        sourceBufferExt: void 0,
        abrController: void 0,
        fragmentExt: void 0,
        indexHandler: void 0,
        debug: void 0,
        system: void 0,
        errHandler: void 0,
        initialize: function(type, periodInfo, data, buffer, videoModel, scheduler, fragmentController, source) {
            var self = this, manifest = self.manifestModel.getValue();
            isDynamic = self.manifestExt.getIsDynamic(manifest), self.setMediaSource(source), 
            self.setVideoModel(videoModel), self.setType(type), self.updateData(data, periodInfo).then(function() {
                return isDynamic ? void ("video" === self.getData().contentType ? searchForLiveEdge.call(self).then(function(liveEdgeTime) {
                    periodInfo.liveEdge = liveEdgeTime - minBufferTime, ready = !0, self.system.notify("liveEdgeFound");
                }) : ready = !0) : (ready = !0, void startPlayback.call(self));
            }), self.setBuffer(buffer), self.setScheduler(scheduler), self.setFragmentController(fragmentController), 
            self.indexHandler.setIsDynamic(isDynamic), self.bufferExt.decideBufferLength(manifest.minBufferTime, periodInfo, waitingForBuffer).then(function(time) {
                self.setMinBufferTime(time);
            });
        },
        getType: function() {
            return type;
        },
        setType: function(value) {
            type = value, void 0 !== this.indexHandler && this.indexHandler.setType(value);
        },
        getPeriodInfo: function() {
            return periodInfo;
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        getScheduler: function() {
            return this.requestScheduler;
        },
        setScheduler: function(value) {
            this.requestScheduler = value;
        },
        getFragmentController: function() {
            return this.fragmentController;
        },
        setFragmentController: function(value) {
            this.fragmentController = value;
        },
        getAutoSwitchBitrate: function() {
            var self = this;
            return self.abrController.getAutoSwitchBitrate();
        },
        setAutoSwitchBitrate: function(value) {
            var self = this;
            self.abrController.setAutoSwitchBitrate(value);
        },
        getData: function() {
            return data;
        },
        updateData: function(dataValue, periodInfoValue, currentTime) {
            var self = this, deferred = Q.defer(), from = data;
            return from || (from = dataValue), doStop.call(self), updateRepresentations.call(self, dataValue, periodInfoValue).then(function(representations) {
                availableRepresentations = representations, periodInfo = periodInfoValue, self.abrController.getPlaybackQuality(type, from).then(function(result) {
                    currentRepresentation || (currentRepresentation = getRepresentationForQuality.call(self, result.quality));
                    var restart = function(time) {
                        dataChanged = !0, playingTime = time, currentRepresentation = getRepresentationForQuality.call(self, result.quality), 
                        currentRepresentation.segmentDuration && (fragmentDuration = currentRepresentation.segmentDuration), 
                        data = dataValue, self.seek(time), self.bufferExt.updateData(data, type), startPlayback.call(self), 
                        deferred.resolve();
                    };
                    currentTime ? restart(currentTime) : self.indexHandler.getCurrentTime(currentRepresentation).then(restart);
                });
            }), deferred.promise;
        },
        getBuffer: function() {
            return buffer;
        },
        setBuffer: function(value) {
            buffer = value;
        },
        getMinBufferTime: function() {
            return minBufferTime;
        },
        setMinBufferTime: function(value) {
            minBufferTime = value;
        },
        setMediaSource: function(value) {
            mediaSource = value;
        },
        isReady: function() {
            return state === READY;
        },
        isBufferingCompleted: function() {
            return isBufferingCompleted;
        },
        clearMetrics: function() {
            var self = this;
            null !== type && "" !== type && self.metricsModel.clearCurrentMetricsForType(type);
        },
        updateBufferState: function() {
            var self = this, currentTime = self.videoModel.getCurrentTime();
            isQuotaExceeded && rejectedBytes && Math.abs(currentTime - (seeking ? seekTarget : rejectTime)) > fragmentDuration ? (rejectTime = self.videoModel.getCurrentTime(), 
            appendToBuffer.call(self, rejectedBytes)) : updateBufferLevel.call(self);
        },
        updateStalledState: function() {
            stalled = this.videoModel.isStalled(), checkIfSufficientBuffer.call(this);
        },
        reset: function(errored) {
            var self = this;
            doStop.call(self), self.clearMetrics(), self.fragmentController.abortRequestsForModel(fragmentModel), 
            self.fragmentController.detachBufferController(fragmentModel), fragmentModel = null, 
            deferredAppends = [], deferredInitAppend = null, initializationData = [], deferredStreamComplete = Q.defer(), 
            liveEdgeSearchRange = null, liveEdgeInitialSearchPosition = null, useBinarySearch = !1, 
            liveEdgeSearchStep = null, deferredLiveEdge = null, errored || (self.sourceBufferExt.abort(mediaSource, buffer), 
            self.sourceBufferExt.removeSourceBuffer(mediaSource, buffer)), data = null, buffer = null;
        },
        start: doStart,
        seek: doSeek,
        stop: doStop
    };
}, MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
}, MediaPlayer.dependencies.BufferExtensions = function() {
    "use strict";
    var minBufferTarget, currentBufferTarget, topAudioQualityIndex = 0, topVideoQualityIndex = 0, audioData = null, videoData = null, getCurrentHttpRequestLatency = function(metrics) {
        var httpRequest = this.metricsExt.getCurrentHttpRequest(metrics);
        return null !== httpRequest ? (httpRequest.tresponse.getTime() - httpRequest.trequest.getTime()) / 1e3 : 0;
    }, isPlayingAtTopQuality = function() {
        var isAtTop, self = this, deferred = Q.defer();
        return Q.when(audioData ? self.abrController.getPlaybackQuality("audio", audioData) : topAudioQualityIndex).then(function(audioQuality) {
            Q.when(videoData ? self.abrController.getPlaybackQuality("video", videoData) : topVideoQualityIndex).then(function(videoQuality) {
                isAtTop = audioQuality.quality === topAudioQualityIndex && videoQuality.quality === topVideoQualityIndex, 
                isAtTop = isAtTop || audioQuality.confidence === MediaPlayer.rules.SwitchRequest.prototype.STRONG && videoQuality.confidence === MediaPlayer.rules.SwitchRequest.prototype.STRONG, 
                deferred.resolve(isAtTop);
            });
        }), deferred.promise;
    };
    return {
        system: void 0,
        videoModel: void 0,
        manifestExt: void 0,
        metricsExt: void 0,
        metricsModel: void 0,
        abrController: void 0,
        bufferMax: void 0,
        updateData: function(data, type) {
            var topIndex = data.Representation_asArray.length - 1;
            "audio" === type ? (topAudioQualityIndex = topIndex, audioData = data) : "video" === type && (topVideoQualityIndex = topIndex, 
            videoData = data);
        },
        getTopQualityIndex: function(type) {
            var topQualityIndex = null;
            return "audio" === type ? topQualityIndex = topAudioQualityIndex : "video" === type && (topQualityIndex = topVideoQualityIndex), 
            topQualityIndex;
        },
        decideBufferLength: function(minBufferTime, duration) {
            return minBufferTarget = isNaN(duration) || MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME < duration && duration > minBufferTime ? Math.max(MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME, minBufferTime) : minBufferTime >= duration ? Math.min(duration, MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME) : Math.min(duration, minBufferTime), 
            Q.when(minBufferTarget);
        },
        getLeastBufferLevel: function() {
            var videoMetrics = this.metricsModel.getReadOnlyMetricsFor("video"), videoBufferLevel = this.metricsExt.getCurrentBufferLevel(videoMetrics), audioMetrics = this.metricsModel.getReadOnlyMetricsFor("audio"), audioBufferLevel = this.metricsExt.getCurrentBufferLevel(audioMetrics), leastLevel = null;
            return leastLevel = null === videoBufferLevel || null === audioBufferLevel ? null !== audioBufferLevel ? audioBufferLevel.level : null !== videoBufferLevel ? videoBufferLevel.level : null : Math.min(audioBufferLevel.level, videoBufferLevel.level);
        },
        getRequiredBufferLength: function(waitingForBuffer, delay, isDynamic, duration) {
            var requiredBufferLength, self = this, vmetrics = self.metricsModel.getReadOnlyMetricsFor("video"), ametrics = self.metricsModel.getReadOnlyMetricsFor("audio"), isLongFormContent = duration >= MediaPlayer.dependencies.BufferExtensions.LONG_FORM_CONTENT_DURATION_THRESHOLD, deferred = Q.defer(), deferredIsAtTop = null;
            return self.bufferMax === MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_MIN ? (requiredBufferLength = minBufferTarget, 
            deferred.resolve(requiredBufferLength)) : self.bufferMax === MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_INFINITY ? (requiredBufferLength = duration, 
            deferred.resolve(requiredBufferLength)) : self.bufferMax === MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED ? (currentBufferTarget = minBufferTarget, 
            isDynamic || waitingForBuffer || (deferredIsAtTop = isPlayingAtTopQuality.call(self)), 
            Q.when(deferredIsAtTop).then(function(isAtTop) {
                isAtTop && (currentBufferTarget = isLongFormContent ? MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM : MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY), 
                requiredBufferLength = currentBufferTarget + delay + Math.max(getCurrentHttpRequestLatency.call(self, vmetrics), getCurrentHttpRequestLatency.call(self, ametrics)), 
                deferred.resolve(requiredBufferLength);
            })) : deferred.reject("invalid bufferMax value: " + self.bufferMax), deferred.promise;
        },
        getBufferTarget: function() {
            return void 0 === currentBufferTarget ? minBufferTarget : currentBufferTarget;
        }
    };
}, MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED = "required", 
MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_MIN = "min", MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_INFINITY = "infinity", 
MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_STARTUP = 1, MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME = 8, 
MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY = 30, MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 300, 
MediaPlayer.dependencies.BufferExtensions.LONG_FORM_CONTENT_DURATION_THRESHOLD = 600, 
MediaPlayer.dependencies.BufferExtensions.prototype.constructor = MediaPlayer.dependencies.BufferExtensions, 
MediaPlayer.utils.Capabilities = function() {
    "use strict";
}, MediaPlayer.utils.Capabilities.prototype = {
    constructor: MediaPlayer.utils.Capabilities,
    supportsMediaSource: function() {
        "use strict";
        var hasWebKit = "WebKitMediaSource" in window, hasMediaSource = "MediaSource" in window;
        return hasWebKit || hasMediaSource;
    },
    supportsMediaKeys: function() {
        "use strict";
        var hasWebKit = "WebKitMediaKeys" in window, hasMs = "MSMediaKeys" in window, hasMediaSource = "MediaKeys" in window;
        return hasWebKit || hasMs || hasMediaSource;
    },
    supportsCodec: function(element, codec) {
        "use strict";
        if (!(element instanceof HTMLVideoElement)) throw "element must be of type HTMLVideoElement.";
        var canPlay = element.canPlayType(codec);
        return "probably" === canPlay;
    }
}, MediaPlayer.utils.Debug = function() {
    "use strict";
    var logToBrowserConsole = !0, _log = function() {
        if (logToBrowserConsole) {
            var _logger = "undefined" != typeof log4javascript ? log4javascript.getLogger() : null;
            if (_logger) {
                if (!_logger.initialized) {
                    var appender = new log4javascript.PopUpAppender(), layout = new log4javascript.PatternLayout("%d{HH:mm:ss.SSS} %-5p - %m%n");
                    appender.setLayout(layout), _logger.addAppender(appender), _logger.setLevel(log4javascript.Level.ALL), 
                    _logger.initialized = !0;
                }
                _logger.info.apply(_logger, arguments);
            } else console.log.apply(console, arguments);
        }
        this.eventBus.dispatchEvent({
            type: "log",
            message: arguments[0]
        });
    };
    return {
        eventBus: void 0,
        setLogToBrowserConsole: function(value) {
            logToBrowserConsole = value;
        },
        getLogToBrowserConsole: function() {
            return logToBrowserConsole;
        },
        log: _log
    };
}, MediaPlayer.dependencies.ErrorHandler = function() {
    "use strict";
    return {
        eventBus: void 0,
        capabilityError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "capability",
                event: err
            });
        },
        downloadError: function(id, url, request) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "download",
                event: {
                    id: id,
                    url: url,
                    request: request
                }
            });
        },
        manifestError: function(message, id, manifest) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "manifestError",
                event: {
                    message: message,
                    id: id,
                    manifest: manifest
                }
            });
        },
        mediaSourceError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "mediasource",
                event: err
            });
        },
        mediaKeySessionError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "key_session",
                event: err
            });
        },
        mediaKeyMessageError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "key_message",
                event: err
            });
        },
        mediaKeySystemSelectionError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "key_system_selection",
                event: err
            });
        }
    };
}, MediaPlayer.dependencies.ErrorHandler.prototype = {
    constructor: MediaPlayer.dependencies.ErrorHandler
}, MediaPlayer.utils.EventBus = function() {
    "use strict";
    var registrations, getListeners = function(type, useCapture) {
        var captype = (useCapture ? "1" : "0") + type;
        return captype in registrations || (registrations[captype] = []), registrations[captype];
    }, init = function() {
        registrations = {};
    };
    return init(), {
        addEventListener: function(type, listener, useCapture) {
            var listeners = getListeners(type, useCapture), idx = listeners.indexOf(listener);
            -1 === idx && listeners.push(listener);
        },
        removeEventListener: function(type, listener, useCapture) {
            var listeners = getListeners(type, useCapture), idx = listeners.indexOf(listener);
            -1 !== idx && listeners.splice(idx, 1);
        },
        dispatchEvent: function(evt) {
            for (var listeners = getListeners(evt.type, !1).slice(), i = 0; i < listeners.length; i++) listeners[i].call(this, evt);
            return !evt.defaultPrevented;
        }
    };
}, MediaPlayer.dependencies.FragmentController = function() {
    "use strict";
    var fragmentModels = [], findModel = function(bufferController) {
        for (var ln = fragmentModels.length, i = 0; ln > i; i++) if (fragmentModels[i].getContext() == bufferController) return fragmentModels[i];
        return null;
    }, isReadyToLoadNextFragment = function() {
        for (var isReady = !0, ln = fragmentModels.length, i = 0; ln > i; i++) if (!fragmentModels[i].isReady()) {
            isReady = !1;
            break;
        }
        return isReady;
    }, executeRequests = function() {
        for (var i = 0; i < fragmentModels.length; i++) fragmentModels[i].executeCurrentRequest();
    };
    return {
        system: void 0,
        debug: void 0,
        fragmentLoader: void 0,
        process: function(bytes) {
            var result = null;
            return null !== bytes && void 0 !== bytes && bytes.byteLength > 0 && (result = new Uint8Array(bytes)), 
            Q.when(result);
        },
        attachBufferController: function(bufferController) {
            if (!bufferController) return null;
            var model = findModel(bufferController);
            return model || (model = this.system.getObject("fragmentModel"), model.setContext(bufferController), 
            fragmentModels.push(model)), model;
        },
        detachBufferController: function(bufferController) {
            var idx = fragmentModels.indexOf(bufferController);
            idx > -1 && fragmentModels.splice(idx, 1);
        },
        onBufferControllerStateChange: function() {
            isReadyToLoadNextFragment() && executeRequests.call(this);
        },
        isFragmentLoadedOrPending: function(bufferController, request) {
            var isLoaded, fragmentModel = findModel(bufferController);
            return fragmentModel ? isLoaded = fragmentModel.isFragmentLoadedOrPending(request) : !1;
        },
        getPendingRequests: function(bufferController) {
            var fragmentModel = findModel(bufferController);
            return fragmentModel ? fragmentModel.getPendingRequests() : null;
        },
        getLoadingRequests: function(bufferController) {
            var fragmentModel = findModel(bufferController);
            return fragmentModel ? fragmentModel.getLoadingRequests() : null;
        },
        isInitializationRequest: function(request) {
            return request && request.type && "initialization segment" === request.type.toLowerCase();
        },
        getLoadingTime: function(bufferController) {
            var fragmentModel = findModel(bufferController);
            return fragmentModel ? fragmentModel.getLoadingTime() : null;
        },
        getExecutedRequestForTime: function(model, time) {
            return model ? model.getExecutedRequestForTime(time) : null;
        },
        removeExecutedRequest: function(model, request) {
            model && model.removeExecutedRequest(request);
        },
        removeExecutedRequestsBeforeTime: function(model, time) {
            model && model.removeExecutedRequestsBeforeTime(time);
        },
        cancelPendingRequestsForModel: function(model) {
            model && model.cancelPendingRequests();
        },
        abortRequestsForModel: function(model) {
            model && model.abortRequests();
        },
        isFragmentExists: function(request) {
            var deferred = Q.defer();
            return this.fragmentLoader.checkForExistence(request).then(function() {
                deferred.resolve(!0);
            }, function() {
                deferred.resolve(!1);
            }), deferred.promise;
        },
        prepareFragmentForLoading: function(bufferController, request, startLoadingCallback, successLoadingCallback, errorLoadingCallback, streamEndCallback) {
            var fragmentModel = findModel(bufferController);
            return fragmentModel && request ? (fragmentModel.addRequest(request), fragmentModel.setCallbacks(startLoadingCallback, successLoadingCallback, errorLoadingCallback, streamEndCallback), 
            Q.when(!0)) : Q.when(null);
        }
    };
}, MediaPlayer.dependencies.FragmentController.prototype = {
    constructor: MediaPlayer.dependencies.FragmentController
}, MediaPlayer.dependencies.FragmentLoader = function() {
    "use strict";
    var RETRY_ATTEMPTS = 3, RETRY_INTERVAL = 500, xhrs = [], doLoad = function(request, remainingAttempts) {
        var req = new XMLHttpRequest(), httpRequestMetrics = null, firstProgress = !0, needFailureReport = !0, self = this;
        xhrs.push(req), request.requestStartDate = new Date(), request.firstByteDate = request.requestStartDate, 
        req.open("GET", request.url, !0), req.responseType = "arraybuffer", request.range && req.setRequestHeader("Range", "bytes=" + request.range), 
        req.onprogress = function(event) {
            firstProgress && (firstProgress = !1, (!event.lengthComputable || event.lengthComputable && event.total != event.loaded) && (request.firstByteDate = new Date()));
        }, req.onload = function() {
            if (!(req.status < 200 || req.status > 299)) {
                needFailureReport = !1, request.requestEndDate = new Date();
                {
                    var currentTime = request.requestEndDate, bytes = req.response;
                    request.firstByteDate.getTime() - request.requestStartDate.getTime(), request.requestEndDate.getTime() - request.firstByteDate.getTime(), 
                    request.requestEndDate.getTime() - request.requestStartDate.getTime();
                }
                httpRequestMetrics = self.metricsModel.addHttpRequest(request.streamType, null, request.type, request.url, null, request.range, request.requestStartDate, request.firstByteDate, request.requestEndDate, req.status, null, request.duration), 
                self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, new Date().getTime() - currentTime.getTime(), [ bytes.byteLength ]), 
                request.deferred.resolve({
                    data: bytes,
                    request: request
                });
            }
        }, req.onloadend = req.onerror = function() {
            if (-1 !== xhrs.indexOf(req) && (xhrs.splice(xhrs.indexOf(req), 1), needFailureReport)) {
                needFailureReport = !1, request.requestEndDate = new Date();
                {
                    request.firstByteDate.getTime() - request.requestStartDate.getTime(), request.requestEndDate.getTime() - request.firstByteDate.getTime(), 
                    request.requestEndDate.getTime() - request.requestStartDate.getTime();
                }
                httpRequestMetrics = self.metricsModel.addHttpRequest(request.streamType, null, request.type, request.url, null, request.range, request.requestStartDate, request.firstByteDate, request.requestEndDate, req.status, null, request.duration), 
                remainingAttempts > 0 ? (remainingAttempts--, setTimeout(function() {
                    doLoad.call(self, request, remainingAttempts);
                }, RETRY_INTERVAL)) : (self.errHandler.downloadError("content", request.url, req), 
                request.deferred.reject(req));
            }
        }, req.send();
    }, checkForExistence = function(request, remainingAttempts) {
        var req = new XMLHttpRequest(), isSuccessful = !1, self = this;
        req.open("HEAD", request.url, !0), req.onload = function() {
            req.status < 200 || req.status > 299 || (isSuccessful = !0, request.deferred.resolve(request));
        }, req.onloadend = req.onerror = function() {
            isSuccessful || (remainingAttempts > 0 ? (remainingAttempts--, setTimeout(function() {
                checkForExistence.call(self, request, remainingAttempts);
            }, RETRY_INTERVAL)) : request.deferred.reject(req));
        }, req.send();
    };
    return {
        metricsModel: void 0,
        errHandler: void 0,
        debug: void 0,
        load: function(req) {
            return req ? (req.deferred = Q.defer(), doLoad.call(this, req, RETRY_ATTEMPTS), 
            req.deferred.promise) : Q.when(null);
        },
        checkForExistence: function(req) {
            return req ? (req.deferred = Q.defer(), checkForExistence.call(this, req, RETRY_ATTEMPTS), 
            req.deferred.promise) : Q.when(null);
        },
        abort: function() {
            var i, req, ln = xhrs.length;
            for (i = 0; ln > i; i += 1) req = xhrs[i], xhrs[i] = null, req.abort(), req = null;
            xhrs = [];
        }
    };
}, MediaPlayer.dependencies.FragmentLoader.prototype = {
    constructor: MediaPlayer.dependencies.FragmentLoader
}, MediaPlayer.dependencies.FragmentModel = function() {
    "use strict";
    var context, startLoadingCallback, successLoadingCallback, errorLoadingCallback, streamEndCallback, executedRequests = [], pendingRequests = [], loadingRequests = [], LOADING_REQUEST_THRESHOLD = 5, loadCurrentFragment = function(request) {
        var onSuccess, onError, self = this;
        startLoadingCallback.call(context, request), onSuccess = function(request, response) {
            loadingRequests.splice(loadingRequests.indexOf(request), 1), executedRequests.push(request), 
            successLoadingCallback.call(context, request, response), request.deferred = null;
        }, onError = function(request) {
            loadingRequests.splice(loadingRequests.indexOf(request), 1), errorLoadingCallback.call(context, request), 
            request.deferred = null;
        }, self.fragmentLoader.load(request).then(onSuccess.bind(context, request), onError.bind(context, request));
    }, removeExecutedRequest = function(request) {
        var idx = executedRequests.indexOf(request);
        -1 !== idx && executedRequests.splice(idx, 1);
    };
    return {
        system: void 0,
        debug: void 0,
        fragmentLoader: void 0,
        setContext: function(value) {
            context = value;
        },
        getContext: function() {
            return context;
        },
        addRequest: function(value) {
            value && pendingRequests.push(value);
        },
        setCallbacks: function(onLoadingStart, onLoadingSuccess, onLoadingError, onStreamEnd) {
            startLoadingCallback = onLoadingStart, streamEndCallback = onStreamEnd, errorLoadingCallback = onLoadingError, 
            successLoadingCallback = onLoadingSuccess;
        },
        isFragmentLoadedOrPending: function(request) {
            for (var req, isLoaded = !1, ln = executedRequests.length, i = 0; ln > i; i++) if (req = executedRequests[i], 
            request.startTime === req.startTime || "complete" === req.action && request.action === req.action) {
                if (request.url === req.url) {
                    isLoaded = !0;
                    break;
                }
                removeExecutedRequest(request);
            }
            if (!isLoaded) for (i = 0, ln = pendingRequests.length; ln > i; i += 1) req = pendingRequests[i], 
            request.url === req.url && request.startTime === req.startTime && (isLoaded = !0);
            if (!isLoaded) for (i = 0, ln = loadingRequests.length; ln > i; i += 1) req = loadingRequests[i], 
            request.url === req.url && request.startTime === req.startTime && (isLoaded = !0);
            return isLoaded;
        },
        isReady: function() {
            return context.isReady();
        },
        getPendingRequests: function() {
            return pendingRequests;
        },
        getLoadingRequests: function() {
            return loadingRequests;
        },
        getLoadingTime: function() {
            var req, i, loadingTime = 0;
            for (i = executedRequests.length - 1; i >= 0; i -= 1) if (req = executedRequests[i], 
            req.requestEndDate instanceof Date && req.firstByteDate instanceof Date) {
                loadingTime = req.requestEndDate.getTime() - req.firstByteDate.getTime();
                break;
            }
            return loadingTime;
        },
        getExecutedRequestForTime: function(time) {
            var i, lastIdx = executedRequests.length - 1, start = 0/0, end = 0/0, req = null;
            for (i = lastIdx; i >= 0; i -= 1) if (req = executedRequests[i], start = req.startTime, 
            end = start + req.duration, !isNaN(start) && !isNaN(end) && time > start && end > time) return req;
            return null;
        },
        removeExecutedRequest: function(request) {
            removeExecutedRequest.call(this, request);
        },
        removeExecutedRequestsBeforeTime: function(time) {
            var i, lastIdx = executedRequests.length - 1, start = 0/0, req = null;
            for (i = lastIdx; i >= 0; i -= 1) req = executedRequests[i], start = req.startTime, 
            !isNaN(start) && time > start && removeExecutedRequest.call(this, req);
        },
        cancelPendingRequests: function() {
            pendingRequests = [];
        },
        abortRequests: function() {
            this.fragmentLoader.abort(), loadingRequests = [];
        },
        executeCurrentRequest: function() {
            var currentRequest, self = this;
            if (0 !== pendingRequests.length && !(loadingRequests.length >= LOADING_REQUEST_THRESHOLD)) switch (currentRequest = pendingRequests.shift(), 
            currentRequest.action) {
              case "complete":
                executedRequests.push(currentRequest), streamEndCallback.call(context, currentRequest);
                break;

              case "download":
                loadingRequests.push(currentRequest), loadCurrentFragment.call(self, currentRequest);
            }
        }
    };
}, MediaPlayer.dependencies.FragmentModel.prototype = {
    constructor: MediaPlayer.dependencies.FragmentModel
}, MediaPlayer.utils.Logger = function() {
    "use strict";
    var _logger = "undefined" != typeof log4javascript ? log4javascript.getLogger() : null, appender = null, logToBrowserConsole = !0, _debug = function() {
        _logger ? _logger.debug.apply(_logger, arguments) : console.debug.apply(console, arguments);
    }, _error = function() {
        _logger ? _logger.error.apply(_logger, arguments) : console.error.apply(console, arguments);
    }, _addAppender = function() {
        if ("undefined" != typeof log4javascript) {
            appender = new log4javascript.PopUpAppender();
            var layout = new log4javascript.PatternLayout("%d{HH:mm:ss.SSS} %-5p - %m%n");
            appender.setLayout(layout), _logger.addAppender(appender), _logger.setLevel(log4javascript.Level.ALL);
        }
    }, _info = function() {
        _logger ? _logger.info.apply(_logger, arguments) : console.info.apply(console, arguments);
    }, _trace = function() {
        _logger ? _logger.trace.apply(_logger, arguments) : console.trace.apply(console, arguments);
    };
    return {
        debug: _debug,
        error: _error,
        addAppender: _addAppender,
        info: _info,
        trace: _trace,
        eventBus: void 0,
        setLogToBrowserConsole: function(value) {
            logToBrowserConsole = value;
        },
        getLogToBrowserConsole: function() {
            return logToBrowserConsole;
        },
        log: function(message) {
            this.eventBus.dispatchEvent({
                type: "log",
                message: message
            });
        }
    };
}, MediaPlayer.utils.Logger.prototype = {
    constructor: MediaPlayer.utils.Logger
}, MediaPlayer.dependencies.ManifestLoader = function() {
    "use strict";
    var RETRY_ATTEMPTS = 3, RETRY_INTERVAL = 500, deferred = null, parseBaseUrl = function(url) {
        var base = null;
        return -1 !== url.indexOf("/") && (base = url.substring(0, url.lastIndexOf("/") + 1)), 
        base;
    }, doLoad = function(url, remainingAttempts) {
        var baseUrl = parseBaseUrl(url), request = new XMLHttpRequest(), requestTime = new Date(), mpdLoadedTime = null, needFailureReport = !0, self = this;
        request.open("GET", url, !0), request.onload = function() {
            request.status < 200 || request.status > 299 || (needFailureReport = !1, mpdLoadedTime = new Date(), 
            self.metricsModel.addHttpRequest("stream", null, "MPD", url, null, null, requestTime, mpdLoadedTime, request.status, null, null), 
            self.parser.parse(request.responseText, baseUrl).then(function(manifest) {
                manifest.mpdUrl = url, manifest.mpdLoadedTime = mpdLoadedTime, deferred.resolve(manifest);
            }, function() {
                deferred.reject(request);
            }));
        }, request.onloadend = request.onerror = function() {
            needFailureReport && (needFailureReport = !1, self.metricsModel.addHttpRequest("stream", null, "MPD", url, null, null, requestTime, new Date(), request.status, null, null), 
            remainingAttempts > 0 ? (remainingAttempts--, setTimeout(function() {
                doLoad.call(self, url, remainingAttempts);
            }, RETRY_INTERVAL)) : (self.errHandler.downloadError("manifest", url, request), 
            deferred.reject(request)));
        }, request.send();
    };
    return {
        debug: void 0,
        parser: void 0,
        errHandler: void 0,
        metricsModel: void 0,
        load: function(url) {
            return deferred = Q.defer(), doLoad.call(this, url, RETRY_ATTEMPTS), deferred.promise;
        }
    };
}, MediaPlayer.dependencies.ManifestLoader.prototype = {
    constructor: MediaPlayer.dependencies.ManifestLoader
}, MediaPlayer.models.ManifestModel = function() {
    "use strict";
    var manifest;
    return {
        system: void 0,
        getValue: function() {
            return manifest;
        },
        setValue: function(value) {
            manifest = value, this.system.notify("manifestUpdated");
        }
    };
}, MediaPlayer.models.ManifestModel.prototype = {
    constructor: MediaPlayer.models.ManifestModel
}, MediaPlayer.dependencies.ManifestUpdater = function() {
    "use strict";
    var deferredUpdate, refreshDelay = 0/0, refreshTimer = null, clear = function() {
        null !== refreshTimer && (clearInterval(refreshTimer), refreshTimer = null);
    }, start = function() {
        clear.call(this), isNaN(refreshDelay) || (refreshTimer = setInterval(onRefreshTimer.bind(this), 1e3 * refreshDelay, this));
    }, update = function() {
        var self = this, manifest = self.manifestModel.getValue();
        void 0 !== manifest && null !== manifest && self.manifestExt.getRefreshDelay(manifest).then(function(t) {
            refreshDelay = t, start.call(self);
        });
    }, onRefreshTimer = function() {
        var manifest, url, self = this;
        Q.when(deferredUpdate ? deferredUpdate.promise : !0).then(function() {
            deferredUpdate = Q.defer(), manifest = self.manifestModel.getValue(), url = manifest.mpdUrl, 
            manifest.hasOwnProperty("Location") && (url = manifest.Location), self.manifestLoader.load(url).then(function(manifestResult) {
                self.manifestModel.setValue(manifestResult), update.call(self);
            });
        });
    }, onStreamsComposed = function() {
        deferredUpdate && deferredUpdate.resolve();
    };
    return {
        debug: void 0,
        system: void 0,
        manifestModel: void 0,
        manifestExt: void 0,
        manifestLoader: void 0,
        setup: function() {
            update.call(this), this.system.mapHandler("streamsComposed", void 0, onStreamsComposed.bind(this));
        },
        init: function() {
            update.call(this);
        },
        stop: function() {
            clear.call(this);
        }
    };
}, MediaPlayer.dependencies.ManifestUpdater.prototype = {
    constructor: MediaPlayer.dependencies.ManifestUpdater
}, MediaPlayer.dependencies.MediaSourceExtensions = function() {
    "use strict";
}, MediaPlayer.dependencies.MediaSourceExtensions.prototype = {
    constructor: MediaPlayer.dependencies.MediaSourceExtensions,
    createMediaSource: function() {
        "use strict";
        var hasWebKit = "WebKitMediaSource" in window, hasMediaSource = "MediaSource" in window;
        return hasMediaSource ? Q.when(new MediaSource()) : hasWebKit ? Q.when(new WebKitMediaSource()) : null;
    },
    attachMediaSource: function(source, videoModel) {
        "use strict";
        return videoModel.setSource(window.URL.createObjectURL(source)), Q.when(!0);
    },
    detachMediaSource: function(videoModel) {
        "use strict";
        return videoModel.setSource(""), Q.when(!0);
    },
    setDuration: function(source, value) {
        "use strict";
        return source.duration = value, Q.when(source.duration);
    },
    signalEndOfStream: function(source) {
        "use strict";
        return source.endOfStream(), Q.when(!0);
    }
}, MediaPlayer.models.MetricsModel = function() {
    "use strict";
    return {
        system: void 0,
        streamMetrics: {},
        clearCurrentMetricsForType: function(type) {
            delete this.streamMetrics[type];
        },
        clearAllCurrentMetrics: function() {
            this.streamMetrics = {};
        },
        getReadOnlyMetricsFor: function(type) {
            return this.streamMetrics.hasOwnProperty(type) ? this.streamMetrics[type] : null;
        },
        getMetricsFor: function(type) {
            var metrics;
            return this.streamMetrics.hasOwnProperty(type) ? metrics = this.streamMetrics[type] : (metrics = this.system.getObject("metrics"), 
            this.streamMetrics[type] = metrics), metrics;
        },
        addTcpConnection: function(streamType, tcpid, dest, topen, tclose, tconnect) {
            var vo = new MediaPlayer.vo.metrics.TCPConnection();
            return vo.tcpid = tcpid, vo.dest = dest, vo.topen = topen, vo.tclose = tclose, vo.tconnect = tconnect, 
            this.getMetricsFor(streamType).TcpList.push(vo), vo;
        },
        addHttpRequest: function(streamType, tcpid, type, url, actualurl, range, trequest, tresponse, tfinish, responsecode, interval, mediaduration) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest();
            return vo.tcpid = tcpid, vo.type = type, vo.url = url, vo.actualurl = actualurl, 
            vo.range = range, vo.trequest = trequest, vo.tresponse = tresponse, vo.tfinish = tfinish, 
            vo.responsecode = responsecode, vo.interval = interval, vo.mediaduration = mediaduration, 
            this.getMetricsFor(streamType).HttpList.push(vo), vo;
        },
        appendHttpTrace: function(httpRequest, s, d, b) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest.Trace();
            return vo.s = s, vo.d = d, vo.b = b, httpRequest.trace.push(vo), vo;
        },
        addRepresentationSwitch: function(streamType, t, mt, to, lto) {
            var vo = new MediaPlayer.vo.metrics.RepresentationSwitch();
            return vo.t = t, vo.mt = mt, vo.to = to, vo.lto = lto, this.getMetricsFor(streamType).RepSwitchList.push(vo), 
            vo;
        },
        addBufferLevel: function(streamType, t, level) {
            var vo = new MediaPlayer.vo.metrics.BufferLevel();
            return vo.t = t, vo.level = level, this.getMetricsFor(streamType).BufferLevel.push(vo), 
            vo;
        },
        addPlayList: function(streamType, start, mstart, starttype) {
            var vo = new MediaPlayer.vo.metrics.PlayList();
            return vo.start = start, vo.mstart = mstart, vo.starttype = starttype, this.getMetricsFor(streamType).PlayList.push(vo), 
            vo;
        },
        appendPlayListTrace: function(playList, representationid, subreplevel, start, mstart, duration, playbackspeed, stopreason) {
            var vo = new MediaPlayer.vo.metrics.PlayList.Trace();
            return vo.representationid = representationid, vo.subreplevel = subreplevel, vo.start = start, 
            vo.mstart = mstart, vo.duration = duration, vo.playbackspeed = playbackspeed, vo.stopreason = stopreason, 
            playList.trace.push(vo), vo;
        }
    };
}, MediaPlayer.models.MetricsModel.prototype = {
    constructor: MediaPlayer.models.MetricsModel
}, MediaPlayer.dependencies.Mp4Processor = function() {
    "use strict";
    var createMovieHeaderBox = function(media) {
        var mvhd = new mp4lib.boxes.MovieHeaderBox();
        return mvhd.version = 1, mvhd.creation_time = 0, mvhd.modification_time = 0, mvhd.timescale = media.timescale, 
        mvhd.duration = Math.round(media.duration * media.timescale), mvhd.rate = 65536, 
        mvhd.volume = 256, mvhd.reserved = 0, mvhd.reserved_2 = [ 0, 0 ], mvhd.matrix = [ 65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824 ], 
        mvhd.pre_defined = [ 0, 0, 0, 0, 0, 0 ], mvhd.next_track_ID = media.trackId + 1, 
        mvhd.flags = 0, mvhd;
    }, createTrackBox = function(media) {
        var trak = new mp4lib.boxes.TrackBox();
        trak.boxes = [];
        var tkhd = new mp4lib.boxes.TrackHeaderBox();
        tkhd.version = 1, tkhd.flags = 7, tkhd.creation_time = 0, tkhd.modification_time = 0, 
        tkhd.track_id = media.trackId, tkhd.reserved = 0, tkhd.duration = Math.round(media.duration * media.timescale), 
        tkhd.reserved_2 = [ 0, 0 ], tkhd.layer = 0, tkhd.alternate_group = 0, tkhd.volume = 256, 
        tkhd.reserved_3 = 0, tkhd.matrix = [ 65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824 ], 
        tkhd.width = media.width << 16, tkhd.height = media.height << 16, trak.boxes.push(tkhd);
        var mdia = new mp4lib.boxes.MediaBox();
        return mdia.boxes = [], mdia.boxes.push(createMediaHeaderBox(media)), mdia.boxes.push(createHandlerReferenceBox(media)), 
        mdia.boxes.push(createMediaInformationBox(media)), trak.boxes.push(mdia), trak;
    }, getLanguageCode = function(language) {
        var result = 0, firstLetterCode = language.charCodeAt(0) - 96 << 10, secondLetterCode = language.charCodeAt(1) - 96 << 5, thirdLetterCode = language.charCodeAt(2) - 96;
        return result = firstLetterCode | secondLetterCode | thirdLetterCode;
    }, createMediaHeaderBox = function(media) {
        var mdhd = new mp4lib.boxes.MediaHeaderBox();
        return mdhd.version = 1, mdhd.creation_time = 0, mdhd.modification_time = 0, mdhd.timescale = media.timescale, 
        mdhd.duration = Math.round(media.duration * media.timescale), mdhd.pad = 0, mdhd.language = getLanguageCode(media.language), 
        mdhd.pre_defined = 0, mdhd;
    }, stringToCharCode = function(str) {
        for (var code = 0, i = 0; i < str.length; i++) code |= str.charCodeAt(i) << 8 * (str.length - i - 1);
        return code;
    }, createHandlerReferenceBox = function(media) {
        var hdlr = new mp4lib.boxes.HandlerBox();
        switch (hdlr.version = 0, hdlr.pre_defined = 0, media.type) {
          case "video":
            hdlr.handler_type = stringToCharCode(hdlr.HANDLERTYPEVIDEO), hdlr.name = hdlr.HANDLERVIDEONAME;
            break;

          case "audio":
            hdlr.handler_type = stringToCharCode(hdlr.HANDLERTYPEAUDIO), hdlr.name = hdlr.HANDLERAUDIONAME;
            break;

          default:
            hdlr.handler_type = stringToCharCode(hdlr.HANDLERTYPETEXT), hdlr.name = hdlr.HANDLERTEXTNAME;
        }
        return hdlr.name += "\x00", hdlr.reserved = [ 0, 0 ], hdlr.flags = 0, hdlr;
    }, createMediaInformationBox = function(media) {
        var minf = new mp4lib.boxes.MediaInformationBox();
        switch (minf.boxes = [], media.type) {
          case "video":
            minf.boxes.push(createVideoMediaHeaderBox(media));
            break;

          case "audio":
            minf.boxes.push(createSoundMediaHeaderBox(media));
        }
        return minf.boxes.push(createDataInformationBox(media)), minf.boxes.push(createSampleTableBox(media)), 
        minf;
    }, createDataInformationBox = function() {
        var dinf = new mp4lib.boxes.DataInformationBox();
        dinf.boxes = [];
        var dref = new mp4lib.boxes.DataReferenceBox();
        dref.version = 0, dref.entry_count = 1, dref.flags = 0, dref.boxes = [];
        var url = new mp4lib.boxes.DataEntryUrlBox();
        return url.location = "", dref.boxes.push(url), dinf.boxes.push(dref), dinf;
    }, createDecodingTimeToSampleBox = function() {
        var stts = new mp4lib.boxes.TimeToSampleBox();
        return stts.version = 0, stts.entry_count = 0, stts.flags = 0, stts.entry = [], 
        stts;
    }, createSampleToChunkBox = function() {
        var stsc = new mp4lib.boxes.SampleToChunkBox();
        return stsc.version = 0, stsc.entry_count = 0, stsc.entry = [], stsc;
    }, createChunkOffsetBox = function() {
        var stco = new mp4lib.boxes.ChunkOffsetBox();
        return stco.version = 0, stco.entry_count = 0, stco.flags = 0, stco.chunk_offset = [], 
        stco;
    }, createSampleSizeBox = function() {
        var stsz = new mp4lib.boxes.SampleSizeBox();
        return stsz.version = 0, stsz.flags = 0, stsz.sample_count = 0, stsz.sample_size = 0, 
        stsz;
    }, _hexstringtoBuffer = function(a) {
        for (var res = new Uint8Array(a.length / 2), i = 0; i < a.length / 2; i++) res[i] = parseInt("" + a[2 * i] + a[2 * i + 1], 16);
        return res;
    }, _mergeArrays = function(oldBuffer, newPart) {
        var res = new Uint8Array(oldBuffer.length + newPart.length);
        return res.set(oldBuffer, 0), res.set(newPart, oldBuffer.length), res;
    }, createAVCConfigurationBox = function(media) {
        var avcC = new mp4lib.boxes.AVCConfigurationBox();
        avcC.configurationVersion = 1, avcC.lengthSizeMinusOne = 3, avcC.reserved = 63, 
        avcC.SPS_NAL = [], avcC.PPS_NAL = [];
        var NALDatabuffer = new Uint8Array(0), codecPrivateData = media.codecPrivateData, NALArray = codecPrivateData.split("00000001");
        NALArray.splice(0, 1);
        for (var SPS_index = 0, PPS_index = 0, j = 0; j < NALArray.length; j++) {
            var regexp7 = new RegExp("^[A-Z0-9]7", "gi"), regexp8 = new RegExp("^[A-Z0-9]8", "gi"), NALBuffer = _hexstringtoBuffer(NALArray[j]);
            NALArray[j].match(regexp7) && (avcC.SPS_NAL[SPS_index++] = {
                NAL_length: NALBuffer.length,
                NAL: NALBuffer
            }, avcC.AVCProfileIndication = parseInt(NALArray[j].substr(2, 2), 16), avcC.profile_compatibility = parseInt(NALArray[j].substr(4, 2), 16), 
            avcC.AVCLevelIndication = parseInt(NALArray[j].substr(6, 2), 16)), NALArray[j].match(regexp8) && (avcC.PPS_NAL[PPS_index++] = {
                NAL_length: NALBuffer.length,
                NAL: NALBuffer
            });
            var tempBuffer = new Uint8Array(NALBuffer.length + 4);
            tempBuffer[3] = NALBuffer.length, tempBuffer.set(NALBuffer, 4), NALDatabuffer = _mergeArrays(NALDatabuffer, tempBuffer);
        }
        return avcC.numOfSequenceParameterSets = SPS_index, avcC.numOfPictureParameterSets = PPS_index, 
        avcC;
    }, createAVCVisualSampleEntry = function(media) {
        var avc1 = null;
        return avc1 = void 0 !== media.contentProtection ? new mp4lib.boxes.EncryptedVideoBox() : new mp4lib.boxes.AVC1VisualSampleEntryBox(), 
        avc1.boxes = [], avc1.data_reference_index = 1, avc1.compressorname = "AVC Coding", 
        avc1.depth = 24, avc1.reserved = [ 0, 0, 0, 0, 0, 0 ], avc1.reserved_2 = 0, avc1.reserved_3 = 0, 
        avc1.pre_defined = 0, avc1.pre_defined_2 = [ 0, 0, 0 ], avc1.pre_defined_3 = 65535, 
        avc1.frame_count = 1, avc1.horizresolution = 4718592, avc1.vertresolution = 4718592, 
        avc1.height = media.height, avc1.width = media.width, avc1.boxes.push(createAVCConfigurationBox(media)), 
        void 0 != media.contentProtection && avc1.boxes.push(createProtectionSchemeInfoBox(media)), 
        avc1;
    }, createOriginalFormatBox = function(media) {
        var frma = new mp4lib.boxes.OriginalFormatBox();
        return frma.data_format = stringToCharCode(media.codecs.substring(0, media.codecs.indexOf("."))), 
        frma;
    }, createSchemeTypeBox = function() {
        var schm = new mp4lib.boxes.SchemeTypeBox();
        return schm.flags = 0, schm.version = 0, schm.scheme_type = 1667591779, schm.scheme_version = 65536, 
        schm;
    }, createSchemeInformationBox = function(media) {
        var schi = new mp4lib.boxes.SchemeInformationBox();
        return schi.boxes = [], schi.boxes.push(createTrackEncryptionBox(media)), schi;
    }, createTrackEncryptionBox = function() {
        var tenc = new mp4lib.boxes.TrackEncryptionBox();
        return tenc.default_IsEncrypted = 1, tenc.default_IV_size = 8, tenc.default_KID = [], 
        tenc;
    }, createProtectionSchemeInfoBox = function(media) {
        var sinf = new mp4lib.boxes.ProtectionSchemeInformationBox();
        return sinf.boxes = [], sinf.boxes.push(createOriginalFormatBox(media)), sinf.boxes.push(createSchemeTypeBox()), 
        sinf.boxes.push(createSchemeInformationBox(media)), sinf;
    }, createVisualSampleEntry = function(media) {
        var codec = media.codecs.substring(0, media.codecs.indexOf("."));
        switch (codec) {
          case "avc1":
            return createAVCVisualSampleEntry(media);
        }
    }, parseHexString = function(str) {
        for (var bytes = []; str.length >= 2; ) bytes.push(parseInt(str.substring(0, 2), 16)), 
        str = str.substring(2, str.length);
        return bytes;
    }, createMPEG4AACESDescriptor = function(media) {
        var audioSpecificConfig = parseHexString(media.codecPrivateData), dsiLength = audioSpecificConfig.length, decoderSpecificInfo = new Uint8Array(2 + dsiLength);
        decoderSpecificInfo[0] = 5, decoderSpecificInfo[1] = dsiLength, decoderSpecificInfo.set(audioSpecificConfig, 2);
        var dcdLength = 13 + decoderSpecificInfo.length, decoderConfigDescriptor = new Uint8Array(2 + dcdLength);
        decoderConfigDescriptor[0] = 4, decoderConfigDescriptor[1] = dcdLength, decoderConfigDescriptor[2] = 64, 
        decoderConfigDescriptor[3] = 20, decoderConfigDescriptor[3] |= 0, decoderConfigDescriptor[3] |= 1, 
        decoderConfigDescriptor[4] = 255, decoderConfigDescriptor[5] = 255, decoderConfigDescriptor[6] = 255, 
        decoderConfigDescriptor[7] = 255, decoderConfigDescriptor[8] = 255, decoderConfigDescriptor[9] = 255, 
        decoderConfigDescriptor[10] = 255, decoderConfigDescriptor[11] = (4278190080 & media.bandwidth) >> 24, 
        decoderConfigDescriptor[12] |= (16711680 & media.bandwidth) >> 16, decoderConfigDescriptor[13] |= (65280 & media.bandwidth) >> 8, 
        decoderConfigDescriptor[14] |= 255 & media.bandwidth, decoderConfigDescriptor.set(decoderSpecificInfo, 15);
        var esdLength = 3 + decoderConfigDescriptor.length, esDescriptor = new Uint8Array(2 + esdLength);
        return esDescriptor[0] = 3, esDescriptor[1] = esdLength, esDescriptor[2] = (65280 & media.trackId) >> 8, 
        esDescriptor[3] = 255 & media.trackId, esDescriptor[4] = 0, esDescriptor.set(decoderConfigDescriptor, 5), 
        esDescriptor;
    }, createMP4AudioSampleEntry = function(media) {
        var mp4a = null;
        mp4a = void 0 !== media.contentProtection ? new mp4lib.boxes.EncryptedAudioBox() : new mp4lib.boxes.MP4AudioSampleEntryBox(), 
        mp4a.boxes = [], mp4a.reserved = [ 0, 0, 0, 0, 0, 0 ], mp4a.data_reference_index = 1, 
        mp4a.reserved_2 = [ 0, 0 ], mp4a.channelcount = media.channels, mp4a.samplesize = 16, 
        mp4a.pre_defined = 0, mp4a.reserved_3 = 0, mp4a.samplerate = media.samplingRate << 16;
        var esdBox = new mp4lib.boxes.ESDBox(), ES_Descriptor = createMPEG4AACESDescriptor(media);
        return esdBox.ES_tag = ES_Descriptor[0], esdBox.ES_length = ES_Descriptor[1], esdBox.ES_data = ES_Descriptor.subarray(2, ES_Descriptor.length), 
        mp4a.boxes.push(esdBox), void 0 != media.contentProtection && mp4a.boxes.push(createProtectionSchemeInfoBox(media)), 
        mp4a;
    }, createAudioSampleEntry = function(media) {
        var codec = media.codecs.substring(0, media.codecs.indexOf("."));
        switch (codec) {
          case "mp4a":
            return createMP4AudioSampleEntry(media);
        }
        return null;
    }, createSampleDescriptionBox = function(media) {
        var stsd = new mp4lib.boxes.SampleDescriptionBox();
        switch (stsd.boxes = [], media.type) {
          case "video":
            stsd.boxes.push(createVisualSampleEntry(media));
            break;

          case "audio":
            stsd.boxes.push(createAudioSampleEntry(media));
        }
        return stsd;
    }, createSampleTableBox = function(media) {
        var stbl = new mp4lib.boxes.SampleTableBox();
        return stbl.boxes = [], stbl.boxes.push(createDecodingTimeToSampleBox(media)), stbl.boxes.push(createSampleToChunkBox(media)), 
        stbl.boxes.push(createChunkOffsetBox(media)), stbl.boxes.push(createSampleSizeBox(media)), 
        stbl.boxes.push(createSampleDescriptionBox(media)), stbl;
    }, createVideoMediaHeaderBox = function() {
        var vmhd = new mp4lib.boxes.VideoMediaHeaderBox();
        return vmhd.version = 0, vmhd.flags = 1, vmhd.graphicsmode = 0, vmhd.opcolor = [ 0, 0, 0 ], 
        vmhd;
    }, createSoundMediaHeaderBox = function() {
        var smhd = new mp4lib.boxes.SoundMediaHeaderBox();
        return smhd.version = 0, smhd.balance = 0, smhd.reserved = 0, smhd;
    }, createFileTypeBox = function() {
        var ftyp = new mp4lib.boxes.FileTypeBox();
        return ftyp.major_brand = 1769172790, ftyp.minor_brand = 1, ftyp.compatible_brands = [], 
        ftyp.compatible_brands[0] = 1769172845, ftyp.compatible_brands[1] = 1769172790, 
        ftyp.compatible_brands[2] = 1836278888, ftyp;
    }, createMovieExtendsBox = function(media) {
        var mvex = new mp4lib.boxes.MovieExtendsBox();
        if (mvex.boxes = [], media.duration !== Number.POSITIVE_INFINITY) {
            var mehd = new mp4lib.boxes.MovieExtendsHeaderBox();
            mehd.version = 1, mehd.flags = 0, mehd.fragment_duration = Math.round(media.duration * media.timescale), 
            mvex.boxes.push(mehd);
        }
        var trex = new mp4lib.boxes.TrackExtendsBox();
        return trex.track_ID = media.trackId, trex.default_sample_description_index = 1, 
        trex.default_sample_duration = 0, trex.default_sample_flags = 0, trex.default_sample_size = 0, 
        mvex.boxes.push(trex), mvex;
    }, createProtectionSystemSpecificHeaderBox = function(media) {
        var pssh = new mp4lib.boxes.ProtectionSystemSpecificHeaderBox();
        pssh.version = 0, pssh.flags = 0;
        var schemeIdUri = media.contentProtection.schemeIdUri.substring(8).replace(/[^A-Fa-f0-9]/g, "");
        pssh.SystemID = _hexstringtoBuffer(schemeIdUri);
        var array = BASE64.decodeArray(media.contentProtection.pro.__text);
        return pssh.DataSize = array.length, pssh.Data = array, pssh;
    }, doGenerateInitSegment = function(media) {
        var moov_file = new mp4lib.boxes.File();
        moov_file.boxes = [];
        var moov = new mp4lib.boxes.MovieBox();
        moov.boxes = [], moov.boxes.push(createMovieHeaderBox(media)), moov.boxes.push(createTrackBox(media)), 
        moov.boxes.push(createMovieExtendsBox(media)), void 0 != media.contentProtection && moov.boxes.push(createProtectionSystemSpecificHeaderBox(media)), 
        moov_file.boxes.push(createFileTypeBox()), moov_file.boxes.push(moov);
        var lp = new mp4lib.fieldProcessors.LengthCounterBoxFieldsProcessor(moov_file);
        moov_file._processFields(lp);
        var data = new Uint8Array(lp.res), sp = new mp4lib.fieldProcessors.SerializationBoxFieldsProcessor(moov_file, data, 0);
        return moov_file._processFields(sp), data;
    };
    return {
        generateInitSegment: doGenerateInitSegment
    };
}, MediaPlayer.dependencies.Mp4Processor.prototype = {
    constructor: MediaPlayer.dependencies.Mp4Processor
}, MediaPlayer.dependencies.ProtectionController = function() {
    "use strict";
    var element = null, keySystems = null, teardownKeySystem = function(kid) {
        var self = this;
        self.protectionModel.removeKeySystem(kid);
    }, selectKeySystem = function(codec, contentProtection) {
        for (var self = this, ks = 0; ks < keySystems.length; ++ks) for (var cp = 0; cp < contentProtection.length; ++cp) if (keySystems[ks].isSupported(contentProtection[cp]) && self.protectionExt.supportsCodec(keySystems[ks].keysTypeString, codec)) {
            var kid = self.manifestExt.getKID(contentProtection[cp]);
            return kid || (kid = "unknown"), self.protectionModel.addKeySystem(kid, contentProtection[cp], keySystems[ks]), 
            kid;
        }
        throw new Error("DRM: The protection system for this content is not supported.");
    }, ensureKeySession = function(kid, codec, eventInitData) {
        var self = this, session = null, initData = null;
        self.protectionModel.needToAddKeySession(kid) && (initData = self.protectionModel.getInitData(kid), 
        !initData && eventInitData && (initData = eventInitData), initData && (session = self.protectionModel.addKeySession(kid, codec, initData)));
    }, updateFromMessage = function(kid, session, msg, laURL) {
        var result, self = this;
        return result = self.protectionModel.updateFromMessage(kid, msg, laURL), result.then(function(data) {
            session.update(data);
        }), result;
    };
    return {
        system: void 0,
        debug: void 0,
        manifestExt: void 0,
        capabilities: void 0,
        videoModel: void 0,
        protectionModel: void 0,
        protectionExt: void 0,
        setup: function() {
            keySystems = this.protectionExt.getKeySystems();
        },
        init: function(videoModel, protectionModel) {
            this.videoModel = videoModel, this.protectionModel = protectionModel, element = this.videoModel.getElement();
        },
        selectKeySystem: selectKeySystem,
        ensureKeySession: ensureKeySession,
        updateFromMessage: updateFromMessage,
        teardownKeySystem: teardownKeySystem
    };
}, MediaPlayer.dependencies.ProtectionController.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionController
}, MediaPlayer.dependencies.ProtectionExtensions = function() {
    "use strict";
}, MediaPlayer.dependencies.ProtectionExtensions.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionExtensions,
    supportsCodec: function(mediaKeysString, codec) {
        "use strict";
        var hasWebKit = "WebKitMediaKeys" in window, hasMs = "MSMediaKeys" in window, hasMediaSource = "MediaKeys" in window;
        return hasMediaSource ? MediaKeys.isTypeSupported(mediaKeysString, codec) : hasWebKit ? WebKitMediaKeys.isTypeSupported(mediaKeysString, codec) : hasMs ? MSMediaKeys.isTypeSupported(mediaKeysString, codec) : !1;
    },
    createMediaKeys: function(mediaKeysString) {
        "use strict";
        var hasWebKit = "WebKitMediaKeys" in window, hasMs = "MSMediaKeys" in window, hasMediaSource = "MediaKeys" in window;
        return hasMediaSource ? new MediaKeys(mediaKeysString) : hasWebKit ? new WebKitMediaKeys(mediaKeysString) : hasMs ? new MSMediaKeys(mediaKeysString) : null;
    },
    setMediaKey: function(element, mediaKeys) {
        var hasWebKit = "WebKitSetMediaKeys" in element, hasMs = "msSetMediaKeys" in element, hasStd = "SetMediaKeys" in element;
        return hasStd ? element.SetMediaKeys(mediaKeys) : hasWebKit ? element.WebKitSetMediaKeys(mediaKeys) : hasMs ? element.msSetMediaKeys(mediaKeys) : void 0;
    },
    createSession: function(mediaKeys, mediaCodec, initData) {
        return mediaKeys.createSession(mediaCodec, initData);
    },
    getKeySystems: function() {
        var playreadyGetUpdate = function(msg, laURL) {
            var deferred = Q.defer(), decodedChallenge = null, headers = [], parser = new DOMParser(), xmlDoc = parser.parseFromString(msg, "application/xml");
            if (!xmlDoc.getElementsByTagName("Challenge")[0]) return deferred.reject("DRM: playready update, can not find Challenge in keyMessage"), 
            deferred.promise;
            var Challenge = xmlDoc.getElementsByTagName("Challenge")[0].childNodes[0].nodeValue;
            Challenge && (decodedChallenge = BASE64.decode(Challenge));
            var headerNameList = xmlDoc.getElementsByTagName("name"), headerValueList = xmlDoc.getElementsByTagName("value");
            if (headerNameList.length != headerValueList.length) return deferred.reject("DRM: playready update, invalid header name/value pair in keyMessage"), 
            deferred.promise;
            for (var i = 0; i < headerNameList.length; i++) headers[i] = {
                name: headerNameList[i].childNodes[0].nodeValue,
                value: headerValueList[i].childNodes[0].nodeValue
            };
            var xhr = new XMLHttpRequest();
            return xhr.onload = function() {
                200 == xhr.status ? deferred.resolve(new Uint8Array(xhr.response)) : deferred.reject('DRM: playready update, XHR status is "' + xhr.statusText + '" (' + xhr.status + "), expected to be 200. readyState is " + xhr.readyState);
            }, xhr.onabort = function() {
                deferred.reject('DRM: playready update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState);
            }, xhr.onerror = function() {
                deferred.reject('DRM: playready update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState);
            }, xhr.open("POST", laURL), xhr.responseType = "arraybuffer", headers && headers.forEach(function(hdr) {
                xhr.setRequestHeader(hdr.name, hdr.value);
            }), xhr.send(decodedChallenge), deferred.promise;
        }, playReadyNeedToAddKeySession = function(initData, keySessions) {
            return null === initData && 0 === keySessions.length;
        }, playreadyGetInitData = function(data) {
            var byteCursor = 0, PROSize = 0, PSSHSize = 0, PSSHBoxType = new Uint8Array([ 112, 115, 115, 104, 0, 0, 0, 0 ]), playreadySystemID = new Uint8Array([ 154, 4, 240, 121, 152, 64, 66, 134, 171, 146, 230, 91, 224, 136, 95, 149 ]), uint8arraydecodedPROHeader = null, PSSHBoxBuffer = null, PSSHBox = null, PSSHData = null;
            if ("pro" in data) uint8arraydecodedPROHeader = BASE64.decodeArray(data.pro.__text); else {
                if (!("prheader" in data)) return null;
                uint8arraydecodedPROHeader = BASE64.decodeArray(data.prheader.__text);
            }
            return PROSize = uint8arraydecodedPROHeader.length, PSSHSize = 4 + PSSHBoxType.length + playreadySystemID.length + 4 + PROSize, 
            PSSHBoxBuffer = new ArrayBuffer(PSSHSize), PSSHBox = new Uint8Array(PSSHBoxBuffer), 
            PSSHData = new DataView(PSSHBoxBuffer), PSSHData.setUint32(byteCursor, PSSHSize), 
            byteCursor += 4, PSSHBox.set(PSSHBoxType, byteCursor), byteCursor += PSSHBoxType.length, 
            PSSHBox.set(playreadySystemID, byteCursor), byteCursor += playreadySystemID.length, 
            PSSHData.setUint32(byteCursor, PROSize), byteCursor += 4, PSSHBox.set(uint8arraydecodedPROHeader, byteCursor), 
            byteCursor += PROSize, PSSHBox;
        };
        return [ {
            schemeIdUri: "urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95",
            keysTypeString: "com.microsoft.playready",
            isSupported: function(data) {
                return this.schemeIdUri === data.schemeIdUri.toLowerCase();
            },
            needToAddKeySession: playReadyNeedToAddKeySession,
            getInitData: playreadyGetInitData,
            getUpdate: playreadyGetUpdate
        }, {
            schemeIdUri: "urn:mpeg:dash:mp4protection:2011",
            keysTypeString: "com.microsoft.playready",
            isSupported: function(data) {
                return this.schemeIdUri === data.schemeIdUri.toLowerCase() && "cenc" === data.value.toLowerCase();
            },
            needToAddKeySession: playReadyNeedToAddKeySession,
            getInitData: function() {
                return null;
            },
            getUpdate: playreadyGetUpdate
        }, {
            schemeIdUri: "urn:uuid:00000000-0000-0000-0000-000000000000",
            keysTypeString: "webkit-org.w3.clearkey",
            isSupported: function(data) {
                return this.schemeIdUri === data.schemeIdUri.toLowerCase();
            },
            needToAddKeySession: function() {
                return !0;
            },
            getInitData: function() {
                return null;
            },
            getUpdate: function(msg) {
                return Q.when(msg);
            }
        } ];
    },
    addKey: function(element, type, key, data, id) {
        element.webkitAddKey(type, key, data, id);
    },
    generateKeyRequest: function(element, type, data) {
        element.webkitGenerateKeyRequest(type, data);
    },
    listenToNeedKey: function(videoModel, listener) {
        videoModel.listen("webkitneedkey", listener), videoModel.listen("msneedkey", listener), 
        videoModel.listen("needKey", listener);
    },
    listenToKeyError: function(source, listener) {
        source.addEventListener("webkitkeyerror", listener, !1), source.addEventListener("mskeyerror", listener, !1), 
        source.addEventListener("keyerror", listener, !1);
    },
    listenToKeyMessage: function(source, listener) {
        source.addEventListener("webkitkeymessage", listener, !1), source.addEventListener("mskeymessage", listener, !1), 
        source.addEventListener("keymessage", listener, !1);
    },
    listenToKeyAdded: function(source, listener) {
        source.addEventListener("webkitkeyadded", listener, !1), source.addEventListener("mskeyadded", listener, !1), 
        source.addEventListener("keyadded", listener, !1);
    },
    unlistenToKeyError: function(source, listener) {
        source.removeEventListener("webkitkeyerror", listener), source.removeEventListener("mskeyerror", listener), 
        source.removeEventListener("keyerror", listener);
    },
    unlistenToKeyMessage: function(source, listener) {
        source.removeEventListener("webkitkeymessage", listener), source.removeEventListener("mskeymessage", listener), 
        source.removeEventListener("keymessage", listener);
    },
    unlistenToKeyAdded: function(source, listener) {
        source.removeEventListener("webkitkeyadded", listener), source.removeEventListener("mskeyadded", listener), 
        source.removeEventListener("keyadded", listener);
    }
}, MediaPlayer.models.ProtectionModel = function() {
    "use strict";
    var element = null, keyAddedListener = null, keyErrorListener = null, keyMessageListener = null, keySystems = [];
    return {
        system: void 0,
        videoModel: void 0,
        protectionExt: void 0,
        setup: function() {
            element = this.videoModel.getElement();
        },
        init: function(videoModel) {
            this.videoModel = videoModel, element = this.videoModel.getElement();
        },
        addKeySession: function(kid, mediaCodec, initData) {
            var session = null;
            return session = this.protectionExt.createSession(keySystems[kid].keys, mediaCodec, initData), 
            this.protectionExt.listenToKeyAdded(session, keyAddedListener), this.protectionExt.listenToKeyError(session, keyErrorListener), 
            this.protectionExt.listenToKeyMessage(session, keyMessageListener), keySystems[kid].initData = initData, 
            keySystems[kid].keySessions.push(session), session;
        },
        addKeySystem: function(kid, contentProtectionData, keySystemDesc) {
            var keysLocal = null;
            keysLocal = this.protectionExt.createMediaKeys(keySystemDesc.keysTypeString), this.protectionExt.setMediaKey(element, keysLocal), 
            keySystems[kid] = {
                kID: kid,
                contentProtection: contentProtectionData,
                keySystem: keySystemDesc,
                keys: keysLocal,
                initData: null,
                keySessions: []
            };
        },
        removeKeySystem: function(kid) {
            if (null !== kid && void 0 !== keySystems[kid] && 0 !== keySystems[kid].keySessions.length) {
                for (var keySessions = keySystems[kid].keySessions, kss = 0; kss < keySessions.length; ++kss) this.protectionExt.unlistenToKeyError(keySessions[kss], keyErrorListener), 
                this.protectionExt.unlistenToKeyAdded(keySessions[kss], keyAddedListener), this.protectionExt.unlistenToKeyMessage(keySessions[kss], keyMessageListener), 
                keySessions[kss].close();
                keySystems[kid] = void 0;
            }
        },
        needToAddKeySession: function(kid) {
            var keySystem = null;
            return keySystem = keySystems[kid], keySystem.keySystem.needToAddKeySession(keySystem.initData, keySystem.keySessions);
        },
        getInitData: function(kid) {
            var keySystem = null;
            return keySystem = keySystems[kid], keySystem.keySystem.getInitData(keySystem.contentProtection);
        },
        updateFromMessage: function(kid, msg, laURL) {
            return keySystems[kid].keySystem.getUpdate(msg, laURL);
        },
        listenToNeedKey: function(listener) {
            this.protectionExt.listenToNeedKey(this.videoModel, listener);
        },
        listenToKeyError: function(listener) {
            keyErrorListener = listener;
            for (var ks = 0; ks < keySystems.length; ++ks) for (var keySessions = keySystems[ks].keySessions, kss = 0; kss < keySessions.length; ++kss) this.protectionExt.listenToKeyError(keySessions[kss], listener);
        },
        listenToKeyMessage: function(listener) {
            keyMessageListener = listener;
            for (var ks = 0; ks < keySystems.length; ++ks) for (var keySessions = keySystems[ks].keySessions, kss = 0; kss < keySessions.length; ++kss) this.protectionExt.listenToKeyMessage(keySessions[kss], listener);
        },
        listenToKeyAdded: function(listener) {
            keyAddedListener = listener;
            for (var ks = 0; ks < keySystems.length; ++ks) for (var keySessions = keySystems[ks].keySessions, kss = 0; kss < keySessions.length; ++kss) this.protectionExt.listenToKeyAdded(keySessions[kss], listener);
        }
    };
}, MediaPlayer.models.ProtectionModel.prototype = {
    constructor: MediaPlayer.models.ProtectionModel
}, MediaPlayer.dependencies.RequestScheduler = function() {
    "use strict";
    var schedulerModels = [], periodicExecuteInterval = null, periodicExecuteId = null, isCheckingForVideoTimeTriggersStarted = !1, PERIODICALLY_TRIGGERED_TASK = 0, WALL_TIME_TRIGGERED_TASK = 1, VIDEO_TIME_TRIGGERED_TASK = 2, setVideoTimeTrigger = function(executeContext, executeFunction, dueTime) {
        if (executeContext && executeFunction) {
            var schedulerModel;
            schedulerModel = registerSchedulerModel.call(this, executeContext, VIDEO_TIME_TRIGGERED_TASK), 
            schedulerModel.setScheduledTask(executeFunction), schedulerModel.setIsScheduled(!0), 
            schedulerModel.setExecuteTime(dueTime), isCheckingForVideoTimeTriggersStarted || startCheckingDueTimeForVideoTimeTrigger.call(this);
        }
    }, startCheckingDueTimeForVideoTimeTrigger = function() {
        var element = this.videoModel.getElement();
        this.schedulerExt.attachScheduleListener(element, checkDueTimeForVideoTimeTriggers.bind(this)), 
        this.schedulerExt.attachUpdateScheduleListener(element, onUpdateSchedule.bind(this)), 
        isCheckingForVideoTimeTriggersStarted = !0;
    }, checkDueTimeForVideoTimeTriggers = function() {
        var model, due, i, videoTimeTriggers = getAllModelsForType.call(this, VIDEO_TIME_TRIGGERED_TASK), ln = videoTimeTriggers.length, now = this.videoModel.getCurrentTime();
        for (i = 0; ln > i; i += 1) model = videoTimeTriggers[i], due = model.getExecuteTime(), 
        model.getIsScheduled() && now > due && (model.executeScheduledTask(), model.setIsScheduled(!1));
    }, removeVideoTimeTrigger = function(executeContext) {
        var videoTimeTriggers, schedulerModel = findSchedulerModel(executeContext, VIDEO_TIME_TRIGGERED_TASK);
        schedulerModel && (unregisterSchedulerModel(schedulerModel), videoTimeTriggers = getAllModelsForType.call(this, VIDEO_TIME_TRIGGERED_TASK), 
        0 === videoTimeTriggers.length && stopCheckingDueTimeForVideoTimeTrigger.call(this));
    }, stopCheckingDueTimeForVideoTimeTrigger = function() {
        var element = this.videoModel.getElement();
        this.schedulerExt.detachScheduleListener(element, checkDueTimeForVideoTimeTriggers.bind(this)), 
        this.schedulerExt.detachUpdateScheduleListener(element, onUpdateSchedule.bind(this)), 
        isCheckingForVideoTimeTriggersStarted = !1;
    }, onUpdateSchedule = function() {
        rescheduleVideoTimeTriggers.call(this), checkDueTimeForVideoTimeTriggers.call(this);
    }, rescheduleVideoTimeTriggers = function() {
        var i, videoTimeTriggers = getAllModelsForType.call(this, VIDEO_TIME_TRIGGERED_TASK), ln = videoTimeTriggers.length;
        for (i = 0; ln > i; i += 1) videoTimeTriggers[i].setIsScheduled(!0);
    }, setTriggerForWallTime = function(executeContext, executeFunction, wallTime) {
        if (executeContext && executeFunction) {
            var executeId, schedulerModel, executeTimeout = wallTime.getTime() - new Date().getTime();
            schedulerModel = registerSchedulerModel.call(this, executeContext, WALL_TIME_TRIGGERED_TASK), 
            schedulerModel.setScheduledTask(executeFunction), executeId = setTimeout(function() {
                schedulerModel.executeScheduledTask(), unregisterSchedulerModel(schedulerModel);
            }, executeTimeout), schedulerModel.setExecuteId(executeId);
        }
    }, removeTriggerForWallTime = function(executeContext) {
        var schedulerModel = findSchedulerModel(executeContext, WALL_TIME_TRIGGERED_TASK);
        schedulerModel && (clearTimeout(schedulerModel.getExecuteId()), unregisterSchedulerModel(schedulerModel));
    }, startScheduling = function(executeContext, executeFunction) {
        if (executeContext && executeFunction) {
            var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_TRIGGERED_TASK);
            schedulerModel || (schedulerModel = registerSchedulerModel.call(this, executeContext, PERIODICALLY_TRIGGERED_TASK)), 
            schedulerModel.setIsScheduled(!0), schedulerModel.setScheduledTask(executeFunction), 
            startPeriodicScheduleListener.call(this), executeFunction.call(executeContext);
        }
    }, onScheduledTimeOccurred = function() {
        runScheduledTasks.call(this);
    }, runScheduledTasks = function() {
        var schedulerModel, i, self = this, periodicModels = getAllModelsForType.call(self, PERIODICALLY_TRIGGERED_TASK), ln = periodicModels.length;
        for (i = 0; ln > i; i += 1) schedulerModel = periodicModels[i], schedulerModel.getIsScheduled() && schedulerModel.executeScheduledTask();
    }, startPeriodicScheduleListener = function() {
        null === periodicExecuteId && (this.adjustExecuteInterval(), periodicExecuteId = setInterval(onScheduledTimeOccurred.bind(this), periodicExecuteInterval));
    }, stopPeriodicScheduling = function(executeContext) {
        var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_TRIGGERED_TASK), periodicModels = getAllModelsForType.call(this, PERIODICALLY_TRIGGERED_TASK);
        schedulerModel && (unregisterSchedulerModel(schedulerModel), 0 === periodicModels.length && stopPeriodicScheduleListener.call(this));
    }, stopPeriodicScheduleListener = function() {
        clearInterval(periodicExecuteId), periodicExecuteId = null;
    }, registerSchedulerModel = function(executeContext, type) {
        if (!executeContext) return null;
        var model = this.system.getObject("schedulerModel");
        return model.setContext(executeContext), model.setType(type), schedulerModels.push(model), 
        model;
    }, getAllModelsForType = function(type) {
        var model, i, models = [];
        for (i = 0; i < schedulerModels.length; i += 1) model = schedulerModels[i], model.getType() === type && models.push(model);
        return models;
    }, unregisterSchedulerModel = function(schedulerModel) {
        var index = schedulerModels.indexOf(schedulerModel);
        -1 !== index && schedulerModels.splice(index, 1);
    }, findSchedulerModel = function(executeContext, type) {
        for (var i = 0; i < schedulerModels.length; i++) if (schedulerModels[i].getContext() === executeContext && schedulerModels[i].getType() === type) return schedulerModels[i];
        return null;
    };
    return {
        system: void 0,
        videoModel: void 0,
        debug: void 0,
        schedulerExt: void 0,
        isScheduled: function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_TRIGGERED_TASK);
            return !!schedulerModel && schedulerModel.getIsScheduled();
        },
        getExecuteInterval: function() {
            return periodicExecuteInterval;
        },
        adjustExecuteInterval: function() {
            if (!(schedulerModels.length < 1)) {
                var newExecuteInterval = this.schedulerExt.getExecuteInterval(schedulerModels[0].getContext());
                periodicExecuteInterval !== newExecuteInterval && (periodicExecuteInterval = newExecuteInterval, 
                null !== periodicExecuteId && (clearInterval(periodicExecuteId), periodicExecuteId = setInterval(onScheduledTimeOccurred.bind(this), periodicExecuteInterval)));
            }
        },
        startScheduling: startScheduling,
        stopScheduling: stopPeriodicScheduling,
        setTriggerForVideoTime: setVideoTimeTrigger,
        setTriggerForWallTime: setTriggerForWallTime,
        removeTriggerForVideoTime: removeVideoTimeTrigger,
        removeTriggerForWallTime: removeTriggerForWallTime
    };
}, MediaPlayer.dependencies.RequestScheduler.prototype = {
    constructor: MediaPlayer.dependencies.RequestScheduler
}, MediaPlayer.dependencies.SchedulerExtensions = function() {
    "use strict";
}, MediaPlayer.dependencies.SchedulerExtensions.prototype = {
    constructor: MediaPlayer.dependencies.SchedulerExtensions,
    getExecuteInterval: function(context) {
        var interval = 1e3;
        return "undefined" != typeof context.getMinBufferTime && (interval = 1e3 * context.getMinBufferTime() / 4, 
        interval = Math.max(interval, 1e3)), interval;
    },
    attachScheduleListener: function(element, scheduleListener) {
        element.addEventListener("timeupdate", scheduleListener);
    },
    detachScheduleListener: function(element, scheduleListener) {
        element.removeEventListener("timeupdate", scheduleListener);
    },
    attachUpdateScheduleListener: function(element, updateScheduleListener) {
        element.addEventListener("seeking", updateScheduleListener);
    },
    detachUpdateScheduleListener: function(element, updateScheduleListener) {
        element.removeEventListener("seeking", updateScheduleListener);
    }
}, MediaPlayer.dependencies.SchedulerModel = function() {
    "use strict";
    var context, scheduledTask, type, executeTime, executeId, isScheduled = !1;
    return {
        system: void 0,
        debug: void 0,
        schedulerExt: void 0,
        setContext: function(value) {
            context = value;
        },
        getContext: function() {
            return context;
        },
        setScheduledTask: function(value) {
            scheduledTask = value;
        },
        executeScheduledTask: function() {
            scheduledTask.call(context);
        },
        setExecuteTime: function(value) {
            executeTime = value;
        },
        getExecuteTime: function() {
            return executeTime;
        },
        setExecuteId: function(value) {
            executeId = value;
        },
        getExecuteId: function() {
            return executeId;
        },
        setType: function(value) {
            type = value;
        },
        getType: function() {
            return type;
        },
        setIsScheduled: function(value) {
            isScheduled = value;
        },
        getIsScheduled: function() {
            return isScheduled;
        }
    };
}, MediaPlayer.dependencies.SchedulerModel.prototype = {
    constructor: MediaPlayer.dependencies.SchedulerModel
}, MediaPlayer.dependencies.SourceBufferExtensions = function() {
    "use strict";
    this.system = void 0, this.manifestExt = void 0;
}, MediaPlayer.dependencies.SourceBufferExtensions.prototype = {
    constructor: MediaPlayer.dependencies.SourceBufferExtensions,
    createSourceBuffer: function(mediaSource, codec) {
        "use strict";
        var deferred = Q.defer(), self = this;
        try {
            deferred.resolve(mediaSource.addSourceBuffer(codec));
        } catch (ex) {
            self.manifestExt.getIsTextTrack(codec) ? deferred.resolve(self.system.getObject("textVTTSourceBuffer")) : deferred.reject(ex.description);
        }
        return deferred.promise;
    },
    removeSourceBuffer: function(mediaSource, buffer) {
        "use strict";
        var deferred = Q.defer();
        try {
            deferred.resolve(mediaSource.removeSourceBuffer(buffer));
        } catch (ex) {
            deferred.reject(ex.description);
        }
        return deferred.promise;
    },
    getBufferRange: function(buffer, time, tolerance) {
        "use strict";
        var len, i, ranges = null, start = 0, end = 0, firstStart = null, lastEnd = null, gap = 0, toler = tolerance || .15;
        try {
            ranges = buffer.buffered;
        } catch (ex) {
            return Q.when(null);
        }
        if (null !== ranges) {
            for (i = 0, len = ranges.length; len > i; i += 1) if (start = ranges.start(i), end = ranges.end(i), 
            null === firstStart) {
                if (gap = Math.abs(start - time), time >= start && end > time) {
                    firstStart = start, lastEnd = end;
                    continue;
                }
                if (toler >= gap) {
                    firstStart = start, lastEnd = end;
                    continue;
                }
            } else {
                if (gap = start - lastEnd, !(toler >= gap)) break;
                lastEnd = end;
            }
            if (null !== firstStart) return Q.when({
                start: firstStart,
                end: lastEnd
            });
        }
        return Q.when(null);
    },
    getAllRanges: function(buffer) {
        var ranges = null;
        try {
            return ranges = buffer.buffered, Q.when(ranges);
        } catch (ex) {
            return Q.when(null);
        }
    },
    getBufferLength: function(buffer, time, tolerance) {
        "use strict";
        var self = this, deferred = Q.defer();
        return self.getBufferRange(buffer, time, tolerance).then(function(range) {
            deferred.resolve(null === range ? 0 : range.end - time);
        }), deferred.promise;
    },
    waitForUpdateEnd: function(buffer) {
        "use strict";
        var intervalId, defer = Q.defer(), CHECK_INTERVAL = 50, checkIsUpdateEnded = function() {
            buffer.updating || (clearInterval(intervalId), defer.resolve(!0));
        }, updateEndHandler = function() {
            buffer.removeEventListener("updateend", updateEndHandler, !1), defer.resolve(!0);
        };
        if (buffer.hasOwnProperty("addEventListener")) try {
            buffer.addEventListener("updateend", updateEndHandler, !1);
        } catch (err) {
            intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
        } else intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
        return defer.promise;
    },
    append: function(buffer, bytes) {
        var deferred = Q.defer();
        try {
            "append" in buffer ? buffer.append(bytes) : "appendBuffer" in buffer && buffer.appendBuffer(bytes), 
            this.waitForUpdateEnd(buffer).then(function() {
                deferred.resolve();
            });
        } catch (err) {
            deferred.reject({
                err: err,
                data: bytes
            });
        }
        return deferred.promise;
    },
    remove: function(buffer, start, end, duration, mediaSource) {
        var deferred = Q.defer();
        try {
            start >= 0 && duration > start && end > start && "ended" !== mediaSource.readyState && buffer.remove(start, end), 
            this.waitForUpdateEnd(buffer).then(function() {
                deferred.resolve();
            });
        } catch (err) {
            deferred.reject(err);
        }
        return deferred.promise;
    },
    abort: function(mediaSource, buffer) {
        "use strict";
        var deferred = Q.defer();
        try {
            "open" === mediaSource.readyState && buffer.abort(), deferred.resolve();
        } catch (ex) {
            deferred.reject(ex.description);
        }
        return deferred.promise;
    }
}, MediaPlayer.dependencies.Stream = function() {
    "use strict";
    var manifest, mediaSource, load, loadedListener, playListener, pauseListener, errorListener, seekingListener, seekedListener, timeupdateListener, progressListener, ratechangeListener, needKeyListener, keyMessageListener, keyAddedListener, keyErrorListener, videoCodec = null, audioCodec = null, contentProtection = null, videoController = null, videoTrackIndex = -1, audioController = null, audioTrackIndex = -1, textController = null, textTrackIndex = -1, autoPlay = !0, initialized = !1, errored = !1, kid = null, initData = [], periodInfo = null, play = function() {
        initialized && this.videoModel.play();
    }, pause = function() {
        this.videoModel.pause();
    }, seek = function(time) {
        initialized && (this.system.notify("setCurrentTime"), this.videoModel.setCurrentTime(time), 
        videoController && videoController.seek(time), audioController && audioController.seek(time));
    }, onMediaSourceNeedsKey = function(event) {
        var type, self = this;
        if (type = "msneedkey" !== event.type ? event.type : videoCodec, initData.push({
            type: type,
            initData: event.initData
        }), contentProtection && videoCodec && !kid) try {
            kid = self.protectionController.selectKeySystem(videoCodec, contentProtection);
        } catch (error) {
            pause.call(self), self.errHandler.mediaKeySystemSelectionError(error);
        }
        kid && self.protectionController.ensureKeySession(kid, type, event.initData);
    }, onMediaSourceKeyMessage = function(event) {
        var self = this, session = null, bytes = null, msg = null, laURL = null;
        session = event.target, bytes = new Uint16Array(event.message.buffer), msg = String.fromCharCode.apply(null, bytes), 
        laURL = event.destinationURL;
        var manifest = self.manifestModel.getValue();
        void 0 !== manifest.backUrl && (laURL = manifest.backUrl), self.protectionController.updateFromMessage(kid, session, msg, laURL).fail(function(error) {
            pause.call(self), self.errHandler.mediaKeyMessageError(error);
        });
    }, onMediaSourceKeyAdded = function() {}, onMediaSourceKeyError = function() {
        var msg, session = event.target;
        switch (msg = "DRM: MediaKeyError - sessionId: " + session.sessionId + " errorCode: " + session.error.code + " systemErrorCode: " + session.error.systemCode + " [", 
        session.error.code) {
          case 1:
            msg += "MEDIA_KEYERR_UNKNOWN - An unspecified error occurred. This value is used for errors that don't match any of the other codes.";
            break;

          case 2:
            msg += "MEDIA_KEYERR_CLIENT - The Key System could not be installed or updated.";
            break;

          case 3:
            msg += "MEDIA_KEYERR_SERVICE - The message passed into update indicated an error from the license service.";
            break;

          case 4:
            msg += "MEDIA_KEYERR_OUTPUT - There is no available output device with the required characteristics for the content protection system.";
            break;

          case 5:
            msg += "MEDIA_KEYERR_HARDWARECHANGE - A hardware configuration change caused a content protection error.";
            break;

          case 6:
            msg += "MEDIA_KEYERR_DOMAIN - An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.";
        }
        msg += "]", this.errHandler.mediaKeySessionError(msg);
    }, setUpMediaSource = function(mediaSourceArg) {
        var deferred = Q.defer(), self = this, onMediaSourceOpen = function(e) {
            mediaSourceArg.removeEventListener("sourceopen", onMediaSourceOpen), mediaSourceArg.removeEventListener("webkitsourceopen", onMediaSourceOpen), 
            deferred.resolve(mediaSourceArg);
        };
        return mediaSourceArg.addEventListener("sourceopen", onMediaSourceOpen, !1), mediaSourceArg.addEventListener("webkitsourceopen", onMediaSourceOpen, !1), 
        self.mediaSourceExt.attachMediaSource(mediaSourceArg, self.videoModel), deferred.promise;
    }, tearDownMediaSource = function() {
        var self = this;
        videoController && videoController.reset(errored), audioController && audioController.reset(errored), 
        mediaSource && self.mediaSourceExt.detachMediaSource(self.videoModel), initialized = !1, 
        kid = null, initData = [], contentProtection = null, videoController = null, audioController = null, 
        textController = null, videoCodec = null, audioCodec = null, mediaSource = null, 
        manifest = null;
    }, checkIfInitialized = function(videoReady, audioReady, textTrackReady, deferred) {
        if (videoReady && audioReady && textTrackReady) if (null === videoController && null === audioController && null === textController) {
            var msg = "No streams to play.";
            this.errHandler.manifestError(msg, "nostreams", manifest), deferred.reject();
        } else deferred.resolve(!0);
    }, initializeMediaSource = function() {
        var initialize = Q.defer(), videoReady = !1, audioReady = !1, textTrackReady = !1, self = this, manifest = self.manifestModel.getValue();
        return self.manifestExt.getDuration(manifest, periodInfo).then(function() {
            self.manifestExt.getVideoData(manifest, periodInfo.index).then(function(videoData) {
                return null !== videoData ? (self.manifestExt.getDataIndex(videoData, manifest, periodInfo.index).then(function(index) {
                    videoTrackIndex = index;
                }), self.manifestExt.getCodec(videoData).then(function(codec) {
                    return videoCodec = codec, self.manifestExt.getContentProtectionData(videoData).then(function(contentProtectionData) {
                        if (contentProtectionData && !self.capabilities.supportsMediaKeys()) return self.errHandler.capabilityError("mediakeys"), 
                        Q.when(null);
                        if (contentProtection = contentProtectionData, !self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                            var msg = "Video Codec (" + codec + ") is not supported.";
                            return self.errHandler.manifestError(msg, "codec", manifest), Q.when(null);
                        }
                        return self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                    });
                }).then(function(buffer) {
                    null === buffer || (videoController = self.system.getObject("bufferController"), 
                    videoController.initialize("video", periodInfo, videoData, buffer, self.videoModel, self.requestScheduler, self.fragmentController, mediaSource)), 
                    videoReady = !0, checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                }, function() {
                    self.errHandler.mediaSourceError("Error creating video source buffer."), videoReady = !0, 
                    checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                })) : (videoReady = !0, checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize)), 
                self.manifestExt.getAudioDatas(manifest, periodInfo.index);
            }).then(function(audioDatas) {
                return null !== audioDatas && audioDatas.length > 0 ? self.manifestExt.getPrimaryAudioData(manifest, periodInfo.index).then(function(primaryAudioData) {
                    self.manifestExt.getDataIndex(primaryAudioData, manifest, periodInfo.index).then(function(index) {
                        audioTrackIndex = index;
                    }), self.manifestExt.getCodec(primaryAudioData).then(function(codec) {
                        return audioCodec = codec, self.manifestExt.getContentProtectionData(primaryAudioData).then(function(contentProtectionData) {
                            if (contentProtectionData && !self.capabilities.supportsMediaKeys()) return self.errHandler.capabilityError("mediakeys"), 
                            Q.when(null);
                            if (contentProtection = contentProtectionData, !self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                var msg = "Audio Codec (" + codec + ") is not supported.";
                                return self.errHandler.manifestError(msg, "codec", manifest), Q.when(null);
                            }
                            return self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                        });
                    }).then(function(buffer) {
                        null === buffer || (audioController = self.system.getObject("bufferController"), 
                        audioController.initialize("audio", periodInfo, primaryAudioData, buffer, self.videoModel, self.requestScheduler, self.fragmentController, mediaSource)), 
                        audioReady = !0, checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                    }, function() {
                        self.errHandler.mediaSourceError("Error creating audio source buffer."), audioReady = !0, 
                        checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                    });
                }) : (audioReady = !0, checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize)), 
                self.manifestExt.getTextData(manifest, periodInfo.index);
            }).then(function(textData) {
                var mimeType;
                null !== textData ? (self.manifestExt.getDataIndex(textData, manifest, periodInfo.index).then(function(index) {
                    textTrackIndex = index;
                }), self.manifestExt.getMimeType(textData).then(function(type) {
                    return mimeType = type, self.sourceBufferExt.createSourceBuffer(mediaSource, mimeType);
                }).then(function(buffer) {
                    null === buffer || (textController = self.system.getObject("textController"), textController.initialize(periodInfo.index, textData, buffer, self.videoModel), 
                    buffer.hasOwnProperty("initialize") && buffer.initialize(mimeType, textController), 
                    textTrackReady = !0, checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize));
                }, function(error) {
                    self.errHandler.mediaSourceError("Error creating text source buffer."), textTrackReady = !0, 
                    checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                })) : (textTrackReady = !0, checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize));
            });
        }), initialize.promise;
    }, initializePlayback = function() {
        var self = this, initialize = Q.defer();
        return self.manifestExt.getDuration(self.manifestModel.getValue(), periodInfo).then(function(duration) {
            return self.mediaSourceExt.setDuration(mediaSource, duration);
        }).then(function() {
            initialized = !0, initialize.resolve(!0);
        }), initialize.promise;
    }, onLoad = function() {
        var initialSeekTime = this.timelineConverter.calcPresentationStartTime(periodInfo);
        initialSeekTime != this.videoModel.getCurrentTime() && (this.system.notify("setCurrentTime"), 
        this.videoModel.setCurrentTime(initialSeekTime)), load.resolve(null);
    }, onPlay = function() {}, onPause = function() {
        this.scheduleWhilePaused || stopBuffering.call(this);
    }, onError = function(event) {
        var error = event.srcElement.error, code = error.code, msg = "";
        if (-1 !== code) {
            switch (code) {
              case 1:
                msg = "MEDIA_ERR_ABORTED";
                break;

              case 2:
                msg = "MEDIA_ERR_NETWORK";
                break;

              case 3:
                msg = "MEDIA_ERR_DECODE";
                break;

              case 4:
                msg = "MEDIA_ERR_SRC_NOT_SUPPORTED";
                break;

              case 5:
                msg = "MEDIA_ERR_ENCRYPTED";
            }
            errored = !0, this.errHandler.mediaSourceError(msg), this.reset();
        }
    }, onSeeking = function() {
        var time = this.videoModel.getCurrentTime();
        videoController && videoController.seek(time), audioController && audioController.seek(time);
    }, onSeeked = function() {
        this.videoModel.listen("seeking", seekingListener), this.videoModel.unlisten("seeked", seekedListener);
    }, onProgress = function() {
        updateBuffer.call(this);
    }, onTimeupdate = function() {
        updateBuffer.call(this);
    }, onRatechange = function() {
        videoController && videoController.updateStalledState(), audioController && audioController.updateStalledState();
    }, updateBuffer = function() {
        videoController && videoController.updateBufferState(), audioController && audioController.updateBufferState();
    }, stopBuffering = function() {
        videoController && videoController.stop(), audioController && audioController.stop();
    }, doLoad = function(manifestResult) {
        var self = this;
        return manifest = manifestResult, self.mediaSourceExt.createMediaSource().then(function(mediaSourceResult) {
            return setUpMediaSource.call(self, mediaSourceResult);
        }).then(function(mediaSourceResult) {
            return mediaSource = mediaSourceResult, initializeMediaSource.call(self);
        }).then(function() {
            return initializePlayback.call(self);
        }).then(function() {
            return load.promise;
        }).then(function() {
            0 === periodInfo.index && autoPlay && play.call(self);
        });
    }, currentTimeChanged = function() {
        this.videoModel.unlisten("seeking", seekingListener), this.videoModel.listen("seeked", seekedListener);
    }, bufferingCompleted = function() {
        videoController && !videoController.isBufferingCompleted() || audioController && !audioController.isBufferingCompleted() || mediaSource && this.mediaSourceExt.signalEndOfStream(mediaSource);
    }, segmentLoadingFailed = function() {
        stopBuffering.call(this);
    }, onLiveEdgeFound = function() {
        var liveEdgeTime = this.timelineConverter.calcPresentationStartTime(periodInfo);
        videoController && videoController.seek(liveEdgeTime), audioController && audioController.seek(liveEdgeTime);
    }, updateData = function(updatedPeriodInfo) {
        var videoData, audioData, deferredVideoData, deferredAudioData, self = this, deferredVideoUpdate = Q.defer(), deferredAudioUpdate = Q.defer(), manifest = self.manifestModel.getValue();
        return periodInfo = updatedPeriodInfo, videoController ? (videoData = videoController.getData(), 
        deferredVideoData = videoData && videoData.hasOwnProperty("id") ? self.manifestExt.getDataForId(videoData.id, manifest, periodInfo.index) : self.manifestExt.getDataForIndex(videoTrackIndex, manifest, periodInfo.index), 
        deferredVideoData.then(function(data) {
            videoController.updateData(data, periodInfo).then(function() {
                deferredVideoUpdate.resolve();
            });
        })) : deferredVideoUpdate.resolve(), audioController ? (audioData = audioController.getData(), 
        deferredAudioData = audioData && audioData.hasOwnProperty("id") ? self.manifestExt.getDataForId(audioData.id, manifest, periodInfo.index) : self.manifestExt.getDataForIndex(audioTrackIndex, manifest, periodInfo.index), 
        deferredAudioData.then(function(data) {
            audioController.updateData(data, periodInfo).then(function() {
                deferredAudioUpdate.resolve();
            });
        })) : deferredAudioUpdate.resolve(), Q.when(deferredVideoUpdate.promise, deferredAudioUpdate.promise);
    };
    return {
        system: void 0,
        videoModel: void 0,
        manifestLoader: void 0,
        manifestModel: void 0,
        mediaSourceExt: void 0,
        sourceBufferExt: void 0,
        bufferExt: void 0,
        manifestExt: void 0,
        fragmentController: void 0,
        abrController: void 0,
        fragmentExt: void 0,
        protectionModel: void 0,
        protectionController: void 0,
        protectionExt: void 0,
        capabilities: void 0,
        debug: void 0,
        metricsExt: void 0,
        errHandler: void 0,
        timelineConverter: void 0,
        requestScheduler: void 0,
        scheduleWhilePaused: void 0,
        setup: function() {
            this.system.mapHandler("setCurrentTime", void 0, currentTimeChanged.bind(this)), 
            this.system.mapHandler("bufferingCompleted", void 0, bufferingCompleted.bind(this)), 
            this.system.mapHandler("segmentLoadingFailed", void 0, segmentLoadingFailed.bind(this)), 
            this.system.mapHandler("liveEdgeFound", void 0, onLiveEdgeFound.bind(this)), load = Q.defer(), 
            playListener = onPlay.bind(this), pauseListener = onPause.bind(this), errorListener = onError.bind(this), 
            seekingListener = onSeeking.bind(this), seekedListener = onSeeked.bind(this), progressListener = onProgress.bind(this), 
            ratechangeListener = onRatechange.bind(this), timeupdateListener = onTimeupdate.bind(this), 
            loadedListener = onLoad.bind(this);
        },
        load: function(manifest, periodInfoValue) {
            periodInfo = periodInfoValue, doLoad.call(this, manifest);
        },
        setVideoModel: function(value) {
            this.videoModel = value, this.videoModel.listen("play", playListener), this.videoModel.listen("pause", pauseListener), 
            this.videoModel.listen("error", errorListener), this.videoModel.listen("seeking", seekingListener), 
            this.videoModel.listen("timeupdate", timeupdateListener), this.videoModel.listen("progress", progressListener), 
            this.videoModel.listen("ratechange", ratechangeListener), this.videoModel.listen("loadedmetadata", loadedListener), 
            this.requestScheduler.videoModel = value;
        },
        setAudioTrack: function(audioTrack) {
            var deferredAudioUpdate = Q.defer(), self = this;
            return audioController ? audioController.emptyBuffer().then(function() {
                audioController.updateData(audioTrack, periodInfo, self.videoModel.getCurrentTime() + 3).then(function() {
                    deferredAudioUpdate.resolve();
                });
            }) : deferredAudioUpdate.reject(), deferredAudioUpdate.promise;
        },
        initProtection: function() {
            needKeyListener = onMediaSourceNeedsKey.bind(this), keyMessageListener = onMediaSourceKeyMessage.bind(this), 
            keyAddedListener = onMediaSourceKeyAdded.bind(this), keyErrorListener = onMediaSourceKeyError.bind(this), 
            this.protectionModel = this.system.getObject("protectionModel"), this.protectionModel.init(this.getVideoModel()), 
            this.protectionController = this.system.getObject("protectionController"), this.protectionController.init(this.videoModel, this.protectionModel), 
            this.protectionModel.listenToNeedKey(needKeyListener), this.protectionModel.listenToKeyMessage(keyMessageListener), 
            this.protectionModel.listenToKeyError(keyErrorListener), this.protectionModel.listenToKeyAdded(keyAddedListener);
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        getManifestExt: function() {
            var self = this;
            return self.manifestExt;
        },
        setAutoPlay: function(value) {
            autoPlay = value;
        },
        getAutoPlay: function() {
            return autoPlay;
        },
        reset: function() {
            pause.call(this), this.videoModel.unlisten("play", playListener), this.videoModel.unlisten("pause", pauseListener), 
            this.videoModel.unlisten("error", errorListener), this.videoModel.unlisten("seeking", seekingListener), 
            this.videoModel.unlisten("timeupdate", timeupdateListener), this.videoModel.unlisten("progress", progressListener), 
            this.videoModel.unlisten("loadedmetadata", loadedListener), tearDownMediaSource.call(this), 
            this.protectionController && this.protectionController.teardownKeySystem(kid), this.protectionController = void 0, 
            this.protectionModel = void 0, this.fragmentController = void 0, this.requestScheduler = void 0, 
            load = Q.defer();
        },
        getDuration: function() {
            return periodInfo.duration;
        },
        getStartTime: function() {
            return periodInfo.start;
        },
        getPeriodIndex: function() {
            return periodInfo.index;
        },
        getId: function() {
            return periodInfo.id;
        },
        getPeriodInfo: function() {
            return periodInfo;
        },
        updateData: updateData,
        play: play,
        seek: seek,
        pause: pause
    };
}, MediaPlayer.dependencies.Stream.prototype = {
    constructor: MediaPlayer.dependencies.Stream
}, MediaPlayer.dependencies.StreamController = function() {
    "use strict";
    var activeStream, timeupdateListener, seekingListener, progressListener, audioTracks, streams = [], STREAM_BUFFER_END_THRESHOLD = 4, STREAM_END_THRESHOLD = 3, autoPlay = !0, deferredSwitch = null, play = function() {
        activeStream.play();
    }, pause = function() {
        activeStream.pause();
    }, seek = function(time) {
        activeStream.seek(time);
    }, switchVideoModel = function(fromVideoModel, toVideoModel) {
        var activeVideoElement = fromVideoModel.getElement(), newVideoElement = toVideoModel.getElement();
        return newVideoElement.parentNode || activeVideoElement.parentNode.insertBefore(newVideoElement, activeVideoElement), 
        activeVideoElement.style.width = "0px", newVideoElement.style.width = "100%", copyVideoProperties(activeVideoElement, newVideoElement), 
        detachVideoEvents.call(this, fromVideoModel), attachVideoEvents.call(this, toVideoModel), 
        Q.when(!0);
    }, attachVideoEvents = function(videoModel) {
        videoModel.listen("seeking", seekingListener), videoModel.listen("progress", progressListener), 
        getNextStream() && videoModel.listen("timeupdate", timeupdateListener);
    }, detachVideoEvents = function(videoModel) {
        videoModel.unlisten("seeking", seekingListener), videoModel.unlisten("progress", progressListener), 
        videoModel.unlisten("timeupdate", timeupdateListener);
    }, copyVideoProperties = function(fromVideoElement, toVideoElement) {
        [ "controls", "loop", "muted", "playbackRate", "volume" ].forEach(function(prop) {
            toVideoElement[prop] = fromVideoElement[prop];
        });
    }, onProgress = function() {
        var ranges = activeStream.getVideoModel().getElement().buffered;
        if (ranges.length) {
            var lastRange = ranges.length - 1, bufferEndTime = ranges.end(lastRange), remainingBufferDuration = activeStream.getStartTime() + activeStream.getDuration() - bufferEndTime;
            STREAM_BUFFER_END_THRESHOLD > remainingBufferDuration && (activeStream.getVideoModel().unlisten("progress", progressListener), 
            onStreamBufferingEnd());
        }
    }, onTimeupdate = function() {
        if (!activeStream.getVideoModel().getElement().seeking) {
            var streamEndTime = activeStream.getStartTime() + activeStream.getDuration(), currentTime = activeStream.getVideoModel().getCurrentTime();
            STREAM_END_THRESHOLD > streamEndTime - currentTime && switchStream.call(this, activeStream, getNextStream());
        }
    }, onSeeking = function() {
        var seekingTime = activeStream.getVideoModel().getCurrentTime(), seekingStream = getStreamForTime(seekingTime);
        seekingStream && seekingStream !== activeStream && switchStream.call(this, activeStream, seekingStream, seekingTime);
    }, onStreamBufferingEnd = function() {
        var nextStream = getNextStream();
        nextStream && nextStream.seek(nextStream.getStartTime());
    }, getNextStream = function() {
        var nextIndex = activeStream.getPeriodIndex() + 1;
        return nextIndex < streams.length ? streams[nextIndex] : null;
    }, getStreamForTime = function(time) {
        var duration = 0, stream = null, ln = streams.length;
        ln > 0 && (duration += streams[0].getStartTime());
        for (var i = 0; ln > i; i++) if (stream = streams[i], duration += stream.getDuration(), 
        duration > time) return stream;
    }, createVideoModel = function() {
        var model = this.system.getObject("videoModel"), video = document.createElement("video");
        return model.setElement(video), model;
    }, removeVideoElement = function(element) {
        element.parentNode && element.parentNode.removeChild(element);
    }, switchStream = function(from, to, seekTo) {
        if (from && to && from !== to) {
            var self = this;
            Q.when(deferredSwitch || !0).then(function() {
                from.pause(), activeStream = to, deferredSwitch = switchVideoModel.call(self, from.getVideoModel(), to.getVideoModel()), 
                seek(seekTo ? from.getVideoModel().getCurrentTime() : to.getStartTime()), play();
            });
        }
    }, composeStreams = function() {
        var pLen, sLen, pIdx, sIdx, period, stream, self = this, manifest = self.manifestModel.getValue(), deferred = Q.defer(), updatedStreams = [];
        return manifest ? (self.manifestExt.getMpd(manifest).then(function(mpd) {
            self.manifestExt.getRegularPeriods(manifest, mpd).then(function(periods) {
                for (pIdx = 0, pLen = periods.length; pLen > pIdx; pIdx += 1) {
                    for (period = periods[pIdx], sIdx = 0, sLen = streams.length; sLen > sIdx; sIdx += 1) streams[sIdx].getId() === period.id && (stream = streams[sIdx], 
                    updatedStreams.push(stream.updateData(period)));
                    stream || (stream = self.system.getObject("stream"), stream.setVideoModel(0 === pIdx ? self.videoModel : createVideoModel.call(self)), 
                    stream.initProtection(), stream.setAutoPlay(autoPlay), stream.load(manifest, period), 
                    streams.push(stream)), stream = null;
                }
                activeStream || (activeStream = streams[0], attachVideoEvents.call(self, activeStream.getVideoModel())), 
                Q.all(updatedStreams).then(function() {
                    deferred.resolve();
                });
            });
        }), deferred.promise) : Q.when(!1);
    }, updateAudioTracks = function() {
        if (activeStream) {
            var self = this;
            self.manifestExt.getAudioDatas(self.manifestModel.getValue(), activeStream.getPeriodIndex()).then(function(audiosDatas) {
                audioTracks = audiosDatas, self.system.notify("audioTracksUpdated");
            });
        }
    }, manifestHasUpdated = function() {
        var self = this;
        composeStreams.call(self).then(function() {
            updateAudioTracks.call(self), self.system.notify("streamsComposed");
        });
    };
    return {
        system: void 0,
        videoModel: void 0,
        manifestLoader: void 0,
        manifestUpdater: void 0,
        manifestModel: void 0,
        mediaSourceExt: void 0,
        sourceBufferExt: void 0,
        bufferExt: void 0,
        manifestExt: void 0,
        fragmentController: void 0,
        abrController: void 0,
        fragmentExt: void 0,
        capabilities: void 0,
        debug: void 0,
        metricsExt: void 0,
        errHandler: void 0,
        backUrl: void 0,
        setup: function() {
            this.system.mapHandler("manifestUpdated", void 0, manifestHasUpdated.bind(this)), 
            timeupdateListener = onTimeupdate.bind(this), progressListener = onProgress.bind(this), 
            seekingListener = onSeeking.bind(this);
        },
        getManifestExt: function() {
            return activeStream.getManifestExt();
        },
        setAutoPlay: function(value) {
            autoPlay = value;
        },
        getAutoPlay: function() {
            return autoPlay;
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        getAudioTracks: function() {
            return audioTracks;
        },
        setAudioTrack: function(audioTrack) {
            activeStream && activeStream.setAudioTrack(audioTrack);
        },
        load: function(url, backUrl) {
            var self = this;
            self.backUrl = backUrl, self.manifestLoader.load(url).then(function(manifest) {
                void 0 !== self.backUrl && (manifest.backUrl = self.backUrl), self.manifestModel.setValue(manifest), 
                self.manifestUpdater.init();
            }, function() {
                self.reset();
            });
        },
        reset: function() {
            activeStream && detachVideoEvents.call(this, activeStream.getVideoModel());
            for (var i = 0, ln = streams.length; ln > i; i++) {
                var stream = streams[i];
                stream.reset(), stream !== activeStream && removeVideoElement(stream.getVideoModel().getElement());
            }
            streams = [], this.manifestUpdater.stop(), this.manifestModel.setValue(null), deferredSwitch = null, 
            activeStream = null;
        },
        play: play,
        seek: seek,
        pause: pause
    };
}, MediaPlayer.dependencies.StreamController.prototype = {
    constructor: MediaPlayer.dependencies.StreamController
}, MediaPlayer.models.VideoModel = function() {
    "use strict";
    var element, stalledStreams = [], isStalled = function() {
        return stalledStreams.length > 0;
    }, addStalledStream = function(type) {
        null !== type && (element.playbackRate = 0, stalledStreams[type] !== !0 && (stalledStreams.push(type), 
        stalledStreams[type] = !0));
    }, removeStalledStream = function(type) {
        if (null !== type) {
            stalledStreams[type] = !1;
            var index = stalledStreams.indexOf(type);
            -1 !== index && stalledStreams.splice(index, 1), isStalled() === !1 && (element.playbackRate = 1);
        }
    }, stallStream = function(type, isStalled) {
        isStalled ? addStalledStream(type) : removeStalledStream(type);
    };
    return {
        system: void 0,
        setup: function() {},
        play: function() {
            element.play();
        },
        pause: function() {
            element.pause();
        },
        isPaused: function() {
            return element.paused;
        },
        getPlaybackRate: function() {
            return element.playbackRate;
        },
        setPlaybackRate: function(value) {
            element.playbackRate = value;
        },
        getCurrentTime: function() {
            return element.currentTime;
        },
        setCurrentTime: function(currentTime) {
            element.currentTime != currentTime && (element.currentTime = currentTime);
        },
        listen: function(type, callback) {
            element.addEventListener(type, callback, !1);
        },
        unlisten: function(type, callback) {
            element.removeEventListener(type, callback, !1);
        },
        getElement: function() {
            return element;
        },
        setElement: function(value) {
            element = value;
        },
        setSource: function(source) {
            element.src = source;
        },
        isStalled: function() {
            return 0 === element.playbackRate;
        },
        stallStream: stallStream
    };
}, MediaPlayer.models.VideoModel.prototype = {
    constructor: MediaPlayer.models.VideoModel
}, MediaPlayer.dependencies.VideoModelExtensions = function() {
    "use strict";
    return {
        getDroppedFrames: function(videoElement) {
            var hasWebKit = null !== videoElement.webkitDroppedFrameCount, droppedFrameCount = -1;
            return hasWebKit && (droppedFrameCount = videoElement.webkitDroppedFrameCount), 
            droppedFrameCount;
        }
    };
}, MediaPlayer.dependencies.VideoModelExtensions.prototype = {
    constructor: MediaPlayer.dependencies.VideoModelExtensions
}, MediaPlayer.dependencies.TextController = function() {
    var data, buffer, LOADING = "LOADING", READY = "READY", initialized = !1, periodInfo = null, state = READY, setState = function(value) {
        state = value;
    }, startPlayback = function() {
        if (initialized && state === READY) {
            var self = this;
            setState.call(self, LOADING), self.indexHandler.getInitRequest(0, data).then(function(request) {
                self.fragmentLoader.load(request).then(onBytesLoaded.bind(self, request), onBytesError.bind(self, request)), 
                setState.call(self, LOADING);
            });
        }
    }, doStart = function() {
        startPlayback.call(this);
    }, onBytesLoaded = function(request, response) {
        var self = this;
        self.fragmentController.process(response.data, request).then(function(data) {
            null !== data && self.sourceBufferExt.append(buffer, data, self.videoModel);
        });
    }, onBytesError = function() {};
    return {
        videoModel: void 0,
        fragmentLoader: void 0,
        fragmentController: void 0,
        indexHandler: void 0,
        sourceBufferExt: void 0,
        debug: void 0,
        initialize: function(periodInfo, data, buffer, videoModel) {
            var self = this;
            self.setVideoModel(videoModel), self.setPeriodInfo(periodInfo), self.setData(data), 
            self.setBuffer(buffer), initialized = !0;
        },
        setPeriodInfo: function(value) {
            periodInfo = value;
        },
        getPeriodIndex: function() {
            return periodInfo.index;
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        getData: function() {
            return data;
        },
        setData: function(value) {
            data = value;
        },
        getBuffer: function() {
            return buffer;
        },
        setBuffer: function(value) {
            buffer = value;
        },
        reset: function(errored, source) {
            errored || (this.sourceBufferExt.abort(source, buffer), this.sourceBufferExt.removeSourceBuffer(source, buffer));
        },
        start: doStart
    };
}, MediaPlayer.dependencies.TextController.prototype = {
    constructor: MediaPlayer.dependencies.TextController
}, MediaPlayer.utils.TextTrackExtensions = function() {
    "use strict";
    return {
        addTextTrack: function(video, captionData, label, scrlang, isDefaultTrack) {
            var track = video.addTextTrack("captions", label, scrlang);
            track.default = isDefaultTrack, track.mode = "showing";
            for (var item in captionData) {
                var currentItem = captionData[item];
                track.addCue(new TextTrackCue(currentItem.start, currentItem.end, currentItem.data));
            }
            return Q.when(track);
        },
        deleteCues: function(video) {
            for (var track = video.textTracks[0], cues = track.cues, i = cues.length; i >= 0; i--) track.removeCue(cues[i]);
            track.mode = "disabled";
        }
    };
}, MediaPlayer.dependencies.TextVTTSourceBuffer = function() {
    var video, data, mimeType;
    return {
        system: void 0,
        eventBus: void 0,
        initialize: function(type, bufferController) {
            mimeType = type, video = bufferController.getVideoModel().getElement(), data = bufferController.getData();
        },
        append: function(bytes) {
            var self = this;
            self.getParser().parse(String.fromCharCode.apply(null, new Uint16Array(bytes))).then(function(result) {
                var label = data.Representation_asArray[0].id, lang = data.lang;
                self.getTextTrackExtensions().addTextTrack(video, result, label, lang, !0).then(function() {
                    self.eventBus.dispatchEvent({
                        type: "updateend"
                    });
                });
            });
        },
        abort: function() {
            this.getTextTrackExtensions().deleteCues(video);
        },
        getParser: function() {
            var parser;
            return "text/vtt" === mimeType && (parser = this.system.getObject("vttParser")), 
            parser;
        },
        getTextTrackExtensions: function() {
            return this.system.getObject("textTrackExtensions");
        },
        addEventListener: function(type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
        },
        removeEventListener: function(type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        }
    };
}, MediaPlayer.dependencies.TextVTTSourceBuffer.prototype = {
    constructor: MediaPlayer.dependencies.TextVTTSourceBuffer
}, MediaPlayer.utils.VTTParser = function() {
    "use strict";
    var convertCuePointTimes = function(time) {
        var timeArray = time.split(":"), len = timeArray.length - 1;
        return time = 60 * parseInt(timeArray[len - 1], 10) + parseFloat(timeArray[len], 10), 
        2 === len && (time += 3600 * parseInt(timeArray[0], 10)), time;
    };
    return {
        parse: function(data) {
            var len, regExNewLine = /(?:\r\n|\r|\n)/gm, regExToken = /-->/, regExWhiteSpace = /(^[\s]+|[\s]+$)/g, captionArray = [];
            data = data.split(regExNewLine), len = data.length;
            for (var i = 0; len > i; i++) {
                var item = data[i];
                if (item.length > 0 && "WEBVTT" !== item && item.match(regExToken)) {
                    var cuePoints = item.split(regExToken), sublines = data[i + 1];
                    captionArray.push({
                        start: convertCuePointTimes(cuePoints[0].replace(regExWhiteSpace, "")),
                        end: convertCuePointTimes(cuePoints[1].replace(regExWhiteSpace, "")),
                        data: sublines
                    });
                }
            }
            return Q.when(captionArray);
        }
    };
}, MediaPlayer.rules.BaseRulesCollection = function() {
    "use strict";
    var rules = [];
    return {
        downloadRatioRule: void 0,
        insufficientBufferRule: void 0,
        getRules: function() {
            return Q.when(rules);
        },
        setup: function() {
            var self = this;
            self.getRules().then(function(r) {
                r.push(self.downloadRatioRule), r.push(self.insufficientBufferRule);
            });
        }
    };
}, MediaPlayer.rules.BaseRulesCollection.prototype = {
    constructor: MediaPlayer.rules.BaseRulesCollection
}, MediaPlayer.rules.DownloadRatioRule = function() {
    "use strict";
    var checkRatio = function(newIdx, currentBandwidth, data) {
        var self = this, deferred = Q.defer();
        return self.manifestExt.getRepresentationFor(newIdx, data).then(function(rep) {
            self.manifestExt.getBandwidth(rep).then(function(newBandwidth) {
                deferred.resolve(newBandwidth / currentBandwidth);
            });
        }), deferred.promise;
    };
    return {
        debug: void 0,
        manifestExt: void 0,
        checkIndex: function(current, metrics, data) {
            var lastRequest, downloadTime, totalTime, downloadRatio, totalRatio, switchRatio, deferred, funcs, i, len, self = this, httpRequests = metrics.HttpList, DOWNLOAD_RATIO_SAFETY_FACTOR = .75;
            return metrics ? null === httpRequests || void 0 === httpRequests || 0 === httpRequests.length ? Q.when(new MediaPlayer.rules.SwitchRequest()) : (lastRequest = httpRequests[httpRequests.length - 1], 
            totalTime = (lastRequest.tfinish.getTime() - lastRequest.trequest.getTime()) / 1e3, 
            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1e3, 
            0 >= totalTime ? Q.when(new MediaPlayer.rules.SwitchRequest()) : null === lastRequest.mediaduration || void 0 === lastRequest.mediaduration || lastRequest.mediaduration <= 0 ? Q.when(new MediaPlayer.rules.SwitchRequest()) : (deferred = Q.defer(), 
            totalRatio = lastRequest.mediaduration / totalTime, downloadRatio = lastRequest.mediaduration / downloadTime * DOWNLOAD_RATIO_SAFETY_FACTOR, 
            isNaN(downloadRatio) || isNaN(totalRatio) ? Q.when(new MediaPlayer.rules.SwitchRequest()) : (isNaN(downloadRatio) ? deferred.resolve(new MediaPlayer.rules.SwitchRequest()) : 1 > downloadRatio ? current > 0 ? self.manifestExt.getRepresentationFor(current - 1, data).then(function(representation1) {
                self.manifestExt.getBandwidth(representation1).then(function(oneDownBandwidth) {
                    self.manifestExt.getRepresentationFor(current, data).then(function(representation2) {
                        self.manifestExt.getBandwidth(representation2).then(function(currentBandwidth) {
                            switchRatio = oneDownBandwidth / currentBandwidth, deferred.resolve(switchRatio > downloadRatio ? new MediaPlayer.rules.SwitchRequest(0) : new MediaPlayer.rules.SwitchRequest(current - 1));
                        });
                    });
                });
            }) : deferred.resolve(new MediaPlayer.rules.SwitchRequest(current)) : self.manifestExt.getRepresentationCount(data).then(function(max) {
                max -= 1, max > current ? self.manifestExt.getRepresentationFor(current + 1, data).then(function(representation1) {
                    self.manifestExt.getBandwidth(representation1).then(function(oneUpBandwidth) {
                        self.manifestExt.getRepresentationFor(current, data).then(function(representation2) {
                            self.manifestExt.getBandwidth(representation2).then(function(currentBandwidth) {
                                if (switchRatio = oneUpBandwidth / currentBandwidth, downloadRatio >= switchRatio) if (downloadRatio > 1e3) deferred.resolve(new MediaPlayer.rules.SwitchRequest(max - 1)); else if (downloadRatio > 100) deferred.resolve(new MediaPlayer.rules.SwitchRequest(current + 1)); else {
                                    for (i = -1, funcs = []; (i += 1) < max; ) funcs.push(checkRatio.call(self, i, currentBandwidth, data));
                                    Q.all(funcs).then(function(results) {
                                        for (i = 0, len = results.length; len > i && !(downloadRatio < results[i]); i += 1) ;
                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(i));
                                    });
                                } else deferred.resolve(new MediaPlayer.rules.SwitchRequest());
                            });
                        });
                    });
                }) : deferred.resolve(new MediaPlayer.rules.SwitchRequest(max));
            }), deferred.promise))) : Q.when(new MediaPlayer.rules.SwitchRequest());
        }
    };
}, MediaPlayer.rules.DownloadRatioRule.prototype = {
    constructor: MediaPlayer.rules.DownloadRatioRule
}, MediaPlayer.rules.InsufficientBufferRule = function() {
    "use strict";
    var dryBufferHits = 0, DRY_BUFFER_LIMIT = 3;
    return {
        debug: void 0,
        checkIndex: function(current, metrics) {
            var playlist, trace, shift = !1, p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
            return null === metrics.PlayList || void 0 === metrics.PlayList || 0 === metrics.PlayList.length ? Q.when(new MediaPlayer.rules.SwitchRequest()) : (playlist = metrics.PlayList[metrics.PlayList.length - 1], 
            null === playlist || void 0 === playlist || 0 === playlist.trace.length ? Q.when(new MediaPlayer.rules.SwitchRequest()) : (trace = playlist.trace[playlist.trace.length - 2], 
            null === trace || void 0 === trace || null === trace.stopreason || void 0 === trace.stopreason ? Q.when(new MediaPlayer.rules.SwitchRequest()) : (trace.stopreason === MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON && (shift = !0, 
            dryBufferHits += 1), dryBufferHits > DRY_BUFFER_LIMIT && (p = MediaPlayer.rules.SwitchRequest.prototype.STRONG), 
            Q.when(shift ? new MediaPlayer.rules.SwitchRequest(current - 1, p) : dryBufferHits > DRY_BUFFER_LIMIT ? new MediaPlayer.rules.SwitchRequest(current, p) : new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, p)))));
        }
    };
}, MediaPlayer.rules.InsufficientBufferRule.prototype = {
    constructor: MediaPlayer.rules.InsufficientBufferRule
}, MediaPlayer.rules.LimitSwitchesRule = function() {
    "use strict";
    var MAX_SWITCHES = 10, VALIDATION_TIME = 2e4, WAIT_COUNT = 5, waiting = 0;
    return {
        debug: void 0,
        checkIndex: function(current, metrics) {
            if (waiting > 0) return waiting -= 1, Q.when(new MediaPlayer.rules.SwitchRequest(current, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
            var rs, delay, i, panic = !1, now = new Date().getTime(), numSwitches = metrics.RepSwitchList.length;
            for (i = numSwitches - 1; i >= 0 && (rs = metrics.RepSwitchList[i], delay = now - rs.t.getTime(), 
            !(delay >= VALIDATION_TIME)); i -= 1) if (i >= MAX_SWITCHES) {
                panic = !0;
                break;
            }
            return panic ? (waiting = WAIT_COUNT, Q.when(new MediaPlayer.rules.SwitchRequest(current, MediaPlayer.rules.SwitchRequest.prototype.STRONG))) : Q.when(new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
        }
    };
}, MediaPlayer.rules.LimitSwitchesRule.prototype = {
    constructor: MediaPlayer.rules.LimitSwitchesRule
}, MediaPlayer.rules.SwitchRequest = function(q, p) {
    "use strict";
    this.quality = q, this.priority = p, void 0 === this.quality && (this.quality = 999), 
    void 0 === this.priority && (this.priority = .5);
}, MediaPlayer.rules.SwitchRequest.prototype = {
    constructor: MediaPlayer.rules.SwitchRequest,
    NO_CHANGE: 999,
    DEFAULT: .5,
    STRONG: 1,
    WEAK: 0
}, MediaPlayer.models.MetricsList = function() {
    "use strict";
    return {
        TcpList: [],
        HttpList: [],
        RepSwitchList: [],
        RepBoundariesList: [],
        BufferLevel: [],
        PlayList: [],
        DroppedFrames: []
    };
}, MediaPlayer.models.MetricsList.prototype = {
    constructor: MediaPlayer.models.MetricsList
}, MediaPlayer.vo.SegmentRequest = function() {
    "use strict";
    this.action = "download", this.startTime = 0/0, this.streamType = null, this.type = null, 
    this.duration = 0/0, this.timescale = 0/0, this.range = null, this.url = null, this.requestStartDate = null, 
    this.firstByteDate = null, this.requestEndDate = null, this.deferred = null, this.quality = 0/0, 
    this.index = 0/0, this.availabilityStartTime = null, this.availabilityEndTime = null, 
    this.wallStartTime = null;
}, MediaPlayer.vo.SegmentRequest.prototype = {
    constructor: MediaPlayer.vo.SegmentRequest,
    ACTION_DOWNLOAD: "download",
    ACTION_COMPLETE: "complete"
}, MediaPlayer.vo.metrics.BufferLevel = function() {
    "use strict";
    this.t = null, this.level = null;
}, MediaPlayer.vo.metrics.BufferLevel.prototype = {
    constructor: MediaPlayer.vo.metrics.BufferLevel
}, MediaPlayer.vo.metrics.DroppedFrames = function() {
    "use strict";
    this.time = null, this.droppedFrames = null;
}, MediaPlayer.vo.metrics.DroppedFrames.prototype = {
    constructor: MediaPlayer.vo.metrics.DroppedFrames
}, MediaPlayer.vo.metrics.HTTPRequest = function() {
    "use strict";
    this.tcpid = null, this.type = null, this.url = null, this.actualurl = null, this.range = null, 
    this.trequest = null, this.tresponse = null, this.tfinish = null, this.responsecode = null, 
    this.interval = null, this.mediaduration = null, this.trace = [];
}, MediaPlayer.vo.metrics.HTTPRequest.prototype = {
    constructor: MediaPlayer.vo.metrics.HTTPRequest
}, MediaPlayer.vo.metrics.HTTPRequest.Trace = function() {
    "use strict";
    this.s = null, this.d = null, this.b = [];
}, MediaPlayer.vo.metrics.HTTPRequest.Trace.prototype = {
    constructor: MediaPlayer.vo.metrics.HTTPRequest.Trace
}, MediaPlayer.vo.metrics.PlayList = function() {
    "use strict";
    this.start = null, this.mstart = null, this.starttype = null, this.trace = [];
}, MediaPlayer.vo.metrics.PlayList.Trace = function() {
    "use strict";
    this.representationid = null, this.subreplevel = null, this.start = null, this.mstart = null, 
    this.duration = null, this.playbackspeed = null, this.stopreason = null;
}, MediaPlayer.vo.metrics.PlayList.prototype = {
    constructor: MediaPlayer.vo.metrics.PlayList
}, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON = "initial_start", 
MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON = "seek", MediaPlayer.vo.metrics.PlayList.Trace.prototype = {
    constructor: MediaPlayer.vo.metrics.PlayList.Trace()
}, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON = "user_request", 
MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON = "representation_switch", 
MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON = "end_of_content", 
MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON = "rebuffering", MediaPlayer.vo.metrics.RepresentationBoundaries = function() {
    "use strict";
    this.t = null, this.min = null, this.max = null;
}, MediaPlayer.vo.metrics.RepresentationBoundaries.prototype = {
    constructor: MediaPlayer.vo.metrics.RepresentationBoundaries
}, MediaPlayer.vo.metrics.RepresentationSwitch = function() {
    "use strict";
    this.t = null, this.mt = null, this.to = null, this.lto = null;
}, MediaPlayer.vo.metrics.RepresentationSwitch.prototype = {
    constructor: MediaPlayer.vo.metrics.RepresentationSwitch
}, MediaPlayer.vo.metrics.TCPConnection = function() {
    "use strict";
    this.tcpid = null, this.dest = null, this.topen = null, this.tclose = null, this.tconnect = null;
}, MediaPlayer.vo.metrics.TCPConnection.prototype = {
    constructor: MediaPlayer.vo.metrics.TCPConnection
};