export const WebViewMessages = {
  toVscode: {
    /**
     * getSetting
     */
    getSetting: 'getSetting',
    /**
     * getDemoFiles
     */
    getDemoFiles: 'getDemoFiles',
    /**
     * getRunningDemos
     */
    getRunningDemos: 'getRunningDemos',
    /**
     * getCurrentDemo
     */
    getCurrentDemo: 'getCurrentDemo',
    /**
     * getNextDemo
     */
    getNextDemo: 'getNextDemo',
    /**
     * getCountdownStarted
     */
    getCountdownStarted: 'getCountdownStarted',
    /**
     * getPresentationStarted
     */
    getPresentationStarted: 'getPresentationStarted',
    /**
     * detach
     */
    detach: 'detach',
    /**
     * runCommand
     */
    runCommand: 'runCommand',
    /**
     * openNotes
     */
    openNotes: 'openNotes',
    /**
     * getNotes
     */
    getNotes: 'getNotes',
    // Presenter view
    /**
     * getTimer
     */
    getTimer: 'getTimer',
    // Preview
    /**
     * getFileUri
     */
    getFileUri: 'getFileUri',
    /**
     * parseFileUri
     */
    parseFileUri: 'parseFileUri',
    /**
     * getStyles
     */
    getStyles: 'getStyles',
    /**
     * getTheme
     */
    getTheme: 'getTheme',
    /**
     * getSlideTheme
     */
    getSlideTheme: 'getSlideTheme',
    /**
     * updateTitle
     */
    updateTitle: 'updateTitle',
    /**
     * getPreviousEnabled
     */
    getPreviousEnabled: 'getPreviousEnabled',
    /**
     * openFile
     */
    openFile: 'openFile',
    /**
     * getFileContents
     */
    getFileContents: 'getFileContents',
    /**
     * setHasClickListener
     */
    setHasClickListener: 'setHasClickListener',
    /**
     * hasNextSlide
     */
    hasNextSlide: 'hasNextSlide',
    /**
     * hasPreviousSlide
     */
    hasPreviousSlide: 'hasPreviousSlide',
    /**
     * updateSlideIndex
     */
    updateSlideIndex: 'updateSlideIndex',
    /**
     * slideReady
     */
    slideReady: 'slideReady',
    /**
     * nextSlideTitle
     */
    nextSlideTitle: 'nextSlideTitle',
    // Config editor
    configEditor: {
      /**
       * getConfigEditorContents
       */
      getContents: 'getConfigEditorContents',
      /**
       * newConfigEditorFile
       */
      newFile: 'newConfigEditorFile',
      /**
       * updateConfigEditor
       */
      updateConfig: 'updateConfigEditor',
      /**
       * saveConfigEditorFile
       */
      saveFile: 'saveConfigEditorFile',
      /***
       * openConfigEditorSource
       */
      openSource: 'openConfigEditorSource',
      /**
       * openConfigEditorFilePicker
       */
      filePicker: 'openConfigEditorFilePicker',
      /**
       * getConfigEditorThemes
       */
      getThemes: 'getConfigEditorThemes',
      /**
       * runConfigEditorDemoStep
       */
      runDemoStep: 'runConfigEditorDemoStep',
      /**
       * checkConfigEditorStepQueue
       */
      checkStepQueue: 'checkConfigEditorStepQueue',
      /**
       * openSettings
       */
      openSettings: 'openSettings',
      /**
       * checkSnippetArgs
       */
      checkSnippetArgs: 'checkSnippetArgs',
      /**
       * getConfigEditorDemoIds
       */
      getDemoIds: 'getConfigEditorDemoIds',
      /**
       * createConfigEditorNotes
       */
      createNotes: 'createConfigEditorNotes',
      commands: 'configEditorCommands',
      /**
       * EngageTime
       */
      engageTime: {
        /**
         * Get polls
         */
        getPolls: 'getEngageTimePolls',
      },
    },
    preview: {
      getSlide: 'getPreviewSlide',
      getTotalSlides: 'getPreviewTotalSlides',
      getGlobalSlideIndex: 'getPreviewGlobalSlideIndex',
    },
    settingsView: {
      /**
       * getSettingsViewSettings
       */
      getSettings: 'getSettingsViewSettings',
      /**
       * saveSettingsViewSettings
       */
      saveSettings: 'saveSettingsViewSettings',
    },
    overview: {
      getFiles: 'getOverviewFiles',
      openConfig: 'openOverviewConfig',
      openConfigStep: 'openOverviewConfigStep',
      openSlide: 'openOverviewSlide',
      runDemoSteps: 'runOverviewDemoSteps',
    },
    presenter: {
      checkNextDemo: 'checkPresenterNextDemo',
    },
  },
  toWebview: {
    /**
     * updateClock
     */
    updateClock: 'updateClock',
    /**
     * updateFiles
     */
    updateFiles: 'updateFiles',
    /**
     * updateRunningDemos
     */
    updateRunningDemos: 'updateRunningDemos',
    /**
     * updateNextDemo
     */
    updateNextDemo: 'updateNextDemo',
    /**
     * updateCountdown
     */
    updateCountdown: 'updateCountdown',
    /**
     * updateCountdownStarted
     */
    updateCountdownStarted: 'updateCountdownStarted',
    /**
     * updateCountdownStatus
     */
    updateCountdownStatus: 'updateCountdownStatus',
    /**
     * resetCountdown
     */
    resetCountdown: 'resetCountdown',
    /**
     * updatePresentationStarted
     */
    updatePresentationStarted: 'updatePresentationStarted',
    /**
     * resetNotes
     */
    resetNotes: 'resetNotes',
    // Preview
    /**
     * updateFileUri
     */
    updateFileUri: 'updateFileUri',
    /**
     * triggerUpdate
     */
    triggerUpdate: 'triggerUpdate',
    /**
     * updateStyles
     */
    updateStyles: 'updateStyles',
    /**
     * updateIsInPresentationMode
     */
    updateIsInPresentationMode: 'updateIsInPresentationMode',
    /**
     * previousSlide
     */
    previousSlide: 'previousSlide',
    /**
     * nextSlide
     */
    nextSlide: 'nextSlide',
    preview: {
      /**
       * updateNextStep
       */
      updateNextStep: 'updateNextStep',
    },
    // Config editor
    configEditor: {
      /**
       * updateConfigEditorContents
       */
      updateConfigContents: 'updateConfigEditorContents',
      /**
       * triggerConfigEditorSave
       */
      triggerSave: 'triggerConfigEditorSave',
      /**
       * openConfigEditorStep
       */
      openStep: 'openConfigEditorStep',
    },
    overview: {
      update: 'updateOverview',
    },
    presenter: {
      nextSlide: 'presenterNextSlide',
    },
  },
};
