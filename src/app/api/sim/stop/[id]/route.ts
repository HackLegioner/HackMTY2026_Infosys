import { NextResponse } from 'next/server';
import { getActiveShift, removeShift } from '@/lib/simulator/shift';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const engine = getActiveShift(id);

  if (!engine) {
    return NextResponse.json({ error: `Shift with id ${id} not found` }, { status: 404 });
  }

  const finalState = { ...engine.state };
  removeShift(id);

  return NextResponse.json({
    ok: true,
    message: `Shift ${id} stopped`,
    finalState,
  });
}
