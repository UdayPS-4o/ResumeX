@echo off
setlocal

:: Change to the directory of the batch file to ensure correct paths
cd /d "%~dp0"

:: Check if Node is installed
node -v >nul 2>&1
if %errorlevel% equ 0 (
    echo Node.js is already installed.
    goto :RunApp
)

echo Node.js is not installed. We need to install it.
echo Checking for Administrator privileges...

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Administrator privileges are required to install Node.js via Chocolatey.
    echo Requesting administrative privileges...
    goto :UACPrompt
) else (
    goto :InstallNode
)

:UACPrompt
    :: Create a VBScript to elevate privileges and rerun this script
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0""", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    :: Exit the current non-admin process
    exit /B

:InstallNode
    echo Running with Administrator privileges.
    
    :: Check if Chocolatey is installed
    choco -v >nul 2>&1
    if %errorlevel% neq 0 (
        echo Chocolatey is not installed. Installing Chocolatey...
        @"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" && SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"
    ) else (
        echo Chocolatey is already installed.
    )

    echo Installing Node.js via Chocolatey...
    choco install nodejs -y

    :: Add node to PATH for current session
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=%PATH%;C:\Program Files\nodejs"
    )

:RunApp
    :: backend\.env is created automatically on first boot: backend\src\env.js
    :: scaffolds it from .env.example and generates AUTH_SECRET / ENCRYPTION_KEY,
    :: so no manual copy is needed here.

    echo Starting the application...
    :: Use node if available in PATH, else use explicit path
    node -v >nul 2>&1
    if %errorlevel% neq 0 (
        if exist "C:\Program Files\nodejs\node.exe" (
            "C:\Program Files\nodejs\node.exe" start.mjs
        ) else (
            echo Failed to find Node.js executable. Please restart your terminal and run start.bat again.
            pause
            exit /B 1
        )
    ) else (
        node start.mjs
    )

pause
