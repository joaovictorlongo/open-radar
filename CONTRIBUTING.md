# Contributing to Open Radar

Obrigado por considerar contribuir! 🎉

## Como Contribuir

### Reportando Bugs

1. Verifique se o bug já não foi reportado nas [issues](https://github.com/joaovictorlongo/open-radar/issues)
2. Use o template de **Bug Report** ao abrir uma nova issue
3. Inclua: dispositivo, versão do sistema, passos para reproduzir, comportamento esperado vs real e screenshots

### Sugerindo Funcionalidades

1. Verifique se a feature já não foi solicitada nas [issues](https://github.com/joaovictorlongo/open-radar/issues)
2. Use o template de **Feature Request** ao abrir uma nova issue
3. Descreva o problema que a feature resolve e como ela deveria funcionar

### Pull Requests

1. **Crie uma branch** a partir da `main` com nome descritivo:
   - `feat/` — nova funcionalidade
   - `fix/` — correção de bug
   - `docs/` — documentação
   - `refactor/` — refatoração
2. Faça commits pequenos e atômicos com mensagens claras (inglês ou português)
3. Mantenha o PR focado em uma única mudança
4. Atualize a `main` antes de abrir o PR (`git rebase main`)
5. Certifique-se de que o projeto compila sem erros

### Style Guide

- TypeScript: siga o padrão existente no código
- Componentes Angular: standalone components, signals, `OnPush` change detection
- Tailwind: use classes utilitárias do Tailwind (NativeScript)
- Nomes de variáveis: camelCase (TypeScript), kebab-case (arquivos)

### Ambiente de Desenvolvimento

```bash
npm install
ns platform add android   # ou ios
ns run android            # ou ios
```

## Código de Conduta

Este projeto segue o [Contributor Covenant](CODE_OF_CONDUCT.md). Ao participar, você concorda em mantê-lo.

## Dúvidas?

Abra uma [discussion](https://github.com/joaovictorlongo/open-radar/discussions) ou issue.
