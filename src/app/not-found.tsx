import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-12 h-12 rounded-md bg-[#18181b] border border-[#27272a] flex items-center justify-center font-mono font-bold text-sm mb-4">
        404
      </div>
      <h2 className="text-xl font-bold mb-2">Página no encontrada</h2>
      <p className="text-xs text-[#71717a] max-w-sm mb-6">
        La ruta solicitada no existe o el recurso ha sido reubicado.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-[#ffffff] text-[#09090b] rounded-md text-xs font-semibold hover:bg-[#e4e4e7] transition"
      >
        Volver al Inicio
      </Link>
    </div>
  );
}
