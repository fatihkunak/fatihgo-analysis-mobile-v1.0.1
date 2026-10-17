@echo off
REM Nichevo API tüneli (nichevo-api.scenefxai.app -> 127.0.0.1:3102). Ayrı tünel: sound-platform-dev'e dokunmaz.
cd /d "C:\Users\Fatih\Desktop\fatihgo\fatihgo-mobile-fixed\nichevo-backend"
if not exist logs mkdir logs
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --config "C:\Users\Fatih\.cloudflared\nichevo-api.yml" run nichevo-api >> logs\cloudflared.log 2>&1
