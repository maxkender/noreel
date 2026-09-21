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
