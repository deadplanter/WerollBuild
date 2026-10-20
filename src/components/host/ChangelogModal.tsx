import React from 'react';
import { X, Sparkles, Calendar, Tag, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ChangelogEntry } from '../../types/dnd';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  changelog: ChangelogEntry[];
  currentVersion: string;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
  changelog,
  currentVersion,
}) => {
  if (!isOpen) return null;

  // Show latest version at top
  const sortedEntries = [...(changelog || [])].sort((a, b) => {
    const vA = parseFloat(a.version) || 0;
    const vB = parseFloat(b.version) || 0;
    return vB - vA;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-[#181920] border-2 border-amber-900/80 rounded-2xl shadow-2xl p-6 text-stone-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-500/50 flex items-center justify-center text-amber-200 shadow">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-cinzel font-black text-lg text-amber-300 tracking-wide">
                Novedades y Registro de Versiones
              </h3>
              <p className="text-[11px] text-stone-400">
                Historial de actualizaciones oficiales de WeRoll (Versión Actual: {currentVersion})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entries list */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1.5 custom-scrollbar">
          {sortedEntries.length === 0 ? (
            <div className="text-center py-12 text-stone-500 text-sm">
              No hay entradas de actualización registradas aún.
            </div>
          ) : (
            sortedEntries.map((entry, index) => {
              const isCurrent = entry.version === currentVersion || index === 0;
              return (
                <div
                  key={entry.version + index}
                  className={`rounded-xl border p-4.5 transition ${
                    isCurrent
                      ? 'bg-gradient-to-br from-[#1e1922] via-[#181920] to-[#1a171d] border-amber-600/70 shadow-md'
                      : 'bg-[#131418] border-stone-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                          isCurrent
                            ? 'bg-amber-600 text-white shadow'
                            : 'bg-stone-800 text-stone-300 border border-stone-700'
                        }`}
                      >
                        v{entry.version}
                      </span>
                      <h4 className="font-cinzel font-bold text-stone-100 text-sm">
                        {entry.title}
                      </h4>
                      {isCurrent && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/50 text-emerald-300">
                          Actual
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>{entry.date}</span>
                    </div>
                  </div>

                  <ul className="space-y-1.5 mt-3">
                    {entry.changes.map((change, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2 text-xs text-stone-300 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-800 mt-4 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-amber-500/80" />
            Configurable por el moderador en Ajustes Privados
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-cinzel font-semibold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
