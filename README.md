# LiftLog

Projeto MVP do LiftLog: app para controle de treino, cargas, calendario, IMC, alimentacao, metas, recompensas e visao inicial para personal trainer.

## Estrutura

```text
LiftLog/
  app/
    LiftLogPWA/        App funcional em formato PWA
  design/              Espaco para Figma, SVGs e referencias visuais
  docs/                Documentacao do projeto
```

> A pasta `.agents` pode ser ignorada. Ela e uma pasta de apoio/configuracao que nao faz parte do app.

## Rodar a PWA

```powershell
cd C:\Users\Felipe.Aguiar\Documents\LiftLog\app\LiftLogPWA
node server.js
```

Depois abra:

```text
http://127.0.0.1:4173
```

No celular, estando no mesmo Wi-Fi do computador, use o IP local do PC com a mesma porta.

## Stack atual

- HTML
- CSS
- JavaScript puro
- LocalStorage
- Service Worker
- Web App Manifest
- PWA instalavel no celular

## Funcionalidades atuais

- Cadastro e login local por usuario
- Sessao salva no navegador
- Dados separados por conta no aparelho
- Perfil Aluno ou Personal
- Controle de cargas por exercicio
- Calendario de presenca
- IMC e meta de peso
- Alimentacao diaria
- Metas e recompensas
