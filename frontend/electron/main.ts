import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const startBackend = () => {
    const isDev = process.env.NODE_ENV === 'development';
    const backendPath = isDev
        ? path.join(process.cwd(), '..', 'backend', 'release', 'sipa-backend.exe')
        : path.join(process.resourcesPath, 'backend', 'sipa-backend.exe');

    console.log('Starting backend from:', backendPath);

    backendProcess = spawn(backendPath, [], {
        cwd: path.dirname(backendPath),
        stdio: 'inherit',
    });

    if (backendProcess) {
        backendProcess.on('error', (err) => {
            console.error('Failed to start backend:', err);
        });

        backendProcess.on('exit', (code) => {
            console.log(`Backend exited with code ${code}`);
            backendProcess = null;
        });
    }
};

const stopBackend = () => {
    if (backendProcess) {
        console.log('Stopping backend...');
        backendProcess.kill();
        backendProcess = null;
    }
};

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, '../public/favicon.ico'),
    });

    setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
            mainWindow?.loadURL('http://localhost:5173');
            mainWindow?.webContents.openDevTools();
        } else {
            mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
        }
    }, 2000);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

app.whenReady().then(() => {
    startBackend();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopBackend();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopBackend();
});
