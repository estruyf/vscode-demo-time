import * as React from 'react';
import { WebViewMessages } from '../../constants';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { EventData } from '@estruyf/vscode';
import { Icon } from 'vscrui';

export interface INotesViewProps {
  currentDemo?: any;
  currentStepIndex?: number;
}

export const NotesView: React.FunctionComponent<INotesViewProps> = ({ 
  currentDemo, 
  currentStepIndex 
}) => {
  const [notes, setNotes] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isExpanded, setIsExpanded] = React.useState<boolean>(true);

  const messageListener = React.useCallback((message: MessageEvent<EventData<any>>) => {
    const { command, payload, requestId } = message.data;
    
    if (!command) {
      return;
    }

    switch (command) {
      case WebViewMessages.toWebview.updateCurrentStepNotes:
        setNotes(payload);
        setLoading(false);
        setError(null);
        break;
      
      case WebViewMessages.toWebview.updateStepNotes:
        if (payload?.stepIndex === currentStepIndex) {
          setNotes(payload.notes);
          setLoading(false);
          setError(null);
        }
        break;
      
      case WebViewMessages.toWebview.notesError:
        setError(payload?.error || 'Failed to load notes');
        setLoading(false);
        break;
    }
  }, [currentStepIndex]);

  React.useEffect(() => {
    window.addEventListener('message', messageListener);
    return () => window.removeEventListener('message', messageListener);
  }, [messageListener]);

  React.useEffect(() => {
    if (currentDemo && typeof currentStepIndex === 'number') {
      setLoading(true);
      setError(null);
      
      // Request notes for current step using existing message structure
      messageHandler.request(WebViewMessages.toVscode.getCurrentStepNotes, {}).then((response: any) => {
        setNotes(response);
        setLoading(false);
        setError(null);
      }).catch((err: any) => {
        setError(err?.message || 'Failed to load notes');
        setLoading(false);
      });
    } else {
      setNotes(null);
      setLoading(false);
      setError(null);
    }
  }, [currentDemo, currentStepIndex]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const renderNotesContent = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 p-3 text-(--vscode-descriptionForeground)">
          <Icon name="loading~spin" className="w-4 h-4" />
          <span>Loading notes...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center gap-2 p-3 text-(--vscode-errorForeground)">
          <Icon name="error" className="w-4 h-4" />
          <span>{error}</span>
        </div>
      );
    }

    if (!notes) {
      return (
        <div className="flex items-center gap-2 p-3 text-(--vscode-descriptionForeground)">
          <Icon name="note" className="w-4 h-4" />
          <span>No notes available for this step</span>
        </div>
      );
    }

    return (
      <div className="p-3">
        <div className="whitespace-pre-wrap text-(--vscode-editor-foreground) text-sm leading-relaxed break-words">
          {notes}
        </div>
      </div>
    );
  };

  const getCurrentStepInfo = () => {
    if (!currentDemo || typeof currentStepIndex !== 'number') {
      return 'No active step';
    }

    const step = currentDemo.steps?.[currentStepIndex];
    if (step) {
      return `Step ${currentStepIndex + 1}: ${step.title || step.action || 'Untitled'}`;
    }

    return `Step ${currentStepIndex + 1}`;
  };

  return (
    <div className="border border-(--vscode-panel-border) rounded-md bg-(--vscode-editor-background)">
      <div 
        className="flex items-center justify-between p-3 border-b border-(--vscode-panel-border) cursor-pointer hover:bg-(--vscode-list-hoverBackground)"
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-2">
          <Icon name="note" className="w-4 h-4 text-(--vscode-symbolIcon-textForeground)" />
          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-(--vscode-editor-foreground)">
              Step Notes
            </h3>
            <span className="text-xs text-(--vscode-descriptionForeground)">
              {getCurrentStepInfo()}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {notes && (
            <span className="text-xs text-(--vscode-descriptionForeground) bg-(--vscode-badge-background) px-2 py-1 rounded">
              Available
            </span>
          )}
          <Icon 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            className="w-4 h-4 text-(--vscode-descriptionForeground)" 
          />
        </div>
      </div>
      
      {isExpanded && (
        <div className="max-h-60 overflow-y-auto">
          {renderNotesContent()}
        </div>
      )}
    </div>
  );
};
