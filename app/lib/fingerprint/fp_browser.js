/*   Copyright (C) 2011,2012,2013,2014 John Kula */

/*
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

    All trademarks and service marks contained within this document are
    property of their respective owners.

    Version 2014.07.23

    Updates may be found at: http:\\www.darkwavetech.com

*/

/*jslint browser:true */

/* This function returns the browser and version number by using the navigator.useragent object */

function fingerprint_browser() {
    "use strict";
    var userAgent,
        name,
        version;

    try {

        userAgent = navigator.userAgent.toLowerCase();

        if (/msie (\d+\.\d+);/.test(userAgent)) { //test for MSIE x.x;
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            if (userAgent.indexOf("trident/6") > -1) {
                version = 10;
            }
            if (userAgent.indexOf("trident/5") > -1) {
                version = 9;
            }
            if (userAgent.indexOf("trident/4") > -1) {
                version = 8;
            }
            name = "Internet Explorer";
        } else if (userAgent.indexOf("trident/7") > -1) { //IE 11+ gets rid of the legacy 'MSIE' in the user-agent string;
            version = 11;
            name = "Internet Explorer";
        }  else if (/edge[\/\s](\d+\.\d+)/.test(userAgent)) { //test for Firefox/x.x or Firefox x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Edge";
        }  else if (/firefox[\/\s](\d+\.\d+)/.test(userAgent)) { //test for Firefox/x.x or Firefox x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Firefox";
        } else if (/opera[\/\s](\d+\.\d+)/.test(userAgent)) { //test for Opera/x.x or Opera x.x (ignoring remaining decimal places);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Opera";
        } else if (/chrome[\/\s](\d+\.\d+)/.test(userAgent)) { //test for Chrome/x.x or Chrome x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Chrome";
        } else if (/version[\/\s](\d+\.\d+)/.test(userAgent)) { //test for Version/x.x or Version x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Safari";
        } else if (/rv[\/\s](\d+\.\d+)/.test(userAgent)) { //test for rv/x.x or rv x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Mozilla";
        } else if (/mozilla[\/\s](\d+\.\d+)/.test(userAgent)) { //test for Mozilla/x.x or Mozilla x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Mozilla";
        } else if (/binget[\/\s](\d+\.\d+)/.test(userAgent)) { //test for BinGet/x.x or BinGet x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Library (BinGet)";
        } else if (/curl[\/\s](\d+\.\d+)/.test(userAgent)) { //test for Curl/x.x or Curl x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Library (cURL)";
        } else if (/java[\/\s](\d+\.\d+)/.test(userAgent)) { //test for Java/x.x or Java x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Library (Java)";
        } else if (/libwww-perl[\/\s](\d+\.\d+)/.test(userAgent)) { //test for libwww-perl/x.x or libwww-perl x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Library (libwww-perl)";
        } else if (/microsoft url control -[\s](\d+\.\d+)/.test(userAgent)) { //test for Microsoft URL Control - x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Library (Microsoft URL Control)";
        } else if (/peach[\/\s](\d+\.\d+)/.test(userAgent)) { //test for Peach/x.x or Peach x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Library (Peach)";
        } else if (/php[\/\s](\d+\.\d+)/.test(userAgent)) { //test for PHP/x.x or PHP x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Library (PHP)";
        } else if (/pxyscand[\/\s](\d+\.\d+)/.test(userAgent)) { //test for pxyscand/x.x or pxyscand x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Library (pxyscand)";
        } else if (/pycurl[\/\s](\d+\.\d+)/.test(userAgent)) { //test for pycurl/x.x or pycurl x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Library (PycURL)";
        } else if (/python-urllib[\/\s](\d+\.\d+)/.test(userAgent)) { //test for python-urllib/x.x or python-urllib x.x (ignoring remaining digits);
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Library (Python URLlib)";
        } else if (/appengine-google/.test(userAgent)) { //test for AppEngine-Google;
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Cloud (Google AppEngine)";
        } else if (/trident/.test(userAgent)) { //test for Trident;
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Trident";
        } else if (/adventurer/.test(userAgent)) { //test for Orange Adventurer;
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "Adventurer";
        } else if (/webkit[\/\s](\d+\.\d+)/.test(userAgent)) { //test for generic webkit port;
            version = Number(RegExp.$1); // capture x.x portion and store as a number
            name = "WebKit";
        } else {
            version = "unknown";
            name = "unknown";
        }
    } catch (err) {
        name = "error";
        version = "error";
    }

    return {
        name: name.replace(/\s+/g, ''),
        version: version
    };
}
