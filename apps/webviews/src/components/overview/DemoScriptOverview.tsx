import React, { useState, useEffect } from 'react';
import { FileText, Play, Clock, Settings, Presentation, Layers, Clapperboard } from 'lucide-react';
import { DemoConfig, Demo, Step } from '../../types/demo';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { WebViewMessages, SlideParser, Slide } from '@demotime/common';
import { getActionIcon } from '../../utils/actionHelpers';
import { Icon } from 'vscrui';

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

  const handleEditDemo = (demoIndex: number) => {
    // messageHandler.send(WebViewMessages.toVscode.configEditor.openStep, { stepIndex: demoIndex });
  };

  const handleEditStep = (demoIndex: number, stepIndex: number) => {
    // messageHandler.send(WebViewMessages.toVscode.configEditor.openStepEdit, {
    //   demoIndex,
    //   stepIndex
    // });
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
    return config.demos.reduce((total, demo) => total + demo.steps.length, 0);
  };

  const getEstimatedDuration = () => {
    // Rough estimate: 3 seconds per step
    const totalSteps = getTotalSteps();
    const estimatedMinutes = Math.ceil((totalSteps * 3) / 60);
    return estimatedMinutes;
  };

  // Parse openSlide actions and create grid items
  useEffect(() => {
    const parseAndCreateGridItems = async () => {
      setLoading(true);
      const items: GridItem[] = [];
      let globalIndex = 1;

      for (let demoIndex = 0; demoIndex < config.demos.length; demoIndex++) {
        const demo = config.demos[demoIndex];

        // Check if demo has openSlide action
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
                items.push({
                  type: 'slide',
                  globalIndex: globalIndex++,
                  slide: {
                    ...slide,
                    filePath: openSlideStep.path!,
                    demoTitle: demo.title,
                    demoIndex
                  },
                  slideIndex
                });
              });
            } else {
              // If file can't be read, add demo as fallback
              items.push({
                type: 'demo',
                globalIndex: globalIndex++,
                demo,
                demoIndex
              });
            }
          } catch (error) {
            console.warn(`Failed to parse slides from ${openSlideStep.path}:`, error);
            // Add demo as fallback if slide parsing fails
            items.push({
              type: 'demo',
              globalIndex: globalIndex++,
              demo,
              demoIndex
            });
          }
        } else {
          // Regular demo without openSlide
          items.push({
            type: 'demo',
            globalIndex: globalIndex++,
            demo,
            demoIndex
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
                <span className="font-medium">{config.demos.length}</span> demos •
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
            {/* Grid Layout - 5 items per row with equal heights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 auto-rows-fr">
              {gridItems.map((item, index) => (
                <div
                  key={`${item.type}-${index}`}
                  className={`h-full ${selectedItem?.index === index ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                >
                  {item.type === 'demo' && item.demo ? (
                    <DemoGridCard
                      demo={item.demo}
                      demoIndex={item.demoIndex!}
                      globalIndex={item.globalIndex}
                      isSelected={selectedItem?.index === index}
                      onClick={() => setSelectedItem(selectedItem?.index === index ? null : { type: 'demo', index })}
                      onEdit={() => handleEditDemo(item.demoIndex!)}
                      onPlay={() => handlePlayDemo(item.demo!, item.demoIndex!)}
                    />
                  ) : item.slide ? (
                    <SlideGridCard
                      slide={item.slide}
                      slideIndex={item.slideIndex!}
                      globalIndex={item.globalIndex}
                      isSelected={selectedItem?.index === index}
                      onClick={() => setSelectedItem(selectedItem?.index === index ? null : { type: 'slide', index })}
                      onEdit={() => handleEditDemo(item.slide!.demoIndex)}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
              <Card className="p-6 text-center">
                <Clapperboard className="h-8 w-8 mx-auto mb-3 text-demo-time-accent" />
                <div className="text-2xl font-bold text-demo-time-white">{config.demos.length}</div>
                <div className="text-sm text-demo-time-gray-4">Demo{config.demos.length !== 1 ? 's' : ''}</div>
              </Card>

              <Card className="p-6 text-center">
                <Presentation className="h-8 w-8 mx-auto mb-3 text-demo-time-accent" />
                <div className="text-2xl font-bold text-demo-time-white">{gridItems.filter(item => item.type === 'slide').length}</div>
                <div className="text-sm text-demo-time-gray-4">Slide{gridItems.filter(item => item.type === 'slide').length !== 1 ? 's' : ''}</div>
              </Card>

              <Card className="p-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-3 text-demo-time-accent" />
                <div className="text-2xl font-bold text-demo-time-white">~{getEstimatedDuration()}min</div>
                <div className="text-sm text-demo-time-gray-4">Estimated Duration</div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Demo Card Component for Grid
interface DemoGridCardProps {
  demo: Demo;
  demoIndex: number;
  globalIndex: number;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onPlay: () => void;
}

const DemoGridCard: React.FC<DemoGridCardProps> = ({
  demo,
  demoIndex,
  globalIndex,
  isSelected,
  onClick,
  onEdit,
  onPlay
}) => {
  return (
    <Card className={`h-full cursor-pointer transition-all duration-200 hover:shadow-lg border-l-4 border-l-yellow-500 ${isSelected ? 'ring-2 ring-blue-500' : ''
      } ${demo.disabled ? 'opacity-60 grayscale' : ''}`}>
      <div className="p-4 h-full flex flex-col" onClick={onClick}>
        {/* Header with type indicator and number */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-7 h-7 bg-yellow-600 rounded-lg text-white font-bold text-sm">
              {globalIndex}
            </div>
            <div className="flex items-center space-x-1">
              <Clapperboard className="h-4 w-4 text-yellow-600" />
              <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                DEMO
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit demo"
          >
            <Settings className="h-3 w-3" />
          </button>
        </div>

        {/* Content - flex-grow to fill available space */}
        <div className="flex-1 flex flex-col">
          <h3 className="font-semibold text-demo-time-white text-sm mb-2 line-clamp-2" title={demo.title}>
            {demo.title}
          </h3>

          {demo.description && (
            <p className="text-xs text-demo-time-gray-4 mb-3 line-clamp-2">
              {demo.description}
            </p>
          )}

          <div className="flex-1 flex flex-col justify-end space-y-2">
            <div className="flex items-center justify-between text-xs text-demo-time-gray-4">
              <span>{demo.steps.length} step{demo.steps.length !== 1 ? 's' : ''}</span>
              {demo.disabled && (
                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full font-semibold">
                  DISABLED
                </span>
              )}
            </div>

            {/* Action preview */}
            {demo.steps.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {demo.steps.slice(0, 3).map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-demo-time-gray-6 text-demo-time-gray-3 rounded-full text-xs font-medium"
                    title={step.action}
                  >
                    <Icon name={getActionIcon(step.action) as never} className="h-3 w-3" />
                    <span>{step.action}</span>
                  </div>
                ))}
                {demo.steps.length > 3 && (
                  <div className="px-2 py-0.5 bg-demo-time-gray-5 text-demo-time-gray-3 rounded-full text-xs">
                    +{demo.steps.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions at bottom */}
          <div className="flex items-center justify-center mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              disabled={demo.disabled}
              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Run demo"
            >
              <Play className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Slide Card Component for Grid
interface SlideGridCardProps {
  slide: Slide & { filePath: string; demoTitle: string; demoIndex: number };
  slideIndex: number;
  globalIndex: number;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
}

const SlideGridCard: React.FC<SlideGridCardProps> = ({
  slide,
  slideIndex,
  globalIndex,
  isSelected,
  onClick,
  onEdit
}) => {
  const getSlideTitle = () => {
    // Extract title from slide content (look for # heading)
    const titleMatch = slide.content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1] : `Slide ${slideIndex + 1}`;
  };

  const getSlidePreview = () => {
    // Get first few lines of content without frontmatter
    const contentWithoutFrontmatter = slide.content.replace(/^---[\s\S]*?---\n/, '');
    const lines = contentWithoutFrontmatter.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    return lines.slice(0, 3).join(' ').substring(0, 100);
  };

  return (
    <Card className={`h-full cursor-pointer transition-all duration-200 hover:shadow-lg border-l-4 border-l-purple-500 ${isSelected ? 'ring-2 ring-purple-500' : ''
      }`}>
      <div className="p-4 h-full flex flex-col" onClick={onClick}>
        {/* Header with type indicator and number */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-7 h-7 bg-purple-600 rounded-lg text-white font-bold text-sm">
              {globalIndex}
            </div>
            <div className="flex items-center space-x-1">
              <Presentation className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                SLIDE
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit demo"
          >
            <Settings className="h-3 w-3" />
          </button>
        </div>

        {/* Content - flex-grow to fill available space */}
        <div className="flex-1 flex flex-col">
          <div className="mb-2">
            <span className="text-xs font-medium text-demo-time-gray-4 bg-demo-time-gray-6 px-2 py-0.5 rounded-full">
              {slide.demoTitle}
            </span>
          </div>

          <h3 className="font-semibold text-demo-time-white text-sm mb-2 line-clamp-2">
            {getSlideTitle()}
          </h3>

          <div className="flex-1 flex flex-col justify-between space-y-2">
            <p className="text-xs text-demo-time-gray-4 line-clamp-3 leading-relaxed">
              {getSlidePreview()}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-demo-time-gray-4">
                <span>Slide {slideIndex + 1}</span>
                {slide.frontmatter.layout && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                    {slide.frontmatter.layout}
                  </span>
                )}
              </div>

              {/* File path */}
              <div className="text-xs text-demo-time-gray-4 font-mono truncate" title={slide.filePath}>
                {slide.filePath.split('/').pop()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
