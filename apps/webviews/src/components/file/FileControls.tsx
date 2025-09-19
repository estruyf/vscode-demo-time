import React from 'react';
// import { FileTypeSelector } from './FileTypeSelector';
// import { FileSelection } from './FileSelection';
// import { FileImportButton } from './FileImportButton';
import { FileActionButtons } from './FileActionButtons';

interface FileControlsProps {
  onSettingsClick: () => void;
  onOverviewClick: () => void;
  onNewFile: () => void;
  onViewSource: () => void;
}

export const FileControls: React.FC<FileControlsProps> = ({
  // fileType,
  // onFileTypeChange,
  // selectedFile,
  // currentFilename,
  // onFileSelect,
  // onFilenameChange,
  onSettingsClick,
  onOverviewClick,
  onNewFile,
  onViewSource,
}) => {
  return (
    <>
      {/* <FileTypeSelector fileType={fileType} onFileTypeChange={onFileTypeChange} /> */}
      {/* <FileSelection
        selectedFile={selectedFile}
        availableFiles={availableFiles}
        onFileSelect={onFileSelect}
        currentFilename={currentFilename}
        onFilenameChange={onFilenameChange}
        fileType={fileType}
      /> */}
      <FileActionButtons onSettingsClick={onSettingsClick} onOverviewClick={onOverviewClick} onViewSource={onViewSource} onNewFile={onNewFile} />
      {/* <FileImportButton onImport={onImport} /> */}
    </>
  );
};
