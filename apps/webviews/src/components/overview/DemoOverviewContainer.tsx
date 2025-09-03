import React, { useState, useEffect } from 'react';
import { FileText, Clapperboard, Presentation, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DemoFileSection } from './DemoFileSection';
import { DemoFileData, OverviewGridItem } from '../../types/demoOverview';

interface DemoOverviewContainerProps {
  demoFiles: DemoFileData[];
  onEditDemo: (fileName: string, demoIndex: number) => void;
  onPlayDemo: (fileName: string, demo: any, demoIndex: number) => void;
}

export const DemoOverviewContainer: React.FC<DemoOverviewContainerProps> = ({
  demoFiles,
  onEditDemo,
  onPlayDemo,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [allGridItems, setAllGridItems] = useState<OverviewGridItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Toggle section expansion
  const toggleSection = (fileName: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  };

  // Expand all sections
  const expandAllSections = () => {
    const allFileNames = demoFiles.map(file => file.fileName);
    setExpandedSections(new Set(allFileNames));
  };

  // Collapse all sections
  const collapseAllSections = () => {
    setExpandedSections(new Set());
  };

  // Calculate total stats across all demo files
  const getTotalStats = () => {
    const totalDemos = demoFiles.reduce((sum, file) => sum + (file.config.demos || []).length, 0);
    const totalSteps = demoFiles.reduce((sum, file) =>
      sum + (file.config.demos || []).reduce((demoSum, demo) => demoSum + demo.steps.length, 0), 0
    );
    const totalSlides = allGridItems.filter(item => item.type === 'slide').length;

    // Rough estimate: 3 seconds per step
    const estimatedMinutes = Math.ceil((totalSteps * 3) / 60);

    return {
      totalFiles: demoFiles.length,
      totalDemos,
      totalSlides,
      totalSteps,
      totalItems: allGridItems.length,
      estimatedDuration: estimatedMinutes
    };
  };

  // Generate all grid items with proper numbering
  useEffect(() => {
    const generateGridItems = async () => {
      setLoading(true);
      const allItems: OverviewGridItem[] = [];
      let globalIndex = 1;

      for (const fileData of demoFiles) {
        const { config, fileName, filePath } = fileData;
        let fileItemIndex = 1;

        for (let demoIndex = 0; demoIndex < (config.demos || []).length; demoIndex++) {
          const demo = config.demos[demoIndex];

          // Check if this demo contains slides (openSlide action)
          const openSlideStep = demo.steps.find(step => step.action === 'openSlide');

          if (openSlideStep && openSlideStep.path) {
            try {
              // For now, we'll just add the demo itself since slide parsing would require VS Code API
              // In a real implementation, you'd use the messageHandler to get slide content
              allItems.push({
                type: 'demo',
                globalIndex: globalIndex++,
                fileIndex: fileItemIndex++,
                fileName,
                filePath,
                demo,
                demoIndex,
              });
            } catch (error) {
              // Fall back to demo display if slide parsing fails
              allItems.push({
                type: 'demo',
                globalIndex: globalIndex++,
                fileIndex: fileItemIndex++,
                fileName,
                filePath,
                demo,
                demoIndex,
              });
            }
          } else {
            allItems.push({
              type: 'demo',
              globalIndex: globalIndex++,
              fileIndex: fileItemIndex++,
              fileName,
              filePath,
              demo,
              demoIndex,
            });
          }
        }
      }

      setAllGridItems(allItems);
      setLoading(false);
    };

    generateGridItems();
  }, [demoFiles]);

  // Initially expand first section if there are demo files
  useEffect(() => {
    if (demoFiles.length > 0 && expandedSections.size === 0) {
      setExpandedSections(new Set([demoFiles[0].fileName]));
    }
  }, [demoFiles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-demo-time-gray-7 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-demo-time-accent mx-auto mb-4"></div>
          <p className="text-demo-time-gray-4">Loading demo overview...</p>
        </div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="min-h-screen bg-demo-time-gray-7">
      {/* Header */}
      <div className="bg-demo-time-black shadow-sm border-b border-demo-time-gray-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-demo-time-white">Demo Script Overview</h1>
              <p className="text-demo-time-gray-4 text-sm mt-1">
                {stats.totalFiles} demo file{stats.totalFiles !== 1 ? 's' : ''} •
                {stats.totalItems} total items
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-demo-time-gray-4">
                <span className="font-medium">{stats.totalDemos}</span> demos •
                <span className="font-medium ml-1">{stats.totalSlides}</span> slides •
                <span className="font-medium ml-1">{stats.totalSteps}</span> steps
              </div>
              <div className="flex space-x-2">
                <Button variant="secondary" onClick={expandAllSections} size="sm">
                  Expand All
                </Button>
                <Button variant="secondary" onClick={collapseAllSections} size="sm">
                  Collapse All
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {demoFiles.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-demo-time-gray-4" />
            <h3 className="text-lg font-medium text-demo-time-white mb-2">No Demo Files Found</h3>
            <p className="text-demo-time-gray-4">Create some demo files to see the script overview</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Demo File Sections */}
            {demoFiles.map((fileData) => (
              <DemoFileSection
                key={fileData.fileName}
                fileData={fileData}
                isExpanded={expandedSections.has(fileData.fileName)}
                onToggle={() => toggleSection(fileData.fileName)}
                onEditDemo={onEditDemo}
                onPlayDemo={onPlayDemo}
                allGridItems={allGridItems.filter(item => item.fileName === fileData.fileName)}
              />
            ))}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
              <Card className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-3 text-demo-time-accent" />
                <div className="text-2xl font-bold text-demo-time-white">{stats.totalFiles}</div>
                <div className="text-sm text-demo-time-gray-4">Demo File{stats.totalFiles !== 1 ? 's' : ''}</div>
              </Card>

              <Card className="p-6 text-center">
                <Clapperboard className="h-8 w-8 mx-auto mb-3 text-demo-time-accent" />
                <div className="text-2xl font-bold text-demo-time-white">{stats.totalDemos}</div>
                <div className="text-sm text-demo-time-gray-4">Demo{stats.totalDemos !== 1 ? 's' : ''}</div>
              </Card>

              <Card className="p-6 text-center">
                <Presentation className="h-8 w-8 mx-auto mb-3 text-demo-time-accent" />
                <div className="text-2xl font-bold text-demo-time-white">{stats.totalSlides}</div>
                <div className="text-sm text-demo-time-gray-4">Slide{stats.totalSlides !== 1 ? 's' : ''}</div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
