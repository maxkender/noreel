# scripts

## check-entitlements.py

Liste les capacites d'un identifiant de bundle via l'API App Store Connect.

    python3 scripts/check-entitlements.py

**Limite exacte** : l'API publique sait **lire** `FAMILY_CONTROLS` mais refuse
de l'**ecrire** (HTTP 409, absent de l'enum accepte en POST). C'est une
*managed capability* : elle ne s'active que dans le portail web. Le script est
donc fiable en lecture — s'il affiche `FAMILY_CONTROLS`, c'est qu'elle est bien
active sur cet identifiant.

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


## Quand les capacites changent

Apple passe automatiquement tous les profils de provisioning de l'identifiant
a l'etat `INVALID` des qu'on modifie ses capacites. C'est normal : il faut les
regenerer. EAS le detecte et les refait au build suivant. Si ce n'est pas le
cas, les supprimer dans le portail (Certificates > Profiles) force la
regeneration.
