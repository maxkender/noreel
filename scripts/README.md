# scripts

## check-entitlements.py

Liste les capacites d'un identifiant de bundle via l'API App Store Connect.

    python3 scripts/check-entitlements.py

**Limite importante** : l'API publique ne connait pas le type `FAMILY_CONTROLS`
(absent de son enum, verifie : HTTP 409 avec la liste des types acceptes).
C'est une *managed capability*. Ce script ne peut donc **pas** confirmer que
l'entitlement Family Controls est actif. Font foi, dans l'ordre :

1. le mail d'Apple Developer Relations accordant l'entitlement au compte ;
2. un build EAS qui reussit avec `EXPO_PUBLIC_FAMILY_CONTROLS=1`.

Si le build echoue sur le provisioning, activer la capacite a la main :
developer.apple.com > Identifiers > l'App ID > cocher Family Controls.

## Activation manuelle des capacites (une seule fois)

`FAMILY_CONTROLS` ne s'active pas par API. EAS essaie quand meme et echoue :

    Apple API error: Unexpected or invalid value at
    'data.relationships.bundleIdCapabilities.data.[0].attributes'

`deploy-auto.sh` exporte donc `EXPO_NO_CAPABILITY_SYNC=1` pour qu'il n'essaie plus.
Les capacites doivent etre cochees a la main sur **chaque** identifiant, y compris
ceux des extensions :

- com.vikstudios.noreel
  https://developer.apple.com/account/resources/identifiers/bundleId/edit/7NL25CY98X
- com.vikstudios.noreel.ShieldConfiguration
  https://developer.apple.com/account/resources/identifiers/bundleId/edit/5KW983RBFB

Cocher sur chacun : **Family Controls** et **App Groups**
(groupe `group.com.vikstudios.noreel`). D'autres identifiants d'extension
apparaitront au build suivant : meme traitement.
