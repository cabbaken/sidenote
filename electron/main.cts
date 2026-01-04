import { app, BrowserWindow, shell, ipcMain, screen, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';

let mainWindow: BrowserWindow | null = null;
let pollInterval: NodeJS.Timeout | null = null;
const PEEK_WIDTH = 20;
const EDGE_THRESHOLD = 50;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Hide the menu bar by default for a cleaner look
    autoHideMenuBar: true,
    // Keep window always on top
    alwaysOnTop: true, 
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:3000');
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else {
    // 'build/index.html'
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (pollInterval) clearInterval(pollInterval);
  });

  // Start polling mechanism for edge detection
  startEdgePoll();
}

// --- IPC Handlers for File Storage ---

ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('save-notes', async (_, folderPath: string, notes: any) => {
  try {
    const filePath = path.join(folderPath, 'notes.json');
    await fs.writeFile(filePath, JSON.stringify(notes, null, 2), 'utf-8');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save notes:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-notes', async (_, folderPath: string) => {
  try {
    const filePath = path.join(folderPath, 'notes.json');
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, return empty array
      return [];
    }
    
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    console.error('Failed to load notes:', error);
    throw error;
  }
});

function startEdgePoll() {
  pollInterval = setInterval(() => {
    if (!mainWindow) return;

    const cursor = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursor);
    const winBounds = mainWindow.getBounds();
    const workArea = currentDisplay.workArea;

    // Check for neighbors to prevent hiding on internal edges
    const displays = screen.getAllDisplays();
    const cBounds = currentDisplay.bounds;

    const hasNeighborLeft = displays.some(d => {
      if (d.id === currentDisplay.id) return false;
      // Check if d is directly to the left (d.right ~= c.left)
      const isLeft = Math.abs((d.bounds.x + d.bounds.width) - cBounds.x) < 10;
      // Check vertical overlap to ensure they are actually touching
      const overlapsY = Math.max(d.bounds.y, cBounds.y) < Math.min(d.bounds.y + d.bounds.height, cBounds.y + cBounds.height);
      return isLeft && overlapsY;
    });

    const hasNeighborRight = displays.some(d => {
      if (d.id === currentDisplay.id) return false;
      // Check if d is directly to the right (d.left ~= c.right)
      const isRight = Math.abs(d.bounds.x - (cBounds.x + cBounds.width)) < 10;
      // Check vertical overlap
      const overlapsY = Math.max(d.bounds.y, cBounds.y) < Math.min(d.bounds.y + d.bounds.height, cBounds.y + cBounds.height);
      return isRight && overlapsY;
    });

    // Check edges
    // Dock left if near workArea start AND no neighbor to the left
    const isDockedLeft = Math.abs(winBounds.x - workArea.x) < EDGE_THRESHOLD && !hasNeighborLeft;
                         
    // Dock right if near workArea end AND no neighbor to the right
    const isDockedRight = Math.abs((winBounds.x + winBounds.width) - (workArea.x + workArea.width)) < EDGE_THRESHOLD && !hasNeighborRight;
    
    // Check if hidden (simple approximation based on position)
    const isHiddenLeft = winBounds.x <= (workArea.x - winBounds.width + PEEK_WIDTH);
    const isHiddenRight = winBounds.x >= (workArea.x + workArea.width - PEEK_WIDTH);

    // MOUSE LOGIC
    // Mouse near edge?
    const mouseNearLeft = cursor.x <= (workArea.x + PEEK_WIDTH) && 
                         cursor.y >= winBounds.y && cursor.y <= (winBounds.y + winBounds.height);
    const mouseNearRight = cursor.x >= (workArea.x + workArea.width - PEEK_WIDTH) && 
                          cursor.y >= winBounds.y && cursor.y <= (winBounds.y + winBounds.height);
    
    // Mouse hover window?
    const mouseInside = cursor.x >= winBounds.x && cursor.x <= (winBounds.x + winBounds.width) &&
                       cursor.y >= winBounds.y && cursor.y <= (winBounds.y + winBounds.height);

    if (isHiddenLeft) {
      if (mouseNearLeft || mouseInside) {
        // Show
        mainWindow.setBounds({ ...winBounds, x: workArea.x });
      }
    } else if (isHiddenRight) {
       if (mouseNearRight || mouseInside) {
        // Show
        mainWindow.setBounds({ ...winBounds, x: workArea.x + workArea.width - winBounds.width });
      }
    } else {
      // Normally visible, check if we should hide
      if (!mouseInside) {
        if (isDockedLeft) {
          // Hide Left
          mainWindow.setBounds({ ...winBounds, x: workArea.x - winBounds.width + PEEK_WIDTH });
        } else if (isDockedRight) {
          // Hide Right
          mainWindow.setBounds({ ...winBounds, x: workArea.x + workArea.width - PEEK_WIDTH });
        }
      }
    }

  }, 100); // Poll every 100ms
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
