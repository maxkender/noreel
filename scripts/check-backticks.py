"""Refuse un backtick dans un commentaire du prelude ou d'un bloqueur.

Les scripts injectes vivent dans des litteraux de gabarit. Un backtick ecrit
dans un commentaire francais — pour citer un nom de propriete, par exemple —
ferme le litteral, et le fichier cesse de compiler pour une raison qui ne
saute pas aux yeux. C'est arrive quatre fois.

`tsc` l'attrape, mais seulement apres coup ; ceci le dit tout de suite, et
nomme la ligne.
"""
import io, re, sys

src = io.open('src/features/client/blockers.ts', encoding='utf-8').read()
bad = []
for n, line in enumerate(src.split('\n'), 1):
    st = line.strip()
    if not (st.startswith('*') or st.startswith('//') or st.startswith('/*')):
        continue
    if '`' in line:
        bad.append((n, st[:80]))
if bad:
    print('Backtick dans un commentaire — il fermerait le litteral de gabarit :')
    for n, t in bad:
        print('  ligne %d : %s' % (n, t))
    sys.exit(1)
print('aucun backtick dans un commentaire')


def cles_en_dur() -> int:
    """
    Une CLE passee a t() au lieu du texte.

    `t` interpole une chaine ; recevoir « s6.progress » lui donne un texte sans
    trou a remplir, qu'il rend tel quel. La cle s'affichait donc en toutes
    lettres au milieu d'un ecran, et ni le typage ni les tests ne s'en
    apercevaient : c'est une chaine valide, et l'ecran se monte tres bien.
    """
    import pathlib
    import re
    faute = re.compile(r"\bt\(\s*'[a-z][a-zA-Z0-9]*\.[a-zA-Z0-9]")
    mauvais = []
    for f in pathlib.Path('src').rglob('*.ts*'):
        for n, ligne in enumerate(f.read_text().splitlines(), 1):
            if faute.search(ligne):
                mauvais.append(f'{f}:{n}  {ligne.strip()}')
    for m in mauvais:
        print('cle passee a t() au lieu du texte :', m)
    return len(mauvais)


if cles_en_dur():
    raise SystemExit(1)
print('aucune cle de traduction passee en dur')
