import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UsersPage } from "./pages/UsersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

// Lazy load heavy pages for better initial load performance
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const ReportFormPage = lazy(() => import("./pages/ReportFormPage"));
const ReportDetailPage = lazy(() => import("./pages/ReportDetailPage"));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="reports" element={
            <Suspense fallback={<PageLoader />}>
              <ReportsPage />
            </Suspense>
          } />
          <Route path="reports/new" element={
            <Suspense fallback={<PageLoader />}>
              <ReportFormPage />
            </Suspense>
          } />
          <Route path="reports/:id/edit" element={
            <Suspense fallback={<PageLoader />}>
              <ReportFormPage />
            </Suspense>
          } />
          <Route path="reports/:id" element={
            <Suspense fallback={<PageLoader />}>
              <ReportDetailPage />
            </Suspense>
          } />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
