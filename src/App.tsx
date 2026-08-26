import { useMemo, useState } from "react";
import { MainLayout } from "./components/MainLayout";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { VocabularyProvider } from "./hooks/VocabularyProvider";
import { AuthProvider } from "./hooks/AuthProvider";
import { useAuth } from "./hooks/authContext";
import { createLocalDeckStore } from "./services/localDeckStore";
import { createRemoteDeckStore } from "./services/remoteDeckStore";

function AppContent() {
  const { user, loading, backendAvailable } = useAuth();
  // Continuar sin cuenta desde la bienvenida (solo dev: edición del CSV)
  const [localBypass, setLocalBypass] = useState(false);
  const store = useMemo(() => (user ? createRemoteDeckStore() : createLocalDeckStore()), [user]);

  // Sin destello mientras se resuelve /api/auth/me
  if (loading) return <div className="min-h-screen bg-slate-100" />;

  // Con backend y sin sesión, la app queda detrás de la bienvenida; sin
  // backend (build estático) se cae al modo local histórico directamente.
  if (!user && backendAvailable && !localBypass) {
    return <WelcomeScreen onContinueLocal={() => setLocalBypass(true)} />;
  }

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
