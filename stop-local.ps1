$ErrorActionPreference = "Continue"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $ProjectRoot ".runtime"

function Stop-FromPidFile($Name) {
  $PidFile = Join-Path $RuntimeDir "$Name.pid"
  if (!(Test-Path $PidFile)) {
    Write-Host "$Name 没有 PID 文件，跳过。"
    return
  }

  $ProcessId = (Get-Content $PidFile -Raw).Trim()
  if (!$ProcessId) { return }

  $Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($Process) {
    Stop-Process -Id $ProcessId -Force
    Write-Host "已停止 $Name，PID: $ProcessId"
  } else {
    Write-Host "$Name 不在运行，PID: $ProcessId"
  }

  Remove-Item $PidFile -ErrorAction SilentlyContinue
}

Stop-FromPidFile "cloudflared"
Stop-FromPidFile "agent"

Write-Host ""
Write-Host "已处理完成。"
