import { useApi } from './hooks/useApi';
import { Connection } from './components/Connection';
import { DemoList } from './components/DemoList';
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
            <div className="container mx-auto px-4 max-w-4xl flex-1 overflow-hidden">
              <DemoList
                apiData={apiData}
                onRunById={runById}
              />
            </div>
          )}

          {apiData && (
            <div className="flex-shrink-0 bg-[#1a1f2e]/95 backdrop-blur-sm border-t border-gray-700/30 shadow-2xl">
              <div className="container mx-auto px-4 py-3 max-w-4xl">
                {apiData.nextDemo && (
                  <div className="bg-gray-800/40 rounded-lg px-3 py-2 mb-2">
                    <p className="text-xs text-gray-500 mb-0.5">NEXT UP</p>
                    <p className="font-semibold text-white text-sm leading-tight">{apiData.nextDemo.title}</p>
                  </div>
                )}
                <button
                  onClick={async () => {
                    try {
                      await triggerNext(true);
                      setTimeout(() => refreshData(), 500);
                    } catch (error) {
                      console.error('Failed to trigger next demo:', error);
                    }
                  }}
                  disabled={loading}
                  className="w-full btn-primary text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Starting...' : apiData.nextDemo ? '▶ Next Demo' : '🚀 Start Demo'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;