import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Eye, 
  Edit3, 
  FileText,
  Menu,
  Moon,
  Sun,
  FolderOpen
} from 'lucide-react';
import { Note, ViewMode } from './types';
import MarkdownView from './components/MarkdownView';

const LOCAL_STORAGE_KEY = 'sidenote-data';
const NOTES_PATH_KEY = 'sidenote-path';
const THEME_STORAGE_KEY = 'sidenote-theme';
const FONT_SIZE_KEY = 'sidenote-fontsize';
const MIN_SIDEBAR_WIDTH = 300;

const App: React.FC = () => {
  // Detect Electron (safe check)
  const isElectron = typeof window !== 'undefined' && window.electron?.isElectron;

  // --- State ---
  const [isOpen, setIsOpen] = useState(isElectron || false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.EDIT);
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const [showNoteList, setShowNoteList] = useState(true);
  const [notesPath, setNotesPath] = useState<string | null>(null);
  
  // Theme & Resizing State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [fontSize, setFontSize] = useState(15);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeGhostX, setResizeGhostX] = useState(0);

  const activeNote = notes.find(n => n.id === activeNoteId);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // --- Effects ---

  // Load Notes & Theme & Font Size
  useEffect(() => {
    const init = async () => {
      // 1. Theme
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark' | null;
      if (savedTheme) {
        setTheme(savedTheme);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }

      // 2. Font Size
      const savedFontSize = localStorage.getItem(FONT_SIZE_KEY);
      if (savedFontSize) {
        setFontSize(parseInt(savedFontSize, 10));
      }

      // 3. Load Path
      const savedPath = localStorage.getItem(NOTES_PATH_KEY);
      if (savedPath && isElectron) {
        setNotesPath(savedPath);
        try {
          // Load from file
          const fileNotes = await window.electron?.loadNotes(savedPath);
          if (fileNotes && Array.isArray(fileNotes)) {
             setNotes(fileNotes);
             if (fileNotes.length > 0) setActiveNoteId(fileNotes[0].id);
             return; // Loaded from file, skip local storage
          }
        } catch (e) {
          console.error("Failed to load from file", e);
        }
      }

      // 4. Fallback to LocalStorage
      const savedNotes = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedNotes) {
        try {
          const parsed = JSON.parse(savedNotes);
          setNotes(parsed);
          if (parsed.length > 0) setActiveNoteId(parsed[0].id);
        } catch (e) { console.error("Failed to load notes", e); }
      } else {
        const initialNote: Note = {
          id: crypto.randomUUID(),
          title: 'Welcome to SideNote',
          content: '# Welcome to SideNote\n\nThis is a smart, collapsible markdown editor.\n\n- Use **Markdown** to style.\n- Your notes are saved automatically.',
          updatedAt: Date.now()
        };
        setNotes([initialNote]);
        setActiveNoteId(initialNote.id);
      }
    };
    
    init();
  }, [isElectron]);

  // Save Notes
  useEffect(() => {
    // Debounce saving slightly or just save on change
    if (notes.length === 0) return;

    // Always save to local storage as backup/web version
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));

    // Save to file if path exists
    if (isElectron && notesPath && window.electron?.saveNotes) {
      window.electron.saveNotes(notesPath, notes).catch(err => console.error("Failed to save to file", err));
    }
  }, [notes, notesPath, isElectron]);

  // Apply Theme
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Save Font Size
  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, fontSize.toString());
  }, [fontSize]);

  // Click outside to close (implementing "auto hide")
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't auto-close in Electron or while resizing
      if (isElectron) return;

      if (
        isOpen && 
        !isResizing && 
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target as Node)
      ) {
         setIsOpen(false);
      }
    };
    
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isResizing]);

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const maxSidebarWidth = window.innerWidth - 50;
      const currentWidthFromCursor = window.innerWidth - e.clientX;
      
      // Calculate target X position for the ghost line
      let targetX = e.clientX;

      // Constrain
      if (currentWidthFromCursor < MIN_SIDEBAR_WIDTH) {
        targetX = window.innerWidth - MIN_SIDEBAR_WIDTH;
      } else if (currentWidthFromCursor > maxSidebarWidth) {
        targetX = window.innerWidth - maxSidebarWidth;
      }
      
      setResizeGhostX(targetX);
    };

    const handleMouseUp = () => {
      if (!isResizing) return;
      setIsResizing(false);
      
      // Commit new width
      const newWidth = window.innerWidth - resizeGhostX;
      setSidebarWidth(newWidth);
      
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeGhostX]);

  // --- Handlers ---

  const handleCreateNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'New Note',
      content: '',
      updatedAt: Date.now()
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setViewMode(ViewMode.EDIT);
    setShowNoteList(false);
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newNotes = notes.filter(n => n.id !== id);
    setNotes(newNotes);
    if (activeNoteId === id) {
      setActiveNoteId(newNotes.length > 0 ? newNotes[0].id : null);
    }
  };

  const handleUpdateNote = (content: string) => {
    if (!activeNoteId) return;
    setNotes(prev => prev.map(note => note.id === activeNoteId ? { ...note, content, updatedAt: Date.now() } : note));
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent closing sidebar
    setIsResizing(true);
    setResizeGhostX(e.clientX);
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleSelectFolder = async () => {
    if (!isElectron || !window.electron?.selectDirectory) return;
    const path = await window.electron.selectDirectory();
    if (path) {
      setNotesPath(path);
      localStorage.setItem(NOTES_PATH_KEY, path);
      // Save current notes to new location immediately
      if (window.electron?.saveNotes) {
        await window.electron.saveNotes(path, notes);
      }
    }
  };

  const adjustFontSize = (delta: number) => {
    setFontSize(prev => Math.max(10, Math.min(32, prev + delta)));
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // --- Render ---

  // Ghost Resizing Line
  const ghostLine = isResizing ? (
    <div 
      className="fixed top-0 bottom-0 w-px border-l-2 border-dashed border-blue-500 z-[100] shadow-xl" 
      style={{ left: resizeGhostX }} 
    />
  ) : null;

  if (!isOpen) {
    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 group">
        <button 
          onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
          className="bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-lg border border-gray-200 dark:border-slate-700 rounded-l-xl p-2 pl-3 hover:pl-5 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-300 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2"
          title="Open Notes"
        >
           <ChevronLeft size={20} />
           <span className="writing-mode-vertical text-xs font-semibold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 h-0 group-hover:h-auto overflow-hidden">
             Notes
           </span>
        </button>
      </div>
    );
  }

  return (
    <>
      {ghostLine}
      <div className={`fixed inset-0 z-50 ${isElectron ? '' : 'pointer-events-none flex justify-end'}`}>
        {/* Backdrop (Web only) */}
        {!isElectron && (
          <div 
            className="absolute inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-auto transition-opacity duration-500"
            // Click handled by document listener
          />
        )}

        {/* Sidebar */}
        <div 
          ref={sidebarRef}
          className={`pointer-events-auto relative h-full bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-2xl flex flex-col transition-transform duration-500 ease-out translate-x-0 ${isElectron ? 'w-full border-none' : 'border-l border-white/20 dark:border-slate-800'}`}
          style={{ width: isElectron ? '100%' : `${Math.min(sidebarWidth, window.innerWidth - 20)}px` }}
        >
          {/* Resize Handle (Web only) */}
          {!isElectron && (
            <div 
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 transition-colors z-[60]"
              onMouseDown={handleResizeStart}
              title="Drag to resize"
            />
          )}
          
          {/* Header */}
          <div className="flex-none h-14 border-b border-gray-200/50 dark:border-slate-700/50 flex items-center justify-between px-4 bg-white/50 dark:bg-black/50">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowNoteList(!showNoteList)}
                className={`p-2 rounded-lg transition-colors ${
                  showNoteList 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'
                }`}
                title="Toggle Note List"
              >
                <Menu size={18} />
              </button>
              <h1 className="font-bold text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">SideNote</span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
               {/* Font Size Controls */}
               <div className="hidden sm:flex items-center gap-0.5 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 mx-2">
                <button onClick={() => adjustFontSize(-1)} className="p-1 px-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Decrease Font">A-</button>
                <button onClick={() => adjustFontSize(1)} className="p-1 px-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Increase Font">A+</button>
               </div>

               {isElectron && (
                <button
                  onClick={handleSelectFolder}
                  className={`p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all ${notesPath ? 'text-blue-600 dark:text-blue-400' : ''}`}
                  title={notesPath ? `Notes saved to: ${notesPath}` : "Select Folder to Save Notes"}
                >
                  <FolderOpen size={20} />
                </button>
               )}

              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>

               <button 
                onClick={handleCreateNote}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-all"
                title="New Note"
              >
                <Plus size={20} />
              </button>
              {!isElectron && (
                <>
                  <div className="h-6 w-[1px] bg-gray-300 dark:bg-slate-700 mx-1"></div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-lg transition-colors"
                    title="Close Sidebar"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Note List */}
            <div className={`${showNoteList ? 'w-48 opacity-100' : 'w-0 opacity-0'} flex-none border-r border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-black/30 transition-all duration-300 flex flex-col overflow-hidden`}>
               <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {notes.map(note => (
                    <div 
                      key={note.id}
                      onClick={() => setActiveNoteId(note.id)}
                      className={`group relative p-3 rounded-lg cursor-pointer transition-all border ${
                        activeNoteId === note.id 
                        ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 shadow-sm' 
                        : 'border-transparent hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <h3 className={`font-medium text-sm truncate ${activeNoteId === note.id ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {note.title || 'Untitled'}
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                        {note.content.substring(0, 30) || 'Empty note...'}
                      </p>
                      <button 
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="absolute right-2 top-2 p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <div className="text-center mt-10 text-xs text-gray-400 dark:text-gray-600">
                      No notes yet
                    </div>
                  )}
               </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-black min-w-0 transition-colors">
              {activeNote ? (
                <>
                  {/* Note Meta & Actions */}
                  <div className="flex-none p-4 pb-2 flex items-center justify-between gap-4">
                    <input
                      type="text"
                      value={activeNote.title}
                      onChange={(e) => setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, title: e.target.value } : n))}
                      className="flex-1 text-lg font-bold text-gray-800 dark:text-gray-100 bg-transparent border-none focus:ring-0 placeholder-gray-300 dark:placeholder-slate-600"
                      placeholder="Note Title"
                    />
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        onClick={() => setViewMode(ViewMode.EDIT)}
                        className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                          viewMode === ViewMode.EDIT 
                          ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => setViewMode(ViewMode.PREVIEW)}
                        className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                          viewMode === ViewMode.PREVIEW 
                          ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="px-4 text-[10px] text-gray-400 dark:text-gray-500 mb-2 flex items-center justify-between">
                    <span>{formatDate(activeNote.updatedAt)}</span>
                  </div>

                  {/* Editor / Preview */}
                  <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {viewMode === ViewMode.EDIT ? (
                      <textarea
                        value={activeNote.content}
                        onChange={(e) => handleUpdateNote(e.target.value)}
                        placeholder="Start typing your markdown note here..."
                        className="w-full h-full resize-none bg-transparent outline-none leading-relaxed text-gray-700 dark:text-gray-200 font-mono placeholder-gray-300 dark:placeholder-slate-600"
                        style={{ fontSize: `${fontSize}px` }}
                        autoFocus
                      />
                    ) : (
                      <div className="h-full" style={{ fontSize: `${fontSize}px` }}>
                         <MarkdownView content={activeNote.content} />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-slate-700">
                  <FileText size={48} className="mb-4 opacity-50" />
                  <p>Select a note or create a new one</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="h-8 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between px-4 text-[10px] text-gray-400 dark:text-gray-500 bg-white/50 dark:bg-black/50">
             <span>Markdown Supported</span>
             <span>{activeNote?.content.length || 0} chars</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;