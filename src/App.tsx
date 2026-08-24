import { MainLayout } from "./components/MainLayout";
import { VocabularyProvider } from "./hooks/VocabularyProvider";

function App() {
  return (
    <VocabularyProvider>
      <MainLayout />
    </VocabularyProvider>
  );
}

export default App;
