import { useApi } from './hooks/useApi';
import { Connection } from './components/Connection';
import { DemoList } from './components/DemoList';
import { NextDemo } from './components/NextDemo';
import { Notes } from './components/Notes';
import { InstallPrompt } from './components/InstallPrompt';
import 'vscrui/dist/codicon.css';
import { Header } from './components/Header';
import { useEffect } from 'react';

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
  } = useApi();

  // Detect mobile screen size
  const isMobile = window.innerWidth < 768;

  // Fetch notes when current demo step has notes and not on mobile
  useEffect(() => {
    if (apiData && !isMobile) {
      // Find the current active step
      const currentStep = apiData.demos
        .flatMap(demo => demo.children)
        .find(step => step.isActive);

      if (currentStep?.notes) {
        fetchNotes(currentStep.notes);
      } else {
        // Clear notes if no current step has notes
        clearNotes();
      }
    } else if (isMobile) {
      // Clear notes on mobile
      clearNotes();
    }
  }, [apiData, isMobile, fetchNotes, clearNotes]);

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
          <Header />

          {apiData && (
            <div className="container mx-auto max-w-7xl flex-1 overflow-hidden">
              <div className="flex h-full">
                <div className={`${notes ? 'flex-1' : 'max-w-4xl mx-auto'} h-full`}>
                  <DemoList
                    apiData={apiData}
                    onRunById={runById}
                  />
                </div>
                {notes && (
                  <Notes notes={notes} />
                )}
              </div>
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
