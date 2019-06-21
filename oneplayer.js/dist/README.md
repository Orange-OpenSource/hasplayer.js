# Orange OnePlayer.js

<!-- toc -->

- [Overview](#overview)
- [Documentation](#documentation)
- [Quick Start for Users](#quick-start-for-users)
- [Quick Start for Developers](#quick-start-for-developers)
- [Developers User Guide](#developers-user-guide)
  * [Basic playback](#basic-playback)
  * [DRM configuration](#drm-configuration)
    + [Server certificate](#server-certificate)
    + [Robustness levels](#robustness-levels)
  * [Events](#events)
  * [Tracks switching](#tracks-switching)
  * [Subtitles display](#subtitles-display)
  * [Live and DVR](#live-and-dvr)
  * [Playback speed](#playback-speed)
  * [Avanced player configuration](#avanced-player-configuration)
  * [Plugins](#plugins)
    + [Ads-insertion plugin](#ads-insertion-plugin)
    + [Metrics reporting plugin](#metrics-reporting-plugin)
  * [OSD debug](#osd-debug)

<!-- tocstop -->

## Overview

OnePlayer.js is the Orange reference client implementation for the playback of http adaptive streams via JavaScript and [compliant browsers](http://caniuse.com/#feat=mediasource), using client-side JavaScript libraries leveraging the Media Source Extensions API set as defined by the W3C, i.e [MSE](https://w3c.github.io/media-source/) and [EME](https://w3c.github.io/encrypted-media/).

It provides support for different http adaptive streaming protocols by embedding javascript clients with MSE and/or EME extensions support, such as:

* [dash.js](https://github.com/Dash-Industry-Forum/dash.js) for the playback of MPEG-DASH and Microsoft Smooth Streaming contents on browsers supporting MSE and EME extensions
* [hls.js](https://github.com/video-dev/hls.js/) for the playback of Apple HLS contents on browsers supporting MSE and EME extensions
* [hls-native.js]() for the playback of Apple HLS contents on browsers supporting natively HLS streaming and also EME API for FairPlay support (such as OSx/Safari)

## Documentation

Full [API Documentation](/doc/index.html) is available describing all public methods, interfaces, properties, and events.

The class {@link OnePlayer} is the main entry point of the module.

## Quick Start for Users

Create a video element somewhere in your html.

```html
<video id="videoPlayer"></video>
```

Include the oneplayer.js in your project.
For example, add oneplayer-all.js (including all dependencies) to the end of the body of your html.

```html
<body>
  ...
  <script src="oneplayer-all.js"></script>
</body>
```

Or import into your source code the oneplayerjs package (installed using npm package manager that will also install dependencies such as dash.js).

```js
import * as oneplayer from 'oneplayerjs'
```

Now you need to create a player intance and initialize it according to the player type to be used.
To initialize the player you need to provide the video element that will be used.
When it is all done, you can load a new stream:

``` js
oneplayer.OnePlayer.create(oneplayer.PlayerType.DASHJS, document.querySelector("#videoPlayer")).then(function(player) {
    player.load({
        url: 'https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd'
    });
}
```

## Quick Start for Developers

1. Install Core Dependencies
    * [install nodejs](http://nodejs.org/)
2. Checkout project repository (default branch: develop)
    * ```git clone https://gitlab.forge.orange-labs.fr/OnePlayer/oneplayer.js.git```
3. Install dependencies
    * ```npm install```
4. Build and watch file changes
    * ```npm run dev```

## Developers User Guide

### Basic playback

To start playback of a stream, use the method {@link IPlayer.load} and provide the manifest URL:

``` js
player.load({
    url: '<manifest URL>'
});
```

Additionnaly to manifest url, the http adaptive streaming protocol and stream type (live vs on-demand) can be specified when opening new stream to enable
the player to configure and tune-in some internal parameters.

For example:

``` js
player.load({
    url: '<manifest URL>',
    protocol: oneplayer.HasProtocol.MSS,
    type: oneplayer.ServiceType.LIVE
});
```

### DRM configuration

When loading protected streams, you can specify the DRM parameters in the {@link IPlayer.load} method.

You can provide the DRM parameters for each key system ignoring the browser and platform context since the player will automatically load the available key system.

``` js
player.load({
    url: '<manifest_url>',
    protData: {
        'com.microsoft.playready': {
            serverURL: '<licenser server URL>',
            ...
        },
        'com.widevine.alpha': {
            serverURL: '<licenser server URL>',
            ...
        }
    }
});
```

For each key system you can specify:

* the license server URL
* the HTTP headers to be added to to request
* wether the license request is made using credentials
* the server certificate
* the audio and video robustness levels

#### Server certificate

For some key systems (e.g. widevine) it is required to provide the license service certificate in order to avoid executing the certificate request-response between the player and the license server.

The solution consists in getting and storing the service certificate at application level and then provide this service certificate to the player prior to any license request.

This method removes the overhead of an additional HTTPS round-trip to the license service and then avoid license request url token to be used twice.

See more detailed information on service certificate here: https://storage.googleapis.com/wvdocs/Widevine_DRM_Proxy_Integration.pdf

The service certificate has to be provided as a Base64 string representation of the binary stream:

``` js
player.load({
    url: '<manifest_url>',
    protData: {
        'com.widevine.alpha': {
            ...
            serverCertificate: btoa(String.fromCharCode.apply(null, certificate)),
            ...
        }
    }
});
```

#### Robustness levels

Robustness refers to how securely the content is handled by the key system. This is a key-system-specific string that specifies the requirements for successful playback.

For Widevine key system, it is recommended (see [Chrome EME Changes and Best Practices](https://storage.googleapis.com/wvdocs/Chrome_EME_Changes_and_Best_Practices.pdf) to provide robustness levels for audio and video streams.

When no robustness level is specified, you get the following warning in Chrome:

*"It is recommended that a robustness level be specified. Not specifying the robustness level could result in unexpected behavior in the future, potentially including failure to play" *

Here is an example for setting the robustness levels:

``` js
player.load({
    url: '<manifest_url>',
    protData: {
        'com.widevine.alpha': {
            ...
            videoRobustness: 'SW_SECURE_DECODE',
            audioRobustness: 'SW_SECURE_CRYPTO',
            ...
        }
    }
});
```

### Events

Additionnaly to the video element events, the application can listen for specific events raised the OnePlayer (see {@link PlayerEvents}).
These events are raised and delivered through the video element as [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).

``` js

video.addEventListener('waiting', waitingListener);
video.addEventListener(PlayerEvents.PLAYER_ERROR, errorListener);
```

In order to listen for all player errors including video element errors, the application can listen for event {@link PlayerEvents.PLAYER_ERROR}.

You can also listen for specific events that are raised by the wrapped player using the {@link IPlayer.addEventListener} method.
Here is an example for dash.js player (see dash.js events description http://cdn.dashjs.org/latest/jsdoc/module-MediaPlayer.html):

``` js

player.addEventListener('metricAdded', metricAddedListener);
```

### Tracks switching

In order to perform track switching, please follow these steps:

1. register to the 'loadedmetadata' event on the video element
2. load the streams using the method {@link IPlayer.load}
3. when 'loadedmetadata' is raised, which means the manifest has been loaded and stream initialized, retrieve the tracks information using the method {@link IPlayer.getTracksForType}
4. during stream playback you can then select a new track using the method {@link IPlayer.selectTrack} or {@link IPlayer.selectTrackForType}

During stream playback, you can also retrieve the current track selected using the method {@link IPlayer.getSelectedTrackForType}.

### Subtitles display

To enable TTML subtitles display, please follow these steps:

1. when creating and initializing the player, provide the HTML div element in which the subtitles shall be displayed
2. enable (or disable) the text tracks using the method {@link IPlayer.enableText}
3. select the text track as described in section [Tracks switching](#tracks-switching)

### Live and DVR

For live streams that provide DVR functionality, the player API enables seeking within thr DVR window.

The method {@link IPlayer.getDuration} returns the duration of the DVR window (in seconds), and the {@link IPlayer.getTime} then returns the playhead position relative to the DVR window range.

To seek within the DVR window, then simply use the {@link IPlayer.seek} by passing the time value relative to the DVR window range.

At application level, to provide DVR seeking functionality, it is recommended to override the native progress control bar with a customized control bar that display the duration and current time as provided by the player.

### Playback speed

The playback speed can be modified in order to achieve either slow motion or trick mode (fast forward and rewind).

The method {@link IPlayer.setPlaybackSpeed} enables setting the playback speed of the player.

* For speeds between 0 and 1, the player will perform slow motion by modifying the playback rate of the video element. Please note that negative slow motion speed are not enabled.
* For negative speeds (from 1) or speeds superior to 1, the player will perform respectivley fast rewind and forward (fast seeking to key frames).

In all cases, the player mutes the video for speeds different from normal speed (1).

### Avanced player configuration

*to be completed*


### Plugins

OnePlayer enables for plugins to be added, which plugins are able to interfere with main video element and player in order to provide some additional functionalities.
To add and enable a pluging, please use method {@link OnePlayer.addPlugin}:

``` js

oneplayer.OnePlayer.addPlugin(player, <PluginType>, <PluginConfig>);
```

#### Ads-insertion plugin

The ads-insertion plugin can be used to handle ads-insertion in MAST/VAST format during content playback. This plugin is based on [adsplayer.js](https://github.com/Orange-OpenSource/adsplayer.js) project.

To enable the ads-insertion plugin, use method {@link OnePlayer.addPlugin} :

``` js
oneplayer.OnePlayer.addPlugin(player, oneplayer.PluginType.ADINSERTION, {
    'adsRenderingDiv': document.getElementById('adsplayer-container'),
    'handleMainPlayerPlayback': false
});
```

Then, when loading a new stream using {@link IPlayer.load} method, you can provide the url of the main MAST file describing the ad-insertion triggers in input stream information {@link StreamInfo.adsUrl} property.
The plugin will handle triggers (pre-roll, mid-roll and end-roll) during content playback.

``` js
player.load({
    url: '<manifest URL>',
    ...
    adsUrl: '<MAST URL>',
});
```

By default, the plugin will manage the main content playback state (pause, resume) when trigerring ads playback.

However, it is possible to let application managing the main content playback, especially for platforms/terminals in which you can not instantiate simultaneously multiple video decoding pipelines. For these platforms, the main content playback shall be stopped when an ads needs to be rendered.
In this case, you need to cconfigure the plugin to disable main content playback management:

``` js
oneplayer.OnePlayer.addPlugin(player, oneplayer.PluginType.ADINSERTION, {
    'adsRenderingDiv': document.getElementById('adsplayer-container'),
    'handleMainPlayerPlayback': false
});
```

Then at application level, it is required to handle main content playback state when when trigerring ads playback.

``` js
video.addEventListener('ad_start', function () {
    // store current playback position/time, and stop main content playback
});

video.addEventListener('ad_stop', function () {
    // start/resume main content playback at recorded playback time
});
```

#### Metrics reporting plugin

The metrics plugin can be used to handle metrics reporting. This plugin is based on metricsagent.js project. This plugin is able to report metrics such as playback state, adaptive bitrate switches, errors, etc. All these metrics are collected by interfering video element and player and reported to a PRISME collector.

To enable the metrics plugin, use method {@link OnePlayer.addPlugin} :

``` js
oneplayer.OnePlayer.addPlugin(player, oneplayer.PluginType.METRICS, {
    serverUrl: collectorUrl
});
```

### OSD debug

A debug panel with playback metrics can be displayed over the video element.
To display the debug panel:
* either enter the keyboard shortcut *Ctrl+Alt+Shift+d*
* either use method {@link IPlayer.showDebug}
