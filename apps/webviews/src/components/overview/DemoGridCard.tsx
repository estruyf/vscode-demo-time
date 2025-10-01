import { Clapperboard, Play, Settings } from "lucide-react";
import { Card } from "../ui";
import { Demo } from "@demotime/common";
import { useMemo, useState } from "react";

interface DemoGridCardProps {
  demo: Demo;
  demoIndex: number;
  globalIndex: number;
  onClick: () => void;
  onEdit: () => void;
}

const DemoGridCard: React.FC<DemoGridCardProps> = ({
  demo,
  demoIndex: _demoIndex,
  globalIndex,
  onClick,
  onEdit,
}) => {
  const [showAllSteps, setShowAllSteps] = useState(false);
  void _demoIndex;

  const stepsToShow = useMemo(
    () => (showAllSteps ? demo.steps : demo.steps.slice(0, 3)),
    [showAllSteps, demo.steps]
  );

  return (
    <Card className={`h-full cursor-pointer transition-all duration-200 hover:shadow-lg border-l-4 border-l-blue-500 dark:hover:shadow-xl ${demo.disabled ? 'opacity-60 grayscale' : ''}`} padding="sm">
      <button className="h-full flex flex-col" onClick={onClick} aria-label={`Trigger ${demo.title}`} aria-disabled={demo.disabled}>
        {/* Header with type indicator and number */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-7 h-7 bg-blue-600 rounded-lg text-white font-bold text-sm">
              {globalIndex}
            </div>
            <div className="flex items-center space-x-1">
              <Clapperboard className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                DEMO
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded-sm transition-colors"
            title="Edit demo"
          >
            <Settings className="h-3 w-3" />
          </button>
        </div>

        {/* Content - flex-grow to fill available space */}
        <div className="flex-1 flex flex-col">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2 text-left" title={demo.title}>
            {demo.title}
          </h3>

          {demo.description && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2 text-left">
              {demo.description}
            </p>
          )}

          {demo.steps.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {stepsToShow.map((step, idx) => (
                <div
                  key={idx}
                  className="w-full flex items-center space-x-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium"
                  title={step.action}
                >
                  <Play className="h-3 w-3" />
                  <span>{step.action}</span>
                </div>
              ))}
              {!showAllSteps && demo.steps.length > 3 && (
                <button
                  title={`Show ${demo.steps.length - 3} more steps`}
                  className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                  onClick={() => setShowAllSteps(true)}>
                  +{demo.steps.length - 3}
                </button>
              )}
            </div>
          )}

          <div className="flex-1 flex flex-col justify-end space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>{demo.steps.length} step{demo.steps.length !== 1 ? 's' : ''}</span>
              {demo.disabled && (
                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full font-semibold">
                  DISABLED
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </Card>
  );
};

export default DemoGridCard;
