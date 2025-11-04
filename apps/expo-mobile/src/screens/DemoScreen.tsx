import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ApiData, DemoFile, DemoStep } from '../types/api';

// Constants
const REFRESH_DELAY_MS = 500;

interface DemoScreenProps {
  apiData: ApiData;
  loading: boolean;
  onTriggerNext: () => Promise<void>;
  onTriggerPrevious: () => Promise<void>;
  onRunById: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onDisconnect: () => void;
}

export const DemoScreen: React.FC<DemoScreenProps> = ({
  apiData,
  loading,
  onTriggerNext,
  onTriggerPrevious,
  onRunById,
  onRefresh,
  onDisconnect,
}) => {
  const handleTriggerNext = async () => {
    // Trigger haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await onTriggerNext();
      setTimeout(() => onRefresh(), REFRESH_DELAY_MS);
    } catch (error) {
      console.error('Failed to trigger next demo:', error);
    }
  };

  const handleTriggerPrevious = async () => {
    // Trigger haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await onTriggerPrevious();
      setTimeout(() => onRefresh(), REFRESH_DELAY_MS);
    } catch (error) {
      console.error('Failed to trigger previous demo:', error);
    }
  };

  const handleRunById = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await onRunById(id);
      setTimeout(() => onRefresh(), REFRESH_DELAY_MS);
    } catch (error) {
      console.error('Failed to run demo:', error);
    }
  };

  const renderDemoStep = (step: DemoStep, demoFile: DemoFile) => {
    const stepId = `${demoFile.demoFilePath}-${step.stepIndex}`;
    
    return (
      <TouchableOpacity
        key={stepId}
        style={[
          styles.stepItem,
          step.isActive && styles.stepActive,
          step.hasExecuted && styles.stepExecuted,
        ]}
        onPress={() => handleRunById(stepId)}
        disabled={step.disabled || loading}
      >
        <View style={styles.stepContent}>
          <Text style={[styles.stepLabel, step.isActive && styles.stepLabelActive]}>
            {step.label}
          </Text>
          {step.description && (
            <Text style={styles.stepDescription}>{step.description}</Text>
          )}
        </View>
        {step.isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  const renderDemoFile = (demoFile: DemoFile) => (
    <View key={demoFile.demoFilePath} style={styles.demoSection}>
      <Text style={styles.demoTitle}>{demoFile.label}</Text>
      {demoFile.description && (
        <Text style={styles.demoDescription}>{demoFile.description}</Text>
      )}
      <View style={styles.stepsContainer}>
        {demoFile.children.map((step) => renderDemoStep(step, demoFile))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Demo Time Remote</Text>
        <TouchableOpacity onPress={onDisconnect} style={styles.disconnectButton}>
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {/* Demo List */}
      <ScrollView style={styles.demoList} contentContainerStyle={styles.demoListContent}>
        {apiData.demos.map((demoFile) => renderDemoFile(demoFile))}
      </ScrollView>

      {/* Navigation Footer */}
      <View style={styles.footer}>
        {apiData.nextDemo && (
          <View style={styles.nextDemoInfo}>
            <Text style={styles.nextDemoLabel}>NEXT UP</Text>
            <Text style={styles.nextDemoTitle}>{apiData.nextDemo.title}</Text>
          </View>
        )}
        
        <View style={styles.navigationButtons}>
          {apiData.previousEnabled && (
            <TouchableOpacity
              style={[styles.navButton, styles.previousButton]}
              onPress={handleTriggerPrevious}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.navButtonText}>← Previous</Text>
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.nextButton,
              !apiData.previousEnabled && styles.nextButtonFull,
            ]}
            onPress={handleTriggerNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.nextButtonText}>
                {apiData.nextDemo ? 'Next →' : '🚀 Start'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#202736',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#1a1f2e',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  disconnectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#374151',
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  demoList: {
    flex: 1,
  },
  demoListContent: {
    padding: 16,
  },
  demoSection: {
    marginBottom: 24,
  },
  demoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  demoDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  stepsContainer: {
    marginTop: 8,
  },
  stepItem: {
    backgroundColor: '#1a1f2e',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    marginBottom: 8,
  },
  stepActive: {
    borderLeftColor: '#eab308',
    backgroundColor: '#292e3e',
  },
  stepExecuted: {
    opacity: 0.6,
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  stepLabelActive: {
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  activeIndicator: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#eab308',
  },
  footer: {
    backgroundColor: '#1a1f2e',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingBottom: 20,
  },
  nextDemoInfo: {
    padding: 16,
    paddingBottom: 8,
  },
  nextDemoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  nextDemoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  navigationButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  navButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  previousButton: {
    backgroundColor: '#374151',
  },
  nextButton: {
    backgroundColor: '#eab308',
  },
  nextButtonFull: {
    flex: 1,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
