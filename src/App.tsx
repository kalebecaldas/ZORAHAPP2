import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from 'sonner';
import { useAuth } from "./hooks/useAuth";
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
          <DashboardIntelligent />
        </ProtectedRoute>
      } />
      <Route path="/conversations" element={
        <ProtectedRoute>
          <ConversationsNew />
        </ProtectedRoute>
      } />
      <Route path="/conversations/:phone" element={
        <ProtectedRoute>
          <ConversationsNew />
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
      <Route path="/workflows/editor/:id" element={
        <ProtectedRoute>
          <WorkflowEditor />
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
      <Route path="/ai-config" element={
        <ProtectedRoute>
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
