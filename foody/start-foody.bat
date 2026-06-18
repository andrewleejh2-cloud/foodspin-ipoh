@echo off 
title Foody (Beta) 
cd /d "%%~dp0"
rem === Moderation admins are configured in foody\server.js (DEFAULT_ADMINS) — currently your own accounts ===
rem To override here instead (avoid non-ASCII usernames in .bat), set them in server.js or via this var:
rem set FOODY_ADMIN=username1,username2
where node >nul 2>nul
if errorlevel 1 (echo [Foody] Node.js not found. & pause & exit /b 1) 
if not exist node_modules (echo [Foody] Installing... & call npm install) 
start "" /b cmd /c "timeout /t 2 >nul && start "" http://localhost:3000" 
node server.js 
pause 
