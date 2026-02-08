@echo off
setlocal EnableDelayedExpansion

echo ==========================================
echo Matcha - Subida rapida a GitHub
echo ==========================================

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git no esta instalado o no esta en PATH.
  pause
  exit /b 1
)

if "%~1"=="" (
  set /p REPO_URL=Pegue la URL de su repo GitHub: 
) else (
  set REPO_URL=%~1
)

if "!REPO_URL!"=="" (
  echo [ERROR] Debe indicar una URL.
  pause
  exit /b 1
)

if not exist ".git" (
  git init
)

git add .
git commit -m "Initial Matcha setup" >nul 2>nul

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin !REPO_URL!
) else (
  git remote set-url origin !REPO_URL!
)

git branch -M main
git push -u origin main

if errorlevel 1 (
  echo [ERROR] No se pudo hacer push. Revise credenciales/permisos.
  pause
  exit /b 1
)

echo [OK] Proyecto subido a GitHub.
pause
