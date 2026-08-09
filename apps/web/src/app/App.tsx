import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { DocumentViewerPage } from '../features/documents/DocumentViewerPage';
import { NotesPage } from '../features/notes/NotesPage';
import { IntegrationsPage } from '../features/integrations/IntegrationsPage';
import { IntegrationPdfPage } from '../features/integrations/IntegrationPdfPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { CategoriesPage } from '../features/categories/CategoriesPage';
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
          <Route path="/images" element={<DocumentsPage initialFilter="image" />} />
          <Route path="/documents/:documentId" element={<DocumentViewerPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/integrations/pdf/:entryId" element={<IntegrationPdfPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/categories/:categoryId" element={<CategoriesPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
