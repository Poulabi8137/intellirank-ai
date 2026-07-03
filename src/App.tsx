import { useTheme } from './hooks/useTheme';
import { AppShell } from './components/layout/AppShell';
import { Header } from './components/layout/Header';
import { CandidateWorkspace } from './components/workspace/CandidateWorkspace';
import { ToastContainer } from './components/ui/Toast';

export default function App() {
  useTheme(); // initializes theme from localStorage / OS preference

  return (
    <>
      <AppShell header={<Header />}>
        <CandidateWorkspace />
      </AppShell>

      <ToastContainer />
    </>
  );
}
