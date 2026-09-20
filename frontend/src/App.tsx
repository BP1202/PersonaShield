import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./components/layout/AppShell";
import { UploadPage } from "./pages/UploadPage";
import { ProcessingPage } from "./pages/ProcessingPage";
import { ResultsPage } from "./pages/ResultsPage";
import { SafeSharePage } from "./pages/SafeSharePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppShell>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/processing/:scanId" element={<ProcessingPage />} />
            <Route path="/results/:scanId" element={<ResultsPage />} />
            <Route path="/safeshare/:scanId" element={<SafeSharePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
