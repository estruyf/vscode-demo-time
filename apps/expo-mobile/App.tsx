import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { BringToFrontProvider } from './src/contexts/BringToFrontContext';
import { useApi } from './src/hooks';
import { ConnectionScreen } from './src/screens/ConnectionScreen';
import { DemoScreen } from './src/screens/DemoScreen';

export default function App() {
  return (
    <BringToFrontProvider>
      <StatusBar style="light" />
      <AppContent />
    </BringToFrontProvider>
  );
}

function AppContent() {
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

  if (!connectionStatus.connected) {
    return (
      <ConnectionScreen
        connectionStatus={connectionStatus}
        loading={loading}
        onConnect={connect}
      />
    );
  }

  if (!apiData) {
    return null;
  }

  return (
    <DemoScreen
      apiData={apiData}
      loading={loading}
      onTriggerNext={triggerNext}
      onTriggerPrevious={triggerPrevious}
      onRunById={runById}
      onRefresh={refreshData}
      onDisconnect={disconnect}
    />
  );
}
