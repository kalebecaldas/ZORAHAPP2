import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from 'sonner';
import { useAuth } from "./hooks/useAuth";
import { usePermissions } from "./hooks/usePermissions";
import Sidebar from "./components/Sidebar";
import { Login } from "./pages/Login";
import DashboardIntelligent from "./pages/DashboardIntelligent";
import ConversationsNew from "./pages/ConversationsNew";
import { Patients } from "./pages/Patients";
import { Workflows } from "./pages/Workflows";
import { WorkflowEditor } from "./pages/WorkflowEditor";
import { Stats } from "./pages/Stats";
import { Settings } from "./pages/Settings";
import { Users } from "./pages/Users";
import { TestChat } from "./pages/TestChat";
import AIConfig from "./pages/AIConfig";

function ProtectedRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const { user } = useAuth();
  const { hasPermission, loading } = usePermissions();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (permission && !hasPermission(permission as any)) {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
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
          <DashboardIntelligent />
        </ProtectedRoute>
      } />
      <Route path="/conversations" element={
        <ProtectedRoute permission="conversations">
          <ConversationsNew />
        </ProtectedRoute>
      } />
      <Route path="/conversations/:phone" element={
        <ProtectedRoute permission="conversations">
          <ConversationsNew />
        </ProtectedRoute>
      } />
      <Route path="/patients" element={
        <ProtectedRoute permission="patients">
          <Patients />
        </ProtectedRoute>
      } />
      <Route path="/workflows" element={
        <ProtectedRoute permission="workflows">
          <Workflows />
        </ProtectedRoute>
      } />
      <Route path="/workflows/editor/:id" element={
        <ProtectedRoute permission="workflows">
          <WorkflowEditor />
        </ProtectedRoute>
      } />
      <Route path="/stats" element={
        <ProtectedRoute permission="stats">
          <Stats />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute permission="settings">
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute permission="users">
          <Users />
        </ProtectedRoute>
      } />
      <Route path="/test" element={
        <ProtectedRoute permission="test">
          <TestChat />
        </ProtectedRoute>
      } />
      <Route path="/ai-config" element={
        <ProtectedRoute permission="aiConfig">
          <AIConfig />
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
