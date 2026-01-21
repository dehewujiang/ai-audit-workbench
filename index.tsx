
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth } from './Auth';
import './index.css';
import { marked } from 'marked';

// PROF-2024-UI-MARKDOWN-ENHANCE: Global Marked Configuration
// Enable GFM (GitHub Flavored Markdown) and breaks (Enter key = <br>)
marked.use({
  breaks: true,
  gfm: true,
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Auth />
  </React.StrictMode>
);
