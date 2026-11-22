# Fists of Doom: Toronto installer for Windows PC (PowerShell)
#   irm https://raw.githubusercontent.com/wacunn/toronto-fight-game/main/install.ps1 | iex
# Safe to run again: updates the game while keeping your local data.

$ErrorActionPreference = "Stop"
$Repo   = if ($env:FOD_REPO)   { $env:FOD_REPO }   else { "wacunn/toronto-fight-game" }
$Branch = if ($env:FOD_BRANCH) { $env:FOD_BRANCH } else { "main" }
$Dir    = if ($env:FOD_DIR)    { $env:FOD_DIR }    else { Join-Path $HOME "FistsOfDoom" }

Write-Host "`nInstalling Fists of Doom: Toronto into $Dir..." -ForegroundColor Cyan

# 1) Install uv (brings Python 3.12 automatically—no manual Python install needed)
$Uv = Get-Command uv -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $Uv) {
    $Candidate = Join-Path $HOME ".local\bin\uv.exe"
    if (Test-Path $Candidate) { $Uv = $Candidate }
}
if (-not $Uv) {
    Write-Host "Step 1 of 4: Installing uv (automatic Python manager)..." -ForegroundColor White
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex" | Out-Null
    $Uv = Join-Path $HOME ".local\bin\uv.exe"
    if (-not (Test-Path $Uv)) { $Uv = "uv" }
} else {
    Write-Host "Step 1 of 4: uv already installed." -ForegroundColor White
}

# 2) Download Fists of Doom (preserving data/ and .env if updating)
Write-Host "Step 2 of 4: Downloading Fists of Doom..." -ForegroundColor White
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Dir "data") | Out-Null
$Tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("fod_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $Tmp | Out-Null
$Zip = Join-Path $Tmp "repo.zip"
Invoke-WebRequest -Uri "https://codeload.github.com/$Repo/zip/refs/heads/$Branch" -OutFile $Zip
Expand-Archive -Path $Zip -DestinationPath $Tmp -Force
$Src = Get-ChildItem -Path $Tmp -Directory | Select-Object -First 1

$Keep = @("data", ".env", ".venv", "logs", ".git")
Get-ChildItem -Path $Src.FullName -Force | ForEach-Object {
    if ($Keep -contains $_.Name) { return }
    $Dest = Join-Path $Dir $_.Name
    if (Test-Path $Dest) { Remove-Item -Path $Dest -Recurse -Force }
    Copy-Item -Path $_.FullName -Destination $Dest -Recurse -Force
}
Remove-Item -Path $Tmp -Recurse -Force

# 3) Create Python 3.12 environment and install packages
Write-Host "Step 3 of 4: Setting up Python (takes under a minute the first time)..." -ForegroundColor White
$VenvPy = Join-Path $Dir ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPy)) {
    & $Uv venv --python 3.12 (Join-Path $Dir ".venv") -q
}
& $Uv pip install --python $VenvPy -q -r (Join-Path $Dir "requirements.txt")

# 4) Create Desktop & Start Menu shortcuts
Write-Host "Step 4 of 4: Adding the Fists of Doom shortcut..." -ForegroundColor White
if (-not $env:FOD_NO_SHORTCUT) {
    $Wsh = New-Object -ComObject WScript.Shell
    $IconFile = Join-Path $Dir "static\icon.ico"
    $Locations = @(
        [Environment]::GetFolderPath("Desktop"),
        (Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs")
    )
    foreach ($Loc in $Locations) {
        if ($Loc -and (Test-Path $Loc)) {
            $Lnk = $Wsh.CreateShortcut((Join-Path $Loc "Fists of Doom.lnk"))
            $Lnk.TargetPath = Join-Path $Dir ".venv\Scripts\pythonw.exe"
            $Lnk.Arguments = "`"" + (Join-Path $Dir "launch.py") + "`""
            $Lnk.WorkingDirectory = $Dir
            $Lnk.Description = "Fists of Doom: Toronto"
            if (Test-Path $IconFile) { $Lnk.IconLocation = $IconFile }
            $Lnk.Save()
        }
    }
}

Write-Host "`nDone! Opening Fists of Doom now. Next time, double-click 'Fists of Doom' on your Desktop." -ForegroundColor Green
if (-not $env:FOD_NO_LAUNCH) {
    Start-Process -FilePath (Join-Path $Dir ".venv\Scripts\pythonw.exe") -ArgumentList "`"$(Join-Path $Dir 'launch.py')`"" -WorkingDirectory $Dir
}
