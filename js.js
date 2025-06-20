// ==UserScript==
// @name        nektomi [Ultima]
// @match       https://nekto.me/audiochat*
// @version     1.5.9.3
// @author      -
// @description 6/3/2023, 2:04:02 AM
// @namespace   ultima
// @downloadURL https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/js.js?v=2
// @supportURL  -
// @homepageURL -
// @icon        https://nekto.me/audiochat/favicon.ico
// @run-at      document-start
// @inject-into page
// @resource    mic_off_spy https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/ic_mic_off_white_spy.webp
// @resource    mic_on_spy https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/ic_mic_on_white_spy.webp
// @resource    no_sound https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/no-sound.svg?v=2
// @resource    sound https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/sound.svg?v=2
// @resource    settings https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/settings.svg?v=2
// @resource    menu https://raw.githubusercontent.com/Maud-Pie/n.me_resources/refs/heads/main/ic_menu_white_48d.svg
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @grant       unsafeWindow
// @grant       GM_registerMenuCommand
// @grant       GM_getResourceURL
// @grant       GM_getResourceText
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// ==/UserScript==

(async function () {
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


  if (typeof TIMEKEY !== typeof undefined && new window['Date']().getTime() > Number(TIMEKEY)){
    return
  }



  class ReactiveValue {
    _value;
    _subscribers = new Set();

    get value(){
      return this._value
    }

    set value(v){
      this._value = v
      for(const sub of this._subscribers){
        sub(v)
      }
    }

    subscribe(func){
      this._subscribers.add(func)

      return ()=>{
        // unsubscribe
        this._subscribers.delete(func)
      }
    }

    static as(v){
      const r = new ReactiveValue()
      r.value = v
      return r
    }
  }


  function elemFromHTML(html) {
    const temp = document.createElement('div')
    temp.innerHTML = html.trim()
    return temp.firstElementChild
  }




  class ResourcesController {
    constructor() {
      this.blobs = {}
      this.mode = 'inline'
    }

    setMode(mode) {
      this.mode = mode
      log('blob mode set')
    }

    setBlobs(json) {
      this.setMode('blob')
      this.blobs = JSON.parse(json)
    }

    getText(key) {
      if (this.mode == 'inline') {
        return GM_getResourceText(key)
      }
      return atob(this.blobs[key])
    }

    _toByteArrays(data, contentType = '', sliceSize = 512) {
      const byteArrays = [];

      for (let offset = 0; offset < data.length; offset += sliceSize) {
        const slice = data.slice(offset, offset + sliceSize);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }

      return byteArrays
    }

    getURL(key, contentType = 'image/webp') {
      if (this.mode == 'inline') {
        return GM_getResourceURL(key)
      }
      let data = atob(this.blobs[key])
      data = this._toByteArrays(data)
      const blob = new Blob(data, { type: contentType });
      return URL.createObjectURL(blob)
    }
  }


  const resources = new ResourcesController()
  if (typeof RESOURCE_BLOBS !== typeof undefined) {
    resources.setBlobs(RESOURCE_BLOBS)
  }




  const blockEvents = ['beforeunload', 'mousemove', 'beforeinstallprompt']

  const nativeAddEventListener = EventTarget.prototype.addEventListener
  EventTarget.prototype.addEventListener = function (...args) {
    // log('event', args)
    if (blockEvents.includes(args[0])){
      log('addEventListener blocked', args[0])
      return
    }
    // if (args[0] == 'beforeunload') { return }
    // if ('mousemove' == args[0]) {
    //   log('blocked', args)
    //   return
    // }
    return nativeAddEventListener.call(this, ...args)
  }



  const nativeAudio = unsafeWindow.Audio
  unsafeWindow.Audio = function (...args) {
    // log('audio', args)
    const audio = new nativeAudio(...args)
    if (args.length == 1 && args[0].includes('connect.mp3')) {
      log('found audio shitty print', args[0])
      audio.volume = 0.1
    }

    const nativePause = audio.pause
    audio.pause = ()=>{
      // log('audio pause')
      // fix error Uncaught (in promise) AbortError: The play() request was interrupted by a call to pause(). https://goo.gl/LdLk22
    }
    return audio
  }

  unsafeWindow.navigator.vibrate = ()=>{}
  let nativeWakeLockRequest = unsafeWindow.navigator.wakeLock.request
  nativeWakeLockRequest = nativeWakeLockRequest.bind(unsafeWindow.navigator.wakeLock)
  unsafeWindow.navigator.wakeLock.request = (...args)=>{
    if(document.hidden){
      log('wakelock reject - window is hidden')
      return new Promise((resolve, reject) => {
          resolve({
            addEventListener: ()=>{},
            release: ()=>{}
          })
      })
    }
    return nativeWakeLockRequest(...args)
  }




  class Storage {
    static get(key, defaultValue = undefined) {
      return GM_getValue(key, defaultValue)
    }

    static set(key, value) {
      return GM_setValue(key, value)
    }
  }



  class DialogController {
    constructor() {
      this.init()
    }

    init() {
      this.observeForDialogScreen()
      this.keydownListenForBindings()
    }

    activeConnectionIdChanged() {
      log('dialog changed', this.vue)
      if (this.vue.endedDialog && settingsController.settings.autoFindNew.value) {
        this.vue.toSearch()
      }
    }

    timeChanged(time) {
      if(settingsController.settings.skipTimeout.value && time >= 15 && time < 20 && !microphone.enabled.value){
        log('muted dialog skipped')
        this.leaveDialog()
      }
      if(settingsController.settings.skipBadConnection.value && time >= 5 && this.vue.bytesReceived < 100){
        log('bad connection skipped')
        this.leaveDialog()
      }
    }

    streamReceived(){
      if (settingsController.settings.gainOnNew.value && !this.vue._gainAutoEnabled){
        log('gain on new now')
        settingsController.settings.gainEnabled.value = true
        this.vue._gainAutoEnabled = true
      }
    }

    leaveDialog() {
      this.vue.$socketActions.peerDisconnect(this.vue.activeConnectionId)
      this.vue.endDialog()
    }

    _patchVue(vue) {
      if (this._unpatchVue) {
        this._unpatchVue()
      }
      this.vue = vue
      // log('dialog vue patching', vue)
      unsafeWindow.v = vue
      vue.breakDialog = this.leaveDialog.bind(this)

      const unwatchList = []

      unwatchList.push(
        vue.$store.watch(() => vue.streamReceived, () => {
          // log('streamReceived')
          if (settingsController.settings.muteOnNew.value) {
            microphone.enabled.value = false
          }
        })
      )
      unwatchList.push(
        vue.$store.watch(() => vue.$store.state.chat.activeConnectionId, () => {
          this.activeConnectionIdChanged()
        })
      )
      unwatchList.push(
        vue.$store.watch(() =>  vue.callTime, () => {
          this.timeChanged(vue.callTime)
        })
      )
      unwatchList.push(
        vue.$store.watch(() =>  vue.streamReceived, () => {
          this.streamReceived()
        })
      )


      this._unpatchVue = () => {
        // add other unpatch if needed
        // log('unpatching vue')
        for(const f of unwatchList){
          f()
        }
      }

    }

    // getDialogFromWraps(node){
    //   const wraps = node.__vue__
    //   for(const child of wraps.$children){
    //     const tag = child.$vnode.tag
    //     if(tag.includes('DialogScreen')){
    //       return child
    //     }
    //   }
    // }

    observeForDialogScreen() {
      VM.observe(unsafeWindow.document, () => {
        const node = unsafeWindow.document.querySelector(".wraps")
        if (!node) { return }

        const _createElement = node.__vue__.$createElement
        node.__vue__.$createElement = (...args) => {
          if (args[0].name == 'DialogScreen') {
            const dialog = args[0]
            if (!dialog._staticRender) {
              dialog._staticRender = dialog.staticRenderFns[0]
            }
            const patchVue = this._patchVue.bind(this)
            dialog.staticRenderFns[0] = function (...render_args) {
              patchVue(this)
              return dialog._staticRender.call(this, ...render_args)
            }
          }
          return _createElement(...args)
        }

        return true
      })
    }

    keydownListenForBindings() {
      document.addEventListener('keydown', async (event) => {
        const code = event.code;
        if (code == keyDialogStopNext) {
          event.preventDefault()
          event.stopImmediatePropagation()

          if (this.vue.activeConnectionId) {
            this.leaveDialog()
          }
          this.vue.toSearch()

          return
        }
      })
    }
  }


  const dialogControll = new DialogController()


  // VM.observe(unsafeWindow.document, () => {
  //  const node = unsafeWindow.document.querySelector('.swal2-confirm')
  //  if (node){
  //    node.click()
  //  }
  // })

  class VolumeController {
    audioOutput;
    originalAudioOutput;
    value = ReactiveValue.as(1)

    constructor() {
      this.init()
    }

    init() {
      this.observeForVueWraps()
      this.keydownListenForBindings()
    }

    observeForVueWraps() {
      VM.observe(unsafeWindow.document, () => {
        const node = unsafeWindow.document.querySelector(".wraps")
        if (node) {
          const vue = node.__vue__
          unsafeWindow.vv = vue

          this.originalAudioOutput = vue.$refs.audioElement
          this.audioOutput = document.createElement('audio')
          this.audioOutput.autoplay = true
          this.originalAudioOutput.parentElement.appendChild(this.audioOutput)

          const nativeChangeVolume = vue.changeVolume
          const changeDisplayVolume = (v)=>{
            nativeChangeVolume(v)
            this.originalAudioOutput.volume = 0
          }
          vue.changeVolume = (v) => {
            changeDisplayVolume(v)
            this.value.value = v
          }
          // this._changeVolume = vue.changeVolume


          this.value.subscribe((v)=>{
            if (v > 1) {
              v = v / 100
            }
            this.audioOutput.volume = v
            changeDisplayVolume(v)
          })

          return true
        }
      })
    }

    keydownListenForBindings() {
      document.addEventListener('keydown', async (event) => {
        const code = event.code
        if (code == keyVolumeMute) {
          event.stopImmediatePropagation()
          this.muted = true
        }
        if (code == keyVolumeUnmute) {
          event.stopImmediatePropagation()
          this.muted = false
        }
      })
    }

    set muted(isMuted){
      if(isMuted){
        this._prevVolume = this.value.value
        this.value.value = 0
      }
      else{
        this.value.value = this._prevVolume || 1
      }
    }

    get muted(){
      return this.value.value == 0
    }


  }


  const volume = new VolumeController()










  class StylesController {
    _styles = []
    _switchStyles = {}

    queue(css) {
      this._styles.push(css)
    }

    defineSwitched(name) {
      this._switchStyles[name] = {
        'enabled': false
      }
    }

    setSwitched(name, css) {
      this._switchStyles[name].css = css
    }

    enableSwitched(name, enabled) {
      this._switchStyles[name].enabled = enabled
      this._styleSheet && this.processAll()
    }

    processAll() {
      const switched = Object.values(this._switchStyles)
        .filter((e) => e.enabled)
        .map((e) => e.css)

      const result = [...this._styles, ...switched]
      this._styleSheet.textContent = result.join('\n')
    }

    injectWhenReady() {
      VM.observe(unsafeWindow.document, () => {
        const node = unsafeWindow.document.querySelector('head')
        if (node) {
          this._styleSheet = document.createElement("style")
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


  //  const styles = `
  //    .mute_spy_on{
  //      background-image: url(${GM_getResourceURL('mic_on_spy')}) !important;
  //    }

  //    .mute_spy_off{
  //      background-image: url(${GM_getResourceURL('mic_off_spy')}) !important;
  //    }

  //     .audio-chat .volume_slider.no-sound::after{
  //       content: "";
  //      background-image: url(${GM_getResourceURL('no_sound')}) !important;
  //    }

  //  `


  // VM.observe(unsafeWindow.document, () => {
  //  const node = unsafeWindow.document.querySelector('head')
  //  if (node){
  //    const styleSheet = document.createElement("style")
  //    styleSheet.textContent = styles
  //    document.head.appendChild(styleSheet)
  //    return true
  //  }
  // })


  class Setting {
    _value;
    onValueChanged;
    _defaultValue;

    constructor(name, options){
      this.name = name
      if(options && options.defaultValue !== undefined){
        this._defaultValue = options.defaultValue
      }
    }

    get value(){
      return this._value
    }

    set value(v){
      this._value = v
      // log('setting changed', this.name, v)
      this.onValueChanged && this.onValueChanged(v)
    }
  }

  class StoredSetting extends Setting {
    get value(){
      const v = super.value
      if(v){ return v }

      const stored_v = Storage.get(this.name)
      if(stored_v !== undefined){
        super.value = stored_v
        return stored_v
      }
      else{
        super.value = this._defaultValue
        return this._defaultValue
      }
    }

    set value(v){
      super.value = v
      Storage.set(this.name, v)
    }
  }


  class SettingsController {
    html = `
        <div class="dropdown">
          <button class="settings-toggle">Settings</button>
          <div id="settingsDropdown" class="dropdown-content">
            <div class="setting-level setting-level-main"></div>
          </div>
        </div>
      `


    css = `
        .dropdown {
          position: relative;
          float: right;
          margin-right: 100px;
          display: inline-block;
          height: 50px;
        }

        .dropdown-content {
          display: none;
          flex-direction: row-reverse;
          position: absolute;
          column-gap: 10px;
          color: var(--night-text-color);
          min-width: 160px;
          right: 0;
          box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
          z-index: 1;
        }
        .dropdown-content label {
          font-weight: unset;
        }

        .setting-level {
          display: none;
          min-width: 200px;
          background-color: var(--night-background-color);
          padding: 5px;
          transform: translateZ(0); /* promote to use gpu (without it when second setting-level is showing another get blur) */
        }

        .setting-level-main {
          display: unset !important;
        }

        .settings-toggle {
          background-color: color-mix(in srgb, var(--night-active-checkbox-border-color), rgba(0,0,0,100) 20%);
          color: white;
          font-size: 16px;
          border: none;
          cursor: pointer;
          height: inherit;
        }


        .ultima-icon {
          width: 20px;
          height: 20px;
        }

        .settings-row {
          display: flex;
          justify-content: space-evenly;
          align-items: center;
        }

        .settings-row > span {
          flex: 1;
        }



        #menu_main_g {
          display: none !important;
        }

        .settings-show {
          display: flex;
        }

        .settings-level-show {
          display: block !important;
        }

        div.navbar-header {
          float: unset !important;
        }

        input.ultima[type="checkbox"] {
          accent-color: var(--night-active-checkbox-background-color);
          transform: scale(1.3);
          margin: 10px;
        }

        input.ultima[type="range"] {
          accent-color: var(--night-active-checkbox-background-color);
          transform: scale(1.0);
          margin: 10px;
        }

        select.ultima {
            background-color: var(--night-active-checkbox-background-color);
            outline: none;
        }

        select.ultima > option {
          background-color: var(--night-active-checkbox-background-color) !important;
        }
      `



    _waitToApply = []
    settings = {}

    constructor() {
      this.autoFindNew = false
      this.init()
    }

    init() {
      styles.queue(this.css)
      log('settings loaded')
    }

    addStoredSetting(name, options){
      const setting = new StoredSetting(name, options)
      this.settings[name] = setting
      return setting
    }

    addSettingLevel(id, label) {
      const lvl = this._appendElemBySelector(
        '#settingsDropdown',
        `<div class="setting-level"></div>`
      )
      this.addLabel(lvl, label)
      return lvl
    }

    addSettingRow(parent) {
      const row = this._appendElem(
        parent,
        '<div class="settings-row">'
      )
      return row
    }
    addIcon(parent, resource_key) {
      const icon = this._appendElem(
        parent,
        `<div class="ultima-icon"></div>`
      )
      icon.innerHTML = resources.getText(resource_key)
      return icon
    }
    addLabel(parent, label) {
      return this._appendElem(
        parent,
        `<span class="ultima">${label}</span>`
      )
    }

    addSelect(parent, options){
      const elem = this._appendElem(
        parent,
        `<select class="ultima"></select>`
      )
      for(const [optionId, optionName] of Object.entries(options)){
        const option = `<option value="${optionId}">${optionName}</option>`
        this._appendElem(elem, option)
      }

      function addValueChanged(callback){
        elem.addEventListener('change', (e)=>{callback(e.target.value)})
      }

      function setValue(value){
        elem.value = value
      }
      return [elem, addValueChanged, setValue]
    }

    addCheckbox(parent) {
      const elem = this._appendElem(
        parent,
        `<input class="ultima" type="checkbox">`
      )
      function addValueChanged(callback){
        elem.addEventListener('change', (e)=>{callback(e.target.checked)})
      }
      function setValue(value){
        elem.checked = value
      }
      return [elem, addValueChanged, setValue]
    }

    addRange(parent, params) {
      params = typeof params !== typeof undefined ? params : {min:0, max:1, step:0.05}

      const elem = this._appendElem(
        parent,
        `<input class="ultima" type="range" min="${params.min}" max="${params.max}" step="${params.step}">`
      )

      function addValueChanged(callback){
        elem.addEventListener('input', (e)=>{callback(e.target.value)})
      }
      function setValue(value){
        elem.value = value
      }
      return [elem, addValueChanged, setValue]
    }

    asPersistentSetting(elemObj, setting){
      const [elem, addValueChanged, setValue] = elemObj
      const storedVal = setting.value
      // log('setting', setting, setting.value)
      storedVal && setValue(storedVal)
      setting.onValueChanged = (val)=>{
        // log('onvaluechanged from', setting, 'to', val, 'elem', elem)
        setValue(val)
      }
      addValueChanged((val)=>{
        setting.value = val
        // log('input from persist', val)
      })
    }

    _appendElemBySelector(selector, html) {
      const parent = this.node.querySelector(selector)
      return this._appendElem(parent, html)
    }

    _appendElem(parent, html) {
      const newElement = elemFromHTML(html)
      parent.appendChild(newElement)
      return newElement
    }


    _applyFromWait() {
      for (const func of this._waitToApply) {
        func()
      }
    }

    onReadyAdditional() { }

    _onReady() {
      this.node.insertAdjacentHTML("beforeend", this.html)

      const settingsDropdown = this.node.querySelector('#settingsDropdown')
      const toggleButton = this.node.querySelector('.settings-toggle')
      toggleButton.addEventListener('click', () => {
        settingsDropdown.classList.toggle("settings-show")
      })

      this.settingsMain = this.node.querySelector('.setting-level-main')

      try {
        this.onReadyAdditional()
      }
      catch (err) {
        log('settings onReadyAdditional got error')
        console.error(err)
      }
    }


    injectWhenReady() {
      VM.observe(unsafeWindow.document, () => {
        const node = unsafeWindow.document.querySelector('div.navbar-header')

        if (node) {
          this.node = node
          this._onReady()
          // this._applyFromWait()
          this.ready = true

          log('ADDED settings')
          return true
        }
      })
    }
  }

  const settingsController = new SettingsController()

  settingsController.onReadyAdditional = function () {
    const row1 = this.addSettingRow(this.settingsMain)
    this.addLabel(row1, 'auto find new')
    this.asPersistentSetting(
      this.addCheckbox(row1),
      this.addStoredSetting('autoFindNew')
    )


    const level_gain = this.addSettingLevel(1, 'gain')

    const gain_row3 = this.addSettingRow(level_gain)
    this.addLabel(gain_row3, 'method')
    this.asPersistentSetting(
      this.addSelect(gain_row3, {
        'multiply': 'Multiply',
        'limit': 'Limit',
        'pow': 'PowerFunc'
      }),
      this.addStoredSetting('gainMethod', {'defaultValue': 'multiply'})
    )

    const gain_row1 = this.addSettingRow(level_gain)

    this.asPersistentSetting(
      this.addRange(
        gain_row1,
        {min:1, max:4, step:0.05}
      ),
      this.addStoredSetting('gainMul', {'defaultValue': 4})
    )

    const gain_row2 = this.addSettingRow(level_gain)
    this.addLabel(gain_row2, 'enable on new')
    this.asPersistentSetting(
      this.addCheckbox(
        gain_row2
      ),
      this.addStoredSetting('gainOnNew')
    )




    const row2 = this.addSettingRow(this.settingsMain)
    this.addIcon(row2, 'settings').addEventListener('click', () => {
      level_gain.classList.toggle('settings-level-show')
    })
    this.addLabel(row2, 'gain volume')
    this.asPersistentSetting(
      this.addCheckbox(row2),
      this.addStoredSetting('gainEnabled')
    )


    const row3 = this.addSettingRow(this.settingsMain)
    this.addLabel(row3, 'mic mute on new')
    this.asPersistentSetting(
      this.addCheckbox(row3),
      this.addStoredSetting('muteOnNew')
    )


    const level_other = this.addSettingLevel(2, 'other')
    const other_row1 = this.addSettingRow(level_other)
    this.addLabel(other_row1, 'skip timeout')
    this.asPersistentSetting(
      this.addCheckbox(
        other_row1
      ),
      this.addStoredSetting('skipTimeout')
    )
    const other_row2 = this.addSettingRow(level_other)
    this.addLabel(other_row2, 'skip bad conn')
    this.asPersistentSetting(
      this.addCheckbox(
        other_row2
      ),
      this.addStoredSetting('skipBadConnection')
    )

    const other_row3 = this.addSettingRow(level_other)
    this.addLabel(other_row3, 'persist mute')
    this.asPersistentSetting(
      this.addCheckbox(
        other_row3
      ),
      this.addStoredSetting('microphoneMutePersistent')
    )

    const row4 = this.addSettingRow(this.settingsMain)
    this.addIcon(row4, 'settings').addEventListener('click', () => {
      level_other.classList.toggle('settings-level-show')
    })
    this.addLabel(row4, 'other')




  }
  settingsController.injectWhenReady()

  //   await settingsController.addCheckbox(
  //     'auto find new',
  //     (event)=>{
  //       settingsController.autoFindNew = event.target.checked
  //       // log('changed', settingsController.autoFindNew)

  //   })
  //   await settingsController.addCategoryWithCheckbox(
  //     'gain',
  //     'gain volume',
  //     (event)=>{
  //       settingsController.gainVolume = event.target.checked
  //       // log('changed2', settingsController.gainVolume)
  //     }
  //   )
  //   await settingsController.addCheckbox(
  //     'mic off on new',
  //     (event)=>{
  //       settingsController.autoMute = event.target.checked
  //       // log('changed3', settingsController.gainVolume)
  //   })

  //   await settingsController.addCategory('misc', 'other')




  class NavbarBeautify {
    css = `
        a.local-time {
          margin: auto;
          flex: 1;
        }

        .navbar-header {
          display: flex;
          justify-content: space-between;
        }

        .pritch {
          display: none !important;
        }

      `

    constructor() {
      styles.defineSwitched('navbar')
      styles.setSwitched('navbar', this.css)
      styles.enableSwitched('navbar', true)
    }

    _onReady() {
      const brand = this.node.querySelector('.navbar-brand')
      // log('brand', brand)
      brand.innerHTML = 'Nekto.me [Ultima]'
      brand.insertAdjacentHTML(
        "afterend",
        `<a id="ultima_localtime" class="navbar-brand local-time">11:11</a>`
      )
      setInterval(this._updateTime, 100)
    }

    _updateTime() {
      const timeElem = unsafeWindow.document.querySelector('#ultima_localtime')
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: "2-digit", hourCycle: 'h23' })
      if (timeElem.innerHTML != time) {
        timeElem.innerHTML = time
      }
    }


    injectWhenReady() {
      VM.observe(unsafeWindow.document, () => {
        const node = unsafeWindow.document.querySelector('div.navbar-header')

        if (node) {
          this.node = node
          this._onReady()
          return true
        }
      })
    }
  }

  const navbar_beautify = new NavbarBeautify()
  navbar_beautify.injectWhenReady()




  class ThemeController {
    themes = {}
    currentTheme

    constructor() {
      styles.defineSwitched('theme')
      this.injectWhenReady()

    }

    defineTheme(name, prettyName, based, buttonHTML, css, template = '') {
      this.themes[name] = {
        prettyName: prettyName,
        based: based,
        buttonHTML: buttonHTML,
        css: template + css
      }
    }

    set(name) {
      this.currentTheme = name
      Storage.set('theme', name)
      if (name == 'light' || name == 'night') {
        this.disable()
        return
      }
      styles.setSwitched('theme', this.themes[name].css)
      styles.enableSwitched('theme', true)

      this.vue.$store._commit('user/setColorScheme', this.themes[name].based)
    }

    disable() {
      styles.enableSwitched('theme', false)
    }

    setFromStorageWhenReady() {
      const storedTheme = Storage.get('theme')
      if (storedTheme) {
        this.set(storedTheme)
        // log('theme on ready', this.vue)
      }
    }

    injectWhenReady() {
      VM.observe(unsafeWindow.document, () => {
        let node
        const cont = unsafeWindow.document.querySelector('div:has(> div.chat-step:not(.error-1))')
        if(cont?.__vue__){
          node = cont
        }
        else{
          const step = unsafeWindow.document.querySelector('div.chat-step.idle')
          if(step?.__vue__){
            node = step
          }
        }
        if (node && node.__vue__) {
          const vue = node.__vue__
          unsafeWindow.v = vue
          this.vue = vue

          vue.$store._commit = vue.$store.commit
          vue.$store.commit = (mutation, state, ...args) => {
            // log('commit', mutation, state, ...args)
            if (mutation == 'user/setColorScheme') {
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



          unsafeWindow.callmemaybe = () => {
            let vue = document.querySelector('div.chat-step.idle').__vue__
            vue.$store.commit('user/setSearchParam', { 'key': 'myAge', 'value': '19,19' })
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
        if (node && node.__vue__ && !node.__ultima) {
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

          for (const [name, theme] of Object.entries(this.themes)) {
            let div
            if (theme.based == 'night') {
              div = nightThemes
            }
            else {
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
  const themeTemplate = `
      :root {
          --night-active-checkbox-background-color: var(--theme-primary) !important;
          --night-active-checkbox-border-color: var(--theme-primary) !important;
          --night-active-talk-color: var(--theme-primary) !important;
          --night-link-color: var(--theme-primary) !important;
          --night-button-stop-color: var(--theme-primary) !important;
          --night-header-text-color: var(--theme-primary) !important;
          --night-header-border-color: var(--theme-primary) !important;
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
            background-color: color-mix(in srgb, var(--theme-primary), rgb(255,255,255) 20%) !important;
        }
        .mute-button.muted {
          background-color: var(--theme-primary) !important;
        }



        input.ultima[type="checkbox"]:focus {
          outline: none;
        }

        span.ultima {
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

        div.talking {
            font-size: large;
        }

        div.users-count-panel > div.join {
          display: none !important;
        }


        div.container.tabs_type_chats {
          display: none !important;
        }

        .navbar-toggle {
          display: none !important;
        }

        /*
        .go-idle-button {
          background-image: url(${resources.getURL('menu')}) !important;
        }
        */

    `


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
          --night-background-color: #101010 !important;
          --night-header-background-color: #171717 !important;
        }
      `,
    themeTemplate
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
          --night-background-color: #101010 !important;
          --night-header-background-color: #171717 !important;
        }
      `,
    themeTemplate
  )







  // const id2 = GM_registerMenuCommand('Text2', function(){alert(123)}, { title: 'Two' })



  const nativeWebSocket = unsafeWindow.WebSocket;
  let conId

  function patchWebSocket(ws, onMessage, onSend) {
    ws.addEventListener("message", (event) => {
      let msg = event.data
      if (!msg.startsWith('42')) {
        return
      }
      msg = msg.slice(2)
      msg = JSON.parse(msg)
      onMessage(msg)
    })

    ws.nativeSend = ws.send
    ws.send = (data) => {
      if (data == '2') {
        ws.nativeSend(data)
        return
      }
      let msg = JSON.parse(data.slice(2))
      if (onSend(msg)) { return }
      ws.nativeSend(data)
    }

    function _sendJson(data) {
      ws.nativeSend('42' + JSON.stringify(data))
      return true
    }


    window.ws = ws

    return [ws, _sendJson]
  }

  let block = false

  function onMessage(msg) {
    const _conId = msg[1].connectionId
    if (_conId) {
      log('found connection id', _conId)
      conId = _conId
    }
    // if(msg[1].type == 'peer-connect'){
    //   block = true
    //   log('peeeeeer', msg)
    // }

    // log('recived', msg)
  }



  function onSend(msg) {
    // if(msg[1].type == 'web-agent'){
    //   log('blocked collection info (web agent)')
    //   return true
    // }
    if (block) { return true }
    if (msg[1].type == 'set-fpt') {
      log('blocked collection info (font-data)')
      return true
    }
    // log('sended', msg)
  }

  let sendJson = null;

  unsafeWindow.WebSocket = function (...args) {
    const ws = new nativeWebSocket(...args)
    const [patchedWS, _sendJson] = patchWebSocket(ws, onMessage, onSend)
    // sendJson = patchedWS.nativeSend.bind(patchedWS)
    sendJson = _sendJson
    return patchedWS
  };



  function sendMute(muted) {
    log('set mute on connection id', conId)
    sendJson(["event", { "type": "peer-mute", "connectionId": conId, "muted": muted }])
  }



  function multiplyMethod(volume, multiplyer) {
    return (volume / 255) * multiplyer
  }

  function powMethod(volume, multiplyer) {
    const n_volume = (volume / 255)
    return Math.pow(2, n_volume) / 3
  }

  function limitMethod(volume, trigger, maxVolume) {
    if (volume <= trigger) return 0;
    const normalized = (volume - trigger) / (maxVolume - trigger);
    return normalized
  }








  let volumeInspectStop

  function patchRemoteAudio(stream) {
    if (volumeInspectStop) { volumeInspectStop() }

    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream)
    const dest = context.createMediaStreamDestination()
    // const source = context.createMediaElementSource(node)
    // log("patch stream", stream)

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

    function updateVolume() {
      analyser.getByteFrequencyData(dataArray)
      const volume = dataArray.reduce((a, b) => a + b) / dataArray.length

      if (settingsController.settings.gainEnabled.value) {
        let gainValue = 0

        if (settingsController.settings.gainMethod.value == 'multiply'){
          gainValue = multiplyMethod(volume, settingsController.settings.gainMul.value)
        }
        else if (settingsController.settings.gainMethod.value == 'limit'){
          gainValue = limitMethod(volume, 20, 60)
        }
        else if (settingsController.settings.gainMethod.value == 'pow'){
          gainValue = powMethod(volume)
        }

        gainValue = 1 - gainValue
        gainValue = Math.max(0, gainValue)
        gainValue = Math.min(1, gainValue)

        // log('method', settingsController.settings.gainMethod.value, 'volume', volume, 'gain', gainValue)

        gainNode.gain.value = gainValue
      }
      else {
        gainNode.gain.value = 1
      }
      // gainNode.gain.value = 0
      // gainNode.gain.value = 0.1
      // audioOutput.volume = gainVolume * gainValue
      // log('stats: \n\n', volume.toFixed(1), '\n', hahG.toFixed(1), '\n', settingsController.gainVolume)



      if (killme) { return }

      requestAnimationFrame(updateVolume);
    }

    updateVolume();

    volumeInspectStop = () => {
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





  // let micStream
  // let _getUserMedia = unsafeWindow.navigator.mediaDevices.getUserMedia.bind(unsafeWindow.navigator.mediaDevices);
  // unsafeWindow.navigator.mediaDevices.getUserMedia = (...args) => {
  //   return _getUserMedia(...args)
  //     .then(stream => {
  //       log("micstream", stream)
  //       micStream = stream.getAudioTracks()[0]
  //       return stream
  //     })
  // }


  class Microphone {
    enabled = ReactiveValue.as(true);
    _stream;
    __getUserMedia;

    constructor(){
      this.init()
    }

    init(){
      this.patchGetUserMedia()

      this.enabled.subscribe((new_value)=>{
        log('enabled new', new_value)
        this._stream.enabled = new_value
      })
    }


    streamChanged(){
      // if(settingsController.settings.muteOnNew.value){
      //   this.enabled.value = false
      // }
      if(settingsController.settings.microphoneMutePersistent.value){
        // log('persist val', this.enabled.value)
        this._stream.enabled = this.enabled.value
      }
      else{
        this.enabled.value = true
      }
    }

    patchGetUserMedia(){
      this.__getUserMedia = unsafeWindow.navigator.mediaDevices.getUserMedia.bind(unsafeWindow.navigator.mediaDevices)

      unsafeWindow.navigator.mediaDevices.getUserMedia = (...args) => {
        return new Promise((resolve, reject)=>{
          this.__getUserMedia(...args)
          .then(stream => {
            log("micstream", stream)
            this._stream = stream.getAudioTracks()[0]
            resolve(stream)
            this.streamChanged()
          })
          .catch((err)=>{reject(err)})
        })
      }
    }
  }

  const microphone = new Microphone();
  unsafeWindow.mic = microphone




  class DynamicElem {
    ogElem;
    _beforeRemove = new Set();

    constructor(selector) {
      this.selector = selector

      this.startObserver()
      this.init()
    }

    init() { }

    create() { }

    callOnRemove(func){
      this._beforeRemove.add(func)
    }

    remove() {
      for(const func of this._beforeRemove){
        func()
        this._beforeRemove.delete(func)
      }
    }

    startObserver() {
      this.stopObserver = VM.observe(document, () => {
        const newOgElem = document.querySelector(this.selector)

        if (newOgElem && !this.ogElem) {
          this.ogElem = newOgElem
          this.create()
        }
        else if(!newOgElem && this.ogElem) {
          this.remove()
          this.ogElem = null
        }
      });
    }
  }


  class VolumeMuteIcon extends DynamicElem {
    init(){
      styles.queue(
        `.audio-chat .volume_slider.no-sound::after{
          mask: url(${resources.getURL('no_sound')}) no-repeat center / contain;
        }

        .audio-chat .volume_slider::after{
          mask: url(${resources.getURL('sound')}) no-repeat center / contain;
          background-image: none !important;
          background-color: var(--night-active-checkbox-background-color);
          width: 17px !important;
          height: 29px !important;
        }`
      )
    }

    create() {
      const event = this.ogElem.addEventListener('click', (e)=>{
        if(e.offsetX < 0){
          // icon pressed
          volume.muted = !volume.muted
        }
      })

      this.callOnRemove(()=>{
        this.ogElem.removeEventListener('click', event)
      })

      this.callOnRemove(()=>{
        volume.value.subscribe((v)=>{
          this.muted = (v == 0)
        })
      })
    }

    remove() {
      super.remove()
    }

    get muted(){
      return this.ogElem.classList.contains('no-sound')
    }

    set muted(isMuted){
      if (isMuted) {
        this.ogElem.classList.add('no-sound')
      }
      else {
        this.ogElem.classList.remove('no-sound')
      }
    }

  }
  let volumeMuteIcon = new VolumeMuteIcon('.volume_slider')


  class ForceMuteButton extends DynamicElem {

    create() {
      // log('forcemutebutton event created')
      let buttonClickEvent = (event) => {
        event.preventDefault()
        event.stopImmediatePropagation()
        microphone.enabled.value = !microphone.enabled.value
      }
      this.ogElem.onclick = undefined
      this.ogElem.addEventListener('click', buttonClickEvent, true)
      this.event = buttonClickEvent
      if(!microphone.enabled.value){
        this.ogElem.classList.add('muted')
      }

      this.callOnRemove(
        microphone.enabled.subscribe((new_value)=>{
          if(new_value){
            this.ogElem.classList.remove('muted')
          }
          else{
            this.ogElem.classList.add('muted')
          }
        })
      )
    }

    remove() {
      super.remove()
      if (!this.event) { return }
      // log('forcemutebutton event removed')

      // this.ogElem.removeEventListener(click, this.event)
      this.event = undefined
    }
  }


  let forceMuteButton = new ForceMuteButton('.mute-button:not(#mute_button_spy)')



  const htmlFakeMuteButton = `<button type="button" id="mute_button_spy" class="mute-button mute_spy_on"></button>`

  class FakeMuteButton {
    constructor(ogClassname, code, onToggle) {
      this.ogClassname = ogClassname
      this.code = code
      this.onToggle = onToggle

      this.startObserver()
    }

    create() {
      if (this.elem) { return }
      // log('button created')
      const parent = this.ogButton.parentElement
      parent.insertAdjacentHTML("beforeend", this.code)
      const node = document.querySelector('#mute_button_spy')
      node.onclick = (e) => {
        const button = e.target
        this.onToggle(button.classList.contains('mute_spy_on'))
        button.classList.toggle('mute_spy_on')
        button.classList.toggle('mute_spy_off')

      }
      this.elem = node
    }

    remove() {
      if (!this.elem) { return }
      // log('button removed')
      this.elem.remove()
      this.elem = undefined
    }

    startObserver() {
      this.disconnectObserver = VM.observe(unsafeWindow.document, () => {
        this.ogButton = document.querySelector(this.ogClassname)

        if (this.ogButton) {
          this.create()
        }
        else {
          this.remove()
        }
      });
    }


  }


  let fakeMuteButton = new FakeMuteButton(
    '.mute-button:not(#mute_button_spy)',
    htmlFakeMuteButton,
    (isMuted) => {
      sendMute(isMuted)
    }
  )

    styles.queue(
      `.mute_spy_on{
        background-image: url(${resources.getURL('mic_on_spy')}) !important;
      }

      .mute_spy_off{
        background-image: url(${resources.getURL('mic_off_spy')}) !important;
      }`
    )





  styles.injectWhenReady()
  // themeController.setFromStorageWhenReady()

})();



