import { MainLayout } from "./components/MainLayout";
import { VocabularyProvider } from "./hooks/useVocabularyStorage";

function App() {
  return (
    <VocabularyProvider>
      <MainLayout />
    </VocabularyProvider>
  );
}

export default App;
