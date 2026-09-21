#!/bin/bash
# Build iOS dans le cloud + envoi TestFlight.
# La connexion Apple se fait par Apple ID + 2FA : la cle API du compte est
# rejetee par Apple (401 verifie a la main contre son API).
set -euo pipefail

export EAS_BUILD_NO_EXPO_GO_WARNING=true

echo "==> Build iOS de NoReel sur les serveurs Expo"
echo "    Connexion par Apple ID : mot de passe + code 2FA demandes."
echo "    Le certificat de distribution existe deja (cree pour ReelsFree)."
echo "    Le bundle com.nutria25.noreel est neuf : il sera enregistre."
echo "    /!\\ Si eas propose de REVOQUER un certificat, repondre NON."
echo

npx --yes eas-cli@latest build --platform ios --profile production

echo
echo "==> Envoi sur TestFlight"
npx --yes eas-cli@latest submit --platform ios --latest

echo
echo "==> Termine. La build apparait dans TestFlight apres 5-15 min."
