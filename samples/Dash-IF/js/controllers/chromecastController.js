angular.module("DashPlayer").controller("ChromecastController",function($scope, $window, $timeout){
	
	// information about protocol and app ID and sender version
	var PROTOCOL =  "urn:x-cast:com.google.cast.video.hasplayer";
	var APP_ID = "7E99FD26";
	var CAST_SENDER_API="//www.gstatic.com/cv/js/sender/v1/cast_sender.js";

	var currentSession = null;

	var startupPromise = new Promise(function(resolve,reject){
		$scope.$watch("chromecast.connected",function(newVal, oldVal){
			if(newVal===true){
				resolve();
			}else{
				reject();
			}
		});
	});

	function onApiLoaded(loaded,errorInfo){
		if(loaded){
			onApiAvailable();
		}else{
			console.error("error on loading chromecast sdk", errorInfo);
		}

	}


	// handle url change when chromecast is active
	$scope.$watch("selectedItem.url",function(newVal, oldVal){
		if(newVal!=oldVal && $scope.chromecast.playing){
			$scope.loadInChromecast();
		}
	});
	


	function loadApi(){
		var script = document.createElement("script");
		script.src = CAST_SENDER_API;
		document.body.appendChild(script);
	}

	function onApiAvailable(){
		if(!chrome.cast || !chrome.cast.isAvailable){
			$timeout(onApiAvailable,1000);
		}
		$scope.chromecast.apiOk = true;
		$scope.$apply();
	}

	function initSession(){
		var p = new Promise(function(resolve, reject){
					console.log("init Sesssion");
					if(!currentSession){
						var sessionRequest = new chrome.cast.SessionRequest(APP_ID);
						var apiConfig = new chrome.cast.ApiConfig(sessionRequest,sessionListener,receiverListener);
						chrome.cast.initialize(apiConfig, function(){
								resolve();}, function(err){reject(err);});
					}else{
						resolve();
					}
				});
		return p;
	}


	function onInitSuccess(){
		var p = new Promise(function(resolve,reject){
			if(!currentSession){
				chrome.cast.requestSession(function(e){resolve(e);},function(err){reject(err);});
			}else{
				resolve(currentSession);
			}
		});
		return p;
	}

	

	function onChromecastError(e){
		console.error("ChromecastCommunication Error", e);
		if(e && e.code){
			switch(e.code){
				case "cancel":
					console.info("here tell user to click on chromecast name in the menu");
					currentSession = null;
				break;
				case "receiver_unavailable":
					console.info("receiver unavailable tell use to retry");
					currentSession = null;
				break;
			}
		}
	}
	
	// called once the session created
	function sessionListener(e){
		currentSession = e;
		e.addUpdateListener(sessionUpdateListener);
		e.addMessageListener(PROTOCOL,onReceiverMessage);
	}

	function sessionUpdateListener(isAlive){
		console.info("session is alive ",isAlive);
		if(!isAlive){
			// the session is closed
			currentSession = null;
			$scope.chromecast.connected = false;
			$scope.chromecast.playing = false;
			$scope.chromecast.cbDisplay = true;
			$scope.chromecast.infoDisplay = false;

			$scope.doLoad();
			$scope.$apply();
		}
	}

	function onReceiverMessage(protocol, messageString){
		console.log("got a message",protocol, messageString);
		var msg = JSON.parse(messageString);
		switch(msg.event){
			case "connected":
				$scope.chromecast.connected = msg.data.connected;
			break;
			case "toggleControlBar":
				$scope.chromecast.cbDisplay = msg.data;
			break;

			case "toggleInformation":
				$scope.chromecast.infoDisplay = msg.data;
			break;
		}

		$scope.$apply();
	}

	
	function receiverListener(e){
		// nothing to done here just logging
		console.info("receiver listener ",e);

	}


	// send message to the receiver
	// msg format  : {commant:"play",data:{...}};
	function sendMessage(msg){
		var p = new Promise(function(resolve,reject){
			if(currentSession){
				currentSession.sendMessage(PROTOCOL,msg,function(resp){resolve(resp);},function(err){reject(err);});
			}else{
				reject();
			}
		});
		return p;
	}

	// connection on the listener to handle api load
	if(chrome){
		$window["__onGCastApiAvailable"] = onApiLoaded;
		loadApi();
	}

	$scope.chromecast.apiOk = false;
	$scope.chromecast.connected = false;
	$scope.chromecast.playing = false;
	$scope.chromecast.cbDisplay = true;
	$scope.chromecast.infoDisplay = false;



	$scope.loadInChromecast = function(url){
		// initilize currentSession if not set
		initSession().then(onInitSuccess,onChromecastError).then(sessionListener,onChromecastError).then(startupPromise).then(function(){
			// retrieve all media information
			var params = {};
			params.url = $scope.selectedItem.url;
			params.backUrl = $scope.selectedItem.backUrl || null;
			params.customData = $scope.selectedItem.customData || null;
			if($scope.player.isReady()){
				var isLive = $scope.player.metricsExt.manifestExt.getIsDynamic($scope.player.metricsExt.manifestModel.getValue())
				if(!isLive){
					$scope.player.getVideoModel().pause();
					var timeToSeek = $scope.player.getVideoModel().getCurrentTime();
					params.url+="#s="+timeToSeek;
				}
			}
			
			
			console.info("sending play command");
			sendMessage({command:"play",data:params}).then(function(){
				$scope.chromecast.playing = true;
				$scope.$apply();
			},onChromecastError);
			
			
			
			
		});
	};


	// stop reading on chromecast back to pag player
	$scope.stopInChromecast = function(){
		console.info("Asked for stopping video");
		if(currentSession){
			currentSession.stop(function(){
				// nothing to do it's done when session isn't alive
			},onChromecastError);
		}
	};

	$scope.chromecast.toggleInformation = function(){
		sendMessage({"command":"toggleInformation"});
	};

	$scope.chromecast.toggleControlbar = function(){
		sendMessage({"command":"toggleControlBar"});
	};



});