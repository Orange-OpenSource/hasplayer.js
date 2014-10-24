var cast = window.cast || {};

(function(){
	

	function HasCastReceiver(player){
		this.player = player;
		this.videoNode = player.getVideoModel().getElement();
		this.currentSender = null;
		this.firstAudioAccess = true;
		this.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
		this.castMessageBus = this.castReceiverManager.getCastMessageBus(HasCastReceiver.PROTOCOL,cast.receiver.CastMessageBus.MessageType.JSON);
		this.castMessageBus.onMessage = this.onMessage.bind(this);
		this.castReceiverManager.onSenderConnected = this.onSenderConnected.bind(this);
		this.castReceiverManager.onSenderDisconnected = this.onSenderDisconnected.bind(this);
		this.castReceiverManager.start();

		//connect events on metrics for testing metric change
		this.player.addEventListener("metricChanged", this.metricChanged.bind(this));
	}

	HasCastReceiver.PROTOCOL =  "urn:x-cast:com.google.cast.video.hasplayer";

	HasCastReceiver.prototype.onSenderConnected = function(e) {
		console.info("sender connected",e); 
		
		this.sendMessage(e.senderId,"connected",{connected:true});
	};

	HasCastReceiver.prototype.onSenderDisconnected = function(e) {
		console.info("onSenderDsisconnected ? ");
		if(this.castReceiverManager.getSenders().length === 0){
			window.close();
		}
	};

	HasCastReceiver.prototype.onMessage = function(event) {
		var message = event.data;
		this.currentSender = event.senderId;

		switch(message.command){
			case "play":
				this.play(message.data);
			break;

			case "toggleInformation":
				this.toggleInformation();
			break;

			case "toggleControlBar":
				this.toggleControlBar();
			break;

			case "toggleMute":
				this.toggleMute();
			break;

			case "changeTrack":
				this.changeTrack(message.data);
			break;

		}
	};


	HasCastReceiver.prototype.metricChanged = function(e) {
		if(e.data.stream == "audio" && this.firstAudioAccess && this.currentSender){
			this.firstAudioAccess = false;
			var audiotracks = this.player.getAudioTracks();
			console.info("audiotracks", audiotracks);
			// only send message if we have more than one audio
			if(audiotracks.length > 1){
				this.sendMessage(this.currentSender,"HaveMultiAudio",audiotracks);
			}
		}
	};


	HasCastReceiver.prototype.toggleInformation = function() {
		$("#infosToToggle").toggle();
		$("#chartToToggle").toggle();
		$("#sliderToToggle").toggle();
		this.sendMessage(this.currentSender,"toggleInformation",$('#chartToToggle').is(':visible'));
	};

	HasCastReceiver.prototype.toggleControlBar = function(){

		var cb = $('#controlBar');
		console.info("controlbar display :: ",cb.is(":visible"));
		if(cb.is(':visible')){
			cb.hide();
		}else{
			cb.show();
		}
		this.sendMessage(this.currentSender,"toggleControlBar",$('#controlBar').is(':visible'));
	};

	HasCastReceiver.prototype.toggleMute = function() {
		this.videoNode.muted = !this.videoNode.muted;
		if(this.videoNode.muted){
			setVolumeOff(true);
		}else{
			setVolumeOff(false);
		}
		this.sendMessage(this.currentSender,"toggleMute",this.videoNode.muted);
	};

	HasCastReceiver.prototype.changeTrack = function(track) {
		console.info("switch language ", track);
		this.player.setAudioTrack(track);
	};


	HasCastReceiver.prototype.play = function(message) {
		console.info("receiving play message",message);
		var drmParams = {};
		drmParams.backUrl = message.backUrl || null;
		drmParams.customData = message.customData || null;
		this.player.attachSource(message.url, drmParams);
		// to update controlbar set firstAccess to true
		firstAccess = true;
		this.firstAudioAccess = true;
		// hide all

		setTimeout(this.toggleControlBar.bind(this),10000);
		this.sendMessage(this.currentSender,"toggleMute",this.videoNode.muted);

		$("#chartToToggle").hide();
		this.sendMessage(this.currentSender,"toggleInformation",$('#chartToToggle').is(':visible'));
	};

	HasCastReceiver.prototype.sendMessage = function(senderId,evt,message) {
		console.info("sendMessage",evt,senderId,message);
		this.castMessageBus.send(senderId,{
			"event":evt,
			"data":message
		});
	};

	
	

	window.HasCastReceiver = HasCastReceiver;
})();
