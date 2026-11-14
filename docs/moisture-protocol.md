# Protocolo de humedad regional a 7 y 14 días

Fijado el 2026-11-14 antes de entrenar. Bruno autorizó retomar la propuesta del chat
«Explorar enfoques innovadores», entrenar y publicar en `cropilot:modelos`.

- Objetivo: GWETROOT diario en t+7 y t+14, relativo al último día de datos t.
  Es saturación relativa regional modelada, no humedad volumétrica ni riego.
- Fuente: snapshot NASA POWER de diez puntos, 1984–2025, incluido en
  `models-water-v1`. Reusar su validador y ET0 FAO-56, verificando sus hashes.
- Features: GWETROOT actual y rezagos 1/7/14/28, medias 7/14/28; lluvia,
  ET0 y temperatura antecedentes; latitud/longitud y ciclo anual. Ninguna
  variable futura ni meteorología pronosticada. Sin ONI por latencia no auditada.
- Train: 1984–2006. Selección: 2007–2012. Calibración de intervalos: 2013–2016.
  Test: 2017–2025. Todos los puntos de una fecha están en la misma partición.
  El target debe quedar dentro de la partición del origen; purgar bordes.
- Baselines: persistencia y climatología zona/mes del target ajustada en train.
  ML: Ridge alpha=100 con escalado y HGB (160 iteraciones, learning rate 0.05,
  15 hojas, mínimo 50 filas/hoja, L2=10, sin early stopping, semilla 42).
  Regresores aprenden cambio frente a persistencia; salida acotada a [0,1].
- Selección por MAE de validación, incluyendo baselines. Guardar HGB aunque no
  gane. No retocar hiperparámetros al ver test; no reentrenar con calibración/test.
- Intervalo exploratorio nominal 90%: percentil 90 del error absoluto de
  calibración (corrección finita conservadora), por horizonte y candidato.
  Reportar cobertura y amplitud en test, sin garantía conformal por dependencia.
- Comparar MAE/RMSE y skill frente a persistencia; bootstrap pareado de años
  completos (2.000 réplicas) y MAE por zona/año. Repetir HGB dejando cada zona
  afuera de train para diagnóstico espacial, sin seleccionar con ese test.
- Conservar métricas, hashes, versiones, ejemplos e instrucciones. Pesos y datos
  fuera de Git, en prerelease privada verificable. Integración por servicio/CLI;
  no agregar UI ni endpoint, ni mergear main.
- Límite temporal: reanálisis revisado, sin vintages ni latencia verificados.
  t es fecha de datos, NO fecha de emisión operativa. No presentar como pronóstico
  disponible hoy: MERRA-2 puede publicarse después del horizonte objetivo.

Fuentes: [NASA GWETROOT](https://gmao.gsfc.nasa.gov/gmao-products/merra-2/faq_merra-2/),
[NASA POWER](https://power.larc.nasa.gov/docs/services/api/temporal/daily/),
[HGB](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.HistGradientBoostingRegressor.html).
