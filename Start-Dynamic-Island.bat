@echo off
cd /d "%~dp0"
if not exist "C:\Program Files\nodejs\node.exe" (
  node electron\launch.cjs
) else (
  "C:\Program Files\nodejs\node.exe" electron\launch.cjs
)
