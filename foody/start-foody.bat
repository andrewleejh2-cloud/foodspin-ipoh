@echo off 
title Foody (Beta) 
cd /d "%%~dp0" 
where node >nul 2>nul 
if errorlevel 1 (echo [Foody] Node.js not found. & pause & exit /b 1) 
if not exist node_modules (echo [Foody] Installing... & call npm install) 
start "" /b cmd /c "timeout /t 2 >nul && start "" http://localhost:3000" 
node server.js 
pause 
