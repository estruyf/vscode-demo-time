import { useApi } from './hooks/useApi';
import { Connection } from './components/Connection';
import { DemoList } from './components/DemoList';
import { NextDemo } from './components/NextDemo';
import { InstallPrompt } from './components/InstallPrompt';
import 'vscrui/dist/codicon.css';

function App() {
  const {
    connectionStatus,
    apiData,
    loading,
    connect,
    disconnect,
    triggerNext,
    triggerPrevious,
    runById,
    refreshData,
  } = useApi();

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
            />
          </div>
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-10 bg-[#202736]/95 backdrop-blur-sm border-b border-gray-700/30 flex-shrink-0">
            <div className="container mx-auto px-4 py-3 max-w-4xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/logo.svg" alt="Demo Time" className="w-10 h-10" />
                  <div>
                    <h1 className="text-lg font-bold text-white leading-tight">
                      Demo Time
                    </h1>
                    <p className="text-xs text-gray-400 leading-tight">
                      Remote
                    </p>
                  </div>
                </div>
                <button
                  onClick={disconnect}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>

          {apiData && (
            <div className="container mx-auto max-w-4xl flex-1 overflow-hidden">
              <DemoList
                apiData={apiData}
                onRunById={runById}
              />
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
