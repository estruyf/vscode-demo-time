import * as React from "react";
import { createRoot } from 'react-dom/client';
import { App } from "./components/App";
import 'vscrui/dist/codicon.css';
import './styles.css';
import './themes/default.css';
import './themes/minimal.css';
import './themes/unnamed.css';
import './themes/monomi.css';
import './webcomponents/Show';

declare const acquireVsCodeApi: <T = unknown>() => {
  getState: () => T;
  setState: (data: T) => void;
  postMessage: (msg: unknown) => void;
};

const elm = document.querySelector("#root");
if (elm) {
  const root = createRoot(elm);
  const webviewUrl = elm.getAttribute("data-webview-url");

  root.render(<App webviewUrl={webviewUrl} />);
}

// Webpack HMR
// @ts-expect-error
if (import.meta.webpackHot) {
  // @ts-expect-error
  import.meta.webpackHot.accept();
}