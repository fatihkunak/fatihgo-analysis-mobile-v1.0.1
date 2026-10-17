# Nichevo görevlerini kaydeder (açılışta, pencere yok, S4U = oturum açmadan çalışır). Yönetici yetkisi gerekmez.
# Gramiq'teki GramiqApi + GramiqApiTunnel ile aynı düzen.
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbs = Join-Path $dir 'run-hidden.vbs'
$tasks = @(
  @{ Name = 'NichevoApi';       Cmd = Join-Path $dir 'start-backend.cmd' },
  @{ Name = 'NichevoApiTunnel'; Cmd = Join-Path $dir 'start-tunnel.cmd' }
)
foreach ($t in $tasks) {
  $action    = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "-nologo `"$vbs`" `"$($t.Cmd)`""
  $trigger   = New-ScheduledTaskTrigger -AtStartup
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Limited
  $settings  = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  Register-ScheduledTask -TaskName $t.Name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
  Write-Output "kayitli: $($t.Name)"
}
