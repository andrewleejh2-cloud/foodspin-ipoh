@echo off
chcp 65001 >nul
title Foody - 临时分享到互联网
echo.
echo   把这台电脑上的 Foody 临时分享到互联网（免费）
echo   ============================================
echo   前提：先双击 start-foody.bat 把服务器跑起来（端口 3000）
echo.
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo   [!] 还没安装 cloudflared
  echo.
  echo   请先打开 PowerShell 运行这一行安装：
  echo       winget install --id Cloudflare.cloudflared
  echo.
  echo   装好后再双击本文件。
  echo.
  pause
  exit /b
)
echo   正在生成公开网址……
echo   稍等几秒，把下面出现的 https://xxxx.trycloudflare.com 发给朋友即可。
echo   朋友用手机数据 / 任何网络都能打开。关掉此窗口 = 停止分享。
echo   --------------------------------------------
echo.
cloudflared tunnel --url http://localhost:3000
pause
