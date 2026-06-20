$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $ProjectRoot ".runtime"
$EnvPath = Join-Path $ProjectRoot ".env"
$Port = "8787"

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

function Write-Section($Text) {
  Write-Host ""
  Write-Host "== $Text ==" -ForegroundColor Cyan
}

function Save-Pid($Name, $Process) {
  $Process.Id | Set-Content -Path (Join-Path $RuntimeDir "$Name.pid") -Encoding ascii
}

function Get-CloudflaredPath {
  $Candidates = @(
    (Join-Path $ProjectRoot "cloudflared.exe"),
    (Join-Path $ProjectRoot "..\..\work\cloudflared.exe")
  )

  foreach ($Candidate in $Candidates) {
    $Resolved = Resolve-Path $Candidate -ErrorAction SilentlyContinue
    if ($Resolved) { return $Resolved.Path }
  }

  $Command = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($Command) { return $Command.Source }

  $DownloadPath = Join-Path $RuntimeDir "cloudflared.exe"
  Write-Section "下载 Cloudflare Tunnel"
  Invoke-WebRequest `
    -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" `
    -OutFile $DownloadPath
  return $DownloadPath
}

function Update-PublicBaseUrl($Url) {
  if (!(Test-Path $EnvPath)) { return }

  $Text = Get-Content $EnvPath -Raw
  if ($Text -match "(?m)^PUBLIC_BASE_URL=") {
    $Text = $Text -replace "(?m)^PUBLIC_BASE_URL=.*$", "PUBLIC_BASE_URL=$Url"
  } else {
    $Text = $Text.TrimEnd() + "`r`nPUBLIC_BASE_URL=$Url`r`n"
  }
  Set-Content -Path $EnvPath -Value $Text -Encoding utf8
}

Write-Section "启动小河豚服务"
$Node = (Get-Command node -ErrorAction Stop).Source
$AgentProcess = Start-Process `
  -FilePath $Node `
  -ArgumentList @("src/index.js") `
  -WorkingDirectory $ProjectRoot `
  -WindowStyle Hidden `
  -PassThru
Save-Pid "agent" $AgentProcess
Write-Host "Agent PID: $($AgentProcess.Id)"

Start-Sleep -Seconds 2

try {
  Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" | Out-Null
  Write-Host "本地服务正常：http://127.0.0.1:$Port" -ForegroundColor Green
} catch {
  Write-Host "本地服务没有响应。可能已有旧服务占用 8787，或 Node 启动失败。" -ForegroundColor Yellow
}

Write-Section "启动 Cloudflare Tunnel"
$Cloudflared = Get-CloudflaredPath
$CloudflaredLog = Join-Path $RuntimeDir "cloudflared.log"
Remove-Item $CloudflaredLog -ErrorAction SilentlyContinue

$TunnelProcess = Start-Process `
  -FilePath $Cloudflared `
  -ArgumentList @("tunnel", "--url", "http://localhost:$Port", "--logfile", $CloudflaredLog) `
  -WorkingDirectory $ProjectRoot `
  -WindowStyle Hidden `
  -PassThru
Save-Pid "cloudflared" $TunnelProcess
Write-Host "Tunnel PID: $($TunnelProcess.Id)"

Write-Host "正在等待公网地址..."
$PublicUrl = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $CloudflaredLog) {
    $Log = Get-Content $CloudflaredLog -Raw
    $Match = [regex]::Match($Log, "https://[a-z0-9-]+\.trycloudflare\.com")
    if ($Match.Success) {
      $PublicUrl = $Match.Value
      break
    }
  }
}

if (!$PublicUrl) {
  Write-Host "没有拿到公网地址，请查看日志：$CloudflaredLog" -ForegroundColor Red
  exit 1
}

Update-PublicBaseUrl $PublicUrl

Write-Section "微信后台填写"
Write-Host "URL:   $PublicUrl/webhooks/wechat" -ForegroundColor Green
Write-Host "Token: 666" -ForegroundColor Green
Write-Host "模式:  明文模式" -ForegroundColor Green
Write-Host ""
Write-Host "这个窗口可以关闭，后台进程会继续运行。要停止时双击 stop-local.bat。"
Write-Host "注意：这是临时隧道，电脑关机/睡眠/停止后地址会变，需要重新填微信 URL。"
