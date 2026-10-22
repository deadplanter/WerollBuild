import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  ListOrdered,
  FileText,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { Character5e, PlayerJournalEntry } from '../../types/dnd';
import { buildJournalIndexEntries } from '../../utils/dnd-math';

interface CharacterJournalBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character5e;
  onUpdateCharacter: (updated: Character5e) => void;
  isLocked?: boolean;
  onUnlockRequest?: () => void;
}

export const CharacterJournalBookModal: React.FC<CharacterJournalBookModalProps> = ({
  isOpen,
  onClose,
  character,
  onUpdateCharacter,
  isLocked = false,
  onUnlockRequest,
}) => {
  // 'index' is the cover summary page; number (1-based) is the specific sheet page
  const [activeSheetNumber, setActiveSheetNumber] = useState<'index' | number>('index');
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  // Add / Edit sheet form state
  const [isEditingSheet, setIsEditingSheet] = useState<boolean>(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [sheetForm, setSheetForm] = useState<{
    sessionNumber: number;
    title: string;
    dateInGame: string;
    summary: string;
    notes: string;
  }>({
    sessionNumber: 1,
    title: '',
    dateInGame: '',
    summary: '',
    notes: '',
  });

  if (!isOpen) return null;

  const entries = character.playerJournal || [];
  const journalIndex = buildJournalIndexEntries(entries);

  const navigateToSheet = (target: 'index' | number) => {
    setIsFlipping(true);
    setIsEditingSheet(false);
    setTimeout(() => {
      setActiveSheetNumber(target);
      setIsFlipping(false);
    }, 180);
  };

  const handleStartNewSheet = () => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const nextSession =
      entries.length > 0
        ? Math.max(...entries.map((j) => Number(j.sessionNumber) || 1)) + 1
        : 1;
    setEditingEntryId(null);
    setSheetForm({
      sessionNumber: nextSession,
      title: '',
      dateInGame: '',
      summary: '',
      notes: '',
    });
    setIsEditingSheet(true);
  };

  const handleStartEditSheet = (entry: PlayerJournalEntry) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    setEditingEntryId(entry.id);
    setSheetForm({
      sessionNumber: entry.sessionNumber || 1,
      title: entry.title || '',
      dateInGame: entry.dateInGame || entry.date || '',
      summary: entry.summary || '',
      notes: entry.notes || '',
    });
    setIsEditingSheet(true);
  };

  const handleSaveSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetForm.title.trim()) return;

    if (editingEntryId) {
      const updated = entries.map((entry) =>
        entry.id === editingEntryId
          ? {
              ...entry,
              sessionNumber: Number(sheetForm.sessionNumber) || 1,
              title: sheetForm.title.trim(),
              dateInGame: sheetForm.dateInGame.trim(),
              summary: sheetForm.summary.trim(),
              notes: sheetForm.notes.trim(),
            }
          : entry
      );
      onUpdateCharacter({ ...character, playerJournal: updated });
      setIsEditingSheet(false);
    } else {
      const newEntry: PlayerJournalEntry = {
        id: `pjournal-${Date.now()}`,
        sessionNumber: Number(sheetForm.sessionNumber) || 1,
        title: sheetForm.title.trim(),
        dateInGame: sheetForm.dateInGame.trim(),
        realDate: new Date().toISOString().slice(0, 10),
        summary: sheetForm.summary.trim(),
        notes: sheetForm.notes.trim(),
      };
      const nextEntries = [...entries, newEntry];
      onUpdateCharacter({ ...character, playerJournal: nextEntries });
      setIsEditingSheet(false);
      navigateToSheet(nextEntries.length);
    }
  };

  const handleDeleteSheet = (id: string) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const nextEntries = entries.filter((e) => e.id !== id);
    onUpdateCharacter({ ...character, playerJournal: nextEntries });
    navigateToSheet('index');
  };

  const currentSheetEntry =
    typeof activeSheetNumber === 'number' ? entries[activeSheetNumber - 1] : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Diario de ${character.name}`}
    >
      {/* Leather-bound Notebook Frame */}
      <div className="relative w-full max-w-5xl bg-gradient-to-b from-[#231d18] via-[#1c1713] to-[#17130f] border-4 border-[#785c38] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Gold Corner Clasps */}
        <div className="pointer-events-none absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-[#d4af37]/70 rounded-tl-lg" />
        <div className="pointer-events-none absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-[#d4af37]/70 rounded-tr-lg" />
        <div className="pointer-events-none absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-[#d4af37]/70 rounded-bl-lg" />
        <div className="pointer-events-none absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-[#d4af37]/70 rounded-br-lg" />

        {/* Notebook Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#18130f] border-b border-[#5e472b] relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2a2119] border border-[#c8a45a]/70 flex items-center justify-center text-[#e6c77c] shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel font-black text-base sm:text-xl text-[#e6c77c] tracking-wider uppercase">
                Diario de {character.name}
              </h2>
              <p className="text-xs text-[#b8a68e]">
                Cuaderno de Crónicas • {journalIndex.totalSheets}{' '}
                {journalIndex.totalSheets === 1 ? 'hoja escrita' : 'hojas escritas'} (1 hoja por nota)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSheetNumber !== 'index' && (
              <button
                type="button"
                onClick={() => navigateToSheet('index')}
                className="px-3.5 py-1.5 rounded-xl bg-[#2a2119] hover:bg-[#382c21] border border-[#c8a45a]/60 text-[#e6c77c] font-cinzel font-bold text-xs flex items-center gap-1.5 transition shadow"
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Índice de Hojas</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleStartNewSheet}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#b88c38] to-[#d6ab54] hover:from-[#c99b42] hover:to-[#e3ba64] text-stone-950 font-cinzel font-black text-xs flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Hoja</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#261f19] hover:bg-[#362c23] text-[#c8b7a1] hover:text-white border border-[#5e472b] transition"
              aria-label="Cerrar diario"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Open Two-Page Notebook Spread */}
        <div
          className={`flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto transition-all duration-200 ${
            isFlipping ? 'opacity-30 scale-[0.99]' : 'opacity-100 scale-100'
          }`}
        >
          {/* LEFT PAGE: Always-Ready Quick Scratchpad (Apunte Rápido) */}
          <div className="lg:col-span-5 p-5 sm:p-6 bg-[#1f1914] border-b lg:border-b-0 lg:border-r-2 border-[#4a3823] flex flex-col justify-between relative">
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-[#4a3823] pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#e6c77c]" />
                  <h3 className="font-cinzel font-bold text-sm text-[#e6c77c] uppercase tracking-wider">
                    Apunte Rápido de Sesión
                  </h3>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Autoguardado
                </span>
              </div>

              <p className="text-xs text-[#b8a68e] leading-relaxed">
                Usa esta contratapa para anotar pistas rápidas, nombres de NPCs, acertijos o recordatorios inmediatos sin cambiar de hoja.
              </p>

              <textarea
                disabled={isLocked}
                value={character.notes || ''}
                onChange={(e) =>
                  onUpdateCharacter({
                    ...character,
                    notes: e.target.value,
                  })
                }
                placeholder="Escribe aquí tus apuntes rápidos de jugador..."
                className="w-full flex-1 min-h-[220px] bg-[#16120e] border border-[#523e27] focus:border-[#c8a45a] rounded-2xl p-4 text-xs sm:text-sm text-[#ecdcc6] leading-relaxed outline-none resize-none shadow-inner"
              />
            </div>

            <div className="pt-3 mt-3 border-t border-[#3d2e1d] flex items-center justify-between text-[11px] text-[#9c886e] font-cinzel">
              <span>Propietario: {character.name}</span>
              <span>Total: {journalIndex.totalSheets} Hojas</span>
            </div>
          </div>

          {/* RIGHT PAGE: Cover Summary Index OR Individual Journal Sheet OR Sheet Editor */}
          <div className="lg:col-span-7 p-5 sm:p-6 bg-[#241d17] flex flex-col justify-between min-h-[420px]">
            {isEditingSheet ? (
              /* CREATE / EDIT SHEET FORM */
              <form onSubmit={handleSaveSheet} className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[#4a3823] pb-2.5">
                    <h3 className="font-cinzel font-bold text-base text-[#e6c77c]">
                      {editingEntryId ? 'Editar Hoja del Diario' : 'Escribir Nueva Hoja en el Diario'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingSheet(false)}
                      className="text-xs text-[#b8a68e] hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-cinzel font-bold text-[#e6c77c] mb-1">
                        Sesión #
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={sheetForm.sessionNumber}
                        onChange={(e) =>
                          setSheetForm({
                            ...sheetForm,
                            sessionNumber: Math.max(1, parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className="w-full bg-[#16120e] border border-[#523e27] focus:border-[#c8a45a] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#e6c77c] outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-cinzel font-bold text-[#e6c77c] mb-1">
                        Título de la Entrada *
                      </label>
                      <input
                        type="text"
                        required
                        value={sheetForm.title}
                        onChange={(e) => setSheetForm({ ...sheetForm, title: e.target.value })}
                        placeholder="Ej. El Secreto de los Túneles Subterráneos"
                        className="w-full bg-[#16120e] border border-[#523e27] focus:border-[#c8a45a] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-cinzel font-bold text-[#b8a68e] mb-1">
                        Fecha en el Mundo (Opc.)
                      </label>
                      <input
                        type="text"
                        value={sheetForm.dateInGame}
                        onChange={(e) => setSheetForm({ ...sheetForm, dateInGame: e.target.value })}
                        placeholder="Ej. 14 de Tarsakh"
                        className="w-full bg-[#16120e] border border-[#523e27] focus:border-[#c8a45a] rounded-xl px-3 py-2 text-xs text-[#ecdcc6] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-cinzel font-bold text-[#e6c77c] mb-1">
                      Resumen Breve (Opcional)
                    </label>
                    <input
                      type="text"
                      value={sheetForm.summary}
                      onChange={(e) => setSheetForm({ ...sheetForm, summary: e.target.value })}
                      placeholder="Síntesis de lo ocurrido en esta sesión..."
                      className="w-full bg-[#16120e] border border-[#523e27] focus:border-[#c8a45a] rounded-xl px-3 py-2 text-xs text-[#ecdcc6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-cinzel font-bold text-[#e6c77c] mb-1">
                      Contenido de la Hoja (Crónica y Apuntes)
                    </label>
                    <textarea
                      rows={7}
                      value={sheetForm.notes}
                      onChange={(e) => setSheetForm({ ...sheetForm, notes: e.target.value })}
                      placeholder="Relata aquí los descubrimientos, combates, tesoros y decisiones de la sesión..."
                      className="w-full bg-[#16120e] border border-[#523e27] focus:border-[#c8a45a] rounded-xl p-3.5 text-xs sm:text-sm text-[#ecdcc6] leading-relaxed outline-none resize-y"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#4a3823]">
                  <button
                    type="button"
                    onClick={() => setIsEditingSheet(false)}
                    className="px-4 py-2 rounded-xl bg-[#16120e] hover:bg-[#2c231b] text-[#b8a68e] text-xs font-cinzel"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#b88c38] to-[#d6ab54] text-stone-950 font-cinzel font-black text-xs shadow-lg"
                  >
                    Guardar Hoja
                  </button>
                </div>
              </form>
            ) : activeSheetNumber === 'index' || !currentSheetEntry ? (
              /* COVER / INDEX SUMMARY OF ALL SHEETS */
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#4a3823] pb-2.5">
                    <div>
                      <h3 className="font-cinzel font-black text-base text-[#e6c77c] uppercase tracking-wider">
                        Carátula • Resumen de Hojas del Diario
                      </h3>
                      <p className="text-xs text-[#b8a68e]">
                        Tienes <strong className="text-[#e6c77c]">{journalIndex.totalSheets}</strong>{' '}
                        {journalIndex.totalSheets === 1 ? 'hoja escrita' : 'hojas escritas'} en tu cuaderno. Haz clic en cualquier entrada para ir a su hoja.
                      </p>
                    </div>
                  </div>

                  {journalIndex.items.length === 0 ? (
                    <div className="bg-[#18130f]/80 border border-[#4a3823] rounded-2xl p-8 text-center space-y-3 my-4">
                      <FileText className="w-10 h-10 text-[#8a7256] mx-auto" />
                      <h4 className="font-cinzel font-bold text-sm text-[#e6c77c]">
                        Tu cuaderno aún no tiene hojas de sesión registradas
                      </h4>
                      <p className="text-xs text-[#b8a68e] max-w-md mx-auto">
                        Cada nota del diario ocupa una hoja separada numerada en este índice. Pulsa <strong>"Nueva Hoja"</strong> para inaugurar la Hoja 1.
                      </p>
                      <button
                        type="button"
                        onClick={handleStartNewSheet}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#b88c38] to-[#d6ab54] text-stone-950 font-cinzel font-black text-xs inline-flex items-center gap-1.5 shadow"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Crear Hoja 1</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                      {journalIndex.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigateToSheet(item.sheetNumber)}
                          className="w-full text-left p-3.5 rounded-xl bg-[#18130f] hover:bg-[#2e241b] border border-[#4a3823] hover:border-[#c8a45a] transition flex items-center justify-between gap-3 group shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-[#2a2119] border border-[#c8a45a]/40 text-[#e6c77c] font-mono font-bold text-[11px]">
                                Sesión {item.sessionNumber}
                              </span>
                              <span className="font-cinzel font-bold text-sm text-[#f3e5d0] group-hover:text-[#e6c77c] truncate">
                                {item.title}
                              </span>
                            </div>
                            {item.dateInGame && (
                              <div className="text-[11px] text-[#a8957c] mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#c8a45a]" />
                                <span>Fecha en el mundo: {item.dateInGame}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="block font-cinzel font-black text-xs text-[#e6c77c]">
                                Hoja #{item.sheetNumber}
                              </span>
                              <span className="block text-[10px] text-[#9c886e] font-mono">
                                ({item.pagesOccupied} hoja)
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#c8a45a] group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#4a3823] flex items-center justify-between text-xs text-[#9c886e] font-cinzel">
                  <span>Carátula / Índice General</span>
                  <span>1 hoja por entrada</span>
                </div>
              </div>
            ) : (
              /* INDIVIDUAL JOURNAL SHEET VIEW */
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 border-b border-[#4a3823] pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#16120e] border border-[#c8a45a]/60 text-[#e6c77c] font-cinzel font-bold text-xs">
                          Hoja #{activeSheetNumber} de {journalIndex.totalSheets}
                        </span>
                        <span className="text-xs font-mono text-[#c8a45a] font-bold">
                          • Sesión {currentSheetEntry.sessionNumber}
                        </span>
                        {currentSheetEntry.dateInGame && (
                          <span className="text-xs text-[#b8a68e]">
                            • {currentSheetEntry.dateInGame}
                          </span>
                        )}
                      </div>
                      <h3 className="font-cinzel font-black text-lg sm:text-xl text-[#f5e9d7] mt-1.5">
                        {currentSheetEntry.title}
                      </h3>
                    </div>

                    {!isLocked && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditSheet(currentSheetEntry)}
                          className="p-2 rounded-xl bg-[#16120e] hover:bg-[#2e241b] text-[#e6c77c] border border-[#523e27]"
                          title="Editar esta hoja"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSheet(currentSheetEntry.id)}
                          className="p-2 rounded-xl bg-[#16120e] hover:bg-red-950/60 text-red-400 border border-[#523e27]"
                          title="Arrancar/Eliminar esta hoja"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {currentSheetEntry.summary && (
                    <div className="p-3 rounded-xl bg-[#18130f] border border-[#523e27] text-xs text-[#e6c77c]">
                      <strong className="uppercase font-cinzel block text-[10px] text-[#b8a68e] mb-0.5">
                        Resumen de la Sesión:
                      </strong>
                      {currentSheetEntry.summary}
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-[#18130f]/90 border border-[#4a3823] min-h-[230px] text-xs sm:text-sm text-[#ecdcc6] leading-relaxed whitespace-pre-line">
                    {currentSheetEntry.notes || 'Esta hoja no tiene apuntes adicionales aún.'}
                  </div>
                </div>

                {/* Page Turn Footer Controls */}
                <div className="pt-3 border-t border-[#4a3823] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={activeSheetNumber <= 1}
                    onClick={() =>
                      typeof activeSheetNumber === 'number' &&
                      navigateToSheet(Math.max(1, activeSheetNumber - 1))
                    }
                    className="px-3 py-1.5 rounded-xl bg-[#16120e] hover:bg-[#2e241b] disabled:opacity-30 border border-[#523e27] text-[#e6c77c] font-cinzel font-bold text-xs flex items-center gap-1 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Hoja Anterior</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateToSheet('index')}
                    className="text-xs font-cinzel font-bold text-[#c8a45a] hover:underline"
                  >
                    Ver Carátula ({journalIndex.totalSheets} hojas)
                  </button>

                  <button
                    type="button"
                    disabled={
                      typeof activeSheetNumber === 'number' &&
                      activeSheetNumber >= journalIndex.totalSheets
                    }
                    onClick={() =>
                      typeof activeSheetNumber === 'number' &&
                      navigateToSheet(Math.min(journalIndex.totalSheets, activeSheetNumber + 1))
                    }
                    className="px-3 py-1.5 rounded-xl bg-[#16120e] hover:bg-[#2e241b] disabled:opacity-30 border border-[#523e27] text-[#e6c77c] font-cinzel font-bold text-xs flex items-center gap-1 transition"
                  >
                    <span>Siguiente Hoja</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
