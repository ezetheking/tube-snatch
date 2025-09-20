@echo off
echo ========================================
echo    🔥 Uncle Hyde's Legacy - Red Edition
echo ========================================
echo.

echo [1/2] Starting Python Backend with Enhanced Logging...
start "Uncle Hyde Backend" cmd /k "cd /d C:\Users\Admin\Desktop\yt && python youtube_api_server.py"
timeout /t 3 /nobreak > nul
echo ✅ Backend starting on http://127.0.0.1:5000
echo.

echo [2/2] Starting Next.js Frontend with Red Dark Theme...
start "Uncle Hyde Frontend" cmd /k "cd /d C:\Users\Admin\Desktop\yt\youtube-downloader-frontend && npm run dev"
timeout /t 3 /nobreak > nul
echo ✅ Frontend starting on http://localhost:3000
echo.

echo ========================================
echo    🎉 Uncle Hyde's Legacy is READY!
echo ========================================
echo.
echo 🌐 Opening browser...
timeout /t 5 /nobreak > nul
start http://localhost:3000
echo.
echo 🎬 Test Channel: https://www.youtube.com/@kingLéoofficiel-e1c
echo 📊 Check the backend terminal for detailed logs
echo.
echo Press any key to close this window...
pause > nul
