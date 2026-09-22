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

# export EXPO_ASC_API_KEY_PATH="${EXPO_ASC_API_KEY_PATH:-$HOME/Downloads/AuthKey_A7476T2W55.p8}"
# export EXPO_ASC_KEY_ID="${EXPO_ASC_KEY_ID:-A7476T2W55}"
# export EXPO_ASC_ISSUER_ID="${EXPO_ASC_ISSUER_ID:-3ecb59f2-287c-494e-b451-a288cb57158d}"
# Le Team ID Apple (10 caracteres) n a RIEN a voir avec l Issuer ID (UUID).
# Sans lui, eas-cli le demande, echoue en 401 et retombe sur le mot de passe.
# Team ID laisse vide : eas-cli proposera la liste de tes equipes apres login.
# Valeurs acceptees : IN_HOUSE | COMPANY_OR_ORGANIZATION | INDIVIDUAL

export EAS_BUILD_NO_EXPO_GO_WARNING=true




echo "==> Build iOS sur les serveurs Expo"
echo "    Connexion par Apple ID : mot de passe + code 2FA demandes."
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
