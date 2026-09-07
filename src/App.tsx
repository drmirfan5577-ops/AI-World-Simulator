import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { WorldTimeClock } from '@/components/features/WorldTimeClock';
import { Landing } from '@/pages/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { BotDetail } from '@/pages/BotDetail';
import { Discover } from '@/pages/Discover';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WorldTimeClock />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bot/:id" element={<BotDetail />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
