import { Demo, Slide } from "@demotime/common";
import { Card } from "../ui";
import { Presentation, Settings } from "lucide-react";
import React from "react";

// Slide Card Component for Grid
interface SlideGridCardProps {
  slide: Slide & { filePath: string; demoTitle: string; demoIndex: number };
  demo?: Demo;
  slideIndex: number;
  totalSlides: number;
  globalIndex: number;
  onClick: () => void;
  onEdit: () => void;
}

const SlideGridCard: React.FC<SlideGridCardProps> = ({
  demo,
  slide,
  slideIndex,
  totalSlides,
  globalIndex,
  onClick,
  onEdit
}) => {
  const slideTitle = React.useMemo(() => {
    const content = typeof slide.content === 'string' ? slide.content : '';
    // Extract first markdown heading (# .. ######)
    const titleMatch = content.match(/^#{1,6}\s+(.+)$/m);
    let title = titleMatch ? titleMatch[1] : `Slide ${slideIndex + 1} (no title)`;
    // Strip HTML tags if present and trim
    title = title.replace(/<[^>]+>/g, '').trim();
    return title;
  }, [slide.content, slideIndex]);

  return (
    <Card className={`h-full cursor-pointer transition-all duration-200 hover:shadow-lg border-l-4 border-l-yellow-500 ${demo?.disabled ? 'opacity-60 grayscale' : ''}`} padding="sm">
      <button className="h-full flex flex-col" onClick={onClick} aria-label={`Trigger ${slideTitle}`} aria-disabled={demo?.disabled}>
        {/* Header with type indicator and number */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-7 h-7 bg-yellow-600 rounded-lg text-white font-bold text-sm">
              {globalIndex}
            </div>
            <div className="flex items-center space-x-1">
              <Presentation className="h-4 w-4 text-yellow-600" />
              <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                SLIDE {totalSlides > 1 && ` GROUP`}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded-sm transition-colors"
            aria-label={`Edit slide ${slideIndex + 1}`}
            title="Edit demo"
          >
            <Settings className="h-3 w-3" />
          </button>
        </div>

        {/* Content - flex-grow to fill available space */}
        <div className="flex-1 flex flex-col">
          <div className="mb-2 flex justify-between items-center">
            <span className="text-xs font-medium text-demo-time-gray-4 bg-demo-time-gray-6 px-2 py-0.5 rounded-full">
              {slide.demoTitle}
            </span>
          </div>

          <h3 className="font-semibold text-demo-time-white text-sm mb-2 text-left">
            {slideTitle}
          </h3>

          <div className="mt-auto flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs text-demo-time-gray-4">
              <span>Slide {slideIndex + 1}/{totalSlides}</span>
              {demo?.disabled && (
                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full font-semibold">
                  DISABLED
                </span>
              )}
              {slide.frontmatter?.layout && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                  {slide.frontmatter?.layout}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </Card>
  );
};

export default SlideGridCard;
