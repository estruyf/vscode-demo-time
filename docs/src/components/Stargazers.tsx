import React, { useEffect } from 'react';
import GitHub from './GitHub';

export default function Stargazers() {
  const [stars, setStars] = React.useState<number | null>(null);

  useEffect(() => {
    fetch(`https://api.frontmatter.codes/stars?repo=estruyf/vscode-demo-time`)
      .then((response) => response.json())
      .then((data) => {
        setStars(data.stars);
      });
  }, []);

  if (!stars) {
    return null;
  }

  return (
    <div className={`stargazers group flex items-center`} style={{ height: "36px" }}>
      <a
        href={`https://github.com/estruyf/vscode-demo-time`}
        className={`h-full flex items-center bg-[var(--sl-color-white)] text-[var(--sl-color-black)] p-2 text-xs font-bold group-hover:bg-whisper-700 rounded no-underline`}
        title={`Give the project a star on GitHub`}>
        <GitHub className={`h-[20px] w-[20px] mr-1 !text-[var(--sl-color-black)]`} />
        <span>Star</span>
      </a>
    
      {
        stars && (
          <>
            <div className="w-3 overflow-hidden inline-block">
              <div className="h-4 bg-[var(--sl-color-white)] group-hover:bg-whisper-700 -rotate-45 transform origin-top-right"></div>
            </div>
    
            <a
              href={`https://github.com/estruyf/vscode-demo-time/stargazers`}
              className={`h-full flex items-center bg-[var(--sl-color-white)] text-[var(--sl-color-black)] p-2 text-xs font-bold group-hover:bg-whisper-700 rounded no-underline`}
              title={`Give the project a star on GitHub`}>
              {stars}
            </a>
          </>
        )
      }
    </div>
  );
};