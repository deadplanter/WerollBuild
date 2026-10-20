import React, { useState } from 'react';
import { X, Folder, FolderPlus, Edit, Trash2, ChevronRight, Layers, AlertCircle, Check } from 'lucide-react';
import { DMWorkspace } from '../../types/dnd';
import { getFolderDepth } from '../../utils/storage';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: DMWorkspace;
  onUpdateWorkspace: (updated: DMWorkspace) => void;
  onSelectFolder: (folder: string) => void;
}

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  workspace,
  onUpdateWorkspace,
  onSelectFolder,
}) => {
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [selectedParentFolder, setSelectedParentFolder] = useState<string>('root');
  const [editingFolderOriginal, setEditingFolderOriginal] = useState<string | null>(null);
  const [editingFolderNewName, setEditingFolderNewName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const currentFolders = workspace.folders || [];

  // Group folders by depth
  // Level 1: depth 1 (no ' / ')
  // Level 2: depth 2 (one ' / ')
  // Level 3: depth 3 (two ' / ')
  const level1Folders = currentFolders.filter((f) => getFolderDepth(f) === 1);
  const level2Folders = currentFolders.filter((f) => getFolderDepth(f) === 2);
  const eligibleParents = [...level1Folders, ...level2Folders];

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setErrorMsg('El nombre de la carpeta no puede estar vacío.');
      return;
    }
    if (trimmed.includes('/')) {
      setErrorMsg('El nombre no debe contener barras ("/"). Selecciona la carpeta padre abajo.');
      return;
    }

    let fullPath = trimmed;
    if (selectedParentFolder !== 'root') {
      const parentDepth = getFolderDepth(selectedParentFolder);
      if (parentDepth >= 3) {
        setErrorMsg('Límite alcanzado: Máximo 3 niveles de carpetas consecutivas (Carpeta / Subcarpeta / Sub-subcarpeta).');
        return;
      }
      fullPath = `${selectedParentFolder} / ${trimmed}`;
    }

    if (currentFolders.includes(fullPath)) {
      setErrorMsg('Ya existe una carpeta con esa ruta.');
      return;
    }

    const updatedFolders = [...currentFolders, fullPath].sort();
    onUpdateWorkspace({
      ...workspace,
      folders: updatedFolders,
    });

    setNewFolderName('');
    setSuccessMsg(`¡Carpeta "${fullPath}" creada con éxito!`);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const handleStartRename = (folder: string) => {
    setEditingFolderOriginal(folder);
    const parts = folder.split(' / ');
    setEditingFolderNewName(parts[parts.length - 1] || folder);
    setErrorMsg('');
  };

  const handleSaveRename = (original: string) => {
    setErrorMsg('');
    const trimmed = editingFolderNewName.trim();
    if (!trimmed || trimmed.includes('/')) {
      setErrorMsg('Nombre inválido (no debe contener barras).');
      return;
    }

    const parts = original.split(' / ');
    parts[parts.length - 1] = trimmed;
    const newFullPath = parts.join(' / ');

    if (newFullPath === original) {
      setEditingFolderOriginal(null);
      return;
    }

    if (currentFolders.includes(newFullPath)) {
      setErrorMsg('Ya existe una carpeta con ese nombre en este nivel.');
      return;
    }

    // Cascade rename child folders
    const updatedFolders = currentFolders.map((f) => {
      if (f === original) return newFullPath;
      if (f.startsWith(`${original} / `)) {
        return f.replace(`${original} / `, `${newFullPath} / `);
      }
      return f;
    });

    // Cascade rename entities
    const updateEntityFolder = (folderProp?: string) => {
      if (!folderProp) return folderProp;
      if (folderProp === original) return newFullPath;
      if (folderProp.startsWith(`${original} / `)) {
        return folderProp.replace(`${original} / `, `${newFullPath} / `);
      }
      return folderProp;
    };

    const updatedNpcs = (workspace.npcs || []).map((n) => ({ ...n, folder: updateEntityFolder(n.folder) || 'General' }));
    const updatedMonsters = (workspace.monsters || []).map((m) => ({ ...m, folder: updateEntityFolder(m.folder) || 'General' }));
    const updatedLocations = (workspace.locations || []).map((l) => ({ ...l, folder: updateEntityFolder(l.folder) || 'General' }));
    const updatedLogs = (workspace.campaignLogs || []).map((l) => ({ ...l, folder: updateEntityFolder(l.folder) || 'General' }));
    const updatedSummaries = (workspace.combatSummaries || []).map((s) => ({ ...s, folder: updateEntityFolder(s.folder) || 'General' }));
    const updatedCustom = (workspace.customItemsAndSpells || []).map((c) => ({ ...c, folder: updateEntityFolder(c.folder) || 'General' }));

    onUpdateWorkspace({
      ...workspace,
      folders: updatedFolders,
      npcs: updatedNpcs,
      monsters: updatedMonsters,
      locations: updatedLocations,
      campaignLogs: updatedLogs,
      combatSummaries: updatedSummaries,
      customItemsAndSpells: updatedCustom,
    });

    setEditingFolderOriginal(null);
    setSuccessMsg(`Carpeta renombrada a "${newFullPath}".`);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const handleDeleteFolder = (folderToDelete: string) => {
    if (!confirm(`¿Eliminar la carpeta "${folderToDelete}" y todas sus subcarpetas? Los elementos se moverán a "General".`)) {
      return;
    }

    const updatedFolders = currentFolders.filter(
      (f) => f !== folderToDelete && !f.startsWith(`${folderToDelete} / `)
    );

    const reassign = (fProp?: string) => {
      if (fProp === folderToDelete || fProp?.startsWith(`${folderToDelete} / `)) {
        return 'General';
      }
      return fProp;
    };

    onUpdateWorkspace({
      ...workspace,
      folders: updatedFolders,
      npcs: (workspace.npcs || []).map((n) => ({ ...n, folder: reassign(n.folder) || 'General' })),
      monsters: (workspace.monsters || []).map((m) => ({ ...m, folder: reassign(m.folder) || 'General' })),
      locations: (workspace.locations || []).map((l) => ({ ...l, folder: reassign(l.folder) || 'General' })),
      campaignLogs: (workspace.campaignLogs || []).map((l) => ({ ...l, folder: reassign(l.folder) || 'General' })),
      combatSummaries: (workspace.combatSummaries || []).map((s) => ({ ...s, folder: reassign(s.folder) || 'General' })),
      customItemsAndSpells: (workspace.customItemsAndSpells || []).map((c) => ({ ...c, folder: reassign(c.folder) || 'General' })),
    });

    setSuccessMsg('Carpeta eliminada.');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  // Helper to count items inside a folder (including children)
  const countItemsInFolder = (f: string) => {
    const match = (folderProp?: string) => folderProp === f || folderProp?.startsWith(`${f} / `);
    const npcs = (workspace.npcs || []).filter((n) => match(n.folder)).length;
    const mons = (workspace.monsters || []).filter((m) => match(m.folder)).length;
    const locs = (workspace.locations || []).filter((l) => match(l.folder)).length;
    const logs = (workspace.campaignLogs || []).filter((l) => match(l.folder)).length;
    const sums = (workspace.combatSummaries || []).filter((s) => match(s.folder)).length;
    const items = (workspace.customItemsAndSpells || []).filter((i) => match(i.folder)).length;
    return npcs + mons + locs + logs + sums + items;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-[#181920] border-2 border-amber-800/80 rounded-2xl shadow-2xl p-6 text-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-600/50 flex items-center justify-center text-amber-300">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-lg text-amber-300">
                Gestión de Carpetas Jerárquicas (Hasta 3 Niveles)
              </h3>
              <p className="text-[11px] text-stone-400">
                Estructura tu campaña en Carpetas Principales, Subcarpetas y Sub-subcarpetas.
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

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-950/80 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-3 p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-xs text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Create Folder Form */}
        <form onSubmit={handleCreateFolder} className="bg-[#121316] border border-stone-800 rounded-xl p-4 mb-4">
          <h4 className="font-cinzel font-bold text-xs text-amber-300 mb-2.5 flex items-center gap-1.5">
            <FolderPlus className="w-4 h-4 text-amber-400" />
            Crear Nueva Carpeta o Subcarpeta
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] text-stone-400 mb-1">Nombre de la Carpeta:</label>
              <input
                type="text"
                placeholder="Ej. Taberna del Jabalí"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full bg-[#181920] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-stone-400 mb-1">Ubicación / Carpeta Padre:</label>
              <select
                value={selectedParentFolder}
                onChange={(e) => setSelectedParentFolder(e.target.value)}
                className="w-full bg-[#181920] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 cursor-pointer"
              >
                <option value="root">📁 Raíz (Carpeta Principal - Nivel 1)</option>
                {eligibleParents.map((p) => {
                  const depth = getFolderDepth(p);
                  return (
                    <option key={p} value={p}>
                      {depth === 1 ? `↳ 📂 ${p} (Nivel 2)` : `   ↳ 📄 ${p} (Nivel 3)`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs rounded-lg shadow transition flex items-center justify-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Crear Carpeta</span>
          </button>
        </form>

        {/* Existing Folders Tree */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
          <div className="flex items-center justify-between text-xs font-cinzel font-bold text-stone-400 pb-1">
            <span>Carpetas Existentes ({currentFolders.length})</span>
            <span className="text-[10px] text-stone-500 font-sans">
              Haz clic para filtrar la vista del DM
            </span>
          </div>

          {currentFolders.length === 0 ? (
            <p className="text-xs text-stone-500 italic py-6 text-center">
              No tienes carpetas personalizadas aún. ¡Crea una arriba!
            </p>
          ) : (
            currentFolders.map((f) => {
              const depth = getFolderDepth(f);
              const parts = f.split(' / ');
              const folderBaseName = parts[parts.length - 1];
              const totalItems = countItemsInFolder(f);
              const isEditing = editingFolderOriginal === f;

              return (
                <div
                  key={f}
                  className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                    depth === 1
                      ? 'bg-[#181920] border-amber-900/60 shadow-sm'
                      : depth === 2
                      ? 'bg-[#15161d] border-stone-800 ml-4'
                      : 'bg-[#121318] border-stone-800/80 ml-8'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className={`text-xs ${
                        depth === 1
                          ? 'text-amber-400 font-bold'
                          : depth === 2
                          ? 'text-amber-300'
                          : 'text-stone-400'
                      }`}
                    >
                      {depth === 1 ? '📁' : depth === 2 ? '↳ 📂' : '   ↳ 📄'}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editingFolderNewName}
                          onChange={(e) => setEditingFolderNewName(e.target.value)}
                          className="bg-[#121316] border border-amber-500 rounded px-2 py-0.5 text-xs text-stone-100 flex-1 font-semibold"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(f)}
                          className="px-2 py-0.5 bg-amber-600 text-white rounded text-xs font-bold"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingFolderOriginal(null)}
                          className="px-2 py-0.5 text-stone-400 hover:text-stone-200 text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          onSelectFolder(f);
                          onClose();
                        }}
                        className="cursor-pointer truncate group flex-1"
                        title={`Filtrar DM por ${f}`}
                      >
                        <span className="font-cinzel text-xs font-bold text-stone-200 group-hover:text-amber-300 transition">
                          {folderBaseName}
                        </span>
                        {depth > 1 && (
                          <span className="text-[10px] text-stone-500 font-mono ml-2">
                            ({f})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-mono" title="Elementos en esta carpeta y subcarpetas">
                        {totalItems} elems
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartRename(f)}
                        className="p-1 text-stone-400 hover:text-amber-400 rounded hover:bg-stone-800"
                        title="Renombrar carpeta"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(f)}
                        className="p-1 text-stone-500 hover:text-red-400 rounded hover:bg-stone-800"
                        title="Eliminar carpeta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-800 mt-4 flex justify-between items-center text-xs text-stone-400">
          <span>Nivel 1 (Principal) • Nivel 2 (Subcarpeta) • Nivel 3 (Sub-subcarpeta)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-cinzel font-semibold transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
