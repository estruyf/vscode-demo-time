import { WebViewMessages } from '@demotime/common';
import { messageHandler } from '@estruyf/vscode/dist/client';
import * as React from 'react';

export interface ISnippetArgumentsProps {
  path: string
}

export const SnippetArguments: React.FunctionComponent<ISnippetArgumentsProps> = ({
  path
}: React.PropsWithChildren<ISnippetArgumentsProps>) => {
  const [args, setArgs] = React.useState<string[]>([]);

  React.useEffect(() => {
    messageHandler.request<string[]>(WebViewMessages.toVscode.configEditor.checkSnippetArgs, path).then((result: string[]) => {
      setArgs(result);
    }).catch((error: Error) => {
      console.error("Error fetching snippet arguments:", error.message);
      setArgs([]);
    });
  }, [path]);

  if (!path || !args || args.length === 0) {
    return null;
  }

  return (
    <>
      <h4 className="font-medium">Found {args.length} snippet arguments</h4>
      <ul className="list-disc pl-5">
        {args.map((arg, index) => (
          <li key={index}>{arg}</li>
        ))}
      </ul>
    </>
  );
};