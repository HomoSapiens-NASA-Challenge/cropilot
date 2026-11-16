# Atribución de datos y cálculos

La interfaz distingue los datos y referencias originales de los cálculos, evaluaciones
y notas del equipo. El objetivo es poder rastrear un resultado hasta sus insumos sin
presentarlo como una observación publicada por NASA, INTA o MAGyP. Se revisaron las siete
entradas `team_*` del generador de casos y sus documentos originales. La separación es
de presentación: conserva los identificadores, autores, enlaces y valores del contrato.

| Referencia             | Principales insumos externos                                                       | Resultado o documento del equipo                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `team_market_model`    | NASA POWER, NOAA ONI, rindes/costos MAGyP, futuros A3 y referencias agronómicas    | Análogos, anomalías de rinde, modelos para faltantes y escenarios de margen                               |
| `team_market_backtest` | Los insumos del modelo de mercado                                                  | Evaluación contra climatología y campañas al azar; no es un dataset observado externo                     |
| `team_water_scenarios` | NASA POWER, SoilGrids, contorno FTW, secuencia INTA, métodos y parámetros FAO/INTA | Simulaciones de balance de agua, estrés y sensibilidad                                                    |
| `team_crop_map`        | NASA HLS, mapas INTA, contornos FTW y contexto NOAA                                | Clasificación 2025/26 e indicadores derivados; el historial 2020/21–2024/25 conserva la atribución a INTA |
| `team_rl_mdp`          | Insumos del modelo de mercado: NASA POWER, NOAA, MAGyP y A3                        | Entorno tabular y evaluación de DP, Q-learning y rotaciones fijas                                         |
| `team_rl_lab`          | NASA POWER, MAGyP, FAO-56/33, calendarios INTA y precios World Bank                | Balance hídrico y evaluación de políticas; incluye supuestos explícitos de suelo y costos                 |
| `team_analog_approach` | NASA POWER, NOAA y MAGyP                                                           | Nota metodológica y análisis descriptivo, incluido el contraejemplo 2017/18                               |

Evidencia consultada:

- [Definiciones y enlaces de los casos](../scripts/demo_case/sources.py).
- [Construcción del caso y referencias del balance de agua](../scripts/demo_case/build.py).
- [Pipeline de mercado y evaluación](https://github.com/HomoSapiens-NASA-Challenge/hub/tree/6823a1f/research/ml-market-model).
- [Balance de agua](water-strategies.md) y [mapa de cultivos](crop-map.md).
- [Protocolo del MDP](https://github.com/HomoSapiens-NASA-Challenge/hub/blob/6823a1f/research/rl/rotation-mdp/PROTOCOL.md).
- [Primera pasada del laboratorio](https://github.com/HomoSapiens-NASA-Challenge/hub/blob/main/research/rl.md).
- [Nota de años análogos](https://github.com/HomoSapiens-NASA-Challenge/hub/blob/main/research/enfoque-anios-como-este.md).

`source-lineage.ts` enlaza los principales insumos que ya existen en `SourceRef`.
No pretende reemplazar la lista completa de parámetros o referencias de cada método.
Los calendarios INTA, FAO-33, precios World Bank y supuestos del laboratorio se señalan
en el texto y permanecen documentados en el método enlazado. No se agrega una licencia
cuando el registro no la declara. No se cambian los JSON generados ni las respuestas API.

En cada caso, las fuentes externas aparecen primero. Los cálculos quedan en un apartado
desplegable. Los popovers de evidencia muestran los insumos externos además de conservar
la cita del cálculo exacto que respalda el resultado. El contador indica referencias,
incluidos los insumos enlazados, sin duplicados.
