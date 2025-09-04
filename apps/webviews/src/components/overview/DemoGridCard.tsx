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
    <Card className={`h-full cursor-pointer transition-all duration-200 hover:shadow-lg border-l-4 border-l-blue-500 ${demo.disabled ? 'opacity-60 grayscale' : ''}`} padding="sm">
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

          {demo.steps.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {stepsToShow.map((step, idx) => (
                <div
                  key={idx}
                  className="w-full flex items-center space-x-1 px-2 py-0.5 bg-demo-time-gray-6 text-demo-time-gray-3 rounded-full text-xs font-medium"
                  title={step.action}
                >
                  <Play className="h-3 w-3" />
                  <span>{step.action}</span>
                </div>
              ))}
              {!showAllSteps && demo.steps.length > 3 && (
                <button
                  title={`Show ${demo.steps.length - 3} more steps`}
                  className="px-2 py-0.5 bg-demo-time-gray-5 hover:bg-demo-time-gray-6 border border-demo-time-gray-4 text-demo-time-gray-2 rounded-full text-xs"
                  onClick={() => setShowAllSteps(true)}>
                  +{demo.steps.length - 3}
                </button>
              )}
            </div>
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
          </div>
        </div>
      </button>
    </Card>
  );
};

export default DemoGridCard;
