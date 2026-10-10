import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Toaster } from 'react-hot-toast';
import { store, persistor } from './store';
import AppRoutes from './routes/AppRoutes';
import PageLoader from './components/ui/PageLoader';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={<PageLoader />} persistor={persistor}>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position={typeof window !== 'undefined' && window.innerWidth < 640 ? 'bottom-center' : 'top-right'}
            containerStyle={typeof window !== 'undefined' && window.innerWidth < 640 ? { bottom: 76 } : {}}
            toastOptions={{
              duration: 3500,
              style: {
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgb(0 0 0 / 0.15)',
                border: '1px solid rgb(226 232 240)',
                maxWidth: '90vw',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </StrictMode>,
);
