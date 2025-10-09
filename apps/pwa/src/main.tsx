import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { BringToFrontProvider } from './contexts/BringToFrontContext.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BringToFrontProvider>
      <App />
    </BringToFrontProvider>
  </React.StrictMode>,
)
