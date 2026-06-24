import { createRoot } from 'react-dom/client';
import App from './App';
import { DevInspector } from '@/features/devtools/DevInspector';
import './globals.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container missing');

// The same bundle serves both windows; ?view=debug renders the Dev Inspector.
const view = new URLSearchParams(window.location.search).get('view');
createRoot(container).render(view === 'debug' ? <DevInspector /> : <App />);
