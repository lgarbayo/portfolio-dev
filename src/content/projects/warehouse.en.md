---
locale: en
slug: warehouse
title: "warehouse"
description: >-
  Multi-agent simulation of an automated warehouse where a fleet of autonomous
  robots stores and retrieves containers with no central planner. Each robot
  perceives what comes in, decides locally whether it fits its capacity and
  races to claim it; mutual exclusion is guaranteed atomically by the
  environment, so no inter-agent negotiation is needed. When shelves saturate, a
  deadline triggers the outbound cycle and a transport agent clears the zone.
context: "Intelligent Systems · Universidade de Vigo"
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
  - "Claim-based allocation, no central dispatcher"
  - "Heterogeneous fleet with different capacities"
  - "Critical-zone mutex through a supervisor"
  - "Outbound cycle triggered by saturation"
  - "Live visualisation with Swing"
---
