# Load environment variables from .env file
Get-Content ..\.env | foreach {
    $name, $value = $_.split('=', 2)
    if ($name -and $value) {
        Set-Item -Path "env:$name" -Value $value
    }
}

# Set the recipient address (beneficiary from Cardano) - corrected to proper length
$env:RECIPIENT_ADDRESS="0xe185a249e622274f3ad1538229a9c579a9e8fc42"

Write-Host "🚀 ETHEREUM TIMELOCK DEPLOYMENT" -ForegroundColor Cyan
Write-Host "════════════════════════════════" -ForegroundColor Cyan
Write-Host "RPC URL: $env:SEPOLIA_RPC_URL"
Write-Host "Recipient: $env:RECIPIENT_ADDRESS"
Write-Host "Private Key: $($env:ETH_PRIVATE_KEY.Substring(0,10))..."
Write-Host "Secret: $env:SECRET"
Write-Host ""

# Deploy the timelock contract
Write-Host "📤 Deploying timelock contract..." -ForegroundColor Yellow
forge script script/TimelockDeploy.sol:TimelockDeploy `
  --rpc-url $env:SEPOLIA_RPC_URL `
  --private-key $env:ETH_PRIVATE_KEY `
  --broadcast `
  -v

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Check the contract on Sepolia Etherscan"
Write-Host "   2. Use TimelockWithdraw script to unlock with secret"
Write-Host "   3. Proceed with Cardano unlock using the same secret"
