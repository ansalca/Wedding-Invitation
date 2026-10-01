# Temporary helper: sets Vercel env vars from the local .env WITHOUT printing values.
# Do not commit this file.
$ErrorActionPreference = 'Stop'
$vercel = 'C:\Users\ansal\AppData\Roaming\npm\vercel.cmd'

function Get-EnvValue($key) {
  $line = (Get-Content -LiteralPath '.env' -Encoding UTF8) | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if (-not $line) { throw "Missing $key in .env" }
  return ($line -replace "^$key=", '').Trim()
}

$url = Get-EnvValue 'VITE_SUPABASE_URL'
$pub = Get-EnvValue 'VITE_SUPABASE_PUBLISHABLE_KEY'

foreach ($target in @('production', 'preview', 'development')) {
  Write-Output "== Adding VITE_SUPABASE_URL [$target] =="
  # --value suppresses the interactive prompt; --yes accepts defaults; --no-sensitive stores as config
  cmd /c "$vercel env add VITE_SUPABASE_URL $target --value `"$url`" --yes --no-sensitive"
  if ($LASTEXITCODE -ne 0) { throw 'Failed to add VITE_SUPABASE_URL' }

  Write-Output "== Adding VITE_SUPABASE_PUBLISHABLE_KEY [$target] =="
  cmd /c "$vercel env add VITE_SUPABASE_PUBLISHABLE_KEY $target --value `"$pub`" --yes --no-sensitive"
  if ($LASTEXITCODE -ne 0) { throw 'Failed to add VITE_SUPABASE_PUBLISHABLE_KEY' }
}

Write-Output 'ALL ENV VARS SET OK'