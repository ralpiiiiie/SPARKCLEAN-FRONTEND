import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { CaseStudy } from './pages/CaseStudy';
import { DescriptiveAnalytics } from './pages/DescriptiveAnalytics';
import { PredictiveAnalytics } from './pages/PredictiveAnalytics';
import { PrescriptiveAnalytics } from './pages/PrescriptiveAnalytics';
import { ProcessSummary } from './pages/ProcessSummary';
import { DataExplorer } from './pages/DataExplorer';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/case-study" element={<CaseStudy />} />
          <Route path="/descriptive" element={<DescriptiveAnalytics />} />
          <Route path="/predictive" element={<PredictiveAnalytics />} />
          <Route path="/prescriptive" element={<PrescriptiveAnalytics />} />
          <Route path="/process" element={<ProcessSummary />} />
          <Route path="/data" element={<DataExplorer />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppLayout>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
