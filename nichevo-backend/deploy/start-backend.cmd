@echo off
REM Nichevo hesap sunucusu (ev PC'si). Yalnız 127.0.0.1:3102. Uzun süreli (bloklar).
REM Açılışta Docker/Postgres henüz hazır değilse sunucu düşer; 15 sn bekleyip yeniden dener.
REM Durdurmak için: deploy\stop.flag dosyası oluştur, sonra 3102 portunun sahibi süreci durdur (bkz. README).
cd /d "C:\Users\Fatih\Desktop\fatihgo\fatihgo-mobile-fixed\nichevo-backend"
if not exist logs mkdir logs
:loop
if exist deploy\stop.flag exit /b 0
"C:\Program Files\nodejs\node.exe" node_modules\tsx\dist\cli.mjs --env-file=.env src\server.ts >> logs\backend.log 2>&1
ping -n 16 127.0.0.1 >nul
goto loop
