import { Poll, WebViewMessages } from '@demotime/common';
import * as React from 'react';
import { ComboBox } from '../ui/ComboBox';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';

export interface IPollIdPickerProps {
  label: string;
  required?: boolean;
  sessionId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export const PollIdPicker: React.FunctionComponent<IPollIdPickerProps> = ({
  label,
  required,
  sessionId,
  value,
  onChange,
  error
}: React.PropsWithChildren<IPollIdPickerProps>) => {
  const [polls, setPolls] = React.useState<Poll[]>([]);

  const selectedPoll = React.useMemo(() => {
    if (!polls || polls.length === 0) {
      return value || "";
    }
    return polls.find(poll => poll.id === value)?.title || value || "";
  }, [polls, value]);

  React.useEffect(() => {
    const fetchPolls = async () => {
      const fetchedPolls = await messageHandler.request<Poll[]>(WebViewMessages.toVscode.configEditor.engageTime.getPolls, { sessionId });
      setPolls(fetchedPolls);
    };

    if (sessionId) {
      fetchPolls();
    }
  }, [sessionId]);

  return (
    <>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <ComboBox
        options={polls.map(poll => poll.title)}
        value={value}
        onChange={selectedTitle => {
          const selectedPoll = polls.find(poll => poll.title === selectedTitle);
          if (selectedPoll) {
            onChange(selectedPoll.id);
          } else {
            onChange('');
          }
        }}
        placeholder={polls.length === 0 ? 'No polls available' : 'Select a poll...'}
        required={required}
        error={error}
      />
      {
        selectedPoll && (
          <p className="mt-2 text-sm"><strong>Poll:</strong> {selectedPoll}</p>
        )
      }
    </>
  );
};
