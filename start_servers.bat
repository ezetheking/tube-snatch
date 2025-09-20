@echo off
echo ========================================
echo    Uncle Hyde's Legacy - YouTube Downloader
echo ========================================
echo.

echo [1/4] Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)
echo ✓ Python dependencies installed
echo.

echo [2/4] Starting Python backend server...
start "Backend Server - Uncle Hyde's Legacy" cmd /k "python youtube_api_server.py"
echo ✓ Backend server starting on http://localhost:5000
echo.

echo [3/4] Installing Node.js dependencies...
cd youtube-downloader-frontend
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)
echo ✓ Node.js dependencies installed
echo.

echo [4/4] Starting Next.js frontend...
start "Frontend - Uncle Hyde's Legacy" cmd /k "npm run dev"
echo ✓ Frontend starting on http://localhost:3000
echo.

echo ========================================
echo    🎉 Uncle Hyde's Legacy is starting!
echo ========================================
echo.
echo 🌐 Open your browser to: http://localhost:3000
echo 🎬 Test channel: https://www.youtube.com/@kingLéoofficiel-e1c
echo.
echo Press any key to close this window...
pause
