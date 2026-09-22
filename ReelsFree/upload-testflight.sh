#!/bin/bash
# Archive ReelsFree et l'envoie sur TestFlight.
#
# Prérequis (une seule fois) :
#   1. Xcode installé, et : sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
#   2. Apple Developer Program actif (99 €/an)
#   3. L'app créée dans App Store Connect avec le même Bundle ID
#   4. Une clé API App Store Connect (Users and Access > Integrations > App Store Connect API)
#      -> télécharge le .p8 et place-le dans ~/.appstoreconnect/private_keys/
#   5. TEAM_ID renseigné dans ExportOptions.plist
#
# Usage :
#   export ASC_KEY_ID=XXXXXXXXXX
#   export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#   ./upload-testflight.sh

set -euo pipefail

SCHEME="ReelsFree"
PROJECT="ReelsFree.xcodeproj"
BUILD_DIR="$(pwd)/build"
ARCHIVE="$BUILD_DIR/$SCHEME.xcarchive"

if ! xcodebuild -version >/dev/null 2>&1; then
  echo "ERREUR : Xcode complet introuvable."
  echo "Installe Xcode depuis le Mac App Store, puis lance :"
  echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  exit 1
fi

if grep -q "REMPLACER_PAR_TON_TEAM_ID" ExportOptions.plist; then
  echo "ERREUR : renseigne ton Team ID dans ExportOptions.plist."
  echo "Tu le trouves sur https://developer.apple.com/account -> Membership."
  exit 1
fi

: "${ASC_KEY_ID:?ASC_KEY_ID non défini (voir l'en-tête de ce script)}"
: "${ASC_ISSUER_ID:?ASC_ISSUER_ID non défini (voir l'en-tête de ce script)}"

echo "==> Nettoyage"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "==> Archivage"
xcodebuild archive \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8"

echo "==> Export + upload vers App Store Connect"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath "$BUILD_DIR/export" \
  -allowProvisioningUpdates \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8"

echo
echo "==> Envoyé."
echo "La build apparaît dans App Store Connect > TestFlight dans 5 à 15 min"
echo "(statut 'Processing' le temps du traitement Apple)."
