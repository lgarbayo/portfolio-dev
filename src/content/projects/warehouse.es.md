---
locale: es
slug: warehouse
title: "warehouse"
description: >-
  Simulación multiagente de un almacén automatizado donde una flota de robots
  autónomos guarda y recupera contenedores sin ningún planificador central. Cada
  robot percibe lo que entra, decide por su cuenta si le cabe y compite por
  reclamarlo; la exclusión mutua la garantiza el entorno de forma atómica, así
  que no hace falta negociar entre agentes. Cuando las estanterías se saturan,
  un plazo dispara el ciclo de salida y un agente de transporte vacía la zona.
context: "Sistemas Inteligentes · Universidade de Vigo"
category: data
year: 2026
tags:
  - Java 21
  - Jason
  - AgentSpeak
  - BDI
  - Gradle
repoUrl: https://github.com/lgarbayo/warehouse
highlights:
  - "Reparto por reclamación, sin despachador central"
  - "Flota heterogénea con capacidades distintas"
  - "Mutex de zonas críticas vía supervisor"
  - "Ciclo de salida disparado por saturación"
  - "Visualización en vivo con Swing"
---
