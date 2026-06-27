import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { RouterProvider } from 'react-router';
import router from './router.ts';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<div className='px-4 py-2 pb-20'>
			<RouterProvider router={router} />
		</div>
	</StrictMode>
);
