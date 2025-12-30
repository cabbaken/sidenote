import { app, BrowserWindow, shell, ipcMain, screen } from 'electron';
import path from 'path';

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

function startEdgePoll() {
  pollInterval = setInterval(() => {
    if (!mainWindow) return;

    const cursor = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursor);
    const winBounds = mainWindow.getBounds();
    const workArea = currentDisplay.workArea;

    // Check edges
    const isDockedLeft = Math.abs(winBounds.x - workArea.x) < EDGE_THRESHOLD;
    const isDockedRight = Math.abs((winBounds.x + winBounds.width) - (workArea.x + workArea.width)) < EDGE_THRESHOLD;
    
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
