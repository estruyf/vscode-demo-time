import { createRoot } from 'react-dom/client';
import './styles.css';
import { RunByIdPage } from './RunByIdPage';
import { OfficeAppWrapper } from './OfficeAppWrapper';

// Legacy Edge CSS support
if (navigator.userAgent.indexOf("Edge/") !== -1) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/assets/legacy-edge.css";
  document.head.appendChild(link);
}

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  // Only check the path once at load (no SSR, so this is fine)
  const isRunById = window.location.pathname.toLowerCase() === '/api/runbyid';
  console.log('isRunById:', isRunById);
  root.render(
    isRunById ? <RunByIdPage /> : <OfficeAppWrapper />
  );

  window.Notification.tri
}
