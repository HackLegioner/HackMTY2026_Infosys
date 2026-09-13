# Matriz de Comparación: Impacto de Eventos Disruptivos (Turno 8h / 480 Ticks)

> **Metodología de Inyección**: Todos los escenarios inician en un entorno de control limpio. En el **Tick 240 (50% del turno)**, se inyectan los eventos designados y se mantienen activos hasta el final del turno (Tick 480). Semilla fija = 42 para paridad determinística.

### Glosario de Eventos
- **[S] Surge**: Tarifa dinámica 2.5x en San Pedro / Valle Oriente.
- **[C] Cierre Vial**: Av. Constitución / Pino Suárez bloqueada (4 km/h).
- **[R] Lluvia Torrencial**: -40% velocidad promedio, asfalto peligroso.
- **[U] Zona de Riesgo**: Independencia / Campana (-$45 MXN multa por incidente).

## 1. Tabla Comparativa de Rendimiento Financiero Neto (MXN)

| # | Escenario | Eventos | Agent A (Economist) Neto | Agent B (Hustler) Neto | Base (FIFO) Neto | Delta A vs Base | Delta B vs Base | Ganador |
|---|---|---|---|---|---|---|---|---|
| 00 | Sin Eventos (Control Limpio) | `NONE` | **$361.9** | **$194.1** | $175.5 | +$186.4 | +$18.6 | 🧊 Agent A |
| 01 | Solo Surge (2.5x Valle) | `S` | **$599.6** | **$380.5** | $282.9 | +$316.7 | +$97.6 | 🧊 Agent A |
| 02 | Solo Cierre Vial (Constitución) | `C` | **$266.4** | **$130.5** | $208.8 | +$57.6 | -$78.3 | 🧊 Agent A |
| 03 | Solo Tormenta Torrencial | `R` | **$471.8** | **$81.7** | $185.0 | +$286.8 | -$103.3 | 🧊 Agent A |
| 04 | Solo Zona de Riesgo | `U` | **$173.1** | **$194.1** | $175.5 | -$2.4 | +$18.6 | ⚡ Agent B |
| 05 | Surge + Cierre Vial | `S+C` | **$610.5** | **$130.5** | $308.7 | +$301.8 | -$178.2 | 🧊 Agent A |
| 06 | Surge + Tormenta | `S+R` | **$675.3** | **$81.7** | $185.0 | +$490.3 | -$103.3 | 🧊 Agent A |
| 07 | Surge + Zona de Riesgo | `S+U` | **$652.6** | **$312.5** | $282.9 | +$369.7 | +$29.6 | 🧊 Agent A |
| 08 | Cierre Vial + Tormenta | `C+R` | **$209.3** | **$63.0** | $185.0 | +$24.3 | -$122.0 | 🧊 Agent A |
| 09 | Cierre Vial + Zona de Riesgo | `C+U` | **$176.3** | **$130.5** | $208.8 | -$32.5 | -$78.3 | 📱 Base |
| 10 | Tormenta + Zona de Riesgo | `R+U` | **$501.9** | **$81.7** | $185.0 | +$316.9 | -$103.3 | 🧊 Agent A |
| 11 | Surge + Cierre + Tormenta | `S+C+R` | **$297.7** | **$63.0** | $185.0 | +$112.7 | -$122.0 | 🧊 Agent A |
| 12 | Surge + Cierre + Zona Riesgo | `S+C+U` | **$610.5** | **$130.5** | $308.7 | +$301.8 | -$178.2 | 🧊 Agent A |
| 13 | Surge + Tormenta + Zona Riesgo | `S+R+U` | **$407.6** | **$81.7** | $185.0 | +$222.6 | -$103.3 | 🧊 Agent A |
| 14 | Cierre + Tormenta + Zona Riesgo | `C+R+U` | **$397.1** | **$63.0** | $185.0 | +$212.1 | -$122.0 | 🧊 Agent A |
| 15 | Tormenta Perfecta (4 Eventos) | `S+C+R+U` | **$297.7** | **$63.0** | $185.0 | +$112.7 | -$122.0 | 🧊 Agent A |

## 2. Desglose Operativo Detallado por Escenario

| Escenario | Agente | Pedidos Entregados | Km Totales | Costo Gasolina ($0.70/km) | Incidentes / Multas | Margen Neto / KM | Ganancia Neta |
|---|---|---|---|---|---|---|---|
| **NONE** - Sin Eventos (Control Limpio) | 🧊 Agent A (DQN) | 6 | 30.2 km | -$21.1 | ⚠️ 0 (-$0.0) | **$12.00/km** | **$361.9** |
| | ⚡ Agent B (Hustler) | 8 | 94.2 km | -$65.9 | ⚠️ 0 (-$120.0) | **$2.10/km** | **$194.1** |
| | 📱 Base (Naive) | 7 | 97.9 km | -$68.5 | ⚠️ 0 (-$90.0) | $1.80/km | $175.5 |
| **S** - Solo Surge (2.5x Valle) | 🧊 Agent A (DQN) | 8 | 46.0 km | -$32.2 | ⚠️ 0 (-$0.0) | **$13.00/km** | **$599.6** |
| | ⚡ Agent B (Hustler) | 9 | 91.1 km | -$63.8 | ⚠️ 0 (-$120.0) | **$4.20/km** | **$380.5** |
| | 📱 Base (Naive) | 7 | 97.9 km | -$68.5 | ⚠️ 0 (-$90.0) | $2.90/km | $282.9 |
| **C** - Solo Cierre Vial (Constitución) | 🧊 Agent A (DQN) | 5 | 26.6 km | -$18.6 | ⚠️ 0 (-$15.0) | **$10.00/km** | **$266.4** |
| | ⚡ Agent B (Hustler) | 6 | 93.6 km | -$65.5 | ⚠️ 0 (-$90.0) | **$1.40/km** | **$130.5** |
| | 📱 Base (Naive) | 7 | 94.6 km | -$66.2 | ⚠️ 0 (-$75.0) | $2.20/km | $208.8 |
| **R** - Solo Tormenta Torrencial | 🧊 Agent A (DQN) | 7 | 41.3 km | -$28.9 | ⚠️ 2 (-$70.0) | **$11.40/km** | **$471.8** |
| | ⚡ Agent B (Hustler) | 6 | 77.6 km | -$54.3 | ⚠️ 3 (-$150.0) | **$1.10/km** | **$81.7** |
| | 📱 Base (Naive) | 6 | 75.4 km | -$52.8 | ⚠️ 1 (-$95.0) | $2.50/km | $185.0 |
| **U** - Solo Zona de Riesgo | 🧊 Agent A (DQN) | 3 | 21.3 km | -$14.9 | ⚠️ 0 (-$0.0) | **$8.10/km** | **$173.1** |
| | ⚡ Agent B (Hustler) | 8 | 94.2 km | -$65.9 | ⚠️ 0 (-$120.0) | **$2.10/km** | **$194.1** |
| | 📱 Base (Naive) | 7 | 97.9 km | -$68.5 | ⚠️ 0 (-$90.0) | $1.80/km | $175.5 |
| **S+C** - Surge + Cierre Vial | 🧊 Agent A (DQN) | 8 | 45.5 km | -$31.9 | ⚠️ 0 (-$15.0) | **$13.40/km** | **$610.5** |
| | ⚡ Agent B (Hustler) | 6 | 93.6 km | -$65.5 | ⚠️ 0 (-$90.0) | **$1.40/km** | **$130.5** |
| | 📱 Base (Naive) | 7 | 94.6 km | -$66.2 | ⚠️ 0 (-$75.0) | $3.30/km | $308.7 |
| **S+R** - Surge + Tormenta | 🧊 Agent A (DQN) | 8 | 37.5 km | -$26.3 | ⚠️ 1 (-$20.0) | **$18.00/km** | **$675.3** |
| | ⚡ Agent B (Hustler) | 6 | 77.6 km | -$54.3 | ⚠️ 3 (-$150.0) | **$1.10/km** | **$81.7** |
| | 📱 Base (Naive) | 6 | 75.4 km | -$52.8 | ⚠️ 1 (-$95.0) | $2.50/km | $185.0 |
| **S+U** - Surge + Zona de Riesgo | 🧊 Agent A (DQN) | 9 | 50.0 km | -$35.0 | ⚠️ 0 (-$0.0) | **$13.10/km** | **$652.6** |
| | ⚡ Agent B (Hustler) | 8 | 92.2 km | -$64.5 | ⚠️ 0 (-$105.0) | **$3.40/km** | **$312.5** |
| | 📱 Base (Naive) | 7 | 97.9 km | -$68.5 | ⚠️ 0 (-$90.0) | $2.90/km | $282.9 |
| **C+R** - Cierre Vial + Tormenta | 🧊 Agent A (DQN) | 4 | 24.6 km | -$17.2 | ⚠️ 1 (-$35.0) | **$8.50/km** | **$209.3** |
| | ⚡ Agent B (Hustler) | 6 | 75.7 km | -$53.0 | ⚠️ 4 (-$170.0) | **$0.80/km** | **$63.0** |
| | 📱 Base (Naive) | 6 | 75.4 km | -$52.8 | ⚠️ 1 (-$95.0) | $2.50/km | $185.0 |
| **C+U** - Cierre Vial + Zona de Riesgo | 🧊 Agent A (DQN) | 3 | 16.7 km | -$11.7 | ⚠️ 0 (-$0.0) | **$10.60/km** | **$176.3** |
| | ⚡ Agent B (Hustler) | 6 | 93.6 km | -$65.5 | ⚠️ 0 (-$90.0) | **$1.40/km** | **$130.5** |
| | 📱 Base (Naive) | 7 | 94.6 km | -$66.2 | ⚠️ 0 (-$75.0) | $2.20/km | $208.8 |
| **R+U** - Tormenta + Zona de Riesgo | 🧊 Agent A (DQN) | 7 | 37.9 km | -$26.5 | ⚠️ 0 (-$15.0) | **$13.20/km** | **$501.9** |
| | ⚡ Agent B (Hustler) | 6 | 77.6 km | -$54.3 | ⚠️ 3 (-$150.0) | **$1.10/km** | **$81.7** |
| | 📱 Base (Naive) | 6 | 75.4 km | -$52.8 | ⚠️ 1 (-$95.0) | $2.50/km | $185.0 |
| **S+C+R** - Surge + Cierre + Tormenta | 🧊 Agent A (DQN) | 5 | 30.9 km | -$21.6 | ⚠️ 1 (-$35.0) | **$9.60/km** | **$297.7** |
| | ⚡ Agent B (Hustler) | 6 | 75.7 km | -$53.0 | ⚠️ 4 (-$170.0) | **$0.80/km** | **$63.0** |
| | 📱 Base (Naive) | 6 | 75.4 km | -$52.8 | ⚠️ 1 (-$95.0) | $2.50/km | $185.0 |
| **S+C+U** - Surge + Cierre + Zona Riesgo | 🧊 Agent A (DQN) | 8 | 45.5 km | -$31.9 | ⚠️ 0 (-$15.0) | **$13.40/km** | **$610.5** |
| | ⚡ Agent B (Hustler) | 6 | 93.6 km | -$65.5 | ⚠️ 0 (-$90.0) | **$1.40/km** | **$130.5** |
| | 📱 Base (Naive) | 7 | 94.6 km | -$66.2 | ⚠️ 0 (-$75.0) | $3.30/km | $308.7 |
| **S+R+U** - Surge + Tormenta + Zona Riesgo | 🧊 Agent A (DQN) | 6 | 38.8 km | -$27.2 | ⚠️ 3 (-$60.0) | **$10.50/km** | **$407.6** |
| | ⚡ Agent B (Hustler) | 6 | 77.6 km | -$54.3 | ⚠️ 3 (-$150.0) | **$1.10/km** | **$81.7** |
| | 📱 Base (Naive) | 6 | 75.4 km | -$52.8 | ⚠️ 1 (-$95.0) | $2.50/km | $185.0 |
| **C+R+U** - Cierre + Tormenta + Zona Riesgo | 🧊 Agent A (DQN) | 6 | 32.2 km | -$22.5 | ⚠️ 0 (-$15.0) | **$12.30/km** | **$397.1** |
| | ⚡ Agent B (Hustler) | 6 | 75.7 km | -$53.0 | ⚠️ 4 (-$170.0) | **$0.80/km** | **$63.0** |
| | 📱 Base (Naive) | 6 | 75.4 km | -$52.8 | ⚠️ 1 (-$95.0) | $2.50/km | $185.0 |
| **S+C+R+U** - Tormenta Perfecta (4 Eventos) | 🧊 Agent A (DQN) | 5 | 30.9 km | -$21.6 | ⚠️ 1 (-$35.0) | **$9.60/km** | **$297.7** |
| | ⚡ Agent B (Hustler) | 6 | 75.7 km | -$53.0 | ⚠️ 4 (-$170.0) | **$0.80/km** | **$63.0** |
| | 📱 Base (Naive) | 6 | 75.4 km | -$52.8 | ⚠️ 1 (-$95.0) | $2.50/km | $185.0 |
