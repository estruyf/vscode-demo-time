import { Clapperboard, Play, Settings } from "lucide-react";
import { Card } from "../ui";
import { Icon } from "vscrui";
import { getActionIcon } from "../../utils";
import { Demo } from "@demotime/common";

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
  demoIndex: _demoIndex,
  globalIndex,
  isSelected,
  onClick,
  onEdit,
  onPlay
}) => {
  void _demoIndex;

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

export default DemoGridCard;
