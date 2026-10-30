# Aprendizados sobre fontes de licitação (PB)

- **PNCP só tem o que vem pela Lei 14.133**, enviado por plataforma credenciada (Manual de Integração PNCP v2.6). Compras sob 8.666 e afins ficam fora. Publicar no PNCP não dispensa a publicação no Diário Oficial.
- **DOE-JP é necessário**: as inexigibilidades da Funjope (ex.: 60.550–60.560, edição 1121, de 21/10/2026) não apareceram no PNCP. DOE-JP: API WordPress `/wp-json/wp/v2/doe-jp` + PDF por edição.
- **Portais próprios dos órgãos contam**: o TJPB (CNPJ `09283185000163`) publica no PNCP (as dispensas trazem o Id PNCP). Use o PNCP filtrado por CNPJ como fonte principal e o portal do TJPB (https://www.tjpb.jus.br/transparencia/licitacoes/consulta) para cruzar os dados.
- **CNPJ da Prefeitura de João Pessoa**: `08778326000156` (IBGE 2507507). No filtro do município, a maior parte do volume vem de outros órgãos.
- **CNPJ da Prefeitura de Campina Grande**: `08993917000146` (IBGE 2504009). Presença forte no PNCP, sempre pela 14.133.
- O Portal da Transparência de JP serve para cruzamento, não como fonte primária: é uma SPA atrás do Imperva, o que torna a coleta instável.
- Identificar a Prefeitura num item do PNCP: os 14 primeiros dígitos do `numeroControlePNCP` são o CNPJ do órgão.
