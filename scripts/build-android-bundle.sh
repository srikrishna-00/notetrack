#!/usr/bin/env bash
# scripts/build-android-bundle.sh
# Build signed Android App Bundle (.aab) for Google Play Store upload
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "=========================================================="
echo "📦 NoteTrack: Android App Bundle (.aab) Builder"
echo "Package ID: com.notetrack.app"
echo "=========================================================="

echo ""
echo "[1/3] Syncing web assets to Android platform..."
npx cap sync android
echo "✓ Web assets successfully synced to android/app/src/main/assets/public"

echo ""
echo "[2/3] Checking Java Runtime..."
if command -v java >/dev/null 2>&1 && java -version >/dev/null 2>&1; then
  echo "✓ Java runtime detected: $(java -version 2>&1 | head -n 1)"
  echo ""
  echo "[3/3] Compiling Android App Bundle via Gradle..."
  cd android
  chmod +x gradlew
  ./gradlew bundleRelease
  cd ..
  echo ""
  echo "=========================================================="
  echo "🎉 SUCCESS: Android App Bundle generated!"
  echo "File: android/app/build/outputs/bundle/release/app-release.aab"
  echo "Upload this file directly to Google Play Console!"
  echo "=========================================================="
else
  echo "⚠ Note: Java runtime is not installed directly in your terminal environment."
  echo ""
  echo "You have two super easy options to generate the Play Store .aab bundle:"
  echo ""
  echo "OPTION A (Recommended - Android Studio GUI):"
  echo "  1. Run: npx cap open android"
  echo "  2. In Android Studio, wait for Gradle sync to complete."
  echo "  3. Go to menu: Build > Generate Signed Bundle / APK..."
  echo "  4. Choose 'Android App Bundle' -> Click Next."
  echo "  5. Select or create your upload keystore -> Click Next."
  echo "  6. Select 'release' -> Click Create!"
  echo "  7. Output .aab file will be located at: android/app/release/app-release.aab"
  echo ""
  echo "OPTION B (Automated GitHub Actions CI):"
  echo "  Push your code to GitHub with the provided .github/workflows/android-playstore.yml."
  echo "  GitHub Actions will build and sign the .aab automatically in 2 minutes!"
  echo ""
fi
