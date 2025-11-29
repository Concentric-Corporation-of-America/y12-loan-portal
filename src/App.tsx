import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/Home';
import { LoginPage } from '@/pages/Login';
import { RegisterPage } from '@/pages/Register';
import { CalculatorPage } from '@/pages/Calculator';
import { MemberDashboard } from '@/pages/member/Dashboard';
import { MemberLoansPage } from '@/pages/member/Loans';
import { MemberApplicationsPage } from '@/pages/member/Applications';
import { LoanApplicationPage } from '@/pages/member/LoanApplication';
import { MemberProfilePage } from '@/pages/member/Profile';
import { AdminDashboard } from '@/pages/admin/Dashboard';
import { Toaster } from '@/components/ui/sonner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // For demo purposes, allow all authenticated users to access admin
  // In production, check user role from database
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/loans" element={<HomePage />} />
        <Route path="/about" element={<HomePage />} />

        {/* Member Routes */}
        <Route
          path="/member/dashboard"
          element={
            <ProtectedRoute>
              <MemberDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member/loans"
          element={
            <ProtectedRoute>
              <MemberLoansPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member/applications"
          element={
            <ProtectedRoute>
              <MemberApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member/applications/new"
          element={
            <ProtectedRoute>
              <LoanApplicationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member/profile"
          element={
            <ProtectedRoute>
              <MemberProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App
