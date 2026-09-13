import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3000/api/sim/benchmark-matrix?durationMin=480&seed=42';

async function run() {
  console.log('⚡ Starting 16-Scenario Disruption Events Benchmark...');
  console.log('📍 Monterrey Zone: 480 Ticks (8-hour shift)');
  console.log('⏰ Mid-shift Event Injection: Tick 240 / 480');
  console.log('🎲 Random Seed: 42 (Exact Parity)\n');

  const startTime = Date.now();
  const res = await fetch(API_URL);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to run benchmark: ${res.status} - ${text}`);
  }

  const data = await res.json();
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Benchmark completed in ${elapsedSec}s across ${data.totalScenarios} scenarios!\n`);

  // Build Markdown table
  let md = `# Matriz de Comparación: Impacto de Eventos Disruptivos (Turno 8h / 480 Ticks)\n\n`;
  md += `> **Metodología de Inyección**: Todos los escenarios inician en un entorno de control limpio. En el **Tick 240 (50% del turno)**, se inyectan los eventos designados y se mantienen activos hasta el final del turno (Tick 480). Semilla fija = 42 para paridad determinística.\n\n`;
  md += `### Glosario de Eventos\n`;
  md += `- **[S] Surge**: Tarifa dinámica 2.5x en San Pedro / Valle Oriente.\n`;
  md += `- **[C] Cierre Vial**: Av. Constitución / Pino Suárez bloqueada (4 km/h).\n`;
  md += `- **[R] Lluvia Torrencial**: -40% velocidad promedio, asfalto peligroso.\n`;
  md += `- **[U] Zona de Riesgo**: Independencia / Campana (-$45 MXN multa por incidente).\n\n`;

  md += `## 1. Tabla Comparativa de Rendimiento Financiero Neto (MXN)\n\n`;
  md += `| # | Escenario | Eventos | Agent A (Economist) Neto | Agent B (Hustler) Neto | Base (FIFO) Neto | Delta A vs Base | Delta B vs Base | Ganador |\n`;
  md += `|---|---|---|---|---|---|---|---|---|\n`;

  for (const r of data.results) {
    const sc = r.scenario;
    const a = r.agent_a;
    const b = r.agent_b;
    const base = r.baseline;

    const winner =
      a.net > b.net && a.net > base.net
        ? '🧊 Agent A'
        : b.net > a.net && b.net > base.net
        ? '⚡ Agent B'
        : '📱 Base';

    const deltaA = a.deltaVsBase >= 0 ? `+$${a.deltaVsBase.toFixed(1)}` : `-$${Math.abs(a.deltaVsBase).toFixed(1)}`;
    const deltaB = b.deltaVsBase >= 0 ? `+$${b.deltaVsBase.toFixed(1)}` : `-$${Math.abs(b.deltaVsBase).toFixed(1)}`;

    md += `| ${sc.name.split('.')[0]} | ${sc.name.split('. ')[1]} | \`${sc.code}\` | **$${a.net.toFixed(1)}** | **$${b.net.toFixed(1)}** | $${base.net.toFixed(1)} | ${deltaA} | ${deltaB} | ${winner} |\n`;
  }

  md += `\n## 2. Desglose Operativo Detallado por Escenario\n\n`;
  md += `| Escenario | Agente | Pedidos Entregados | Km Totales | Costo Gasolina ($0.70/km) | Incidentes / Multas | Margen Neto / KM | Ganancia Neta |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;

  for (const r of data.results) {
    const sc = r.scenario;
    const a = r.agent_a;
    const b = r.agent_b;
    const base = r.baseline;

    md += `| **${sc.code}** - ${sc.name.split('. ')[1]} | 🧊 Agent A (DQN) | ${a.orders} | ${a.km.toFixed(1)} km | -$${a.fuelCost.toFixed(1)} | ⚠️ ${a.incidents} (-$${a.penalties.toFixed(1)}) | **$${a.netPerKm.toFixed(2)}/km** | **$${a.net.toFixed(1)}** |\n`;
    md += `| | ⚡ Agent B (Hustler) | ${b.orders} | ${b.km.toFixed(1)} km | -$${b.fuelCost.toFixed(1)} | ⚠️ ${b.incidents} (-$${b.penalties.toFixed(1)}) | **$${b.netPerKm.toFixed(2)}/km** | **$${b.net.toFixed(1)}** |\n`;
    md += `| | 📱 Base (Naive) | ${base.orders} | ${base.km.toFixed(1)} km | -$${base.fuelCost.toFixed(1)} | ⚠️ ${base.incidents} (-$${base.penalties.toFixed(1)}) | $${base.netPerKm.toFixed(2)}/km | $${base.net.toFixed(1)} |\n`;
  }

  // Save to file
  const outPath = path.join(process.cwd(), 'BENCHMARK_EVENTS_REPORT.md');
  fs.writeFileSync(outPath, md, 'utf-8');
  console.log(`📄 Report saved to: ${outPath}\n`);

  // Print summary table to console
  console.log('='.repeat(105));
  console.log(
    'ESCENARIO'.padEnd(35) +
    'AGENT A (NETO)'.padEnd(16) +
    'AGENT B (NETO)'.padEnd(16) +
    'BASE (NETO)'.padEnd(14) +
    'DELTA A'.padEnd(12) +
    'DELTA B'.padEnd(12)
  );
  console.log('-'.repeat(105));

  for (const r of data.results) {
    const sc = r.scenario;
    const a = r.agent_a;
    const b = r.agent_b;
    const base = r.baseline;
    const deltaA = a.deltaVsBase >= 0 ? `+$${a.deltaVsBase.toFixed(1)}` : `-$${Math.abs(a.deltaVsBase).toFixed(1)}`;
    const deltaB = b.deltaVsBase >= 0 ? `+$${b.deltaVsBase.toFixed(1)}` : `-$${Math.abs(b.deltaVsBase).toFixed(1)}`;

    console.log(
      `${sc.name}`.padEnd(35) +
      `$${a.net.toFixed(1)}`.padEnd(16) +
      `$${b.net.toFixed(1)}`.padEnd(16) +
      `$${base.net.toFixed(1)}`.padEnd(14) +
      `${deltaA}`.padEnd(12) +
      `${deltaB}`.padEnd(12)
    );
  }
  console.log('='.repeat(105));
}

run().catch((err) => {
  console.error('Error running benchmark:', err);
  process.exit(1);
});
