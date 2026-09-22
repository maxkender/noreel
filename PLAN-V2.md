# NoReel — plan v2

Rien n'est modifie tant que tu n'as pas valide. 7 chantiers, ordonnes par
risque pour toi : ce qui bloque l'usage d'abord, le confort ensuite.

---

## 1. Sortir des apps — BLOQUANT

Tu restes enferme dans X. J'avais corrige la croix au build 19 (position
absolue qui depassait du parent) ; si ca persiste, la WebView capte les
touches et aucune correction de mise en page n'y changera rien.

**Trois sorties independantes, pour ne plus jamais dependre d'une seule :**

- **Bulle flottante deplacable** par-dessus la WebView, comme le concurrent.
  Elle vit hors du flux de la WebView, donc rien ne peut l'intercepter.
- **Glisser vers le bas** pour fermer (geste natif de la feuille modale).
- **Barre haute en verre** avec la croix, hors de la zone WebView.

Question : sur quel build es-tu ? Si c'est le 18 ou avant, la croix n'avait
pas encore ete corrigee.

---

## 2. Accueil — refonte complete

Aujourd'hui : un carrousel par pages, sans bouton d'ouverture visible, vide.

**Cible, inspiree des captures Opal :**

- **Defilement vertical**, plus de pagination. Toutes les apps visibles.
- **En-tete** : logo NoReel, score du jour, avatar/compte a droite.
- **Trois anneaux de stats** en haut (temps recupere, focus, repos) comme
  leurs cercles Sommeil / Focus / Repos.
- **Grille d'apps** : chaque app avec son logo, son temps du jour, et un
  acces direct a ses reglages.
- **Cartes d'action** : « Termine ta configuration », « Remets tes apps sur
  l'ecran d'accueil », l'idee du jour.
- **Etoiles flottantes** en fond, lentes, pour la profondeur.
- **Barre de navigation** en verre beaucoup plus pousse : flou fort, reflet
  haut, bordure lumineuse, pastille active qui glisse.

---

## 3. Brancher tous les reglages

Aujourd'hui les reglages non verrouilles sont **memorises mais sans effet**.

Pour chacun, il faut ecrire son selecteur dans `blockers.ts` et transmettre
l'etat a la page injectee :

| App | A brancher |
|---|---|
| Instagram | posts suggeres, stories, fil, messages uniquement, noir et blanc |
| TikTok | recherche, creation, messages uniquement, noir et blanc |
| X | Explorer, messages uniquement, noir et blanc |
| YouTube | accueil, commentaires, suggestions, noir et blanc |

Le noir et blanc est le plus simple et le plus spectaculaire : un filtre CSS
`grayscale(1)` sur la racine. Je commencerais par lui.

---

## 4. Onboarding — rythme et deux ecrans a refaire

- **Ouverture plus fluide**, et des ecrans en trop : je propose de fusionner
  l'ecran 2 (« les memes apps ») avec l'ecran 4 (« la solution »), et de
  supprimer l'ecran 9 si la banniere de l'accueil fait deja le travail.
- **« Voici la part de ton temps »** : grille absente et grand vide au milieu.
  A reconstruire — la grille de 100 carres centree, le pourcentage qui monte
  avec, et le chiffre en annees juste dessous. Plus d'espace mort.
- **« Ce que le doomscrolling fait a ton cerveau »** : une etape par ecran,
  la timeline reste visible sur le cote et progresse, on touche pour avancer.
- **Typographie** : passer sur la meme graisse et le meme tracking qu'Opal,
  plus serre, plus lourd sur les titres.
- **Frappe** : lisser la cadence, accelerer legerement, et enchainer sans
  a-coup entre la fin du texte et l'apparition de la suite.

---

## 5. Copywriting a reprendre

« Bloquer les apps d'origine / Pour que NoReel tienne, il faut empecher… »
est explicatif et lourd. Direction : une promesse, pas une justification.

Je te proposerai 3 formulations par ecran concerne plutot que d'imposer la
mienne.

---

## 6. Reglages et parametres

Reprendre la structure de leur ecran Parametres : sections titrees
(Compte, Personnaliser, Assistance, Integrations, Autorisations), lignes avec
icone + libelle + valeur a droite + chevron, feuille modale en verre avec
bouton de validation rond en haut a droite.

---

## 7. Parrainage

Invite 5 personnes → Pro gratuit pendant 1 an.

- Code unique par utilisateur, affiche en gros avec copier et partager
- Compteur « 2 / 5 amis inscrits »
- Ecran dedie dans l'onglet Compte

**Limite a connaitre** : sans serveur, un code de parrainage est declaratif —
on ne peut pas verifier qu'une inscription est reelle. Pour que ce soit
fiable il faudra un backend. Je peux faire l'interface complete maintenant et
la brancher plus tard, ou attendre. Dis-moi.

---

## Ordre propose

1. Sortir des apps (bloquant)
2. Accueil refondu + etoiles + verre pousse
3. Brancher les reglages
4. Onboarding : les deux ecrans casses, puis le rythme
5. Copywriting
6. Parametres
7. Parrainage

Les points 1 a 3 changent l'usage tout de suite. Les 4 a 7 sont du soin.
