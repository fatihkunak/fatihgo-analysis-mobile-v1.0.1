# Nichevo hesap sunucusu görevini kaydeder: açılışta, pencere yok, S4U (oturum açmadan çalışır). Yönetici yetkisi gerekmez.
# Gramiq'teki GramiqApi görevi ile aynı düzen. Docker Desktop açılışta kalkıp Postgres hazır olana kadar başlangıç betiği yeniden dener.
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbs = Join-Path $dir 'run-hidden.vbs'
$cmd = Join-Path $dir 'start-backend.cmd'
$action    = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "-nologo `"$vbs`" `"$cmd`""
$trigger   = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Limited
$settings  = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NichevoApi' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Output 'kayitli: NichevoApi (acilista baslar)'
