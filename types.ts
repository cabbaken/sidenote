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