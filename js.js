// ==UserScript==
// @name        nektomi [Ultima]
// @namespace   Violentmonkey Scripts
// @match       https://nekto.me/audiochat*
// @grant       none
// @version     1.4.0
// @author      -
// @description 6/3/2023, 2:04:02 AM
// @icon        https://nekto.me/audiochat/favicon.ico
// @downloadURL https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/js.js
// @run-at      document-start
// @inject-into page
// @resource    mic_off_spy https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/ic_mic_off_white_spy.webp
// @resource    mic_on_spy https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/ic_mic_on_white_spy.webp
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @grant       unsafeWindow
// @grant       GM_registerMenuCommand
// @grant       GM_getResourceURL
// @grant       GM_addStyle
// ==/UserScript==


(async function() {
	'use strict';

	const keyDialogStopNext = 'Space'
  const keyVolumeMute = 'ArrowDown'
  const keyVolumeUnmute = 'ArrowUp'



	let _console_log = unsafeWindow.console.log
	let log = _console_log








	unsafeWindow.console.log = (...args) => {
		// _console_log(...args)
	}



//   let nativeAddEventListener = unsafeWindow.document.addEventListener

//   unsafeWindow.document.addEventListener = function(...args){
//     log('adde', ...args)
//     if(args[0] == 'visibilitychange' | args[0] == 'mouseleave'){
//       log('blocked vis change')
//       return
//     }
//     return nativeAddEventListener(...args)
//   }

//   document.addEventListener("visibilitychange", () => {
//     log('me', document.visibilityState)
//   });

  // const nativeGetUserMedia = unsafeWindow.navigator.mediaDevices.getUserMedia
  // unsafeWindow.navigator.mediaDevices.getUserMedia = function(...args){
  //   log('audio', ...args)
  //   return nativeGetUserMedia(...args)
  // }


  const nativeAudio = unsafeWindow.Audio
  unsafeWindow.Audio = function(...args){
    // log('audio', args)
    const audio = new nativeAudio(...args)
    if (args.length == 1 && args[0].includes('connect.mp3')){
      log('found audio shitty print', args[0])
      audio.volume = 0.1
    }
    return audio
  }

	log('hack eeeye')



	function getElementByXpath(path) {
		return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
	}

	function waitForElemByXPath(path, ms){
		return new Promise((resolve, reject) => {
			 setTimeout(() => {
				 resolve(getElementByXpath(path));
			 }, ms)
		 })
	}

  let dialogStoppedByKey = false
	document.addEventListener('keydown', async (event) => {
		const code = event.code;
		if(code == keyDialogStopNext){
			event.stopImmediatePropagation()
			const stopTalkButton = document.querySelector('.stop-talk-button')
      if(stopTalkButton){
        stopTalkButton.click()
        dialogStoppedByKey = true
      }

      const goScanButton = unsafeWindow.document.querySelector('.go-scan-button')
      if(goScanButton){
        goScanButton.click()
        dialogStoppedByKey = false
      }
      return
      }
	})

  VM.observe(unsafeWindow.document, () => {
		const node = unsafeWindow.document.querySelector('.swal2-confirm')
		if (node){
			node.click()
		}
	})


  class Volume{
    static set(vol){
      const media = [...document.querySelectorAll('video, audio')]
      media[0].volume = vol
    }

    static get(){
      const media = [...document.querySelectorAll('video, audio')]
      return media[0].volume
    }
  }

  let prevVolume = 1
  VM.observe(unsafeWindow.document, () => {
		const node = unsafeWindow.document.querySelector('.stop-talk-button')
		if (node){
			prevVolume = Volume.get()
      log('start volume is', prevVolume)
      return true
		}
	})

  document.addEventListener('keydown', async (event) => {
		const code = event.code;
		if(code == keyVolumeMute){
			event.stopImmediatePropagation()
			prevVolume = Volume.get()
      Volume.set(0)
		}
    if(code == keyVolumeUnmute){
      event.stopImmediatePropagation()
      Volume.set(prevVolume)
    }
	})




	// document.addEventListener('keypress', async (event) => {
	// 	const code = event.code;
	// 	if(code == keyDialogStopNext){
	// 		event.stopImmediatePropagation()
	// 		const endCallDialog = document.querySelector('swal2-confirm')
	// 		if(endCallDialog){
	// 			const endCallButton = endCallDialog.childNodes[2].childNodes[1]
	// 			endCallButton.click()
	// 			return
	// 		}
	// 	}
	// })



	const styles = `
		.mute_spy_on{
			background-image: url(${GM_getResourceURL('mic_on_spy')}) !important;
		}

		.mute_spy_off{
			background-image: url(${GM_getResourceURL('mic_off_spy')}) !important;
		}

    .fixed{
        position:fixed;
        top:200px;
        right:0px;
        width:100px;
        z-index: 1000;
    }

    .custom_text{
      color: white;
      font-size: 20px;
    }

	`


	VM.observe(unsafeWindow.document, () => {
		const node = unsafeWindow.document.querySelector('head')
		if (node){
			const styleSheet = document.createElement("style")
			styleSheet.textContent = styles
			document.head.appendChild(styleSheet)
			return true
		}
	})

  let autoFindNew = false

  VM.observe(unsafeWindow.document, () => {
		const node = unsafeWindow.document.querySelector('body')
		if (node){
			const div = document.createElement("div")
      div.classList.toggle('fixed')


      const label = document.createElement("label")
      label.innerHTML = 'auto find new'
      label.classList.toggle('custom_text')
      div.appendChild(label)
      const checkbox = document.createElement("input")
      checkbox.setAttribute("type", "checkbox")
      checkbox.addEventListener('change', (event) => {
        autoFindNew = event.currentTarget.checked
      })
      div.appendChild(checkbox)

			node.appendChild(div)
      log('ADDED')
			return true
		}
	})


  VM.observe(unsafeWindow.document, () => {
		const node = unsafeWindow.document.querySelector('.go-scan-button')
    if (node){
      if(dialogStoppedByKey){
        dialogStoppedByKey = false
        node.click()
        return
      }
      if(autoFindNew){
        node.click()
        return
      }
    }
  })


// const id2 = GM_registerMenuCommand('Text2', function(){alert(123)}, { title: 'Two' })



	const nativeWebSocket = unsafeWindow.WebSocket;
	let conId

  function patchWebSocket(ws, onMessage, onSend){
		ws.addEventListener("message", (event) => {
			let msg = event.data
			if(!msg.startsWith('42')){
				return
			}
			msg = msg.slice(2)
			msg = JSON.parse(msg)
      onMessage(msg)
		})

    ws.nativeSend = ws.send
    ws.send = (data)=>{
      if(data == '2'){
        ws.nativeSend(data)
        return
      }
      let msg = JSON.parse(data.slice(2))
      if (onSend(msg)){ return }
      ws.nativeSend(data)
    }

		function _sendJson(data){
			ws.nativeSend('42'+JSON.stringify(data))
      return true
		}


		window.ws = ws

    return [ws, _sendJson]
  }

  let block = false

  function onMessage(msg){
    const _conId = msg[1].connectionId
    if(_conId){
      log('found connection id', _conId)
      conId = _conId
    }
    // if(msg[1].type == 'peer-connect'){
    //   block = true
    //   log('peeeeeer', msg)
    // }

    // log('recived', msg)
  }



  function onSend(msg){
    // if(msg[1].type == 'web-agent'){
    //   log('blocked collection info (web agent)')
    //   return true
    // }
    if(block){return true}
    if(msg[1].type == 'set-fpt'){
      log('blocked collection info (font-data)')
      return true
    }
    // log('sended', msg)
  }

  let sendJson = null;

  unsafeWindow.WebSocket = function(...args){
		const ws = new nativeWebSocket(...args)
    const [patchedWS, _sendJson] = patchWebSocket(ws, onMessage, onSend)
    // sendJson = patchedWS.nativeSend.bind(patchedWS)
    sendJson = _sendJson
		return patchedWS
	};



	function sendMute(muted){
		log('set mute on connection id', conId)
		sendJson(["event",{"type":"peer-mute","connectionId":conId,"muted":muted}])
	}


  // document.querySelectorAll('.mute-button:not(#mute_button_spy)')





    // muted
  // ss.getAudioTracks()[0].enabled = true
  // let _getUserMedia = unsafeWindow.navigator.mediaDevices.getUserMedia
  let micStream
  let _getUserMedia = unsafeWindow.navigator.mediaDevices.getUserMedia.bind(unsafeWindow.navigator.mediaDevices);
  unsafeWindow.navigator.mediaDevices.getUserMedia = (...args) => {
    return _getUserMedia(...args)
      .then(stream => {
        log("stream", stream)
        micStream = stream.getAudioTracks()[0]
        return stream
      })
  }



  class ForceMuteButton{
		constructor(ogClassname, onToggle){
      this.ogClassname = ogClassname
      this.onToggle = onToggle

			this.startObserver()
		}

		create(){
      if (this.event){ return }
      // log('forcemutebutton event created')
      let e = (event)=>{
        log('eeee event')
        event.preventDefault()
        event.stopImmediatePropagation()
        const button = event.target
        this.onToggle(!button.classList.contains('muted'))
        button.classList.toggle('muted')
			}
      this.ogButton.onclick = undefined
			this.ogButton.addEventListener('click', e, true)
			this.event = e
		}

    remove(){
      if (!this.event){ return }
      // log('forcemutebutton event removed')

      // this.ogButton.removeEventListener(click, this.event)
      this.event = undefined
    }

		startObserver(){
			this.disconnectObserver = VM.observe(unsafeWindow.document, () => {
				this.ogButton = document.querySelector(this.ogClassname)

				if (this.ogButton) {
					this.create()
				}
				else{
          this.remove()
				}
			});
		}
  }


  let forceMuteButton = new ForceMuteButton(
    '.mute-button:not(#mute_button_spy)',
    (isMuted)=>{
      console.log("force mute to", isMuted)
      micStream.enabled = !isMuted
    }
  )


	const htmlFakeMuteButton = `<button type="button" id="mute_button_spy" class="mute-button mute_spy_on"></button>`

	class FakeMuteButton{
		constructor(ogClassname, code, onToggle){
			this.ogClassname = ogClassname
			this.code = code
      this.onToggle = onToggle

			this.startObserver()
		}

		create(){
			if (this.elem){ return }
      // log('button created')
			const parent = this.ogButton.parentElement
			parent.insertAdjacentHTML("beforeend", this.code)
			const node = document.querySelector('#mute_button_spy')
			node.onclick = (e)=>{
        const button = e.target
        this.onToggle(button.classList.contains('mute_spy_on'))
        button.classList.toggle('mute_spy_on')
        button.classList.toggle('mute_spy_off')

			}
			this.elem = node
		}

    remove(){
      if (!this.elem){ return }
      // log('button removed')
      this.elem.remove()
      this.elem = undefined
    }

		startObserver(){
			this.disconnectObserver = VM.observe(unsafeWindow.document, () => {
				this.ogButton = document.querySelector(this.ogClassname)

				if (this.ogButton) {
					this.create()
				}
				else{
          this.remove()
				}
			});
		}


	}


	let fakeMuteButton = new FakeMuteButton(
    '.mute-button:not(#mute_button_spy)',
    htmlFakeMuteButton,
    (isMuted)=>{
      sendMute(isMuted)
    }
  )

	// buttons-panel



})()

