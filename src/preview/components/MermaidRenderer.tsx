import * as React from 'react';
import mermaid from 'mermaid';

export interface IMermaidRendererProps {
  dark?: boolean;
}

export const MermaidRenderer: React.FunctionComponent<IMermaidRendererProps> = ({
  dark = false
}: React.PropsWithChildren<IMermaidRendererProps>) => {
  React.useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: dark ? 'dark' : 'default'
    });
    mermaid.contentLoaded();
    mermaid.run();
  }, []);


  return (
    <>

    </>
  );
};