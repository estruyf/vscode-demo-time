import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Card } from '../ui/Card';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client';
import { EventData } from '@estruyf/vscode';
import { StepList } from '../step/StepList';
import { DemoConfig } from '../../types/demo';
import { useAutoSave, useDemoConfig, useFileOperations } from '../../hooks';
import { AppHeader, MainContent, Sidebar } from '../layout';
import { ActionControls, FileControls } from '../file';
import { ValidationSummary } from './ValidationSummary';
import { DemoEditor, DemoSection, MainConfigForm } from '.';
import SettingsView from '../webviews/SettingsView';
import { WebViewMessages } from '@demotime/common';

export const DemoBuilder: React.FC<{ initialConfig: DemoConfig }> = ({ initialConfig }) => {
  const [editingStep, setEditingStep] = useState<{ demoIndex: number; stepIndex: number } | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<number | null>(null);
  const [isTestingDemo, setIsTestingDemo] = useState<boolean>(false);
  const [showValidation, setShowValidation] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const mainContentRef = React.useRef<HTMLDivElement>(null);

  // Check if we're on the settings page
  const isSettingsPage = window.location.pathname === '/settings';

  // Custom hooks for state management
  const {
    config,
    handleConfigChange,
    handleDemoChange,
    handleStepChange,
    handleAddDemo,
    handleRemoveDemo,
    handleDuplicateDemo,
    handleAddStep,
    handleRemoveStep,
    handleDuplicateStep,
    handleReorderDemo,
    handleReorderStep,
    validation
  } = useDemoConfig(initialConfig);

  const {
    handleSave,
  } = useFileOperations();

  // Auto-save functionality
  const {
    isAutoSaving,
    isManuallySaving,
    autoSaveStatusText,
    autoSaveStatusColor,
    performManualSave,
  } = useAutoSave({
    config,
    onSave: handleSave,
    interval: 20000, // 20 seconds
    enabled: false
  });

  const handlePlayDemo = (demoIndex: number) => {
    setSelectedDemo(demoIndex);
    setIsTestingDemo(true);
    setEditingStep(null); // Clear any step editing
  };

  // Event handlers
  const handleViewSource = () => {
    messageHandler.send(WebViewMessages.toVscode.configEditor.openSource);
  };

  const handleNewFileClick = () => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, { command: "demo-time.createDemoFile" });
  };

  const handleSettingsClick = () => {
    messageHandler.send(WebViewMessages.toVscode.configEditor.openSettings);
  };

  const handleOverviewClick = () => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, { command: "demo-time.showOverview" });
  };

  const handleManualSave = () => {
    performManualSave();
  };

  const handleDuplicateDemoWithState = (index: number) => {
    handleDuplicateDemo(index);

    // Automatically select the duplicated demo (which is at index + 1)
    setSelectedDemo(index + 1);
    setEditingStep(null);
  };

  const handleRemoveDemoWithState = (index: number) => {
    handleRemoveDemo(index);
    if (selectedDemo === index) {
      setSelectedDemo(null);
      setEditingStep(null);
    } else if (selectedDemo !== null && selectedDemo > index) {
      setSelectedDemo(selectedDemo - 1);
    }
  };

  const handleRemoveStepWithState = (stepIndex: number) => {
    if (selectedDemo === null) return;

    handleRemoveStep(selectedDemo, stepIndex);

    if (editingStep?.demoIndex === selectedDemo) {
      if (editingStep.stepIndex === stepIndex) {
        setEditingStep(null);
      } else if (editingStep.stepIndex > stepIndex) {
        setEditingStep({
          demoIndex: selectedDemo,
          stepIndex: editingStep.stepIndex - 1
        });
      }
    }
  };

  const handleDuplicateStepWithState = (stepIndex: number) => {
    if (selectedDemo === null) return;

    handleDuplicateStep(selectedDemo, stepIndex);

    // Automatically open the new duplicated step for editing
    setEditingStep({
      demoIndex: selectedDemo,
      stepIndex: stepIndex + 1,
    });
  };

  const handleAddStepWithState = (demoIndex: number) => {
    const currentDemo = config.demos[demoIndex];
    const newStepIndex = currentDemo.steps.length;

    handleAddStep(demoIndex);

    // Automatically open the new step for editing
    setEditingStep({
      demoIndex,
      stepIndex: newStepIndex
    });
  };

  const handleAddDemoWithState = () => {
    const newDemoIndex = config.demos.length;
    handleAddDemo();

    // Automatically select the new demo
    setSelectedDemo(newDemoIndex);
    setEditingStep(null); // Clear any existing step editing
  };

  const handleReorderDemoWithState = (fromIndex: number, toIndex: number) => {
    handleReorderDemo(fromIndex, toIndex);

    // Update the index of the step being edited if it was affected by the reorder
    if (editingStep !== null) {
      // Case 1: The demo being edited is the one that was moved.
      if (editingStep.demoIndex === fromIndex) {
        setEditingStep({ ...editingStep, demoIndex: toIndex });
      }
      // Case 2: A demo was moved from *before* the edited demo to *after* it, shifting the edited demo's index down.
      else if (fromIndex < editingStep.demoIndex && toIndex >= editingStep.demoIndex) {
        setEditingStep({ ...editingStep, demoIndex: editingStep.demoIndex - 1 });
      }
      // Case 3: A demo was moved from *after* the edited demo to *before* it, shifting the edited demo's index up.
      else if (fromIndex > editingStep.demoIndex && toIndex <= editingStep.demoIndex) {
        setEditingStep({ ...editingStep, demoIndex: editingStep.demoIndex + 1 });
      }
    }

    // Update the index of the selected demo if it was affected by the reorder
    if (selectedDemo === fromIndex) {
      setSelectedDemo(toIndex);
    } else if (selectedDemo !== null) {
      if (fromIndex < selectedDemo && toIndex >= selectedDemo) {
        setSelectedDemo(selectedDemo - 1);
      } else if (fromIndex > selectedDemo && toIndex <= selectedDemo) {
        setSelectedDemo(selectedDemo + 1);
      }
    }
  };

  const handleReorderStepWithState = (fromIndex: number, toIndex: number) => {
    if (selectedDemo === null) return;

    handleReorderStep(selectedDemo, fromIndex, toIndex);

    if (editingStep?.demoIndex === selectedDemo) {
      if (editingStep.stepIndex === fromIndex) {
        setEditingStep({
          demoIndex: selectedDemo,
          stepIndex: toIndex
        });
      } else if (fromIndex < editingStep.stepIndex && toIndex >= editingStep.stepIndex) {
        setEditingStep({
          demoIndex: selectedDemo,
          stepIndex: editingStep.stepIndex - 1
        });
      } else if (fromIndex > editingStep.stepIndex && toIndex <= editingStep.stepIndex) {
        setEditingStep({
          demoIndex: selectedDemo,
          stepIndex: editingStep.stepIndex + 1
        });
      }
    }
  };

  const handleEditStep = (stepIndex: number | null) => {
    if (selectedDemo === null) return;

    if (stepIndex === null) {
      setEditingStep(null);
    } else {
      setEditingStep({
        demoIndex: selectedDemo,
        stepIndex
      });
    }
  };

  const handleNavigateToDemo = (demoIndex: number) => {
    setSelectedDemo(demoIndex);
    setEditingStep(null);
    setIsTestingDemo(false);

    // Scroll main content into view after demo selection
    setTimeout(() => {
      if (mainContentRef.current) {
        mainContentRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  };


  const handleNavigateToStep = (demoIndex: number, stepIndex: number) => {
    setSelectedDemo(demoIndex);
    setEditingStep({ demoIndex, stepIndex });
    setIsTestingDemo(false);

    // Scroll main content into view after navigation
    setTimeout(() => {
      if (mainContentRef.current) {
        mainContentRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  };

  const handleDemoStepNavigation = (payload: { stepIndex?: number }) => {
    if (!payload) {
      return;
    }

    const { stepIndex } = payload;

    if (stepIndex !== undefined) {
      setSelectedDemo(stepIndex);
      setIsTestingDemo(false);
      setEditingStep(null);
    } else {
      console.warn("Received openConfigEditorStep without stepIndex or selectedDemo");
    }
  }

  useEffect(() => {
    function messageListener(message: MessageEvent<EventData<unknown>>) {
      const { command, payload } = message.data;
      if (command === WebViewMessages.toWebview.configEditor.triggerSave) {
        performManualSave();
      } else if (command === WebViewMessages.toWebview.configEditor.openStep) {
        handleDemoStepNavigation(payload as { stepIndex?: number });
      }
    }

    Messenger.listen(messageListener);

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, [performManualSave, selectedDemo]);

  // Handle URL changes for settings page
  useEffect(() => {
    const handlePopState = () => {
      // Force re-render when URL changes
      window.location.reload();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    messageHandler.request<unknown | null>(WebViewMessages.toVscode.configEditor.checkStepQueue).then(payload => {
      handleDemoStepNavigation(payload as { stepIndex?: number });
    });
  }, []);

  // If we're on the settings page, render the settings component
  if (isSettingsPage) {
    return <SettingsView />;
  }

  return (
    <div className="min-h-screen bg-demo-time-gray-7">
      <AppHeader
        title="Config Editor"
        subtitle="Manage your demo configuration"
        validation={validation}
        showValidation={showValidation}
        onToggleValidation={() => setShowValidation(!showValidation)}
        fileControls={
          <FileControls
            onSettingsClick={handleSettingsClick}
            onOverviewClick={handleOverviewClick}
            onNewFile={handleNewFileClick}
            onViewSource={handleViewSource}
          />
        }
        actionControls={
          <ActionControls
            canSave={validation.isValid}
            onSave={handleManualSave}
            isSaving={isManuallySaving}
          />
        }
        autoSaveStatus={{
          text: autoSaveStatusText,
          color: autoSaveStatusColor,
          isActive: isAutoSaving || isManuallySaving
        }}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {showValidation && (
          <div className="mb-8">
            <ValidationSummary
              validationResult={validation}
              config={config}
              onNavigateToDemo={handleNavigateToDemo}
              onNavigateToStep={handleNavigateToStep}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Sidebar className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-205px)] lg:overflow-y-auto">
            <Card className='space-y-6'>
              <div className="flex items-center">
                <button
                  className="text-demo-time-gray-1 hover:text-demo-time-gray-2"
                  aria-label={collapsed ? "Expand settings" : "Collapse settings"}
                  onClick={() => setCollapsed((prev) => !prev)}
                >
                  <div className="flex items-center space-x-2">
                    {collapsed ? <ChevronDown /> : <ChevronUp />}

                    <h2 className="text-xl font-semibold text-gray-900">Demo File Settings</h2>
                  </div>
                </button>
              </div>
              {!collapsed && (
                <MainConfigForm config={config} onChange={handleConfigChange} />
              )}
            </Card>

            <DemoSection
              demos={config.demos}
              selectedDemo={selectedDemo}
              onSelectDemo={setSelectedDemo}
              onAddDemo={handleAddDemoWithState}
              onRemoveDemo={handleRemoveDemoWithState}
              onReorderDemo={handleReorderDemoWithState}
              onPlayDemo={handlePlayDemo}
              onDuplicateDemo={handleDuplicateDemoWithState}
              onToggleDemoDisabled={(index, disabled) => {
                const updatedDemo = { ...config.demos[index], disabled };
                handleDemoChange(index, updatedDemo);
              }}
            />
          </Sidebar>

          <MainContent ref={mainContentRef}>
            {selectedDemo !== null && (
              <>
                <DemoEditor
                  demo={config.demos[selectedDemo]}
                  onChange={(demo) => handleDemoChange(selectedDemo, demo)}
                />

                <Card padding="md">
                  <StepList
                    demo={config.demos[selectedDemo]}
                    isTestingDemo={isTestingDemo}
                    onStopTesting={() => setIsTestingDemo(false)}
                    onPlayDemo={() => handlePlayDemo(selectedDemo)}
                    editingStep={editingStep}
                    selectedDemo={selectedDemo}
                    onAddStep={() => handleAddStepWithState(selectedDemo)}
                    onRemoveStep={handleRemoveStepWithState}
                    onDuplicateStep={handleDuplicateStepWithState}
                    onEditStep={handleEditStep}
                    onReorderStep={handleReorderStepWithState}
                    onStepChange={(stepIndex, updatedStep) => handleStepChange(selectedDemo!, stepIndex, updatedStep)}
                  />
                </Card>
              </>
            )}

            {selectedDemo === null && (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Demo Selected</h3>
                <p className="text-gray-600">Select a demo from the left panel to view and edit its steps</p>
              </Card>
            )}
          </MainContent>
        </div>
      </div>
    </div>
  );
};
