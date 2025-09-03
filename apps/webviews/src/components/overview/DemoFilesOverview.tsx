import React, { useState, useMemo } from 'react';
import { DemoConfig } from '../../types/demo';
import { DemoFileSection } from './DemoFileSection';
import { Card } from '../ui/Card';
import { FileText, Clock, Presentation, Clapperboard } from 'lucide-react';

interface DemoFilesOverviewProps {
  demoConfigs: DemoConfig[];
  fileNames: string[];
}

interface SectionData {
  fileName: string;
  config: DemoConfig;
  startingIndex: number;
  demoCount: number;
  stepCount: number;
}

export const DemoFilesOverview: React.FC<DemoFilesOverviewProps> = ({
  demoConfigs,
  fileNames,
}) => {
  // Track collapsed state for each section
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Process data to create sections with proper numbering
  const sectionsData = useMemo((): SectionData[] => {
    let globalIndex = 1;
    
    return fileNames.map((fileName, fileIndex) => {
      const config = demoConfigs[fileIndex];
      const demoCount = config?.demos?.length || 0;
      const stepCount = config?.demos?.reduce((total, demo) => total + demo.steps.length, 0) || 0;
      
      const sectionData: SectionData = {
        fileName,
        config,
        startingIndex: globalIndex,
        demoCount,
        stepCount,
      };
      
      globalIndex += demoCount;
      
      return sectionData;
    });
  }, [demoConfigs, fileNames]);

  // Calculate totals
  const totals = useMemo(() => {
    return sectionsData.reduce(
      (acc, section) => ({
        demos: acc.demos + section.demoCount,
        steps: acc.steps + section.stepCount,
        estimatedMinutes: acc.estimatedMinutes + Math.ceil(section.stepCount * 3 / 60),
      }),
      { demos: 0, steps: 0, estimatedMinutes: 0 }
    );
  }, [sectionsData]);

  const toggleSection = (fileName: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [fileName]: !prev[fileName]
    }));
  };

  const handleEditDemo = (demoIndex: number) => {
    // Implementation for editing demo
    console.log('Edit demo:', demoIndex);
  };

  const handlePlayDemo = (demo: any, demoIndex: number) => {
    // Implementation for playing demo
    console.log('Play demo:', demo, demoIndex);
  };

  if (sectionsData.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-demo-time-gray-4" />
        <h3 className="text-lg font-medium text-demo-time-white mb-2">No Demo Files Found</h3>
        <p className="text-demo-time-gray-4">Create demo files to see the script overview</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <FileText className="h-6 w-6 mx-auto mb-2 text-demo-time-accent" />
          <div className="text-lg font-bold text-demo-time-white">{sectionsData.length}</div>
          <div className="text-xs text-demo-time-gray-4">Demo File{sectionsData.length !== 1 ? 's' : ''}</div>
        </Card>

        <Card className="p-4 text-center">
          <Clapperboard className="h-6 w-6 mx-auto mb-2 text-demo-time-accent" />
          <div className="text-lg font-bold text-demo-time-white">{totals.demos}</div>
          <div className="text-xs text-demo-time-gray-4">Demo{totals.demos !== 1 ? 's' : ''}</div>
        </Card>

        <Card className="p-4 text-center">
          <Presentation className="h-6 w-6 mx-auto mb-2 text-demo-time-accent" />
          <div className="text-lg font-bold text-demo-time-white">{totals.steps}</div>
          <div className="text-xs text-demo-time-gray-4">Step{totals.steps !== 1 ? 's' : ''}</div>
        </Card>

        <Card className="p-4 text-center">
          <Clock className="h-6 w-6 mx-auto mb-2 text-demo-time-accent" />
          <div className="text-lg font-bold text-demo-time-white">~{totals.estimatedMinutes}min</div>
          <div className="text-xs text-demo-time-gray-4">Estimated Duration</div>
        </Card>
      </div>

      {/* Demo File Sections */}
      <div className="space-y-4">
        {sectionsData.map((section) => (
          <DemoFileSection
            key={section.fileName}
            fileName={section.fileName}
            config={section.config}
            startingIndex={section.startingIndex}
            isCollapsed={collapsedSections[section.fileName] || false}
            onToggle={() => toggleSection(section.fileName)}
            onEditDemo={handleEditDemo}
            onPlayDemo={handlePlayDemo}
          />
        ))}
      </div>
    </div>
  );
};