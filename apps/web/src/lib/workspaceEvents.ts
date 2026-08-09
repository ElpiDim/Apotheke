export type WorkspaceResource = 'categories' | 'documents' | 'notes' | 'tasks' | 'integrations';

const eventName = 'pinit:workspace-changed';
const storageKey = 'pinit:workspace-change';

export function announceWorkspaceChange(...resources: WorkspaceResource[]) {
  window.dispatchEvent(new CustomEvent<WorkspaceResource[]>(eventName, { detail: resources }));
  localStorage.setItem(storageKey, JSON.stringify({ resources, timestamp: Date.now() }));
}

export function onWorkspaceChange(callback: (resources: WorkspaceResource[]) => void) {
  const listener = (event: Event) => callback((event as CustomEvent<WorkspaceResource[]>).detail ?? []);
  const storageListener = (event: StorageEvent) => {
    if (event.key !== storageKey || !event.newValue) return;
    try {
      const message = JSON.parse(event.newValue) as { resources?: WorkspaceResource[] };
      callback(message.resources ?? []);
    } catch { /* Ignore malformed external storage events. */ }
  };
  window.addEventListener(eventName, listener);
  window.addEventListener('storage', storageListener);
  return () => { window.removeEventListener(eventName, listener); window.removeEventListener('storage', storageListener); };
}
