### Release Notes v0.12.0 (2019/06/17)
* Add API method IPlayer.getTracks()
* [dash.js] Update version (v2.9.3-o.6)

### Release Notes v0.11.0 (2019/05/16)
* Add OSD debug panel (see IPlayer.showDebug())

### Release Notes v0.10.0 (2019/04/25)
* IPlayer.stop() can optionnaly reset the stream or stop the playback (to enable playback resume from beginning)
* [dash.js] Update version (v2.9.3-o.5)
* Bugs fixing:
* - Fix trick play for Safari browser

### Release Notes v0.9.0 (2019/04/09)
* TrackInfo.kind property type can be either AudioKind or TextKind
* Add error codes MEDIA_MORALITY_ERR and PLAYER_API_ERROR
* [dash.js] Update version (v2.9.3-o.4)

### Release Notes v0.7.8 (2019/04/05)
* [dash.js] Update version (v2.9.3-o.3)
* Bugs fixing:
* - Fix playback speed controller if quick speed changes

### Release Notes v0.7.7 (2019/03/20)
* [dash.js] Update version (v2.9.3-o.2)
* [metricsagent.js] Update version (1.6.2)
* Export missing Kind type
* Bugs fixing:
* - Fix plugins life cycle

### Release Notes v0.7.5 (2019/03/15)
* Add TrackInfo.selected property

### Release Notes v0.7.3 (2019/03/13)
* Update build to exclude dependencies from output bundle by default

### Release Notes v0.7.2 (2019/03/12)
* [dash.js] Update version (v2.9.3-o.1)

### Release Notes v0.7.1 (2019/02/14)
* [metricsagent.js] Update version (1.6.1)

### Release Notes v0.7.0 (2019/02/14)
* Add userData property in StreamInfo type
* [dash.js] Update version (v2.9.3)
* [dash.js] Update default buffer settings
* [dash.js] Handle AdaptationSet without id property
* [asdplayer.js] Update version (1.4.0)
* [metricsagent.js] Update version (1.6.0)

### Release Notes v0.6.2 (2018/12/13)
* Add a build option (--core) to exclude dependencies from output bundle
* Update TrackInfo type definition
* Update KeySystemConfiguration type definition

### Release Notes v0.6.1 (2018/11/27)
* [dash.js] Update version (v2.9.2 + revert stalled state management)

### Release Notes v0.6.0 (2018/11/09)
* Set API methods OnePlayer.create() and IPlayer.init() asynchronous (return Promise)
* Add possibility to provide a key for storing media settings in locals storage (see IPlayer.enableLastMediaSettingsCaching())
* [dash.js] Update version (v2.9.2 + hack for custom data)
* [dash.js] Update segments download errors management
* [metricsagent.js] Update version (1.5.2)

### Release Notes v0.5.3 (2018/10/29)
* [dash.js] Update segments download errors management

### Release Notes v0.5.2 (2018/10/22)
* [dash.js] Add configuration parameter to specify minimum allowed video bitrate
* Bugs fixing:
* - Fix regression on volume management for slow motion and fast forward/rewind modes

### Release Notes v0.5.1 (2018/10/19)
* Add API method IPlayer.getQualityForType()
* Add API method IPlayer.getBuffelLevelForType()
* [dash.js] Set default stable buffer time to 4 sec. for on-demand contents
* Bugs fixing:
* - Fix stop of adsplayer.js plugin

### Release Notes v0.5.0 (2018/10/16)
* Add HLS/FairPlay player dedicated to Safari browsers
* Add Kind type for text tracks TrackInfo.kind attribute to distinguish captions/subtitles from audio description
* [asdplayer.js] Update version (1.3.0)
* [adsplayer.js] Add events AD_START and AD_END to be notified of ad(s) playback start and end

### Release Notes v0.4.2 (2018/10/05)
* Bugs fixing:
* - [dash.js] Fix TTML preprocessing for style attribute

### Release Notes v0.4.1 (2018/10/05)
* Bugs fixing:
* - [dash.js] Fix TTML preprocessing activation
* - [metricsagent.js] Fix oneplayer errors management

### Release Notes v0.4.0 (2018/10/04)
* Modify OnePlayer.create() prototype (requires PlayerType as input)
* Add PlayerError interface and PlayerErrorCodes for PlayerEvents.PLAYER_ERROR events
* Add method IPlayer.enableLastMediaSettingsCaching() to enable default tracks settings (language, state) storing in local storage
* [dash.js] Update version (v2.9.1 + hack for custom data)
* [dash.js] Add TTML preprocessor for TTML fragments not compliant with IMSC-1
* [dash.js] Manage default player settings and settings according to stream type and protocol
* Bugs fixing:
* - Reset slow motion or fast forward/rewind mode when loading new stream

### Release Notes v0.3.4 (2018/09/20)
* Bugs fixing:
* - [dash.js] Fix mistakenly seek at start time when switching track

### Release Notes v0.3.3 (2018/09/20)
* [dash.js] Disable media settings caching in local storage

### Release Notes v0.3.2 (2018/09/19)
* Bugs fixing:
* - Fix volume management for slow motion and fast forward/rewind modes
* - [dash.js] Correct default audio language setting

### Release Notes v0.3.1 (2018/09/17)
* [dash.js] Add support for playback start time

### Release Notes v0.3.0 (2018/09/13)
* Add plugins integration mechanism
* Add plugin for metricsagent.js (metrics collecting)
* Add plugin for adsplayer.js (ad-insertion)
* [dash.js] Update version (v2.9.0 + hack for custom data + fix for EME session closing)
* Bugs fixing:
* - Correct volume management for slow motion and fast forward/rewind modes

### Release Notes v0.2.4 (2018/09/04)
* Bugs fixing:
* - [dash.js] Fix segments download errors management

### Release Notes v0.2.3 (2018/09/03)
* [dash.js] Update version (v2.9.0 + hack for custom data)

### Release Notes v0.2.0 (2018/08/24)
* [dash.js] Update version (v2.9.0)
* Replace IPlayer.SetTrickModeSpeed() by IPlayer.setPlaybackSpeed() that implements slow motion and fast forward/rewind
* Correct IPlayer.getDuration() and IPlayer.getTime() for DRV live streams
* Add 'Developers User Guide' in README

### Release Notes v0.1.0 (2018/07/09)
* Integrate dash.js player (v2.8.0)
* Available API functionalities:
  - playback control (play, pause, seek, stop)
  - audio and text tracks selection
  - text tracks activation
  - trick play (fast forward and rewind)
