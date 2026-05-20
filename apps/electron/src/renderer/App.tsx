import { MintApp } from './components/mint-app';
import { ErrorBoundary } from './components/error-boundary';
import { Toaster } from 'sonner';

export function App() {
  return (
    <ErrorBoundary>
      <MintApp />
      <Toaster position="top-center" richColors closeButton />
    </ErrorBoundary>
  );
}
