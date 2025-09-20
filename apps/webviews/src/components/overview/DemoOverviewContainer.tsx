import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DemoFileSection } from './DemoFileSection';
import { DemoFileData, OverviewGridItem } from '../../types/demoOverview';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { SlideParser, WebViewMessages } from '@demotime/common';

interface DemoOverviewContainerProps {
  demoFiles: DemoFileData[];
}

export const DemoOverviewContainer: React.FC<DemoOverviewContainerProps> = ({
  demoFiles,
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
              // Request file content from VS Code
              const fileContent = await messageHandler.request<string>(
                WebViewMessages.toVscode.getFileContents,
                openSlideStep.path
              );

              if (fileContent) {
                // Parse slides from markdown content
                const parser = new SlideParser();
                const slides = parser.parseSlides(fileContent);

                // Add each slide as a grid item
                slides.forEach((slide, slideIndex) => {
                  allItems.push({
                    type: 'slide',
                    globalIndex: globalIndex++,
                    fileIndex: fileItemIndex++,
                    fileName,
                    filePath,
                    slide: {
                      ...slide,
                      filePath: openSlideStep.path!,
                      demoTitle: demo.title,
                      demoIndex
                    },
                    demo,
                    slideIndex,
                    totalSlides: slides.length
                  });
                });
              } else {
                // If file can't be read, add demo as fallback
                allItems.push({
                  type: 'demo',
                  globalIndex: globalIndex++,
                  fileIndex: fileItemIndex++,
                  fileName,
                  filePath,
                  demo,
                  demoIndex
                });
              }
            } catch {
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


  useEffect(() => {
    if (demoFiles.length > 0) {
      setExpandedSections(new Set(demoFiles.map(file => file.fileName)));
    }
  }, [demoFiles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-demo-time-gray-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-demo-time-gray-5">Loading demo overview...</p>
        </div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-demo-time-gray-1">
      {/* Header */}
      <div className="bg-white dark:bg-demo-time-gray-2 shadow-xs border-b border-gray-200 dark:border-demo-time-gray-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-demo-time-gray-7">Overview</h1>
              <p className="text-gray-600 dark:text-demo-time-gray-5 text-sm mt-1">
                <span>{stats.totalFiles} demo file{stats.totalFiles !== 1 ? 's' : ''} •</span>
                <span className="ml-1">{stats.totalItems} total items</span>
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600 dark:text-demo-time-gray-5">
                <span className="font-medium ml-1">{stats.totalDemos}</span> demos •
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
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-demo-time-gray-5" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-demo-time-gray-7 mb-2">No Demo Files Found</h3>
            <p className="text-gray-600 dark:text-demo-time-gray-5">Create some demo files to see the script overview</p>
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
                allGridItems={allGridItems.filter(item => item.fileName === fileData.fileName)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
