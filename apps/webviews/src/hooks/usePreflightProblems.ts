import { useCallback, useEffect, useRef, useState } from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client';
import { EventData } from '@estruyf/vscode';
import { ActProblem, DemoConfig, WebViewMessages } from '@demotime/common';

const CHECK_DELAY = 500;

/**
 * Checks the act with the preflight check of the extension: on every change of the config, and when
 * the files the moves use change
 */
export const usePreflightProblems = (config: DemoConfig) => {
  const [problems, setProblems] = useState<ActProblem[]>([]);
  const configRef = useRef(config);
  const requestRef = useRef(0);

  configRef.current = config;

  const check = useCallback(() => {
    // Only use the result of the latest request
    const request = ++requestRef.current;
    messageHandler
      .request<ActProblem[]>(
        WebViewMessages.toVscode.configEditor.getPreflightProblems,
        configRef.current,
      )
      .then((result) => {
        if (request === requestRef.current) {
          setProblems(Array.isArray(result) ? result : []);
        }
      })
      .catch(() => {
        // The problems stay as they are when the check fails
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(check, CHECK_DELAY);
    return () => clearTimeout(timer);
  }, [config, check]);

  useEffect(() => {
    const messageListener = (message: MessageEvent<EventData<unknown>>) => {
      if (message.data.command === WebViewMessages.toWebview.configEditor.preflightChanged) {
        check();
      }
    };

    Messenger.listen(messageListener);
    return () => Messenger.unlisten(messageListener);
  }, [check]);

  return problems;
};
