export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { pingRedis } from '@/lib/security/redisClient';

export async function GET() {
  const timestamp = new Date().toISOString();
  const checks: Record<string, any> = {};

  // 1. Check MongoDB Atlas
  const mongoStart = Date.now();
  try {
    const conn = await connectDB();
    if (conn && conn.connection.readyState === 1) {
      checks.mongo_db = {
        status: 'ok',
        provider: 'MongoDB Atlas',
        latencyMs: Date.now() - mongoStart,
        database: conn.connection.name,
        host: conn.connection.host,
      };
    } else {
      checks.mongo_db = {
        status: 'degraded',
        provider: 'MongoDB Atlas (in-memory fallback active)',
        latencyMs: Date.now() - mongoStart,
      };
    }
  } catch (err) {
    checks.mongo_db = {
      status: 'error',
      message: err instanceof Error ? err.message : 'Connection failed',
      latencyMs: Date.now() - mongoStart,
    };
  }

  // 2. Check Upstash Redis
  const redisResult = await pingRedis();
  checks.upstash_redis = {
    status: redisResult.ok ? 'ok' : 'degraded',
    provider: 'Upstash Serverless Redis',
    latencyMs: redisResult.latencyMs,
    ...(redisResult.message ? { message: redisResult.message } : {}),
  };

  // 3. Check Railway Python Agent Microservice
  const pythonUrl = process.env.PYTHON_AGENT_URL || 'http://localhost:8001';
  const pyStart = Date.now();
  try {
    const pyRes = await fetch(`${pythonUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (pyRes.ok) {
      const pyData = await pyRes.json();
      checks.railway_python_agents = {
        status: 'ok',
        provider: 'Railway / Local Container',
        url: pythonUrl,
        latencyMs: Date.now() - pyStart,
        details: pyData,
      };
    } else {
      checks.railway_python_agents = {
        status: 'degraded',
        provider: 'Railway / Local Container (Fallback TS heuristic active)',
        url: pythonUrl,
        httpStatus: pyRes.status,
        latencyMs: Date.now() - pyStart,
      };
    }
  } catch (err) {
    checks.railway_python_agents = {
      status: 'degraded',
      provider: 'Railway (TS heuristic fallback active)',
      url: pythonUrl,
      message: err instanceof Error ? err.message : 'Timeout or unreachable',
      latencyMs: Date.now() - pyStart,
    };
  }

  // 4. Check Open-Meteo Meteorology API
  const meteoStart = Date.now();
  try {
    const meteoRes = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=25.6692&longitude=-100.3099&current=temperature_2m',
      { signal: AbortSignal.timeout(3000) }
    );
    checks.open_meteo = {
      status: meteoRes.ok ? 'ok' : 'degraded',
      provider: 'Open-Meteo Monterrey Coordinates',
      latencyMs: Date.now() - meteoStart,
    };
  } catch (_err) {
    checks.open_meteo = {
      status: 'degraded',
      provider: 'Open-Meteo (Clear weather fallback active)',
      latencyMs: Date.now() - meteoStart,
    };
  }

  const isHealthy =
    checks.mongo_db.status === 'ok' || checks.upstash_redis.status === 'ok';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      app: 'The Courier — Next.js 14 Full-Stack',
      version: '2.0.0-market',
      timestamp,
      checks,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
