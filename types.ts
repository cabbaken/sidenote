export interface ElectronAPI {
  isElectron: boolean;
  selectDirectory: () => Promise<string | null>;
  saveNotes: (folderPath: string, notes: Note[]) => Promise<{ success: boolean; error?: string }>;
  loadNotes: (folderPath: string) => Promise<Note[]>;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export enum ViewMode {
  EDIT = 'EDIT',
  PREVIEW = 'PREVIEW'
}