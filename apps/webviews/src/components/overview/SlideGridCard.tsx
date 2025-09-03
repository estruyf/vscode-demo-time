import { Slide } from "@demotime/common";
import { Card } from "../ui";
import { Presentation, Settings } from "lucide-react";

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

export default SlideGridCard;
