import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/utils/auth';
import { logsStorage } from '@/app/utils/logs-storage';

/**
 * GET /api/admin/logs
 * Obtiene los logs almacenados (solo para admins)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level') as 'error' | 'warn' | 'info' | 'debug' | 'log' | null;
    const limit = parseInt(searchParams.get('limit') || '100');
    const hours = parseInt(searchParams.get('hours') || '24');

    // Calcular fecha desde
    const since = new Date();
    since.setHours(since.getHours() - hours);

    // Obtener logs
    const logs = logsStorage.getLogs({
      level: level ? (level.includes(',') ? level.split(',') as any : level) : undefined,
      limit,
      since,
    });

    // Obtener estadísticas
    const stats = logsStorage.getStats();

    return NextResponse.json({
      logs,
      stats,
      total: logs.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener logs' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/logs
 * Limpia los logs almacenados (solo para admins)
 */
export async function DELETE() {
  const authResult = await requireAuth();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    logsStorage.clearLogs();
    return NextResponse.json({ message: 'Logs limpiados correctamente' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al limpiar logs' },
      { status: 500 }
    );
  }
}


