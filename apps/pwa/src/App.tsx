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

  // Check for PWA updates
  const checkForUpdates = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        let updateFound = false;

        for (const registration of registrations) {
          // Force update check
          await registration.update();

          // Check if there's a waiting worker (new version available)
          if (registration.waiting) {
            updateFound = true;
            // Notify user that update is available
            if (confirm('A new version is available! Reload to update?')) {
              // Tell the waiting worker to skip waiting and become active
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              // Reload the page
              window.location.reload();
            }
            break;
          }
        }

        if (!updateFound) {
          alert('No updates available. You\'re running the latest version!');
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
        alert('Error checking for updates. Please try again.');
      }
    } else {
      alert('Service workers not supported in this browser.');
    }
  };

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
