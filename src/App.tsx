import { useCallback } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { CandidateWorkspace } from './components/workspace/CandidateWorkspace';
import { DetailPanel } from './components/DetailPanel';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const selectedId = useAppStore(s => s.selectedId);
  const setSelectedId = useAppStore(s => s.setSelectedId);

  const handleClosePanel = useCallback(() => {
    setSelectedId(null);
  }, [setSelectedId]);

  return (
    <AppShell
      header={<Header />}
      sidebar={<Sidebar />}
      panel={selectedId ? <DetailPanel onClose={handleClosePanel} /> : undefined}
    >
      <CandidateWorkspace />
    </AppShell>
  );
}
