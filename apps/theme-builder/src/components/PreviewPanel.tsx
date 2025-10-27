import React from 'react';
import { ThemeConfig } from '../types/theme';

interface PreviewPanelProps {
  theme: ThemeConfig;
  currentLayout: string;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ theme, currentLayout }) => {
  const getLayoutStyles = () => {
    const layoutKey = currentLayout as keyof ThemeConfig['layouts'];
    const layout = theme.layouts[layoutKey] || theme.layouts.default;
    
    return {
      background: layout.background,
      color: layout.color,
      fontSize: theme.fontSize,
    };
  };

  const getHeadingStyles = () => {
    const layoutKey = currentLayout as keyof ThemeConfig['layouts'];
    const layout = theme.layouts[layoutKey] || theme.layouts.default;
    
    return {
      color: layout.headingColor,
      background: layout.headingBackground,
    };
  };

  const renderLayoutContent = () => {
    switch (currentLayout) {
      case 'intro':
        return (
          <div className="flex flex-col items-center justify-center text-center h-full">
            <h1 className="text-6xl mb-4" style={getHeadingStyles()}>
              Welcome to Demo Time
            </h1>
            <p className="text-xl opacity-80">Create amazing presentations with ease</p>
          </div>
        );
      case 'quote':
        return (
          <div className="flex flex-col items-center justify-center text-center h-full">
            <h1 className="text-5xl mb-4 italic" style={getHeadingStyles()}>
              "The best way to predict the future is to create it."
            </h1>
            <p className="text-lg opacity-70">- Peter Drucker</p>
          </div>
        );
      case 'section':
        return (
          <div className="flex flex-col items-center justify-center text-center h-full">
            <h1 className="text-6xl mb-4" style={getHeadingStyles()}>
              New Section
            </h1>
            <p className="text-xl opacity-80">Let's dive into the next topic</p>
          </div>
        );
      case 'imageLeft':
        return (
          <div className="grid grid-cols-2 gap-8 h-full items-center">
            <div className="bg-gray-300 rounded-lg h-64 flex items-center justify-center text-gray-600">
              Image
            </div>
            <div>
              <h1 className="text-4xl mb-4" style={getHeadingStyles()}>
                Image Left Layout
              </h1>
              <p>This layout places an image on the left side with content on the right.</p>
            </div>
          </div>
        );
      case 'imageRight':
        return (
          <div className="grid grid-cols-2 gap-8 h-full items-center">
            <div>
              <h1 className="text-4xl mb-4" style={getHeadingStyles()}>
                Image Right Layout
              </h1>
              <p>This layout places an image on the right side with content on the left.</p>
            </div>
            <div className="bg-gray-300 rounded-lg h-64 flex items-center justify-center text-gray-600">
              Image
            </div>
          </div>
        );
      case 'twoColumns':
        return (
          <div className="grid grid-cols-2 gap-8 h-full">
            <div>
              <h1 className="text-3xl mb-4" style={getHeadingStyles()}>
                Left Column
              </h1>
              <ul className="list-disc ml-6 space-y-2">
                <li>Point one</li>
                <li>Point two</li>
                <li>Point three</li>
              </ul>
            </div>
            <div>
              <h1 className="text-3xl mb-4" style={getHeadingStyles()}>
                Right Column
              </h1>
              <ul className="list-disc ml-6 space-y-2">
                <li>Point A</li>
                <li>Point B</li>
                <li>Point C</li>
              </ul>
            </div>
          </div>
        );
      default:
        return (
          <div>
            <h1 className="text-5xl mb-6" style={getHeadingStyles()}>
              Slide Title
            </h1>
            <p className="mb-4 text-lg leading-relaxed opacity-80">
              This is a paragraph of text in your slide. It will use the colors and styles you've
              configured in your theme.
            </p>
            <ul className="list-disc ml-6 mb-4 space-y-2">
              <li>First bullet point</li>
              <li>Second bullet point</li>
              <li>Third bullet point</li>
            </ul>
            <blockquote
              className="border-l-4 p-4 rounded"
              style={{
                borderColor: theme.blockquoteBorder,
                background: theme.blockquoteBackground,
              }}
            >
              This is a blockquote that demonstrates how quoted content will appear.
            </blockquote>
            <p className="mt-4">
              <a href="#" style={{ color: theme.linkColor }}>
                This is a link
              </a>{' '}
              in your theme.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">Preview</h2>
        <p className="text-sm text-gray-400">See how your theme looks in real-time</p>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div
          className="w-full aspect-video rounded-lg shadow-2xl overflow-hidden"
          style={getLayoutStyles()}
        >
          <div className="h-full p-8">{renderLayoutContent()}</div>
        </div>
      </div>
    </div>
  );
};
