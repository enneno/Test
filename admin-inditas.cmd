@echo off
title Lumi Nails admin inditas
cd /d "%~dp0"

set "PORT=8000"
set "ADMIN_URL=http://127.0.0.1:%PORT%/admin/"
set "BUNDLED_PY=C:\Users\llevi\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

echo Lumi Nails helyi admin inditasa
echo.
echo Mappa: %CD%
echo Admin: %ADMIN_URL%
echo.
echo Ezt az ablakot hagyd nyitva, amig hasznalod az admint.
echo Leallitas: Ctrl + C, majd Y.
echo.

start "" "%ADMIN_URL%"

where python >nul 2>nul
if not errorlevel 1 (
    python -m http.server %PORT% --bind 127.0.0.1
    goto :vege
)

where py >nul 2>nul
if not errorlevel 1 (
    py -m http.server %PORT% --bind 127.0.0.1
    goto :vege
)

if exist "%BUNDLED_PY%" (
    "%BUNDLED_PY%" -m http.server %PORT% --bind 127.0.0.1
    goto :vege
)

echo Nem talaltam Python telepitest.
echo Telepitsd a Pythont, vagy szolj es csinalunk masik inditasi modot.
pause
exit /b 1

:vege
pause
