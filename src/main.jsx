import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom'; // Import RouterProvider
import router from './routes'; // Import the router
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} /> {/* Use RouterProvider with your router */}
  </StrictMode>,
);
