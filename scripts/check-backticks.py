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
