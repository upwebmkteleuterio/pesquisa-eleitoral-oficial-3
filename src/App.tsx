import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { InstallPwaProvider } from "./contexts/InstallPwaContext";
import { AppLayout } from "./components/layout/AppLayout";
import { AdminLayout } from "./components/admin/AdminLayout";
import { useState } from "react";
import SplashScreen from "./components/SplashScreen";

import SurveyList from "./pages/SurveyList";
import SurveyDetails from "./pages/SurveyDetails";
import CollectionForm from "./pages/CollectionForm";
import SuccessPage from "./pages/SuccessPage";
import SyncPage from "./pages/SyncPage";
import HistoryPage from "./pages/HistoryPage";

// Admin Pages
import ResearchersList from "./pages/admin/ResearchersList";
import ClientsList from "./pages/admin/ClientsList";
import SurveysList from "./pages/admin/SurveysList";
import SurveyForm from "./pages/admin/SurveyForm";
import RegionsList from "./pages/admin/RegionsList";
import Reports from "./pages/admin/Reports";
import SubmissionsList from "./pages/admin/SubmissionsList";
import History from "./pages/admin/History";
import AiFormGenerator from "./pages/admin/AiFormGenerator";
import Login from "./pages/Login";
import PublicForm from "./pages/PublicForm";
import PublicSuccessPage from "./pages/PublicSuccessPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      networkMode: 'always',
      retry: 0,
    },
  },
});

function AppRoutes() {
  const { session, isLoading, profile } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Rotas Públicas (acessíveis sem sessão)
  if (!session) {
    return (
      <Routes>
        <Route path="/p/:id" element={<PublicForm />} />
        <Route path="/p/sucesso" element={<PublicSuccessPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const isAdmin = profile?.role === 'admin';
  const isClient = profile?.role === 'cliente';

  if (isClient) {
    return (
      <Routes>
        <Route path="/adm" element={<AdminLayout />}>
          <Route index element={<Navigate to="/adm/respostas" replace />} />
          <Route path="respostas" element={<SubmissionsList />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="*" element={<Navigate to="/adm/respostas" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/adm/respostas" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Rotas Públicas também disponíveis para usuários logados se quiserem testar */}
      <Route path="/p/:id" element={<PublicForm />} />
      <Route path="/p/sucesso" element={<PublicSuccessPage />} />

      {/* App Routes */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<SurveyList />} />
        <Route path="/survey/:id" element={<SurveyDetails />} />
        <Route path="/collection/:id" element={<CollectionForm />} />
        <Route path="/sync" element={<SyncPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Route>
      <Route path="/success" element={<SuccessPage />} />

      {/* Admin Routes */}
      {isAdmin ? (
        <Route path="/adm" element={<AdminLayout />}>
          <Route index element={<Navigate to="/adm/relatorios" replace />} />
          <Route path="pesquisadores" element={<ResearchersList />} />
          <Route path="clientes" element={<ClientsList />} />
          <Route path="formularios" element={<SurveysList />} />
          <Route path="formularios/novo" element={<SurveyForm />} />
          <Route path="formularios/editar/:id" element={<SurveyForm />} />
          <Route path="regioes" element={<RegionsList />} />
          <Route path="respostas" element={<SubmissionsList />} />
          <Route path="historico" element={<History />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="gerar-ia" element={<AiFormGenerator />} />
        </Route>
      ) : (
        <Route path="/adm/*" element={<Navigate to="/" replace />} />
      )}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <InstallPwaProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </InstallPwaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}