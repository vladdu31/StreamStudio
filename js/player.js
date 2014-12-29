var player;
var searchTypes_select = 'videos';
var selected_resolution = '1080p';
var selected_category = '';
var current_video = NaN;
var current_search = '';
var current_start_index = 1;
var current_prev_start_index = 1;
var current_page = 1;
var current_search_page = 1;
var current_song_page = 1;
var load_first_song_next = false;
var load_first_song_prev = false;
var current_song = NaN;
var next_vid;
var prev_vid;
var relTime;
var trackDuration;
var timeUpdater;
var previousLink;
var playFromHttp = false;
var playFromFile = false;
var playFromUpnp = false;
var playFromMega = false;
var playFromMegaUser = false;
var playFromTwitch = false;
var playFromYoutube = false;
var doNotSwitch = false;

$(document).ready(function() {
	
	player = MediaElementPlayer('#videoPlayer', {
        features: ['playpause', 'progress', 'current', 'duration', 'stop', 'volume', 'fullscreen']
    });
    
    // next signal and callback
    $(document).on('click', '.mejs-next-btn', function(e) {
		e.preventDefault();
        getNext();
    });
    // stop button
    $(document).on('click', '#stopBtn, #subPlayer-stop', function(e) {
		try {
			upnpMediaPlaying = false;
			continueTransition = false;
			mediaRenderer.stop();
			stopUpnp();
		} catch(err) {}
        initPlayer();
        $('#playerContainer').hide();
        $('#playerTopBar').hide();
        $('#tab a[href="#tabpage_'+activeTab+'"]').click();
    });
    // pause/stop button
    $('.mejs-playpause-button').click(function(e) {
        if (playAirMedia === true) {
            if (airMediaPlaying === true) {
                login(stop_on_fbx);
                if (currentMedia.link !== currentAirMedia.link) {
                    setTimeout(function() {
                        $('.mejs-overlay-button').hide();
                        play_on_fbx(currentMedia.link);
                    }, 2000);
                }
            } else {
                $('.mejs-overlay-button').hide();
                play_on_fbx(currentMedia.link);
            }
        }
    });
    //transcoder button
     $(document).on('click','#transcodeBtnContainer,#transcodingBtnSub',function(e) {
		e.preventDefault();
		if(transcoderEnabled) {
			$('button[aria-controls="transcodeBtn"]').removeClass('transcoder-enabled').addClass('transcoder-disabled');
			$('button[aria-controls="transcodeBtn"]').attr('title',_('transcoding disabled'));
			transcoderEnabled = false;
		} else {
			$('button[aria-controls="transcodeBtn"]').removeClass('transcoder-disabled').addClass('transcoder-enabled');
			$('button[aria-controls="transcodeBtn"]').attr('title',_('transcoding enabled'));
			transcoderEnabled = true;
		}
	 });
    
    //playlist buttons
    $(document).on('click','#playlistBtn,#playlistBtnSub',function(e) {
		e.preventDefault();
		console.log('playlist clicked');
		var pos = $('button[aria-label="playlist"]').css('backgroundPosition-y');
		if(pos === '0px') {
			$('button[aria-label="playlist"]').attr('style', 'background-position-y:-16px !important');
			$('button[aria-label="playlist"]').attr('title',_('repeat mode'));
			playlistMode = 'loop';
		//} else if(pos === '-16px') {
			//$('button[aria-label="playlist"]').attr('style', 'background-position-y:-48px !important');
			//$('button[aria-label="playlist"]').attr('title','shuffle mode');
			//playlistMode = 'shuffle';
		} else if (pos === '-16px') {
			$('button[aria-label="playlist"]').attr('style', 'background-position-y:-48px !important');
			$('button[aria-label="playlist"]').attr('title',_('play and stop mode (click to change)'));
			playlistMode = 'normal';
		} else if (pos === '-48px') {
			$('button[aria-label="playlist"]').attr('style', 'background-position-y:0px !important');
			$('button[aria-label="playlist"]').attr('title',_('playlist mode'));
			playlistMode = 'continue';
		}
	});
	
    // previous signal and callback
    $(document).on('click', '.mejs-back-btn', function(e) {
        e.preventDefault();
        getPrev();
    });
    
    // player signals
    player.media.addEventListener('ended', function() {
        on_media_finished();
		$('.mejs-overlay-play').show();
		$(".mejs-overlay-loading").hide();
    });
    
    //player.media.addEventListener('loadeddata', function() {
        //$('.mejs-overlay,.mejs-overlay-loading').hide();
    //}, false);
    
    player.media.addEventListener('pause', function() {
		$('#subPlayer-play').show();
		$('#subPlayer-pause').hide();
    });
    player.media.addEventListener('seeking', function() {
		$(".mejs-overlay-loading").show();
		$('.mejs-overlay-play').hide();
    });
    
    player.media.addEventListener('stalled', function() {
		$(".mejs-overlay-loading").show();
		$('.mejs-overlay-play').hide();
    });
    
    player.media.addEventListener('playing', function() {
		$('#subPlayer-play').hide();
		$('#subPlayer-pause').show();
		$('.mejs-overlay-button,.mejs-overlay,.mejs-overlay-loading,.mejs-overlay-play').hide();
    });
    
	//SubPlayer controls
	$('#subPlayer-next').click(function() {
		getNext();
	});
	
	$('#subPlayer-play, #subPlayer-pause').click(function() {
		if(player.media.paused) {
			player.play();
		} else {
			player.pause();
		}
	});
	
	$('#subPlayer-prev').click(function() {
		getPrev();
	});
	
	// subPlayer show/hide 
	//$("#subPlayer").hide();
	
	//$( "#showPlayer" ).mouseover(function() {
	  //$("#subPlayer").show();
	//});
	//$("#subPlayer" ).mouseleave(function() {
	  //$("#subPlayer").hide();
	//});
	
	// subPlayer progress bar
	mediaPlayer = document.getElementById('videoPlayer');
	mediaPlayer.addEventListener('timeupdate', updateProgressBar, false);
	$('#progress-bar').click(function(e) {
		var pos = e.offsetX;
		var pct = (( pos * 100) / $('#progress-bar').width()).toFixed(2);
		var duree = player.media.duration !== Infinity ? player.media.duration : mediaDuration;
		console.log(pct + "%")
		var newTime = Math.round((duree * pct) / 100);
		if(transcoderEnabled || playFromYoutube) {
			var m = {};
			var l = currentMedia.link.replace(/&start=(.*)/,'')
			if(playFromFile) {
				m.link = l.replace('?file=/','?file=file:///')+'&start='+mejs.Utility.secondsToTimeCode(newTime);
			} else if(playFromHttp) {
				m.link = l.split('?file=')[1]+'&start='+mejs.Utility.secondsToTimeCode(newTime)+'&external';
			} else if (torrentPlaying) {
				m.link = l.split('?file=')[1]+'&start='+mejs.Utility.secondsToTimeCode(newTime)+'&torrent';
			} else if (playFromUpnp) {
				m.link = l.split('?file=')[1]+'&start='+mejs.Utility.secondsToTimeCode(newTime)+'&upnp';
			} else if (playFromYoutube) {
				doNotSwitch = true;
				m.link = l.split('?file=')[1]+'&start='+mejs.Utility.secondsToTimeCode(newTime);
			}
			m.title = currentMedia.title;
			console.log(m)
			startPlay(m);
		} else {
			player.setCurrentTime(newTime)
		}
	})
	
	// close player
	$('#closePlayer').click(function() {
		if (win.isFullscreen === true) {
            win.toggleFullscreen();
            player.isFullScreen = false;
        }
        $('#playerContainer').hide();
        $('#playerTopBar').hide();
        $('#tab a[href="#tabpage_'+activeTab+'"]').click();
    });
	
});


function initPlayer() {
    player.pause();
    player.setSrc('');
    $("#subPlayer-img").attr('src',"images/play-overlay.png");
    setTimeout(function() {
		player.currentTime = 0;
		player.current[0].style.width = 0;
		player.loaded[0].style.width = 0;
		//player.durationD.html('00:00:00');
		$('.mejs-time-loaded').width(0+'%');
		$('.mejs-time-buffering').width(0+'%');
		$('.mejs-time-current').width(0+'%');
		$('.mejs-currenttime').text('00:00:00');
		$('.mejs-duration').text('00:00:00');
		$('#subPlayer-Progress progress').val(0);
		//$("#preloadTorrent").remove();
		$(".mejs-overlay").show();
		$(".mejs-layer").show();
		$(".mejs-overlay-loading").hide();
		$('#subPlayer-title').empty().append(_('Waiting...'));
		mediaDuration = 0;
	},100);
		$('#infosPage').remove();
		$('#song-title').empty().append(_('Waiting...'));
		$('.mejs-container #fbxMsg').remove();
		continueTransition = false;
		clearInterval(timeUpdater);
		timeUpdater = null;
		$("#subPlayer-title").text(' '+_('Waiting...'));
		$('#subPlayer-play').show();
		$('#subPlayer-pause').hide();
		$('#fbxMsg2').remove();
		if (upnpMediaPlaying && playFromUpnp) {
			upnpMediaPlaying = false;
			playFromUpnp = false;
			mediaRenderer.stop();
		}
		try {
			cleanffar();
			currentRes.end();
		} catch (err) {}
		try {
			if(torrentPlaying) {
			 stopTorrent();
			}
		} catch (err) {}
		
		try {
			extPlayerProc.kill('SIGKILL');
		} catch(err) {}
	setTimeout(function() { 
		if(player.media.paused && player.media.src.match(/index.html/) !== null && torrentPlaying == false) {
			$(".mejs-overlay-button").show();
			$(".mejs-overlay-play").show();
		}
	},2000);
}

function startPlay(media) {
	if(torrentPlaying === false && playFromUpnp == false && upnpMediaPlaying == false) {
		if (media.link.indexOf('videoplayback?id') !== -1 && !upnpToggleOn) {
			if(currentMedia && currentMedia.ytId !== ytId) {
				initPlayer();
			} else {
				cleanffar();
			}
		} else {
			initPlayer();
		}
	}
    if(extPlayerRunning) {
		try {
			extPlayerProc.kill('SIGKILL');
			setTimeout(function() {
				startPlay(media);
				extPlayerRunning = false;
			},1000);
			return;
		} catch(err){};
	}
    
    playFromFile = false;
    playFromHttp = false;
    torrentPlaying = false;
    playFromUpnp = false;
    playFromMega = false;
    playFromMegaUser = false;
    playFromTwitch = false;
    playFromYoutube = false;
    var localLink = null;
    try {
        next_vid = media.next;
        var link = media.link;
        if(link.indexOf('http://'+ipaddress+':8888/?file') !== -1) {
			link = link.split('?file=')[1].replace('&tv','');
		} else {
			link = link.replace('&tv','');
		}
        var title = media.title;
        currentMedia = media;
        currentMedia.link = link;
        
        // set title
        $('#song-title').empty().append(_('Playing: ') + decodeURIComponent(title));
		$('.mejs-overlay, .mejs-overlay-loading').show();
		$('.mejs-overlay-play').hide();
        // check type of link to play
		var linkType = link.split('&').pop();
		if (linkType === 'twitch' || link.indexOf('twitch.tv') !== -1) {
			playFromTwitch = true;
			currentMedia.link = link.replace('&twitch','').replace('&external','');
			launchPlay();
		// youtube dash
		} else if (link.indexOf('videoplayback?id') !== -1 && !upnpToggleOn) {
			playFromYoutube = true;
			currentMedia.link = link;
			currentMedia.ytId = ytId;
			launchPlay();
		} else if (linkType === 'torrent') {
			torrentPlaying = true;
			currentMedia.link = link.replace('&torrent','');
			launchPlay();
		// http(s) links
		} else if (linkType === 'external') {
			playFromHttp = true;
			currentMedia.link = link.replace('&external','');
			launchPlay();
		// local files links
		} else if (link.indexOf('file:///') !== -1) {
			playFromFile = true;
			currentMedia.link = link.replace('file://','');
			launchPlay();
		// play from upnp server
		} else if (linkType === 'upnp' || upnpToggleOn) {
			playFromUpnp = true;
			currentMedia.link = link.replace('&upnp','');
			launchPlay();
		// else look for link already downloaded, if yes play it from hdd
		} else if (playFromFile == false) {
			fs.readdir(download_dir, function(err, filenames) {
				var i;
				count = filenames.length;
				if ((err) || (count === 0)) {
					launchPlay();
				} else {
					for (i = 0; i < filenames.length; i++) {
						ftitle = filenames[i];
						if ((title + '.mp4' === ftitle) || (title + '.webm' === ftitle) || (title + '.mp3' === ftitle)) {
							currentMedia.link = 'file://' + encodeURI(download_dir + '/' + ftitle);
						}
						count--;
						if (count === 0) {
							launchPlay();
						}
					}
				}
			});
		} else {
			launchPlay();
		}
    } catch (err) {
        console.log("error startPlay: " + err);
    }
}

function launchPlay() {
	try {
		var obj = JSON.parse(settings.ht5Player);
		if((activeTab == 1 || activeTab == 2) && (search_engine=== 'dailymotion' || search_engine=== 'youtube' || engine.type == "video") && obj.name === "StreamStudio") {
			if(doNotSwitch) {
				doNotSwitch = false;
			} else {
				$('#playerToggle').click();
				$(".mejs-overlay-button").hide();
				$('.mejs-overlay-play').hide();
			}
		}
	} catch(err) {}
	$('#subPlayer-play').hide();
	$('#subPlayer-pause').show();
	var img = null;
	try {
		img = $('.highlight img')[0].src;
		console.log(img, activeTab, $('#subPlayer-img').attr('src'))
		if (img !== $('#subPlayer-img').attr('src') && img !== null && activeTab !== 3 && activeTab !== 5) {
			$('#subPlayer-img').attr('src',img);
		} else {
			$('#subPlayer-img').attr('src','images/play-overlay.png');
		}
	} catch(err) {
		$('#subPlayer-img').attr('src','images/play-overlay.png');
	}
	if($('#subPlayer-title').text() !== currentMedia.title) {
		$('#subPlayer-title').empty().append('<p>'+currentMedia.title+'</p>');
	}
	// add link for transcoding
	if(transcoderEnabled || playFromTwitch|| playFromYoutube|| currentMedia.link.indexOf('mega.co') !== -1) {
		var link = 'http://'+ipaddress+':8888/?file='+currentMedia.link;
		currentMedia.link = link;
	}
	
	if(upnpToggleOn) {
		upnpMediaPlaying = false;
		continueTransition = false;
		currentMedia.data = JSON.stringify({"protocolInfo" : "http-get:*"});
		if(currentMedia.type === undefined) {
			try {
				if (mime.lookup(currentMedia.title).indexOf('audio/') !== -1 || mime.lookup(currentMedia.link).indexOf('audio/') !== -1) {
					currentMedia.type = "object.item.audioItem.musicTrack";
				} else if (mime.lookup(currentMedia.title).indexOf('video/') !== -1 || mime.lookup(currentMedia.link).indexOf('video/') !== -1) {
					currentMedia.type = "object.item.videoItem";
				}
			} catch(err) {
				currentMedia.type = "object.item.videoItem";
			}
		}
		if (upnpMediaPlaying) {
			mediaRenderer.stop();
			setTimeout(function() { return playUpnpRenderer(currentMedia);},2000);
		} else {
			return playUpnpRenderer(currentMedia);
		}
	} else {
		var obj = JSON.parse(settings.ht5Player);
		if(obj.name === 'StreamStudio') {
			player.setSrc(currentMedia.link);
			player.play();
		} else {
			startExtPlayer(obj);
		}
	}
}

function startExtPlayer(obj) {
	if(currentMedia.link.indexOf('mega.co') !== -1) {
		extPlayerProc = spawn(''+obj.path+'', [''+decodeURIComponent(currentMedia.link)+'']);
	} else {
		extPlayerProc = spawn(''+obj.path+'', [''+decodeURIComponent(currentMedia.link)+'']);
	}
	extPlayerRunning = true;
	extPlayerProc.on('exit',function() {
		console.log(obj.name + ' process terminated....');
		initPlayer();
		extPlayerRunning = false;
	});
}


function startVideo(vid_id, title) {
    if ($('#' + vid_id + ' a.video_link').length === 0) {
        return;
    }
    
    var childs = $('#' + vid_id + ' a.video_link');
    var elength = parseInt(childs.length);
    if (elength > 1) {
        for (var i = 0; i < elength; i++) {
            var found = false;
            var res = $(childs[i], this).attr('alt');
            if (res == settings.resolution) {
                childs[i].click();
                break;
            } else {
                // if not found  select the highest resolution available...
                if (i + 1 == elength) {
                    if (found === false) {
                        childs[0].click();
                    } else {
                        continue;
                    }
                }
            }
        }
    } else {
        childs[0].click();
    }
}

function playNextVideo(vid_id) {
    try {
        var elem_id = '';
        // if page was changed
        if (current_song_page !== current_page) {
            // if some items are loaded
            if ($('#items_container').children().length > 1) {
                // play first item
                vid_id = $('#items_container').find('.youtube_item').find('.downloads_container').attr('id');
            } else {
                return;
            }
        }
        load_first_song_next = false;
        load_first_song_prev = false;
        current_song_page = current_page;
        startVideo(vid_id);
    } catch (err) {
        console.log(err + " : can't play next video...");
    }
}

function getNext() {
	$('.mejs-time-buffering').width(0+'%');
	$('.mejs-time-current').width(0+'%');
	$('span.mejs-currenttime').text('00:00:00');
	$('span.mejs-duration').text('00:00:00');
    //$("#preloadTorrent").remove();
    $(".mejs-overlay").show();
    $(".mejs-layer").show();
    $(".mejs-overlay-loading").hide();
    $(".mejs-overlay-button").show();
    $('#infosPage').remove();
    $('#song-title').empty().append(_('Stopped...'));
    $('.mejs-container #fbxMsg').remove();
    console.log("trying get next video", next_vid);
    if (activeTab == 1) {
		try {
			engine.play_next();
		} catch(err) {
			try {
				$('.highlight').closest('li').next().find('a')[0].click();
			} catch (err) {
				try {
					$('.highlight').closest('li').next().find('a.preload')[0].click();
				} catch (err) {
					try {
						$('.highlight').closest('div.youtube_item').next().find('a.start_video').click()
					} catch (err) {
						playNextVideo(next_vid);
					}
				}
			}
		}
	} else {
		try {
			var vid = $('.jstree-clicked').attr('id');
			if (vid === undefined) {
				console.log("no more videos to play in the playlists");
			} else {
				$('#' + vid).next().find('a').click();
			}
		} catch(err) {} 
	}
}

function getPrev() {
	$('.mejs-time-buffering').width(0+'%');
	$('.mejs-time-current').width(0+'%');
	$('span.mejs-currenttime').text('00:00:00');
	$('span.mejs-duration').text('00:00:00');
    //$("#preloadTorrent").remove();
    $(".mejs-overlay").show();
    $(".mejs-layer").show();
    $(".mejs-overlay-loading").hide();
    $(".mejs-overlay-button").show();
    $('#infosPage').remove();
    $('#song-title').empty().append(_('Stopped...'));
    $('.mejs-container #fbxMsg').remove();
    if (activeTab == 1) {
		try {
			$('.highlight').closest('li').prev().find('a')[0].click();
		} catch (err) {
			try {
				$('.highlight').closest('div.youtube_item').prev().find('a.start_video').click()
			} catch(err) {}
		}
	} else {
		try {
			var vid = $('.jstree-clicked').attr('id');
			if (vid === undefined) {
				console.log("no more videos to play in the playlists");
			} else {
				$('#' + vid).prev().find('a').click();
			}
		} catch(err) {} 
	}
}

function on_media_finished(){
	if (playlistMode === 'normal') {
		initPlayer();
	} else if (playlistMode === 'loop') {
		if(upnpMediaPlaying) {
			playUpnpRenderer(currentMedia)
		} else {
			startPlay(currentMedia);
		}
	} else if (playlistMode === 'shuffle') {
		
	} else if (playlistMode === 'continue') {
		getNext();
	} 
}

function updateProgressBar() {
   var progressBar = document.getElementById('progress-bar');
   var duree = player.media.duration !== Infinity ? player.media.duration : mediaDuration;
   var current = player.media.currentTime;
   try {
	   var percentage = ((100 / duree) * current);
		progressBar.value = percentage;
	} catch(err) {}
}
