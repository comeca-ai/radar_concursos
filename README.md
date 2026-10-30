# radar_concursos

Radar de licitações públicas — **MVP: Paraíba (PB) e Pernambuco (PE)**.

Acompanha oportunidades de **prefeitura, governo estadual e órgãos federais** que atuam nesses estados, guiado por **ICP** (o que a sua empresa realmente disputa).

> Não é assessoria jurídica. Organiza e traduz informações públicas.

## Escopo do MVP

| Inclui | Não inclui (ainda) |
|---|---|
| PB + PE | Demais UFs do Nordeste |
| PNCP (fonte principal) | Gerar proposta / preço |
| Esferas: municipal, estadual, federal | Parecer jurídico automático |
| Alertas por ICP | Bater preço sozinho |

## ICP (perfil)

Filtros que o usuário configura: CNAEs / palavras do objeto, faixa de valor, modalidades (ex.: pregão), esferas, municípios prioritários, palavras bloqueadas.

## Arquitetura

Ver [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Fontes (MVP)

1. **PNCP** — API pública de consulta (`https://pncp.gov.br/api/consulta`), filtro `uf=PB` / `uf=PE`
2. Portais estaduais/municipais (complemento, quando o órgão ainda não publica tudo no PNCP) — fila secundária

## Status

Repositório criado em 2026-10-29. Próximo: coletor PNCP + modelo `oportunidade` + alertas.
