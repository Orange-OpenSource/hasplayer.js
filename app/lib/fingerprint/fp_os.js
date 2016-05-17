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

/* This function returns the operating system and number of bits by looking at the navigator.useragent and navigator.platform objects */

function fingerprint_os() {
    "use strict";

    var userAgent,
        platform,
        name,
        bits,
        os = {
            name: "",
            bits: ""
        };

    try {
        /* navigator.userAgent is supported by all major browsers */
        userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.indexOf("windows nt 10.0") !== -1) {
            name = "Windows 10";
        } else if (userAgent.indexOf("windows nt 6.3") !== -1) {
            name = "Windows 8.1";
        } else if (userAgent.indexOf("windows nt 6.2") !== -1) {
            name = "Windows 8";
        } else if (userAgent.indexOf("windows nt 6.1") !== -1) {
            name = "Windows 7";
        } else if (userAgent.indexOf("windows nt 6.0") !== -1) {
            name = "Windows Vista/Windows Server 2008";
        } else if (userAgent.indexOf("windows nt 5.2") !== -1) {
            name = "Windows XP x64/Windows Server 2003";
        } else if (userAgent.indexOf("windows nt 5.1") !== -1) {
            name = "Windows XP";
        } else if (userAgent.indexOf("windows nt 5.01") !== -1) {
            name = "Windows 2000, Service Pack 1 (SP1)";
        } else if (userAgent.indexOf("windows xp") !== -1) {
            name = "Windows XP";
        } else if (userAgent.indexOf("windows 2000") !== -1) {
            name = "Windows 2000";
        } else if (userAgent.indexOf("windows nt 5.0") !== -1) {
            name = "Windows 2000";
        } else if (userAgent.indexOf("windows nt 4.0") !== -1) {
            name = "Windows NT 4.0";
        } else if (userAgent.indexOf("windows nt") !== -1) {
            name = "Windows NT 4.0";
        } else if (userAgent.indexOf("winnt4.0") !== -1) {
            name = "Windows NT 4.0";
        } else if (userAgent.indexOf("winnt") !== -1) {
            name = "Windows NT 4.0";
        } else if (userAgent.indexOf("windows me") !== -1) {
            name = "Windows ME";
        } else if (userAgent.indexOf("win 9x 4.90") !== -1) {
            name = "Windows ME";
        } else if (userAgent.indexOf("windows 98") !== -1) {
            name = "Windows 98";
        } else if (userAgent.indexOf("win98") !== -1) {
            name = "Windows 98";
        } else if (userAgent.indexOf("windows 95") !== -1) {
            name = "Windows 95";
        } else if (userAgent.indexOf("windows_95") !== -1) {
            name = "Windows 95";
        } else if (userAgent.indexOf("win95") !== -1) {
            name = "Windows 95";
        } else if (userAgent.indexOf("ce") !== -1) {
            name = "Windows CE";
        } else if (userAgent.indexOf("win16") !== -1) {
            name = "Windows 3.11";
        } else if (userAgent.indexOf("iemobile") !== -1) {
            name = "Windows Mobile";
        } else if (userAgent.indexOf("wm5 pie") !== -1) {
            name = "Windows Mobile";
        } else if (userAgent.indexOf("windows phone 10.0") !== -1) {
            name = "Windows Phone 10";
        } else if (userAgent.indexOf("windows") !== -1) {
            name = "Windows (Unknown Version)";
        } else if (userAgent.indexOf("openbsd") !== -1) {
            name = "Open BSD";
        } else if (userAgent.indexOf("sunos") !== -1) {
            name = "Sun OS";
        } else if (userAgent.indexOf("ubuntu") !== -1) {
            name = "Ubuntu";
        } else if (userAgent.indexOf("ipad") !== -1) {
            name = "iOS (iPad)";
        } else if (userAgent.indexOf("ipod") !== -1) {
            name = "iOS (iTouch)";
        } else if (userAgent.indexOf("iphone") !== -1) {
            name = "iOS (iPhone)";
        } else if (userAgent.indexOf("mac os x beta") !== -1) {
            name = "Mac OSX Beta (Kodiak)";
        } else if (userAgent.indexOf("mac os x 10.0") !== -1) {
            name = "Mac OSX Cheetah";
        } else if (userAgent.indexOf("mac os x 10.1") !== -1) {
            name = "Mac OSX Puma";
        } else if (userAgent.indexOf("mac os x 10.2") !== -1) {
            name = "Mac OSX Jaguar";
        } else if (userAgent.indexOf("mac os x 10.3") !== -1) {
            name = "Mac OSX Panther";
        } else if (userAgent.indexOf("mac os x 10.4") !== -1) {
            name = "Mac OSX Tiger";
        } else if (userAgent.indexOf("mac os x 10.5") !== -1) {
            name = "Mac OSX Leopard";
        } else if (userAgent.indexOf("mac os x 10.6") !== -1) {
            name = "Mac OSX Snow Leopard";
        } else if (userAgent.indexOf("mac os x 10.7") !== -1) {
            name = "Mac OSX Lion";
        } else if (userAgent.indexOf("mac os x") !== -1) {
            name = "Mac OSX (Version Unknown)";
        } else if (userAgent.indexOf("mac_68000") !== -1) {
            name = "Mac OS Classic (68000)";
        } else if (userAgent.indexOf("68K") !== -1) {
            name = "Mac OS Classic (68000)";
        } else if (userAgent.indexOf("mac_powerpc") !== -1) {
            name = "Mac OS Classic (PowerPC)";
        } else if (userAgent.indexOf("ppc mac") !== -1) {
            name = "Mac OS Classic (PowerPC)";
        } else if (userAgent.indexOf("macintosh") !== -1) {
            name = "Mac OS Classic";
        } else if (userAgent.indexOf("googletv") !== -1) {
            name = "Android (GoogleTV)";
        } else if (userAgent.indexOf("xoom") !== -1) {
            name = "Android (Xoom)";
        } else if (userAgent.indexOf("htc_flyer") !== -1) {
            name = "Android (HTC Flyer)";
        } else if (userAgent.indexOf("android") !== -1) {
            name = "Android";
        } else if (userAgent.indexOf("symbian") !== -1) {
            name = "Symbian";
        } else if (userAgent.indexOf("series60") !== -1) {
            name = "Symbian (Series 60)";
        } else if (userAgent.indexOf("series70") !== -1) {
            name = "Symbian (Series 70)";
        } else if (userAgent.indexOf("series80") !== -1) {
            name = "Symbian (Series 80)";
        } else if (userAgent.indexOf("series90") !== -1) {
            name = "Symbian (Series 90)";
        } else if (userAgent.indexOf("x11") !== -1) {
            name = "UNIX";
        } else if (userAgent.indexOf("nix") !== -1) {
            name = "UNIX";
        } else if (userAgent.indexOf("linux") !== -1) {
            name = "Linux";
        } else if (userAgent.indexOf("qnx") !== -1) {
            name = "QNX";
        } else if (userAgent.indexOf("os/2") !== -1) {
            name = "IBM OS/2";
        } else if (userAgent.indexOf("beos") !== -1) {
            name = "BeOS";
        } else if (userAgent.indexOf("blackberry95") !== -1) {
            name = "Blackberry (Storm 1/2)";
        } else if (userAgent.indexOf("blackberry97") !== -1) {
            name = "Blackberry (Bold)";
        } else if (userAgent.indexOf("blackberry96") !== -1) {
            name = "Blackberry (Tour)";
        } else if (userAgent.indexOf("blackberry89") !== -1) {
            name = "Blackberry (Curve 2)";
        } else if (userAgent.indexOf("blackberry98") !== -1) {
            name = "Blackberry (Torch)";
        } else if (userAgent.indexOf("playbook") !== -1) {
            name = "Blackberry (Playbook)";
        } else if (userAgent.indexOf("wnd.rim") !== -1) {
            name = "Blackberry (IE/FF Emulator)";
        } else if (userAgent.indexOf("blackberry") !== -1) {
            name = "Blackberry";
        } else if (userAgent.indexOf("palm") !== -1) {
            name = "Palm OS";
        } else if (userAgent.indexOf("webos") !== -1) {
            name = "WebOS";
        } else if (userAgent.indexOf("hpwos") !== -1) {
            name = "WebOS (HP)";
        } else if (userAgent.indexOf("blazer") !== -1) {
            name = "Palm OS (Blazer)";
        } else if (userAgent.indexOf("xiino") !== -1) {
            name = "Palm OS (Xiino)";
        } else if (userAgent.indexOf("kindle") !== -1) {
            name = "Kindle";
        } else if (userAgent.indexOf("wii") !== -1) {
            name = "Nintendo (Wii)";
        } else if (userAgent.indexOf("nintendo ds") !== -1) {
            name = "Nintendo (DS)";
        } else if (userAgent.indexOf("playstation 3") !== -1) {
            name = "Sony (Playstation Console)";
        } else if (userAgent.indexOf("playstation portable") !== -1) {
            name = "Sony (Playstation Portable)";
        } else if (userAgent.indexOf("webtv") !== -1) {
            name = "MSN TV (WebTV)";
        } else if (userAgent.indexOf("inferno") !== -1) {
            name = "Inferno";
        } else {
            name = "Unknown";
        }

        /* navigator.platform is supported by all major browsers */
        platform = navigator.platform.toLowerCase();

        if (platform.indexOf("x64") !== -1) {
            bits = "64";
        } else if (userAgent.indexOf("x86_64") !== -1) {
            bits = "64";
        } else if (userAgent.indexOf("x86-64") !== -1) {
            bits = "64";
        } else if (userAgent.indexOf("win64") !== -1) {
            bits = "64";
        } else if (userAgent.indexOf("x64;") !== -1) {
            bits = "64";
        } else if (userAgent.indexOf("amd64") !== -1) {
            bits = "64";
        } else if (userAgent.indexOf("wow64") !== -1) {
            bits = "64";
        } else if (userAgent.indexOf("x64_64") !== -1) {
            bits = "64";
        } else if (userAgent.indexOf("ia65") !== -1) {
            bits = "64";
        } else if (userAgent.indexOf("sparc64") !== -1) {
            bits = "64";
        } else if (userAgent.indexOf("ppc64") !== -1) {
            bits = "64";
        } else if (userAgent.indexOf("irix64") !== -1) {
            bits = "64";
        } else if (userAgent.indexOf("irix64") !== -1) {
            bits = "64";
        } else {
            bits = "32";
        }
    } catch (err) {
        name = "error";
        bits = "error";
    }

    return {
        name: name.replace(/\s+/g, ''),
        bits: "x" + bits
    };
}