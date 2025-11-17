import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from 'sonner';
import { useAuth } from "./hooks/useAuth";
import Sidebar from "./components/Sidebar";
import { Login } from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Conversations from "./pages/Conversations";
import { Patients } from "./pages/Patients";
import { Workflows } from "./pages/Workflows";
import { Stats } from "./pages/Stats";
import { Settings } from "./pages/Settings";
import { Users } from "./pages/Users";
import { TestChat } from "./pages/TestChat";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/conversations" element={
        <ProtectedRoute>
          <Conversations />
        </ProtectedRoute>
      } />
      <Route path="/conversations/:phone" element={
        <ProtectedRoute>
          <Conversations />
        </ProtectedRoute>
      } />
      <Route path="/patients" element={
        <ProtectedRoute>
          <Patients />
        </ProtectedRoute>
      } />
      <Route path="/workflows" element={
        <ProtectedRoute>
          <Workflows />
        </ProtectedRoute>
      } />
      <Route path="/stats" element={
        <ProtectedRoute>
          <Stats />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      } />
      <Route path="/test" element={
        <ProtectedRoute>
          <TestChat />
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <AppRoutes />
        <Toaster position="top-right" />
      </Layout>
    </Router>
  );
}
