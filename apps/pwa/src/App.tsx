import {
  useApi,
  usePwaUpdates,
  useNotesAutoFetch,
  useViewport,
  useSplitView,
  useWakeLock
} from './hooks';
import { Connection } from './components/Connection';
import { DemoList } from './components/DemoList';
import { NextDemo } from './components/NextDemo';
import { Notes } from './components/Notes';
import { InstallPrompt } from './components/InstallPrompt';
import { Header } from './components/Header';
import { NextSlide } from './components/NextSlide';
import { ZoomControls } from './components/ZoomControls';
import 'vscrui/dist/codicon.css';

function App() {
  const {
    connectionStatus,
    apiData,
    loading,
    notes,
    connect,
    disconnect,
    triggerNext,
    triggerPrevious,
    runById,
    refreshData,
    fetchNotes,
    clearNotes,
    zoomIn,
    zoomOut,
  } = useApi();

  // Custom hooks for cleaner logic
  const { isMobile } = useViewport();
  const { splitView } = useSplitView(apiData, isMobile);
  const { checkForUpdates } = usePwaUpdates();

  // Keep screen awake when connected
  useWakeLock(connectionStatus.connected);

  // Auto-fetch notes based on active step
  useNotesAutoFetch({
    apiData,
    isMobile,
    fetchNotes,
    clearNotes,
  });

  return (
    <div className="h-screen bg-[#202736] text-white flex flex-col overflow-hidden">
      <InstallPrompt />

      {!connectionStatus.connected ? (
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8 max-w-4xl min-h-full flex flex-col justify-center">
            <header className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-6">
                <img src="/logo.svg" alt="Demo Time" className="w-16 h-16 md:w-20 md:h-20" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Demo Time Remote
              </h1>
              <p className="text-base md:text-lg text-gray-400">
                Remote control for live coding presentations
              </p>
            </header>

            <Connection
              connectionStatus={connectionStatus}
              loading={loading}
              onConnect={connect}
              onDisconnect={disconnect}
              onCheckForUpdates={checkForUpdates}
            />
          </div>
        </div>
      ) : (
        <>
          <Header
            onDisconnect={disconnect}
            clock={apiData?.clock}
          />

          {apiData && (
            <div className="container mx-auto max-w-7xl flex-1 overflow-hidden relative">
              <div className="flex h-full">
                <div className={`max-w-4xl md:max-w-none h-full mx-auto md:mx-0 ${splitView ? 'md:w-1/3' : 'w-full'}`}>
                  <DemoList
                    apiData={apiData}
                    onRunById={runById}
                  />
                </div>

                {
                  splitView && (
                    <div className='w-2/3 flex flex-col'>
                      {apiData.settings.showScreenshot && (
                        <NextSlide {...apiData.slides} />
                      )}

                      {(apiData.settings.showNotes && notes) && (
                        <Notes notes={notes} />
                      )}
                    </div>
                  )
                }
              </div>

              <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />
            </div>
          )}

          {apiData && (
            <NextDemo
              nextDemo={apiData.nextDemo}
              previousEnabled={apiData.previousEnabled}
              loading={loading}
              onTriggerNext={triggerNext}
              onTriggerPrevious={triggerPrevious}
              onRefresh={refreshData}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
