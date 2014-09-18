var cast = window.cast || {};

(function(){
	
	HasCastReceiver.PROTOCOL =  "urn:x-cast:com.google.cast.video.hasplayer";

	function HasCastReceiver(player){
		this.player = player;
		this.currentSender = null;
		this.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
		this.castMessageBus = this.castReceiverManager.getCastMessageBus(HasCastReceiver.PROTOCOL,cast.receiver.CastMessageBus.MessageType.JSON);
		this.castMessageBus.onMessage = this.onMessage.bind(this);
		this.castReceiverManager.onSenderConnected = this.onSenderConnected.bind(this);
		this.castReceiverManager.onSenderDisconnected = this.onSenderDisconnected.bind(this);
		this.castReceiverManager.start();
	}

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
		console.info("affichag de la contolbat :: ",cb.is(":visible"));
		if(cb.is(':visible')){
			cb.hide();
		}else{
			cb.show();
		}
		this.sendMessage(this.currentSender,"toggleControlBar",$('#controlBar').is(':visible'));
	}

	HasCastReceiver.prototype.play = function(message) {
		console.info("receiving play message",message);
		var drmParams = {};
		drmParams.backUrl = message.backUrl || null;
		drmParams.customData = message.customData || null;
		this.player.attachSource(message.url, drmParams);
		// to update controlbar set firstAccess to true
		firstAccess = true;
		// hide all

		setTimeout(this.toggleControlBar.bind(this),10000);

		this.toggleInformation();
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
