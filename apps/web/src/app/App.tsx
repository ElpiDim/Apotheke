import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { NotesPage } from '../features/notes/NotesPage';
import { IntegrationsPage } from '../features/integrations/IntegrationsPage';
import { SearchPage } from '../features/search/SearchPage';
import { AppShell } from './AppShell';
import { OverviewPage } from './OverviewPage';

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
