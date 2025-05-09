// ==UserScript==
// @name        nektomi [Ultima]
// @match       https://nekto.me/audiochat*
// @grant       none
// @version     1.5.3.4
// @author      -
// @description 6/3/2023, 2:04:02 AM
// @namespace   ultima
// @supportURL  -
// @homepageURL -
// @icon        https://nekto.me/audiochat/favicon.ico
// @downloadURL https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/js.js
// @run-at      document-start
// @inject-into page
// @resource    mic_off_spy https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/ic_mic_off_white_spy.webp
// @resource    mic_on_spy https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/ic_mic_on_white_spy.webp
// @resource    no_sound https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/no-sound.svg?v=2
// @resource    sound https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/sound.svg?v=2
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @grant       unsafeWindow
// @grant       GM_registerMenuCommand
// @grant       GM_getResourceURL
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
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
  unsafeWindow.log = log



  // let r = GM_xmlhttpRequest({
  //   url: 'https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/js.js',
  //   onload: (e) => {log(e.responseText)}
  // })

  // log(await r)



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

  // while(true){
  //   if(window.__VUE__){
  //     log('VUE', unsafeWindow.__VUE__)
  //     break
  //   }
  // }



// 	function getElementByXpath(path) {
// 		return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
// 	}

// 	function waitForElemByXPath(path, ms){
// 		return new Promise((resolve, reject) => {
// 			 setTimeout(() => {
// 				 resolve(getElementByXpath(path));
// 			 }, ms)
// 		 })
// 	}



  class Storage{
    static get(key, defaultValue=undefined){
      return GM_getValue(key, defaultValue)
    }

    static set(key, value){
      return GM_setValue(key, value)
    }
  }



  class DialogController{
    constructor(){
      this.dialogStoppedByKey = false
      this.init()
    }

    init(){
      this.observeForDialogScreen()
      this.keydownListenForBindings()
    }

    _dialogUpdated(){
      log('dialog updated', this.vue)
      if (this.vue.endedDialog && settingsController.autoFindNew){
        this.vue.toSearch()
      }
    }

    leaveDialog(){
      this.vue.$socketActions.peerDisconnect(this.vue.activeConnectionId)
      this.vue.endDialog()
    }

    _patchVue(vue){
      if(this._unpatchVue){
        this._unpatchVue()
      }
      this.vue = vue
      log('dialog vue patching')
      unsafeWindow.v = vue
      vue.breakDialog = this.leaveDialog.bind(this)
      const unwatch = vue.$store.watch(()=>vue.$store.state.chat.activeConnectionId, ()=>{
        this._dialogUpdated()
      })

      this._unpatchVue = ()=>{
        // add other unpatch if needed
        log('unpatching vue')
        unwatch()
      }

    }

    observeForDialogScreen(){
      VM.observe(unsafeWindow.document, () => {
        const node = unsafeWindow.document.querySelector(".wraps")
        if (! node){ return }

        const c = node.__vue__.$createElement
        node.__vue__.$createElement = (...args) => {
          // log('createElement', ...args)
          if(args[0].name == 'DialogScreen'){
            const dialog = args[0]
            if (!dialog._staticRender){
              dialog._staticRender = dialog.staticRenderFns[0]
              // log('render setted')
            }
            const patch = this._patchVue.bind(this)
            dialog.staticRenderFns[0] = function(...render_args){
              // log('render', render_args.length, ...render_args)
              patch(this)
              // log('render inside og - ', dialog._staticRender)
              return dialog._staticRender.call(this, ...render_args)
            }
            // log('setting render og - ', dialog._staticRender, ' \n\n new is -', dialog.staticRenderFns[0])

            return c(...args)
          }
          return c(...args)
        }

        return true
      })
    }

    keydownListenForBindings(){
      document.addEventListener('keydown', async (event) => {
        const code = event.code;
        if(code == keyDialogStopNext){
          event.preventDefault()
          event.stopImmediatePropagation()

          if(this.vue.activeConnectionId){
            this.leaveDialog()
            // this.dialogStoppedByKey = true
          }
          this.vue.toSearch()

          return
          }
      })
    }
  }


  const dialogControll = new DialogController()


	// VM.observe(unsafeWindow.document, () => {
	// 	const node = unsafeWindow.document.querySelector('.swal2-confirm')
	// 	if (node){
	// 		node.click()
	// 	}
	// })

  class VolumeController{
    constructor(){
      this.audioOutput
      this.originalAudioOutput
      this.init()
    }

    init(){
      this.observeForVueWraps()
      this.keydownListenForBindings()
    }

    observeForVueWraps(){
      VM.observe(unsafeWindow.document, () => {
        const node = unsafeWindow.document.querySelector(".wraps")
        if (node){
          const vue = node.__vue__
          unsafeWindow.vv = vue




          // log('vue found', vue)
          this.originalAudioOutput = vue.$refs.audioElement
          this.audioOutput = document.createElement('audio')
          this.audioOutput.autoplay = true
          this.originalAudioOutput.parentElement.appendChild(this.audioOutput);
          vue.changeVolume = (value)=>{
            this.originalAudioOutput.volume = 0
            this.set(value)
            log("set vol", value/100)
          }
          return true
        }
      })
    }

    keydownListenForBindings(){
      document.addEventListener('keydown', async (event) => {
        const code = event.code
        if(code == keyVolumeMute){
          event.stopImmediatePropagation()
          this._prevVolume = this.get()
          this.set(0)
          volumeMuteIcon.setMute(true)
        }
        if(code == keyVolumeUnmute){
          event.stopImmediatePropagation()
          this.set(this._prevVolume)
          volumeMuteIcon.setMute(false)
        }
      })
    }

    set(value){
      if(value > 1){
        value = value / 100
      }
      this.audioOutput.volume = value
    }

    get(){
      return this.audioOutput.volume
    }
  }


  const volume = new VolumeController()










  class StylesController{
    _styles = []
    _switchStyles = {}

    queue(css){
      this._styles.push(css)
    }

    defineSwitched(name){
      this._switchStyles[name] = {
        'enabled': false
      }
    }

    setSwitched(name, css){
      this._switchStyles[name].css = css
    }

    enableSwitched(name, enabled){
      this._switchStyles[name].enabled = enabled
      this._styleSheet && this.processAll()
    }

    processAll(){
      const switched = Object.values(this._switchStyles)
      .filter((e) => e.enabled)
      .map((e)=> e.css)

      const result = [...this._styles, ...switched]
      this._styleSheet.textContent = result.join('\n')
    }

    injectWhenReady(){
      VM.observe(unsafeWindow.document, () => {
        const node = unsafeWindow.document.querySelector('head')
        if (node){
          this._styleSheet = document.createElement("style")
          // this._processedStyles = this.styles.join('\n')
          // this._styleSheet.textContent = this._processedStyles
          node.appendChild(this._styleSheet)
          this.processAll()
          return true
        }
      })
    }
  }

  const styles = new StylesController()
  // styles.setSwitched('theme', 'abc')
  // styles.enableSwitched('theme', true)
  // styles.enableSwitched('theme', false)


// 	const styles = `
// 		.mute_spy_on{
// 			background-image: url(${GM_getResourceURL('mic_on_spy')}) !important;
// 		}

// 		.mute_spy_off{
// 			background-image: url(${GM_getResourceURL('mic_off_spy')}) !important;
// 		}

//     .audio-chat .volume_slider.no-sound::after{
//       content: "";
// 			background-image: url(${GM_getResourceURL('no_sound')}) !important;
// 		}

// 	`


	// VM.observe(unsafeWindow.document, () => {
	// 	const node = unsafeWindow.document.querySelector('head')
	// 	if (node){
	// 		const styleSheet = document.createElement("style")
	// 		styleSheet.textContent = styles
	// 		document.head.appendChild(styleSheet)
	// 		return true
	// 	}
	// })

  class SettingsController{
    html = `
     <div class="dropdown">
      <button class="settings-toggle">Settings</button>
      <div id="settingsDropdown" class="dropdown-content">

      </div>
    </div>
    `


    css = `
      .dropdown {
        position: relative;
        float: right;
        display: inline-block;
        height: 50px;
      }

      .dropdown-content {
        display: none;
        position: absolute;
        background-color: var(--night-background-color);
        color: var(--night-text-color);
        min-width: 160px;
        right: 0;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
        z-index: 1;
      }
      .dropdown-content label {
        font-weight: unset;
      }

      .settings-toggle {
        background-color: color-mix(in srgb, var(--night-active-checkbox-border-color), rgba(0,0,0,100) 20%);
        color: white;
        font-size: 16px;
        border: none;
        cursor: pointer;
        height: inherit;
      }

      #menu_main_g {
        display: none !important;
      }

      div.container.tabs_type_chats {
        display: none !important;
      }

      .pritch {
        display: none !important;
      }

      .show {display:block;}

      div.navbar-header {
        float: unset !important;
      }

      input.ultima[type="checkbox"] {
        accent-color: var(--night-active-checkbox-background-color);
        transform: scale(1.3);
        margin: 10px;
      }

      input.ultima[type="checkbox"]:focus {
        outline: none;
      }

      label.ultima {
        font-size: medium;
      }

      div.chat-step.idle > div:nth-child(2) > div:nth-child(3) {
        display: none !important;
      }

      div.description {
        display: none !important;
      }

      div.outer-container.with_tabs {
        height: 100%;
      }

    `


    waitToApply = []

    constructor(){
      this.autoFindNew = false
      this.init()
    }

    init(){
      styles.queue(this.css)
    }

    addCheckbox(label, callback){
      this.waitToApply.push(()=>{
        const settings = unsafeWindow.document.querySelector('#settingsDropdown')
        const temp = document.createElement('div')
        const html = `
          <div>
            <label class="ultima">${label}</label>
            <input class="ultima" type="checkbox">
          </div>
        `
        temp.innerHTML = html.trim()
        const newElement = temp.firstElementChild
        const _callback = (event)=>{
          event.preventDefault()
          event.target.blur()
          return callback(event)
        }
        newElement.addEventListener('change', callback)
        settings.appendChild(newElement)
      })
    }


    injectWhenReady(){
      VM.observe(unsafeWindow.document, () => {
        const node = unsafeWindow.document.querySelector('div.navbar-header')

        if (node){
          const brand = node.querySelector('.navbar-brand')
          // log('brand', brand)
          brand.innerHTML = 'Nekto.me [Ultima]'
          node.insertAdjacentHTML("beforeend", this.html)
          const settingsDropdown = node.querySelector('#settingsDropdown')
          const toggleButton = node.querySelector('.settings-toggle')
          toggleButton.addEventListener('click', ()=>{
            settingsDropdown.classList.toggle("show")
          })
          // const checkbox = node.querySelector('input')
          // checkbox.addEventListener('change', (event) => {
          //   this.autoFindNew = event.currentTarget.checked
          // })
          for (const setting of this.waitToApply){
            setting()
          }

          log('ADDED settings')
          return true
        }
      })
    }
  }

  const settingsController = new SettingsController()
  settingsController.addCheckbox(
    'auto find new',
    (event)=>{
      settingsController.autoFindNew = event.target.checked
      // log('changed', settingsController.autoFindNew)

  })
  settingsController.addCheckbox(
    'gain volume',
    (event)=>{
      settingsController.gainVolume = event.target.checked
      // log('changed2', settingsController.gainVolume)
  })
  settingsController.addCheckbox(
    'mic off on new',
    (event)=>{
      settingsController.autoMute = event.target.checked
      // log('changed2', settingsController.gainVolume)
  })

  settingsController.injectWhenReady()





  class ThemeController {
    themes = {}
    currentTheme

    constructor(){
      styles.defineSwitched('theme')
      this.injectWhenReady()

    }

    defineTheme(name, prettyName, based, buttonHTML, css){
      this.themes[name] = {
        prettyName: prettyName,
        based: based,
        buttonHTML: buttonHTML,
        css: css
      }
    }

    set(name){
      this.currentTheme = name
      Storage.set('theme', name)
      if (name == 'light' || name == 'night'){
        this.disable()
        return
      }
      styles.setSwitched('theme', this.themes[name].css)
      styles.enableSwitched('theme', true)

      this.vue.$store._commit('user/setColorScheme', this.themes[name].based)
    }

    disable(){
      styles.enableSwitched('theme', false)
    }

    setFromStorageWhenReady(){
      const storedTheme = Storage.get('theme')
      if (storedTheme){
        this.set(storedTheme)
        // log('theme on ready', this.vue)
      }
    }

    injectWhenReady(){
      VM.observe(unsafeWindow.document, () => {
        const node = unsafeWindow.document.querySelector('div.chat-step.idle')
        if (node && node.__vue__){
          const vue = node.__vue__
          unsafeWindow.v = vue
          this.vue = vue

          vue.$store._commit = vue.$store.commit
          vue.$store.commit = (mutation, state, ...args)=>{
            // log('commit', mutation, state, ...args)
            if(mutation == 'user/setColorScheme'){
              this.set(state)
            }
            return vue.$store._commit(mutation, state, ...args)
          }
          // vue.$store._commit('user/setSearchParam', {'key': 'myAge', 'value': '19,19'})
          // vue.$store._commit(
          //     'user/setSearchParam', {
          //     "key": "wishAges",
          //     "value": [
          //         "19,19"
          //     ]
          // })



          unsafeWindow.callmemaybe = ()=>{
            let vue = document.querySelector('div.chat-step.idle').__vue__
            vue.$store.commit('user/setSearchParam', {'key': 'myAge', 'value': '19,19'})
            vue.$store.commit(
                'user/setSearchParam', {
                "key": "wishAges",
                "value": [
                    "19,19"
                ]
            })
          }


          this.setFromStorageWhenReady()

          log('chat-step vue getted')
          return true
        }
      })

      VM.observe(unsafeWindow.document, () => {
        const node = unsafeWindow.document.querySelector('div.chat-step.idle')
        if (node && node.__vue__ && !node.__ultima){
          node.__ultima = true
          const nightThemes = unsafeWindow.document.querySelector('.theme-filter-panel > div:nth-child(2)')
          const lightThemes = unsafeWindow.document.querySelector('.theme-filter-panel > div:nth-child(1)')
          nightThemes.querySelector('label').innerHTML = 'Темное оформление:'
          lightThemes.querySelector('label').innerHTML = 'Светлое оформление:'
          nightThemes.querySelector('div > button:nth-child(1)').innerHTML = 'Классика'
          lightThemes.querySelector('div > button:nth-child(1)').innerHTML = 'Классика'

          const nightV = node.__vue__.$children[5]
          const lightV = node.__vue__.$children[4]

          // ----------------------------------------------
          // add radiobutton variant with vue

          // let elems = $vm0._props.elements
          // let cop = Object.assign({}, elems[2])
          // cop.name = 'IIIIII'
          // cop.value = 'lol'
          // ----------------------------------------------

          for (const [name, theme] of Object.entries(this.themes)){
            let div
            if (theme.based == 'night'){
              div = nightThemes
            }
            else{
              div = lightThemes
            }

//             let group
//             if (theme.based == 'night'){
//               group = nightV
//             }
//             else{
//               group = lightV
//             }

//             const elems = group.$props.elements
//             const elem = Object.assign({}, elems[0])
//             elem.name = theme.prettyName
//             elem.value = name
//             log('new elem', elems[0], elem)
//             elems.push(elem)


            div = div.querySelector('div')
            div.insertAdjacentHTML("beforeend", theme.buttonHTML)
            // filtersNode.insertAdjacentHTML("beforeend", theme.buttonHTML)
            const themeButton = div.querySelector(':nth-last-child(1)')
            // log('last', themeButton)
            themeButton.addEventListener('click', (event) => {
              this.set(name)
              themeButton.classList.toggle('checked')
            })
          }

          log('ADDED themes')
        }
      })
    }

  }

  const themeController = new ThemeController()


  themeController.defineTheme(
    'purple',
    'Фиолетовая',
    'night',
    `
      <button class="btn btn-default">Фиолетовая</button>
    `,
    `
      :root {
        --theme-primary: #594d7f;
        --night-active-checkbox-background-color: var(--theme-primary) !important;
        --night-active-checkbox-border-color: var(--theme-primary) !important;
        --night-active-talk-color: var(--theme-primary) !important;
        --night-link-color: var(--theme-primary) !important;
        --night-button-stop-color: var(--theme-primary) !important;
        --night-background-color: #101010 !important;
        --night-header-text-color: var(--theme-primary) !important;
        --night-header-border-color: var(--theme-primary) !important;
        --night-header-background-color: #171717 !important;
      }
      .navbar {
          background: var(--theme-primary) !important;
      }

      div.outer-container {
        width: 100% !important;
        margin: 0% !important;
      }

      .audio-chat .header .chat {
          color: var(--theme-primary) !important;
          font-weight: bold;
          font-size: 15px ! important;
          display: inline ! important;
      }

      .volume_slider .slider-dot {
          background-color: var(--theme-primary) !important;
      }
      .volume_slider .slider-process {
          background-color: var(--theme-primary) !important;
      }
      .volume_slider .slider-piecewise {
          background-color: color-mix(in srgb, var(--night-active-checkbox-border-color), rgb(255,255,255) 20%) !important;
      }

      .mute-button.muted {
        background-color: var(--theme-primary) !important;
      }
    `
  )




  // https://codepen.io/bennettfeely/pen/vYLmYJz
//   themeController.defineTheme(
//     'purple-stars',
//     'Фиолетовое небо',
//     'night',
//     `
//       <button class="btn btn-default">Фиолетовое небо</button>
//     `,
//     `
//       :root {
//         --theme-primary: #594d7f;
//         --night-active-checkbox-background-color: var(--theme-primary);
//         --night-active-checkbox-border-color: var(--theme-primary);
//         --night-active-talk-color: var(--theme-primary);
//         --night-background-color: #101010;
//         --night-header-text-color: var(--theme-primary);
//         --night-header-border-color: var(--theme-primary);
//         --night-header-background-color: #171717;
//       }
//       .navbar {
//           background: var(--theme-primary) !important;
//       }

//       div.outer-container {
//         width: 100% !important;
//         margin: 0% !important;
//       }

//       .audio-chat .header .chat {
//           color: var(--theme-primary);
//           font-weight: bold;
//           font-size: 15px ! important;
//           display: inline ! important;
//       }

//       .volume_slider .slider-dot {
//           background-color: var(--theme-primary) !important;
//       }
//       .volume_slider .slider-process {
//           background-color: var(--theme-primary) !important;
//       }
//       .volume_slider .slider-piecewise {
//           background-color: color-mix(in srgb, var(--night-active-checkbox-border-color), rgb(255,255,255) 20%);
//           border-radius: 2px;
//       }


//       :root {
//         --twinkle-duration: 4s;
//       }

//       .stars-wrapper {
//         position: relative;
//         pointer-events: none;
//         width: 100vw;
//         height: 100vh;
//         background: rgb(0,0,0);
//         overflow: hidden;
//       }

//       .stars {
//         position: absolute;
//         top: 0;
//         left: 0;
//         right: 0;
//         bottom: 0;
//         animation: twinkle var(--twinkle-duration) ease-in-out infinite;

//         &:nth-child(2) {
//           animation-delay: calc(var(--twinkle-duration) * -0.33);
//         }
//         &:nth-child(3) {
//           animation-delay: calc(var(--twinkle-duration) * -0.66);
//         }

//         @keyframes twinkle {
//           25% {
//             opacity: 0;
//           }
//         }
//       }

//       .star {
//         fill: white;

//         &:nth-child(3n) {
//           opacity: 0.8;
//         }
//         &:nth-child(7n) {
//           opacity: 0.6;
//         }
//         &:nth-child(13n) {
//           opacity: 0.4;
//         }
//         &:nth-child(19n) {
//           opacity: 0.2;
//         }
//       }


//     `
//   )

  themeController.defineTheme(
    'green',
    'Зеленая',
    'night',
    `
      <button class="btn btn-default">Зеленая</button>
    `,
    `
      :root {
        --theme-primary: #123311;
        --night-active-checkbox-background-color: var(--theme-primary) !important;
        --night-active-checkbox-border-color: var(--theme-primary) !important;
        --night-active-talk-color: var(--theme-primary) !important;
        --night-background-color: #101010 !important;
        --night-header-text-color: var(--theme-primary) !important;
        --night-header-border-color: var(--theme-primary) !important;
        --night-header-background-color: #171717 !important;
      }
      .navbar {
          background: var(--theme-primary) !important;
      }

      div.outer-container {
        width: 100% !important;
        margin: 0% !important;
      }

      .audio-chat .header .chat {
          color: var(--theme-primary) !important;
          font-weight: bold;
          font-size: 15px ! important;
          display: inline ! important;
      }

      .volume_slider .slider-dot {
          background-color: var(--theme-primary) !important;
      }
      .volume_slider .slider-process {
          background-color: var(--theme-primary) !important;
      }
      .volume_slider .slider-piecewise {
          background-color: color-mix(in srgb, var(--night-active-checkbox-border-color), rgb(255,255,255) 20%) !important;
      }
    `
  )







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



  let volumeInspectStop

  function patchRemoteAudio(stream) {
    if(volumeInspectStop){ volumeInspectStop() }

    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream)
    const dest = context.createMediaStreamDestination()
    // const source = context.createMediaElementSource(node)
    log("patch stream", stream)

    const gainNode = context.createGain()
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    const dataArray = new Uint8Array(analyser.frequencyBinCount)


    source.connect(analyser)
    analyser.connect(gainNode)
    // gainNode.connect(context.destination)
    gainNode.connect(dest)
    volume.audioOutput.srcObject = dest.stream

    let killme = false

    // Step 5: Monitor and adjust volume
    let smoothedVolume = 0;
    function updateVolume() {
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length

      const volume = average / 255;

      // Smooth it (exponential moving average)
      smoothedVolume = smoothedVolume * 0.3 + volume * 0.4;

      // Optional: scale or clamp
      const minGain = 0.1
      const maxGain = 1
      const scaledGain = minGain + (maxGain - minGain) * smoothedVolume;

      // Smooth gain changes using linear ramp

      // gainNode.gain.linearRampToValueAtTime(scaledGain, context.currentTime + 0.05)

      let hahG = 1 - volume * 3
      hahG = Math.max(0, hahG)

      if(settingsController.gainVolume){
        // gainNode.gain.linearRampToValueAtTime(scaledGain, context.currentTime + 0.05)
        gainNode.gain.value = hahG
      }
      else{
        gainNode.gain.value = 1
      }
      // gainNode.gain.value = 0
      // gainNode.gain.value = 0.1
      // audioOutput.volume = gainVolume * gainValue
      // log('stats: \n\n', volume.toFixed(1), '\n', hahG.toFixed(1), '\n', settingsController.gainVolume)



      if(killme){ return }

      requestAnimationFrame(updateVolume);
    }

    updateVolume();

    volumeInspectStop = ()=>{
      killme = true
      analyser.disconnect()
      context.close()
    }
  }









  // const originalAddTrack = RTCPeerConnection.prototype.addTrack;
  const originalSetRemoteDescription = RTCPeerConnection.prototype.setRemoteDescription;


    RTCPeerConnection.prototype.setRemoteDescription = async function (desc) {
        const result = await originalSetRemoteDescription.call(this, desc);

        // Try to grab streams if they are already available
        const pc = this;
        setTimeout(() => {
          const receivers = pc.getReceivers ? pc.getReceivers() : [];
          receivers.forEach(receiver => {
            const track = receiver.track;
            if (track && track.kind === 'audio') {
              const stream = new MediaStream([track]);
              patchRemoteAudio(stream);
            }
          });
        }, 100); // Slight delay to let receivers populate

        return result;
      };




    // muted
  // ss.getAudioTracks()[0].enabled = true
  // let _getUserMedia = unsafeWindow.navigator.mediaDevices.getUserMedia
  let micStream
  let _getUserMedia = unsafeWindow.navigator.mediaDevices.getUserMedia.bind(unsafeWindow.navigator.mediaDevices);
  unsafeWindow.navigator.mediaDevices.getUserMedia = (...args) => {
    return _getUserMedia(...args)
      .then(stream => {
        // log("micstream", stream)
        micStream = stream.getAudioTracks()[0]
        return stream
      })
  }



  class VolumeMuteIcon{
		constructor(ogClassname, onToggle){
      this.ogClassname = ogClassname
      this.onToggle = onToggle

			this.startObserver()
		}

		create(){
      log('VolumeMuteIcon created')
		}

    remove(){
      return
    }
    setMute(active){
      if(active){
        this.ogElem.classList.add('no-sound')
      }
      else{
        this.ogElem.classList.remove('no-sound')
      }
    }

		startObserver(){
			this.disconnectObserver = VM.observe(unsafeWindow.document, () => {
				this.ogElem = document.querySelector(this.ogClassname)

				if (this.ogElem) {
					this.create()
				}
				else{
          this.remove()
				}
			});
		}
  }


  let volumeMuteIcon = new VolumeMuteIcon(
    '.volume_slider',
    (isMuted)=>{
      console.log("force mute to", isMuted)
      micStream.enabled = !isMuted
    }
  )



  class ForceMuteButton{
		constructor(ogClassname, onToggle){
      this.ogClassname = ogClassname
      this.onToggle = onToggle

			this.startObserver()
		}

		create(){
      if (this.event){ return }
      if (settingsController.autoMute){
        this.onToggle(!this.ogButton.classList.contains('muted'))
      }
      // log('forcemutebutton event created')
      let e = (event)=>{
        log('eeee event')
        event.preventDefault()
        event.stopImmediatePropagation()
        // const button = event.target
        this.onToggle(!this.ogButton.classList.contains('muted'))
        // button.classList.toggle('muted')
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
      forceMuteButton.ogButton.classList.toggle('muted')
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

	styles.queue(
		`.mute_spy_on{
			background-image: url(${GM_getResourceURL('mic_on_spy')}) !important;
		}

		.mute_spy_off{
			background-image: url(${GM_getResourceURL('mic_off_spy')}) !important;
		}

    .audio-chat .volume_slider.no-sound::after{
			background-image: url(${GM_getResourceURL('no_sound')}) !important;
		}

    .audio-chat .volume_slider::after{
			background-image: url(${GM_getResourceURL('sound')}) !important;
		}`
  )





  styles.injectWhenReady()
  // themeController.setFromStorageWhenReady()

})()

