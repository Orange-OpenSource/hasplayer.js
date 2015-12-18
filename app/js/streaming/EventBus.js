MediaPlayer.utils.EventBus = function() {
    "use strict";

    var registrations,

        getListeners = function(type, useCapture) {
            var captype = (useCapture ? '1' : '0') + type;

            if (!(captype in registrations)) {
                registrations[captype] = [];
            }

            return registrations[captype];
        },

        init = function() {
            registrations = {};
        };

    init();

    return {
        addEventListener: function(type, listener, useCapture) {
            var listeners = getListeners(type, useCapture),
                idx = listeners.indexOf(listener);

            if (idx === -1) {
                listeners.push(listener);
            }
        },

        removeEventListener: function(type, listener, useCapture) {
            var listeners = getListeners(type, useCapture),
                idx = listeners.indexOf(listener);

            if (idx !== -1) {
                listeners.splice(idx, 1);
            }
        },

        dispatchEvent: function(evt) {
            var listeners = getListeners(evt.type, false).slice(),
                i = 0;

            for (i = 0; i < listeners.length; i += 1) {
                listeners[i].call(this, evt);
            }
            return !evt.defaultPrevented;
        }
    };
};