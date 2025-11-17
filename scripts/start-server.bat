@echo off
setlocal enabledelayedexpansion

:: Colors (using ANSI escape codes where supported)
set "GREEN=[32m"
set "YELLOW=[33m"
set "RED=[31m"
set "NC=[0m"

:: Configuration
set SERVER_PORT=4001
set CLIENT_PORT=4002
set MAX_RETRIES=3
set RETRY_DELAY=2

echo %GREEN%🚀 Iniciando sistema de gerenciamento de clínica...%NC%

:: Function to check if port is in use (Windows version)
:check_port
set "port=%~1"
netstat -ano | findstr ":!port! " | findstr "LISTENING" >nul
if !errorlevel! equ 0 (
    exit /b 0
) else (
    exit /b 1
)

:: Function to kill process on port (Windows version)
:kill_port
set "port=%~1"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":!port! " ^| findstr "LISTENING"') do (
    set "pid=%%a"
    if not "!pid!"=="" (
        echo %YELLOW%🔒 Porta !port! em uso. Encerrando processo...%NC%
        taskkill /F /PID !pid! >nul 2>&1
        if !errorlevel! equ 0 (
            echo %GREEN%✅ Processo !pid! encerrado na porta !port!%NC%
        ) else (
            echo %RED%❌ Falha ao encerrar processo !pid! na porta !port!%NC%
        )
    )
)
timeout /t 1 /nobreak >nul
exit /b 0

:: Function to wait for port to be free
:wait_for_port
set "port=%~1"
set "retries=0"

:wait_loop
call :check_port !port!
if !errorlevel! equ 0 (
    if !retries! lss %MAX_RETRIES% (
        echo %YELLOW%⏳ Aguardando porta !port! ficar livre...%NC%
        timeout /t %RETRY_DELAY% /nobreak >nul
        set /a retries+=1
        goto wait_loop
    ) else (
        echo %RED%❌ Porta !port! ainda em uso após %MAX_RETRIES% tentativas%NC%
        exit /b 1
    )
)
exit /b 0

:: Main execution
echo %GREEN%📋 Verificando portas...%NC%

:: Check and kill ports if in use
for %%p in (%SERVER_PORT% %CLIENT_PORT%) do (
    call :check_port %%p
    if !errorlevel! equ 0 (
        call :kill_port %%p
        call :wait_for_port %%p
        if !errorlevel! neq 0 (
            echo %RED%❌ Não foi possível liberar a porta %%p%NC%
            pause
            exit /b 1
        )
    )
)

echo %GREEN%✅ Portas verificadas e liberadas!%NC%

:: Verify Prisma is ready
echo %GREEN%🔍 Verificando banco de dados...%NC%
if not exist "prisma\schema.prisma" (
    echo %RED%❌ Arquivo prisma\schema.prisma não encontrado%NC%
    pause
    exit /b 1
)

:: Generate Prisma client if needed
if not exist "node_modules\.prisma" (
    echo %YELLOW%📦 Gerando cliente Prisma...%NC%
    call npx prisma generate
)

:: Check if database exists and run migrations if needed
if not exist "prisma\dev.db" (
    echo %YELLOW%💾 Banco de dados não encontrado. Criando...%NC%
    call npx prisma migrate deploy
)

echo %GREEN%✅ Banco de dados verificado!%NC%

:: Start the system
echo %GREEN%🎯 Iniciando servidor e cliente...%NC%
echo %GREEN%📡 Servidor: http://localhost:%SERVER_PORT%%NC%
echo %GREEN%🌐 Cliente: http://localhost:%CLIENT_PORT%%NC%
echo %YELLOW%⏱️  Isso pode levar alguns segundos...%NC%
echo.

:: Use npm run dev to start both client and server
call npm run dev

pause