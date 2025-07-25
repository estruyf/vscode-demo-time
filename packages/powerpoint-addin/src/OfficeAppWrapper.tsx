import * as React from 'react';
import { App } from './App';

export function OfficeAppWrapper() {
  const [officeReady, setOfficeReady] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Office' in window) {
      Office.onReady((info) => {
        if (info.host === Office.HostType.PowerPoint) {
          setOfficeReady(true);
        }
      });
    }
  }, []);

  if (!officeReady) {
    return null;
  }
  return <App />;
}
