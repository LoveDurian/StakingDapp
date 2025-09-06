#!/bin/bash

echo "🔄 Updating project dependencies after removing MORALIS..."

echo "📦 Installing frontend dependencies..."
cd frontend
npm install
echo "✅ Frontend dependencies updated"

echo "📦 Installing backend dependencies..."
cd ../backend
npm install
echo "✅ Backend dependencies updated"

echo "🎉 All dependencies updated successfully!"
echo ""
echo "📝 Note: MORALIS has been removed from the project."
echo "   - Wallet balance is now queried directly from the blockchain"
echo "   - No API keys or external services required"
echo "   - The project is now more lightweight and self-contained"
