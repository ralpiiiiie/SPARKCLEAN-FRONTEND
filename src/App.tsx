import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/auth/RequireAuth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { BranchDashboard } from './pages/BranchDashboard';
import { CaseStudy } from './pages/CaseStudy';
import { DescriptiveAnalytics } from './pages/DescriptiveAnalytics';
import { PredictiveAnalytics } from './pages/PredictiveAnalytics';
import { PrescriptiveAnalytics } from './pages/PrescriptiveAnalytics';
import { ProcessSummary } from './pages/ProcessSummary';
import { DataExplorer } from './pages/DataExplorer';
import { Settings } from './pages/Settings';
import { useAuthStore } from './store/auth';

/** Signed-in shell with the sidebar, top bar and assistant. */
function ProtectedShell() {
  return (
    <RequireAuth>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </RequireAuth>
  );
}

/** Routes that only global accounts (admin / analyst) may open. */
function GlobalOnly() {
  return (
    <RequireAuth roles={['admin', 'analyst']}>
      <Outlet />
    </RequireAuth>
  );
}

/** `/` resolves to the dashboard this account is allowed to see. */
function RoleHome() {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'manager' ? <BranchDashboard /> : <Dashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedShell />}>
          <Route path="/" element={<RoleHome />} />
          <Route element={<GlobalOnly />}>
            <Route path="/case-study" element={<CaseStudy />} />
            <Route path="/descriptive" element={<DescriptiveAnalytics />} />
            <Route path="/predictive" element={<PredictiveAnalytics />} />
            <Route path="/prescriptive" element={<PrescriptiveAnalytics />} />
            <Route path="/process" element={<ProcessSummary />} />
            <Route path="/data" element={<DataExplorer />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
