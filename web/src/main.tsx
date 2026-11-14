import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { RouterProvider } from 'react-router';
import router from './router.ts';
import { setupPwaUpdate } from './services/pwaUpdate.ts';

// Enable automatic PWA background updates
setupPwaUpdate();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>
);
