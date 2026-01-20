# Fix Prisma Client Generation
# This script stops all Node processes, removes Prisma cache, and regenerates Prisma Client

Write-Host "🛑 Stopping Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "🧹 Removing Prisma cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue
    Write-Host "✅ Prisma cache removed" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No Prisma cache found" -ForegroundColor Cyan
}

Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma Client generated successfully!" -ForegroundColor Green
    Write-Host "🌱 You can now run: npm run seed" -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    Write-Host "💡 Try:" -ForegroundColor Yellow
    Write-Host "   1. Close all terminals and IDEs" -ForegroundColor Yellow
    Write-Host "   2. Restart your computer" -ForegroundColor Yellow
    Write-Host "   3. Run this script again" -ForegroundColor Yellow
}



