import { useMemo } from "react";
import { MainLayout } from "./components/MainLayout";
import { VocabularyProvider } from "./hooks/VocabularyProvider";
import { AuthProvider } from "./hooks/AuthProvider";
import { useAuth } from "./hooks/authContext";
import { createLocalDeckStore } from "./services/localDeckStore";
import { createRemoteDeckStore } from "./services/remoteDeckStore";

function AppContent() {
  const { user, loading } = useAuth();
  const store = useMemo(() => (user ? createRemoteDeckStore() : createLocalDeckStore()), [user]);
  // Sin destello del mazo anónimo mientras se resuelve /api/auth/me
  if (loading) return <div className="min-h-screen bg-slate-100" />;
  return (
    // key: entrar/salir de sesión remonta el provider → reset limpio de todo
    // el estado del mazo, sin lógica de recarga entre identidades.
    <VocabularyProvider key={user?.id ?? "anon"} store={store}>
      <MainLayout />
    </VocabularyProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
