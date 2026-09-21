#!/bin/bash
# Build + TestFlight, sans intervention quand c'est possible.
#
# Tente d'abord --non-interactive : ca marche des que le certificat de
# distribution et le profil existent deja cote Expo (donc a partir du 2e build).
# Bascule en interactif seulement si des identifiants manquent vraiment.
set -uo pipefail

# Cle API App Store Connect (testee : HTTP 200 contre api.appstoreconnect.apple.com).
# Tant qu'elle est valide, ni mot de passe ni 2FA ne sont demandes.
export EXPO_ASC_API_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_P8G4THGFGZ.p8"
export EXPO_ASC_KEY_ID="P8G4THGFGZ"
export EXPO_ASC_ISSUER_ID="3ecb59f2-287c-494e-b451-a288cb57158d"
export EXPO_APPLE_TEAM_ID="K792T8TQ4X"
export EXPO_APPLE_TEAM_TYPE="COMPANY_OR_ORGANIZATION"
export EAS_BUILD_NO_EXPO_GO_WARNING=true

if [ ! -f "$EXPO_ASC_API_KEY_PATH" ]; then
  echo "ERREUR : cle API introuvable a $EXPO_ASC_API_KEY_PATH"
  exit 1
fi
EAS="npx --yes eas-cli@latest"

echo "==> Tentative automatique"
if $EAS build --platform ios --profile production --non-interactive; then
  echo "==> Build auto OK"
else
  echo
  echo "==> Identifiants manquants : passage en interactif."
  echo "    Reponds oui a create/generate/set up, Ctrl-C sur revoke/delete."
  echo
  $EAS build --platform ios --profile production || exit 1
fi

echo
echo "==> Envoi TestFlight"
$EAS submit --platform ios --latest --non-interactive \
  || $EAS submit --platform ios --latest

echo
echo "==> Termine."
