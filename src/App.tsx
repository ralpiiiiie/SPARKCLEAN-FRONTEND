import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppLayout } from "./components/layout/AppLayout";
import { RequireAuth } from "./components/auth/RequireAuth";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { CaseStudy } from "./pages/CaseStudy";
import { DescriptiveAnalytics } from "./pages/DescriptiveAnalytics";
import { PredictiveAnalytics } from "./pages/PredictiveAnalytics";
import { PrescriptiveAnalytics } from "./pages/PrescriptiveAnalytics";
import { DataExplorer } from "./pages/DataExplorer";
import { Settings } from "./pages/Settings";

/** Signed-in shell with the sidebar and top bar. */
function ProtectedShell() {
  return (
    <RequireAuth>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </RequireAuth>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/case-study" element={<CaseStudy />} />
          <Route path="/descriptive" element={<DescriptiveAnalytics />} />
          <Route path="/predictive" element={<PredictiveAnalytics />} />
          <Route path="/prescriptive" element={<PrescriptiveAnalytics />} />
          <Route path="/data" element={<DataExplorer />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
