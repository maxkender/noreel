# FamilyControls — blocage natif : etat et diagnostic

## Etat

Le code est complet et derriere un drapeau. `EXPO_PUBLIC_FAMILY_CONTROLS=1`
active le plugin ; sans lui l'app se construit et se deploie normalement.

- `src/services/shield.real.ts` — API verifiee dans les `.d.ts` du paquet
- `src/features/onboarding/screens/Permissions.tsx` — 4 etats
- Page Blocage (onglet) — Temps d'ecran + redirection, inertes tant que le
  drapeau est off
- `targets/` — les 3 extensions generees par react-native-device-activity

## Ce qui bloque

7 builds EAS, tous en echec au meme endroit, avec la meme signature :

```
Preparing credentials for target 'ActivityMonitorExtension'   OK
Preparing credentials for target 'NoReel'                     OK
Preparing credentials for target 'ShieldAction'               OK
Preparing credentials for target 'ShieldConfiguration'        OK
...
Start phase: CONFIGURE_XCODE_PROJECT
Assigning provisioning profile '...ActivityMonitorExtension...' to target 'ActivityMonitorExtension'
End phase: CONFIGURE_XCODE_PROJECT
Build failed
```

Un seul profil sur quatre est assigne, puis la phase se termine sans erreur.
Aucun message, aucun fichier de log cote Expo (`error` et `logFiles` vides).

## Causes eliminees

| Hypothese | Verification | Verdict |
|---|---|---|
| Entitlement non accorde | mail Apple + API : FAMILY_CONTROLS et FAMILY_CONTROLS_DISTRIBUTION presents sur les 4 identifiants | ecartee |
| Capacites non activees | API : APP_GROUPS + FAMILY_CONTROLS sur les 4 | ecartee |
| Profils invalides | API : les 4 profils `ACTIVE`, regeneres par EAS a chaque build | ecartee |
| `ios.appleTeamId` manquant | corrige ; l'avertissement de @bacons/apple-targets a disparu du prebuild | ecartee |
| Sync des capacites | `EXPO_NO_CAPABILITY_SYNC=1` (Apple refuse FAMILY_CONTROLS en POST : HTTP 409) | ecartee |
| Cle API rejetee | testee a la main contre l'API Apple : HTTP 200 | ecartee |
| Groupe d'apps absent | cree et rattache ; les credentials des 4 cibles passent | ecartee |
| Projet Xcode incoherent | `expo prebuild` local : 4 cibles, 4 bundle ids correspondants, entitlements corrects | ecartee |
| Trop de modules natifs | Skia et masked-view retires | sans effet |

## Ce qui reste a essayer

1. **Build local avec Xcode.** C'est la seule facon d'obtenir la vraie erreur
   de la phase de configuration. Xcode n'est pas installe sur cette machine.
2. **Ticket Expo** avec les ids de build ci-dessous : la phase se termine sans
   lever d'erreur, ce qui ressemble a un defaut de leur cote sur les projets
   multi-cibles.

Builds concernes : `a4b928d9-1394-48da-b736-d3176f14c3f8`,
`7cebb311-763e-473a-ba0a-fe7dddea5a53`, `6aae1581-7cbc-49b3-94a2-ada605eac4cd`.

Logs lisibles : `./scripts/build-logs.sh <build-id>` (brotli + JSON par ligne).
