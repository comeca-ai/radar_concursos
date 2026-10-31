# Motor ICP

`scripts/motor.py` — pergunta natural + UF → licitações públicas ranqueadas (nunca concurso de provas; modalidade 3 é excluída).

1. Expande a pergunta em termos técnicos de edital (grupos: TI, software, IA, nuvem, provas digitais).
2. Carrega bases locais: `data/jp`, `data/cg` (PB), `data/pe` (PE, Recife).
3. Casa termos no `objeto` (sem acento, palavra inteira). Score: frase = 2, palavra = 1, pergunta literal = +3. Desempate por valor estimado.

```
python3 scripts/motor.py "provas digitais" --uf PB
python3 scripts/motor.py "sistema com IA" --uf PE --modalidade pregão -n 5
python3 scripts/motor.py "hospedagem" --kw "data center" --json
```
Uso como lib: `from motor import buscar; termos, res = buscar("software", uf="PB")`.
