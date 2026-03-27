/*
	this is all the stuff not included in the web version
	lets us not to communicate with start.js
*/

showAds=false;
Music=false;
WindowFocus=true;

Steam=false;
App=false;



PRELOAD=function(callback){return async function(){
	
	var initMusic=function()
	{
		AudioContext=new (window.AudioContext || window.webkitAudioContext)();
		if (AudioContext)
		{
			Music={};
			Music.context=AudioContext;
			Music.tracks={};
			
			//node stack
			Music.gain=new GainNode(Music.context,{gain:1});
			Music.gain.connect(Music.context.destination);
			Music.filter=new BiquadFilterNode(Music.context,{type:'lowpass',Q:0});
			Music.filter.frequency.setValueAtTime(5000,Music.context.currentTime);
			Music.filter.connect(Music.gain);
			Music.out=Music.filter;
			
			Music.setFilter=function(val,secs)
			{
				//val=1: no effect
				//val=0: full lowpass
				//secs: ramp over how many seconds
				var minValue=40;
				var maxValue=Music.context.sampleRate/2;
				var numberOfOctaves=Math.log(maxValue/minValue)/Math.LN2;
				var multiplier=Math.pow(2,numberOfOctaves*(val-1.0));
				Music.filter.frequency.cancelScheduledValues(Music.context.currentTime);
				if (secs)
				{
					Music.filter.frequency.setValueAtTime(Music.filter.frequency.value,Music.context.currentTime);
					Music.filter.frequency.exponentialRampToValueAtTime(maxValue*multiplier,Music.context.currentTime+secs);
				}
				else Music.filter.frequency.setValueAtTime(maxValue*multiplier,Music.context.currentTime);
			}
			Music.setFilter(1);
			
			Music.setVolume=function(val,secs)
			{
				//val=1: full volume
				//val=0: silent
				//secs: ramp over how many seconds
				val*=0.75;
				Music.gain.gain.cancelScheduledValues(Music.context.currentTime);
				if (secs)
				{
					if (val<=0)
					{
						val=0.00001;
					}
					Music.gain.gain.setValueAtTime(Music.gain.gain.value,Music.context.currentTime);
					Music.gain.gain.exponentialRampToValueAtTime(val,Music.context.currentTime+secs);
				}
				else Music.gain.gain.setValueAtTime(val,Music.context.currentTime);
			}
			
			Music.addTrack=function(name,author,url)
			{
				if (!Music.tracks[name])
				{
					Music.tracks[name]={
						audio:new Audio(),
						canPlay:false,
						name:name,
						author:author,
					};
					var track=Music.tracks[name];
					track.out=Music.context.createMediaElementSource(track.audio);
					track.audio.autoplay=false;
					track.audio.crossOrigin='anonymous';
					track.audio.src=url;
					track.audio.track=track;
					track.play=function(){
						this.out.connect(Music.out);
						this.audio.currentTime=0;
						this.audio.loop=false;
						this.audio.play();
					};
					track.stop=function(){
						//this.out.disconnect(Music.out);
						this.audio.pause();
					};
					track.unstop=function(){
						this.out.connect(Music.out);
						this.audio.play();
					};
					AddEvent(track.audio,'canplay',function(it){
						it.target.track.canPlay=true;
					});
				}
			}
			
			//note: may trigger CORS locally
			Music.addTrack('preclick','C418','music/preclick.mp3');
			Music.addTrack('click','C418','music/click.mp3');
			Music.addTrack('grandmapocalypse','C418','music/grandmapocalypse.mp3');
			Music.addTrack('ascend','C418','music/ascend.mp3');
			
			Music.cues={
				'launch':()=>{Music.setFilter(0);setTimeout(()=>{Music.loopTrack('preclick');Music.setFilter(1,5);},1000);},
				'preplay':()=>{Music.setFilter(0.5,0.1);setTimeout(()=>{Music.cue('play');Music.setFilter(1,0.1);},100);},
				'play':()=>{if (Game.elderWrath<3){Music.loopTrack('click');Music.setFilter(1);} else {Music.cue('grandmapocalypse');}},
				'grandmapocalypse':()=>{Music.loopTrack('grandmapocalypse');Music.setFilter(1);},
				'fadeTo':(what)=>{
					if (Music.playing && Music.playing.name==what) return false;
					Music.setFilter(0,3);
					setTimeout(()=>{
						var prev=Music.playing?Music.playing.audio.currentTime:0;
						Music.setFilter(0);
						Music.setFilter(1,3);
						Music.loopTrack(what);
						Music.playing.audio.currentTime=prev%(1*4);//preserve bpm and bar
					},3000);
				},
				'preascend':()=>{Music.setFilter(0,3);},
				'ascend':()=>{Music.loopTrack('ascend');Music.setFilter(1);Music.playing.audio.currentTime=(Game.resets%2==0?0:175.95);},
			};
			
			Music.cue=function(cue,arg)
			{
				if (Music.cues[cue]) Music.cues[cue](arg);
			}
			
			Music.playing=false;
			Music.playTrack=function(name,callback)
			{
				var track=Music.tracks[name];
				if (!track) return false;
				if (Music.playing) Music.playing.stop();//todo: fade out
				Music.playing=track;
				if (track.canPlay) {track.play();track.audio.loop=false;if (callback){callback(track);}}
				else
				{
					AddEvent(track.audio,'canplay',function(it){
						if (it.target.track==Music.playing) {it.target.track.play();if (callback){callback(it.target.track);}}
					});
				}
				if (Game.jukebox) Game.jukebox.setTrack(Game.jukebox.tracks.indexOf(name),true);
				return true;
			}
			Music.loopTrack=function(name)
			{
				Music.playTrack(name,(track)=>{track.audio.loop=true;});
			}
			
			Music.pause=function()
			{
				if (Music.playing) Music.playing.stop();
			}
			Music.unpause=function()
			{
				if (Music.playing) Music.playing.unstop();
			}
			Music.loop=function(val)
			{
				if (Music.playing) Music.playing.audio.loop=val;
			}
			Music.setTime=function(val)
			{
				if (Music.playing) Music.playing.currentTime=val;
			}
			
			//Music.playTrack('click');
		}
	}
	
	/*if (!App)
	{
		Game.firstClick=false;
		AddEvent(window,'click',function(initMusic){return function(){
			if (Game.firstClick) return;
			Game.firstClick=true;
			initMusic();
		}}(initMusic));
	}
	else */initMusic();
	
	
	
	//handle errors, likely in mods
	let onRuntimeError=function(e)
	{
		var stack=0;
		if (e.stack) stack=e.stack;
		else if (e.reason && e.reason.stack) stack=e.reason.stack;
		if (stack)
		{
			var str='';
			
			var paths=stack.match(/\(([^\)]+)\)/gi);
			var modPath=paths.filter(it=>it.indexOf('/mods/')!=-1);
			var srcPath=paths.filter(it=>it.indexOf('/src/')!=-1);
			if (modPath.length>0)
			{
				var path=modPath[0].slice(1,-1);
				path=path.substring(path.indexOf('/mods/'));
				str+=`Error in mod script:<br><b>${path}</b><br>Try disabling the relevant mod.`;
			}
			else if (srcPath.length>0)
			{
				var path=srcPath[0].slice(1,-1);
				path=path.substring(path.indexOf('/src/'));
				str+=`Error in game script:<br><b>${path}</b><br>This may be caused by a recent update.`;
			}
			else
			{
				str+=`Error in game code.`;
				if (paths.length>0) str+=`<br><b>${paths[0].slice(1,-1)}</b>`;
			}
			
			if (str && l('failedToLoad'))
			{
				str+=`<div style="font-size:20px;margin-top:24px;"><a id="errorStartModless" class="highlightHover smallWhiteButton">Restart without mods?</a> <a id="errorQuit" class="highlightHover smallOrangeButton">Quit</a></div>`;
				l('failedToLoad').innerHTML=str;
				l('failedToLoad').style.animation='none';
				AddEvent(l('errorStartModless'),'click',()=>{Steam.reload({'modless':'1'})});
				AddEvent(l('errorQuit'),'click',Steam.quit);
			}
		}
	}
	
	window.addEventListener('error',onRuntimeError);
	window.addEventListener('unhandledrejection',onRuntimeError);
	
	callback();
}};