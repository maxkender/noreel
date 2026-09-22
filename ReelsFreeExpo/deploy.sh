#!/bin/bash
# Build iOS dans le cloud + envoi sur TestFlight, sans Xcode et sans mot de passe.
#
# Usage :
#   export EXPO_ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#   ./deploy.sh
#
# L'Issuer ID se trouve sur https://appstoreconnect.apple.com
#   -> Users and Access -> Integrations -> App Store Connect API
#   C'est l'UUID affiché en haut de la page, au-dessus de la liste des clés.

set -euo pipefail

export EXPO_ASC_API_KEY_PATH="${EXPO_ASC_API_KEY_PATH:-$HOME/Downloads/AuthKey_A7476T2W55.p8}"
export EXPO_ASC_KEY_ID="${EXPO_ASC_KEY_ID:-A7476T2W55}"
export EXPO_ASC_ISSUER_ID="${EXPO_ASC_ISSUER_ID:-3ecb59f2-287c-494e-b451-a288cb57158d}"
# Le Team ID Apple (10 caracteres) n a RIEN a voir avec l Issuer ID (UUID).
# Sans lui, eas-cli le demande, echoue en 401 et retombe sur le mot de passe.
export EXPO_APPLE_TEAM_ID="${EXPO_APPLE_TEAM_ID:-K792T8TQ4X}"
# Valeurs acceptees : IN_HOUSE | COMPANY_OR_ORGANIZATION | INDIVIDUAL
export EXPO_APPLE_TEAM_TYPE="${EXPO_APPLE_TEAM_TYPE:-COMPANY_OR_ORGANIZATION}"
export EAS_BUILD_NO_EXPO_GO_WARNING=true

if [ ! -f "$EXPO_ASC_API_KEY_PATH" ]; then
  echo "ERREUR : clé API introuvable : $EXPO_ASC_API_KEY_PATH"
  exit 1
fi

if [ -z "${EXPO_APPLE_TEAM_ID:-}" ]; then
  echo "ERREUR : EXPO_APPLE_TEAM_ID non defini (10 caracteres, PAS l Issuer ID)."
  echo "Il se trouve sur developer.apple.com/account > Membership details."
  exit 1
fi

if [ -z "${EXPO_ASC_ISSUER_ID:-}" ]; then
  echo "ERREUR : EXPO_ASC_ISSUER_ID non defini."
  echo "Il se trouve sur appstoreconnect.apple.com > Users and Access"
  echo "  > Integrations > App Store Connect API (UUID en haut de page)."
  exit 1
fi

echo "==> Build iOS sur les serveurs Expo"
echo "    Authentification par cle API : aucun mot de passe ne sera demande."
echo "    Repondre OUI a la creation du certificat de distribution."
echo "    /!\\ Si eas propose de REVOQUER un certificat existant, repondre NON"
echo "        (cela casserait les builds de tes autres apps)."
echo
npx --yes eas-cli@latest build \
  --platform ios \
  --profile production

echo
echo "==> Envoi sur TestFlight"
npx --yes eas-cli@latest submit \
  --platform ios \
  --latest \
  --non-interactive

echo
echo "==> Terminé. La build apparaît dans TestFlight après 5-15 min de traitement Apple."
