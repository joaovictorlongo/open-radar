# Open Radar

[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Angular](https://img.shields.io/badge/Angular-20-red.svg)](https://angular.dev)
[![NativeScript](https://img.shields.io/badge/NativeScript-9.0-blue.svg)](https://nativescript.org)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green.svg)](https://leafletjs.com)

**Open Radar** é um aplicativo mobile nativo Android e iOS de código aberto que exibe dados meteorológicos em tempo real do [IPMet](https://www.ipmetradar.com.br) — radar meteorológico, satélite GOES-19, raios, estações METAR/INMET e estimativa de chuva acumulada — em um mapa interativo com animação e geolocalização.

## Funcionalidades

- **Radar PPI animado** — 8 frames com pré-download e ciclo automático, dados do radar de Bauru-SP
- **Satélite GOES-19** — imagem infravermelha em tempo real
- **Chuva Acumulada** — estimativa por radar via WMS nativo
- **Raios** — descargas atmosféricas em tempo real
- **METAR / INMET** — estações meteorológicas com temperatura, umidade e vento
- **Animação automática** — pré-carrega e reproduz frames sequencialmente (1200ms por frame)
- **Geolocalização** — centraliza o mapa na posição do usuário (zoom 6)
- **Legendas** — escala dBZ para radar e mm para chuva acumulada
- **Exclusão mútua** — radar desliga satélite e vice-versa; satélite reativa radar ao desligar

## Captura de Tela

> *Mapa interativo com radar PPI, camadas sobrepostas e barra de controle na parte inferior.*

<img width="216" height="480" alt="image" src="https://github.com/user-attachments/assets/c18168f3-0200-471c-b9d9-f667f7865606" />
<img width="216" height="480" alt="image" src="https://github.com/user-attachments/assets/418d662f-8270-4a88-8d07-40361627bc62" />
<img width="216" height="480" alt="image" src="https://github.com/user-attachments/assets/7b5d0d3c-74f8-481a-aed5-eea4f2a15542" />


## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Angular 20 (standalone components) |
| Runtime Mobile | NativeScript 9.0 (Android + iOS) |
| Mapa | Leaflet 1.9.4 via WebView |
| Geolocalização | `@nativescript/geolocation` |
| HTTP | `@nativescript/core/http` (com `Referer` header) |
| Estilos | Tailwind CSS (NativeScript) |
| Build | Webpack 5 |


## Como Executar

```bash
# Instalar dependências
npm install

# Android
ns platform add android
ns run android

# iOS
ns platform add ios
ns run ios
```

## Arquitetura

O mapa é renderizado dentro de uma **WebView** que carrega um HTML inline contendo Leaflet. A comunicação entre o código TypeScript do Angular e o mapa JavaScript é feita via `evaluateJavascript` (Android) / `evaluateJavaScriptCompletionHandler` (iOS).

As imagens (radar, satélite, chuva acumulada) são baixadas **nativamente** pelo HTTP client do NativeScript (com header `Referer` obrigatório pelo MapServer 8.0+) e expostas ao WebView via URL `file://`.

### Estrutura

```
src/
├── app/
│   ├── map/
│   │   ├── map.component.ts      # Lógica: WebView, download, animação, toggles
│   │   ├── map.component.html    # Layout: mapa, botões, barra inferior
│   │   └── map.template.ts       # HTML/JS Leaflet: camadas, legendas, animação
│   ├── services/
│   │   └── ipmet.service.ts      # API calls: lightning, metar, inmet
│   ├── app.component.ts
│   └── app.routes.ts
├── main.ts
└── polyfills.ts
```
## API de Dados

| Endpoint | Descrição |
|----------|-----------|
| `ultimo.php` | Timestamp do frame mais recente |
| `raios.php` | Descargas atmosféricas (GeoJSON) |
| `metar.php` | Estações METAR (GeoJSON) |
| `inmet2.php` | Estações INMET (GeoJSON) |
| `mapserv.fcgi?map=ppi/*.map` | WMS Radar PPI (8 frames históricos) |
| `mapserv.fcgi?map=acum/ultimo.map` | WMS Chuva Acumulada |
| `satelite/sat_goes.gif` | Imagem de satélite GOES-19 |

## Licença

MIT © [João Longo](https://github.com/anomalyco)

Dados meteorológicos fornecidos pelo [IPMet](https://www.ipmetradar.com.br) — Centro de Meteorologia de Bauru, FC/Unesp.
