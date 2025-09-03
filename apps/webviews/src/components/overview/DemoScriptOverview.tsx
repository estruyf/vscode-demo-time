import React, { useState, useEffect } from 'react';
import { FileText, Clock, Settings, Presentation, Clapperboard } from 'lucide-react';
import { DemoConfig } from '../../types/demo';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { WebViewMessages, SlideParser, Slide, Demo } from '@demotime/common';
import DemoGridCard from './DemoGridCard';
import SlideGridCard from './SlideGridCard';

interface DemoScriptOverviewProps {
  config: DemoConfig;
}

interface GridItem {
  type: 'demo' | 'slide';
  globalIndex: number; // Sequential numbering across all items
  demo?: Demo;
  demoIndex?: number;
  slide?: Slide & { filePath: string; demoTitle: string; demoIndex: number };
  slideIndex?: number;
}

export const DemoScriptOverview: React.FC<DemoScriptOverviewProps> = ({ config }) => {
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ type: 'demo' | 'slide'; index: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const handleEditDemo = (_demoIndex: number) => {
    void _demoIndex;
    // messageHandler.send(WebViewMessages.toVscode.configEditor.openStep, { stepIndex: _demoIndex });
  };

  const handlePlayDemo = (demo: Demo, demoIndex: number) => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, {
      command: 'demo-time.runDemo',
      args: { demo, demoIndex }
    });
  };

  const openConfigEditor = () => {
    // messageHandler.send(WebViewMessages.toVscode.configEditor.openEditor);
  };

  const getTotalSteps = () => {
    return (config.demos || []).reduce((total, demo) => total + demo.steps.length, 0);
  };

  const getEstimatedDuration = () => {
    // Rough estimate: 3 seconds per step
    const totalSteps = getTotalSteps();
    const estimatedMinutes = Math.ceil((totalSteps * 3) / 60);
    return estimatedMinutes;
  };

  // Parse openSlide actions and create grid items for the single config
  useEffect(() => {
    const parseAndCreateGridItems = async () => {
      setLoading(true);
      const items: GridItem[] = [];
      let globalIndex = 1;

      for (let demoIndex = 0; demoIndex < (config.demos || []).length; demoIndex++) {
        const demo = config.demos[demoIndex];

        const openSlideStep = demo.steps.find(step => step.action === 'openSlide');

        if (openSlideStep && openSlideStep.path) {
          try {
            const fileContent = await messageHandler.request<string>(
              WebViewMessages.toVscode.getFileContents,
              openSlideStep.path
            );

            if (fileContent) {
              const parser = new SlideParser();
              const slides = parser.parseSlides(fileContent);

              slides.forEach((slide, slideIndex) => {
                items.push({
                  type: 'slide',
                  globalIndex: globalIndex++,
                  demoIndex,
                  slide: {
                    ...slide,
                    filePath: openSlideStep.path!,
                    demoTitle: demo.title,
                    demoIndex,
                  },
                  slideIndex,
                });
              });
            } else {
              items.push({
                type: 'demo',
                globalIndex: globalIndex++,
                demo,
              });
            }
          } catch (error) {
            console.warn(`Failed to parse slides from ${openSlideStep.path}:`, error);
            items.push({
              type: 'demo',
              globalIndex: globalIndex++,
              demo,
            });
          }
        } else {
          items.push({
            type: 'demo',
            globalIndex: globalIndex++,
            demo,
          });
        }
      }

      setGridItems(items);
      setLoading(false);
    };

    parseAndCreateGridItems();
  }, [config]);

  if (loading) {
    return (
      <div className="min-h-screen bg-demo-time-gray-7 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-demo-time-accent mx-auto mb-4"></div>
          <p className="text-demo-time-gray-4">Loading demo script...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-demo-time-gray-7">
      {/* Header */}
      <div className="bg-demo-time-black shadow-sm border-b border-demo-time-gray-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-demo-time-white">Demo Script Overview</h1>
              <p className="text-demo-time-gray-4 text-sm mt-1">{config.title}</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-demo-time-gray-4">
                <span className="font-medium">{(config.demos || []).length}</span> demos •
                <span className="font-medium ml-1">{gridItems.length}</span> items •
                <span className="font-medium ml-1">{getTotalSteps()}</span> steps •
                <span className="font-medium ml-1">~{getEstimatedDuration()}min</span>
              </div>
              <Button variant="secondary" onClick={openConfigEditor} icon={Settings} size="sm">
                Edit Config
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {gridItems.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-demo-time-gray-4" />
            <h3 className="text-lg font-medium text-demo-time-white mb-2">No Items to Display</h3>
            <p className="text-demo-time-gray-4">Add demos to see the script overview</p>
            <Button variant="dark" onClick={openConfigEditor} className="mt-4">
              Open Config Editor
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Single-config flat grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 auto-rows-fr">
              {gridItems.sort((a, b) => a.globalIndex - b.globalIndex).map((item) => (
                <div
                  key={`${item.type}-${item.globalIndex}`}
                  className={`h-full ${selectedItem?.index === item.globalIndex ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                >
                  {item.type === 'demo' && item.demo ? (
                    <DemoGridCard
                      demo={item.demo}
                      demoIndex={item.demoIndex!}
                      globalIndex={item.globalIndex}
                      isSelected={selectedItem?.index === item.globalIndex}
                      onClick={() => setSelectedItem(selectedItem?.index === item.globalIndex ? null : { type: 'demo', index: item.globalIndex })}
                      onEdit={() => handleEditDemo(item.demoIndex!)}
                      onPlay={() => handlePlayDemo(item.demo!, item.demoIndex!)}
                    />
                  ) : item.slide ? (
                    <SlideGridCard
                      slide={item.slide}
                      slideIndex={item.slideIndex!}
                      globalIndex={item.globalIndex}
                      isSelected={selectedItem?.index === item.globalIndex}
                      onClick={() => setSelectedItem(selectedItem?.index === item.globalIndex ? null : { type: 'slide', index: item.globalIndex })}
                      onEdit={() => handleEditDemo(item.slide!.demoIndex)}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            {/* Summary Stats across all configs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
              <Card className="p-6 text-center">
                <Clapperboard className="h-8 w-8 mx-auto mb-3 text-demo-time-accent" />
                <div className="text-2xl font-bold text-demo-time-white">{(config.demos || []).length}</div>
                <div className="text-sm text-demo-time-gray-4">Demo{(config.demos || []).length !== 1 ? 's' : ''}</div>
              </Card>

              <Card className="p-6 text-center">
                <Presentation className="h-8 w-8 mx-auto mb-3 text-demo-time-accent" />
                <div className="text-2xl font-bold text-demo-time-white">{gridItems.filter(item => item.type === 'slide').length}</div>
                <div className="text-sm text-demo-time-gray-4">Slide{gridItems.filter(item => item.type === 'slide').length !== 1 ? 's' : ''}</div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
