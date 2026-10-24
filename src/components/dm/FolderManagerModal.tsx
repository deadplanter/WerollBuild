import React, { useState, useMemo } from 'react';
import {
  X,
  Folder,
  FolderOpen,
  FolderPlus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Check,
  Compass,
  Camera,
  MapPin,
  Plus,
  Upload,
  ListPlus,
  ExternalLink,
  Layers,
} from 'lucide-react';
import {
  DMWorkspace,
  PlaceAlbumPhoto,
  LocationRecord,
  ZoneMapRecord,
} from '../../types/dnd';
import { getFolderDepth } from '../../utils/storage';
import {
  ensureCompleteFolderHierarchy,
  enqueueVisualItem,
} from '../../utils/dnd-math';
import { compressImageFileToDataUrl } from '../../utils/imageCompressor';

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
  const [activeExplorerFolder, setActiveExplorerFolder] = useState<string>(
    () => workspace.activeAtlasFolder || 'all'
  );
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [selectedParentFolder, setSelectedParentFolder] = useState<string>('root');
  const [editingFolderOriginal, setEditingFolderOriginal] = useState<string | null>(null);
  const [editingFolderNewName, setEditingFolderNewName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Inline Visual Item Editor state inside the Folder Explorer
  const [editingVisualItem, setEditingVisualItem] = useState<{
    kind: 'map' | 'album' | 'tactical';
    id: string;
    title: string;
    imageUrl: string;
    folder: string;
    isPrimaryCover?: boolean;
  } | null>(null);

  // Quick Add Visual inside Explorer
  const [newVisualKind, setNewVisualKind] = useState<'map' | 'tactical' | 'album'>('album');
  const [newVisualTitle, setNewVisualTitle] = useState<string>('');
  const [newVisualUrl, setNewVisualUrl] = useState<string>('');

  const currentFolders = useMemo(
    () => ensureCompleteFolderHierarchy(workspace.folders || []),
    [workspace.folders]
  );

  if (!isOpen) return null;

  const level1Folders = currentFolders.filter((f) => getFolderDepth(f) === 1);
  const level2Folders = currentFolders.filter((f) => getFolderDepth(f) === 2);
  const level3Folders = currentFolders.filter((f) => getFolderDepth(f) === 3);
  const eligibleParents = [...level1Folders, ...level2Folders, ...level3Folders];

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2600);
  };

  const handleCreateFolder = (e: React.FormEvent, overrideParent?: string) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setErrorMsg('El nombre del lugar / carpeta no puede estar vacío.');
      return;
    }
    if (trimmed.includes('/')) {
      setErrorMsg('El nombre no debe contener barras ("/"). Selecciona el lugar padre.');
      return;
    }

    const parentToUse = overrideParent !== undefined ? overrideParent : selectedParentFolder;
    let fullPath = trimmed;
    if (parentToUse !== 'root' && parentToUse !== 'all') {
      const parentDepth = getFolderDepth(parentToUse);
      if (parentDepth >= 4) {
        setErrorMsg(
          'Límite alcanzado: Máximo 4 niveles de lugares bajo el Mundo (Región / Ciudad / Lugar / Sub-lugar).'
        );
        return;
      }
      fullPath = `${parentToUse} / ${trimmed}`;
    }

    if (currentFolders.includes(fullPath)) {
      setErrorMsg('Ya existe un lugar o carpeta con esa ruta.');
      return;
    }

    const updatedFolders = [...currentFolders, fullPath].sort();
    onUpdateWorkspace({
      ...workspace,
      folders: updatedFolders,
    });

    setNewFolderName('');
    setActiveExplorerFolder(fullPath);
    notifySuccess(`¡Carpeta "${fullPath}" creada con éxito!`);
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
      setErrorMsg('Ya existe un lugar con ese nombre en este nivel.');
      return;
    }

    const updatedFolders = currentFolders.map((f) => {
      if (f === original) return newFullPath;
      if (f.startsWith(`${original} / `)) {
        return f.replace(`${original} / `, `${newFullPath} / `);
      }
      return f;
    });

    const updateEntityFolder = (folderProp?: string) => {
      if (!folderProp) return folderProp;
      if (folderProp === original) return newFullPath;
      if (folderProp.startsWith(`${original} / `)) {
        return folderProp.replace(`${original} / `, `${newFullPath} / `);
      }
      return folderProp;
    };

    const updatedAtlasMaps: Record<string, string> = {};
    for (const [k, v] of Object.entries(workspace.atlasMaps || {})) {
      const nextKey = updateEntityFolder(k) || k;
      updatedAtlasMaps[nextKey] = v;
    }

    const updatedPinPositions: Record<string, { x: number; y: number }> = {};
    for (const [k, v] of Object.entries(workspace.atlasPinPositions || {})) {
      const nextKey = updateEntityFolder(k) || k;
      updatedPinPositions[nextKey] = v;
    }

    onUpdateWorkspace({
      ...workspace,
      folders: updatedFolders,
      npcs: (workspace.npcs || []).map((n) => ({
        ...n,
        folder: updateEntityFolder(n.folder) || 'General',
      })),
      monsters: (workspace.monsters || []).map((m) => ({
        ...m,
        folder: updateEntityFolder(m.folder) || 'General',
      })),
      locations: (workspace.locations || []).map((l) => ({
        ...l,
        folder: updateEntityFolder(l.folder) || 'General',
      })),
      campaignLogs: (workspace.campaignLogs || []).map((l) => ({
        ...l,
        folder: updateEntityFolder(l.folder) || 'General',
      })),
      combatSummaries: (workspace.combatSummaries || []).map((s) => ({
        ...s,
        folder: updateEntityFolder(s.folder) || 'General',
      })),
      customItemsAndSpells: (workspace.customItemsAndSpells || []).map((c) => ({
        ...c,
        folder: updateEntityFolder(c.folder) || 'General',
      })),
      placeAlbumPhotos: (workspace.placeAlbumPhotos || []).map((p) => ({
        ...p,
        folder: updateEntityFolder(p.folder) || 'all',
      })),
      zoneMaps: (workspace.zoneMaps || []).map((zm) => ({
        ...zm,
        folder: updateEntityFolder(zm.folder) || 'all',
      })),
      visualQueue: (workspace.visualQueue || []).map((q) => ({
        ...q,
        folder: updateEntityFolder(q.folder) || 'all',
      })),
      atlasMaps: updatedAtlasMaps,
      atlasPinPositions: updatedPinPositions,
    });

    if (activeExplorerFolder === original) {
      setActiveExplorerFolder(newFullPath);
    }
    setEditingFolderOriginal(null);
    notifySuccess(`Carpeta renombrada a "${newFullPath}".`);
  };

  const handleDeleteFolder = (folderToDelete: string) => {
    const updatedFolders = currentFolders.filter(
      (f) => f !== folderToDelete && !f.startsWith(`${folderToDelete} / `)
    );

    const reassign = (fProp?: string) => {
      if (fProp === folderToDelete || fProp?.startsWith(`${folderToDelete} / `)) {
        return 'General';
      }
      return fProp;
    };

    const updatedAtlasMaps: Record<string, string> = {};
    for (const [k, v] of Object.entries(workspace.atlasMaps || {})) {
      if (k !== folderToDelete && !k.startsWith(`${folderToDelete} / `)) {
        updatedAtlasMaps[k] = v;
      }
    }

    const updatedPinPositions: Record<string, { x: number; y: number }> = {};
    for (const [k, v] of Object.entries(workspace.atlasPinPositions || {})) {
      if (k !== folderToDelete && !k.startsWith(`${folderToDelete} / `)) {
        updatedPinPositions[k] = v;
      }
    }

    onUpdateWorkspace({
      ...workspace,
      folders: updatedFolders,
      npcs: (workspace.npcs || []).map((n) => ({ ...n, folder: reassign(n.folder) || 'General' })),
      monsters: (workspace.monsters || []).map((m) => ({
        ...m,
        folder: reassign(m.folder) || 'General',
      })),
      locations: (workspace.locations || []).map((l) => ({
        ...l,
        folder: reassign(l.folder) || 'General',
      })),
      campaignLogs: (workspace.campaignLogs || []).map((l) => ({
        ...l,
        folder: reassign(l.folder) || 'General',
      })),
      combatSummaries: (workspace.combatSummaries || []).map((s) => ({
        ...s,
        folder: reassign(s.folder) || 'General',
      })),
      customItemsAndSpells: (workspace.customItemsAndSpells || []).map((c) => ({
        ...c,
        folder: reassign(c.folder) || 'General',
      })),
      placeAlbumPhotos: (workspace.placeAlbumPhotos || []).map((p) => ({
        ...p,
        folder:
          p.folder === folderToDelete || p.folder?.startsWith(`${folderToDelete} / `)
            ? 'all'
            : p.folder,
      })),
      zoneMaps: (workspace.zoneMaps || []).map((zm) => ({
        ...zm,
        folder:
          zm.folder === folderToDelete || zm.folder?.startsWith(`${folderToDelete} / `)
            ? 'all'
            : zm.folder,
      })),
      atlasMaps: updatedAtlasMaps,
      atlasPinPositions: updatedPinPositions,
    });

    if (activeExplorerFolder === folderToDelete) {
      setActiveExplorerFolder('all');
    }
    notifySuccess(`Carpeta "${folderToDelete}" eliminada.`);
  };

  // Count visuals + entities in folder
  const countItemsInFolder = (f: string) => {
    const match = (folderProp?: string) =>
      f === 'all'
        ? !folderProp || folderProp === 'all' || folderProp === 'General'
        : folderProp === f || folderProp?.startsWith(`${f} / `);
    const npcs = (workspace.npcs || []).filter((n) => match(n.folder)).length;
    const mons = (workspace.monsters || []).filter((m) => match(m.folder)).length;
    const locs = (workspace.locations || []).filter((l) => match(l.folder)).length;
    const photos = (workspace.placeAlbumPhotos || []).filter((p) => match(p.folder)).length;
    const zMaps = (workspace.zoneMaps || []).filter((zm) => match(zm.folder)).length;
    const hasCover = Boolean(workspace.atlasMaps?.[f]);
    return npcs + mons + locs + photos + zMaps + (hasCover ? 1 : 0);
  };

  // Direct sub-folders of activeExplorerFolder
  const directSubFolders = currentFolders.filter((f) => {
    if (activeExplorerFolder === 'all') {
      return getFolderDepth(f) === 1;
    }
    const targetDepth = getFolderDepth(activeExplorerFolder) + 1;
    return f.startsWith(`${activeExplorerFolder} / `) && getFolderDepth(f) === targetDepth;
  });

  // Visuals inside activeExplorerFolder
  const folderMatchesExact = (folderProp?: string) => {
    if (activeExplorerFolder === 'all') {
      return !folderProp || folderProp === 'all' || folderProp === 'General';
    }
    return folderProp === activeExplorerFolder;
  };

  const folderCoverMapUrl = workspace.atlasMaps?.[activeExplorerFolder] || '';
  const folderExtraMaps = (workspace.zoneMaps || []).filter((zm) =>
    folderMatchesExact(zm.folder)
  );
  const folderTacticalMaps = (workspace.locations || []).filter((loc) =>
    folderMatchesExact(loc.folder)
  );
  const folderAlbumPhotos = (workspace.placeAlbumPhotos || []).filter((p) =>
    folderMatchesExact(p.folder)
  );
  const folderNpcs = (workspace.npcs || []).filter((n) => folderMatchesExact(n.folder));
  const folderMonsters = (workspace.monsters || []).filter((m) => folderMatchesExact(m.folder));

  const activeFolderLabel =
    activeExplorerFolder === 'all'
      ? 'Mundo Completo (Raíz)'
      : activeExplorerFolder.split('/').pop()?.trim() || activeExplorerFolder;

  const handleEnqueueVisual = (item: {
    id: string;
    kind: 'map' | 'album' | 'tactical';
    title: string;
    imageUrl: string;
    folder: string;
  }) => {
    const nextQueue = enqueueVisualItem(workspace.visualQueue, item);
    onUpdateWorkspace({
      ...workspace,
      visualQueue: nextQueue,
    });
    notifySuccess(`"${item.title}" añadido a la Cola de Proyección (${nextQueue.length}).`);
  };

  const handleSaveEditedVisual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVisualItem) return;
    const { kind, id, title, imageUrl, folder, isPrimaryCover } = editingVisualItem;
    const cleanTitle = title.trim() || 'Visual';
    const cleanUrl = imageUrl.trim();
    const cleanFolder = folder || 'all';

    if (kind === 'map' && isPrimaryCover) {
      const nextAtlasMaps = { ...(workspace.atlasMaps || {}) };
      if (cleanUrl) {
        nextAtlasMaps[cleanFolder] = cleanUrl;
      } else {
        delete nextAtlasMaps[cleanFolder];
      }
      onUpdateWorkspace({
        ...workspace,
        atlasMaps: nextAtlasMaps,
      });
    } else if (kind === 'map') {
      onUpdateWorkspace({
        ...workspace,
        zoneMaps: (workspace.zoneMaps || []).map((zm) =>
          zm.id === id
            ? { ...zm, title: cleanTitle, imageUrl: cleanUrl, folder: cleanFolder }
            : zm
        ),
      });
    } else if (kind === 'album') {
      onUpdateWorkspace({
        ...workspace,
        placeAlbumPhotos: (workspace.placeAlbumPhotos || []).map((p) =>
          p.id === id
            ? { ...p, title: cleanTitle, imageUrl: cleanUrl, folder: cleanFolder }
            : p
        ),
      });
    } else if (kind === 'tactical') {
      onUpdateWorkspace({
        ...workspace,
        locations: (workspace.locations || []).map((l) =>
          l.id === id
            ? { ...l, name: cleanTitle, mapImageUrl: cleanUrl, folder: cleanFolder }
            : l
        ),
      });
    }

    setEditingVisualItem(null);
    notifySuccess(`"${cleanTitle}" actualizado correctamente.`);
  };

  const handleAddVisualInExplorer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisualTitle.trim() && !newVisualUrl.trim()) return;
    const finalTitle = newVisualTitle.trim() || `Visual de ${activeFolderLabel}`;
    const finalUrl = newVisualUrl.trim();
    const targetFolder = activeExplorerFolder === 'all' ? 'all' : activeExplorerFolder;

    if (newVisualKind === 'map') {
      const newMap: ZoneMapRecord = {
        id: `zmap-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        title: finalTitle,
        imageUrl: finalUrl,
        folder: targetFolder,
        createdAt: Date.now(),
      };
      onUpdateWorkspace({
        ...workspace,
        zoneMaps: [newMap, ...(workspace.zoneMaps || [])],
        atlasMaps:
          !workspace.atlasMaps?.[targetFolder] && finalUrl
            ? { ...(workspace.atlasMaps || {}), [targetFolder]: finalUrl }
            : workspace.atlasMaps,
      });
    } else if (newVisualKind === 'tactical') {
      const newLoc: LocationRecord = {
        id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: finalTitle,
        region: activeFolderLabel,
        type: 'Zona Táctica',
        description: '',
        secretsForDm: '',
        pointsOfInterest: [],
        mapImageUrl: finalUrl,
        folder: targetFolder === 'all' ? 'General' : targetFolder,
        gridCols: 10,
        gridRows: 8,
      };
      onUpdateWorkspace({
        ...workspace,
        locations: [newLoc, ...(workspace.locations || [])],
      });
    } else {
      const newPhoto: PlaceAlbumPhoto = {
        id: `alb-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        title: finalTitle,
        imageUrl: finalUrl,
        folder: targetFolder,
        createdAt: Date.now(),
      };
      onUpdateWorkspace({
        ...workspace,
        placeAlbumPhotos: [newPhoto, ...(workspace.placeAlbumPhotos || [])],
      });
    }

    setNewVisualTitle('');
    setNewVisualUrl('');
    notifySuccess(`"${finalTitle}" añadido a la carpeta ${activeFolderLabel}.`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
      data-testid="modal-world-folder-explorer"
    >
      <div className="relative w-full max-w-6xl bg-[#14161f] border-2 border-[#c8a45c] rounded-2xl shadow-2xl p-4 sm:p-6 text-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#c8a45c]/30 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-[#e2c275] flex items-center justify-center text-[#e2c275] shadow">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cinzel font-black text-base sm:text-lg text-[#f5e4be] uppercase tracking-wider">
                Explorador Masivo de Carpetas del Mundo
              </h3>
              <p className="text-xs text-stone-400">
                Navega y edita masivamente todos tus lugares, sub-lugares, mapas, mapas tácticos, álbumes y personajes como carpetas.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-folder-explorer"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 rounded-xl bg-stone-800/80 hover:bg-stone-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-950/80 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-xs text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main 2-Column Folder Explorer Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* LEFT PANE: FOLDER TREE + CREATE FOLDER */}
          <div className="lg:col-span-5 flex flex-col bg-[#10121a] border border-stone-800 rounded-xl p-3 overflow-hidden">
            {/* Create Folder Form */}
            <form
              onSubmit={(e) => handleCreateFolder(e)}
              className="bg-[#161924] border border-[#c8a45c]/40 rounded-xl p-3 mb-3 space-y-2"
            >
              <div className="font-cinzel font-bold text-xs text-[#e2c275] flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4" />
                <span>Nueva Carpeta / Sub-Lugar</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  data-testid="input-new-folder-name"
                  placeholder="Nombre (ej. Aguas Profundas)"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-[#10121a] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 focus:border-amber-500 outline-none"
                />
                <select
                  value={selectedParentFolder}
                  onChange={(e) => setSelectedParentFolder(e.target.value)}
                  className="w-full bg-[#10121a] border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100 cursor-pointer"
                >
                  <option value="root">🌍 Raíz del Mundo (Nivel 1)</option>
                  {eligibleParents.map((p) => {
                    const depth = getFolderDepth(p);
                    return (
                      <option key={p} value={p}>
                        {depth === 1 ? `⛰️ ${p}` : depth === 2 ? `↳ 🏰 ${p}` : `  ↳ 🍺 ${p}`}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                type="submit"
                data-testid="btn-submit-new-folder"
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-black text-xs rounded-lg shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Crear Carpeta</span>
              </button>
            </form>

            {/* Folder Tree List */}
            <div className="text-[11px] font-cinzel font-bold text-stone-400 uppercase mb-1.5 flex items-center justify-between px-1">
              <span>Árbol de Carpetas ({currentFolders.length + 1})</span>
              <span className="text-[10px] text-amber-300/80">Clic para abrir carpeta</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {/* Root Mundo Folder */}
              <div
                onClick={() => setActiveExplorerFolder('all')}
                className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                  activeExplorerFolder === 'all'
                    ? 'bg-amber-950/60 border-[#e2c275] text-[#f5e4be] shadow'
                    : 'bg-[#161924] border-stone-800 hover:border-stone-700 text-stone-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="w-4 h-4 text-[#e2c275] shrink-0" />
                  <span className="font-cinzel font-bold text-xs truncate">
                    🌍 Mundo Completo (Raíz)
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 border border-stone-700 text-amber-300 font-mono shrink-0">
                  {countItemsInFolder('all')} ítems
                </span>
              </div>

              {currentFolders.map((f) => {
                const depth = getFolderDepth(f);
                const parts = f.split(' / ');
                const folderBaseName = parts[parts.length - 1];
                const totalItems = countItemsInFolder(f);
                const isEditing = editingFolderOriginal === f;
                const isSelected = activeExplorerFolder === f;

                return (
                  <div
                    key={f}
                    onClick={() => !isEditing && setActiveExplorerFolder(f)}
                    className={`p-2 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/60 border-[#e2c275] text-[#f5e4be] shadow'
                        : 'bg-[#151722] border-stone-800/90 hover:border-stone-700 text-stone-300'
                    } ${
                      depth === 2
                        ? 'ml-3'
                        : depth === 3
                        ? 'ml-6'
                        : depth >= 4
                        ? 'ml-9'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingFolderNewName}
                            onChange={(e) => setEditingFolderNewName(e.target.value)}
                            className="bg-[#0e1017] border border-amber-500 rounded px-2 py-0.5 text-xs text-stone-100 flex-1"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(f)}
                            className="px-2 py-0.5 bg-amber-600 text-stone-950 rounded text-[10px] font-bold cursor-pointer"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFolderOriginal(null)}
                            className="px-1.5 py-0.5 text-stone-400 hover:text-white text-[10px] cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="truncate flex-1">
                          <span className="font-cinzel text-xs font-bold block truncate">
                            {folderBaseName}
                          </span>
                          {depth > 1 && (
                            <span className="text-[9px] text-stone-500 font-mono block truncate">
                              {f}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-900 text-stone-400 font-mono">
                          {totalItems}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartRename(f)}
                          className="p-1 text-stone-400 hover:text-amber-300 rounded hover:bg-stone-800 cursor-pointer"
                          title="Renombrar carpeta"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(f)}
                          className="p-1 text-stone-500 hover:text-red-400 rounded hover:bg-stone-800 cursor-pointer"
                          title="Eliminar carpeta"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANE: CONTENTS OF SELECTED FOLDER & BULK EDITING */}
          <div className="lg:col-span-7 flex flex-col bg-[#10121a] border border-stone-800 rounded-xl p-4 overflow-y-auto space-y-4 custom-scrollbar">
            {/* Folder Header & Quick Travel */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-800">
              <div>
                <div className="text-[10px] font-mono text-amber-400 uppercase">
                  Carpeta Seleccionada
                </div>
                <h4 className="font-cinzel font-black text-base text-[#f5e4be] flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#e2c275]" />
                  <span>{activeFolderLabel}</span>
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="btn-explorer-travel-folder"
                  onClick={() => {
                    onSelectFolder(activeExplorerFolder);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir en el Atlas</span>
                </button>
              </div>
            </div>

            {/* Inline Visual Item Edit Modal/Box */}
            {editingVisualItem && (
              <form
                onSubmit={handleSaveEditedVisual}
                className="p-3.5 rounded-xl bg-amber-950/30 border-2 border-[#e2c275] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-cinzel font-bold text-xs text-[#f5e4be] uppercase">
                    ✎ Editando {editingVisualItem.kind === 'map' ? 'Mapa' : editingVisualItem.kind === 'tactical' ? 'Mapa Táctico' : 'Foto de Álbum'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingVisualItem(null)}
                    className="text-stone-400 hover:text-white text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editingVisualItem.title}
                    onChange={(e) =>
                      setEditingVisualItem({ ...editingVisualItem, title: e.target.value })
                    }
                    placeholder="Nombre / Título"
                    className="bg-[#0e1017] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
                  />
                  <select
                    value={editingVisualItem.folder}
                    onChange={(e) =>
                      setEditingVisualItem({ ...editingVisualItem, folder: e.target.value })
                    }
                    className="bg-[#0e1017] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
                  >
                    <option value="all">🌍 Mundo Completo</option>
                    {currentFolders.map((f) => (
                      <option key={f} value={f}>
                        📁 {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingVisualItem.imageUrl}
                    onChange={(e) =>
                      setEditingVisualItem({ ...editingVisualItem, imageUrl: e.target.value })
                    }
                    placeholder="URL de la imagen o sube archivo →"
                    className="flex-1 bg-[#0e1017] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
                  />
                  <label className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-[#c8a45c]/50 text-xs font-cinzel font-bold text-[#e2c275] cursor-pointer flex items-center gap-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await compressImageFileToDataUrl(file, 900, 0.85);
                        setEditingVisualItem((prev) =>
                          prev ? { ...prev, imageUrl: dataUrl } : null
                        );
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-cinzel font-bold text-xs cursor-pointer shrink-0"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            )}

            {/* Quick Add Visual Item to this Folder */}
            <form
              onSubmit={handleAddVisualInExplorer}
              className="p-3 rounded-xl bg-[#161924] border border-stone-800 space-y-2"
            >
              <div className="font-cinzel font-bold text-xs text-[#e2c275] flex items-center justify-between">
                <span>+ Añadir Mapa o Imagen a "{activeFolderLabel}"</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <select
                  value={newVisualKind}
                  onChange={(e) => setNewVisualKind(e.target.value as any)}
                  className="sm:col-span-3 bg-[#0e1017] border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100"
                >
                  <option value="album">🖼️ Foto de Álbum</option>
                  <option value="tactical">⚔️ Mapa Táctico</option>
                  <option value="map">🗺️ Mapa de Zona</option>
                </select>
                <input
                  type="text"
                  value={newVisualTitle}
                  onChange={(e) => setNewVisualTitle(e.target.value)}
                  placeholder="Título (ej. Mapa de la Ciudad)"
                  className="sm:col-span-4 bg-[#0e1017] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
                />
                <input
                  type="text"
                  value={newVisualUrl}
                  onChange={(e) => setNewVisualUrl(e.target.value)}
                  placeholder="URL o sube archivo →"
                  className="sm:col-span-3 bg-[#0e1017] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
                />
                <div className="sm:col-span-2 flex items-center gap-1">
                  <label
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-[#c8a45c]/50 text-[#e2c275] cursor-pointer"
                    title="Subir archivo PNG/JPG"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await compressImageFileToDataUrl(file, 900, 0.85);
                        setNewVisualUrl(dataUrl);
                        if (!newVisualTitle.trim()) {
                          setNewVisualTitle(file.name.replace(/\.[^/.]+$/, ''));
                        }
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-black text-xs cursor-pointer"
                  >
                    Añadir
                  </button>
                </div>
              </div>
            </form>

            {/* 1. Subcarpetas directas */}
            <div>
              <h5 className="font-cinzel font-bold text-xs text-amber-300 uppercase mb-2 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5" />
                <span>Sub-Carpetas Directas ({directSubFolders.length})</span>
              </h5>
              {directSubFolders.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {directSubFolders.map((sub) => {
                    const shortName = sub.split('/').pop()?.trim() || sub;
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setActiveExplorerFolder(sub)}
                        className="p-2.5 rounded-xl bg-[#161924] hover:bg-[#1f2433] border border-[#c8a45c]/40 text-left flex items-center justify-between gap-2 transition cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 truncate text-xs font-cinzel font-bold text-[#f5e4be]">
                          <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">{shortName}</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-stone-500 italic">
                  Sin sub-carpetas directas en este nivel.
                </p>
              )}
            </div>

            {/* 2. Mapas de la Carpeta (Carátula + Mapas Adicionales) */}
            <div>
              <h5 className="font-cinzel font-bold text-xs text-amber-300 uppercase mb-2 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                <span>
                  Mapas de Zona ({(folderCoverMapUrl ? 1 : 0) + folderExtraMaps.length})
                </span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {folderCoverMapUrl && (
                  <div className="p-2.5 rounded-xl bg-[#161924] border border-[#c8a45c]/60 flex items-center gap-2.5">
                    <img
                      src={folderCoverMapUrl}
                      alt="Mapa Principal"
                      className="w-14 h-14 rounded-lg object-cover border border-[#c8a45c]/40 shrink-0 bg-black"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-bold">
                        Carátula
                      </span>
                      <div className="font-cinzel font-bold text-xs text-[#f5e4be] truncate mt-0.5">
                        Mapa: {activeFolderLabel}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingVisualItem({
                              kind: 'map',
                              id: `map-${activeExplorerFolder}`,
                              title: `Mapa: ${activeFolderLabel}`,
                              imageUrl: folderCoverMapUrl,
                              folder: activeExplorerFolder,
                              isPrimaryCover: true,
                            })
                          }
                          className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-amber-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-2.5 h-2.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleEnqueueVisual({
                              id: `map-${activeExplorerFolder}`,
                              kind: 'map',
                              title: `Mapa: ${activeFolderLabel}`,
                              imageUrl: folderCoverMapUrl,
                              folder: activeExplorerFolder,
                            })
                          }
                          className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-[10px] text-emerald-200 flex items-center gap-1 cursor-pointer"
                        >
                          <ListPlus className="w-2.5 h-2.5" />
                          <span>+ Cola</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {folderExtraMaps.map((zm) => (
                  <div
                    key={zm.id}
                    className="p-2.5 rounded-xl bg-[#161924] border border-stone-800 flex items-center gap-2.5"
                  >
                    {zm.imageUrl ? (
                      <img
                        src={zm.imageUrl}
                        alt={zm.title}
                        className="w-14 h-14 rounded-lg object-cover border border-stone-700 shrink-0 bg-black"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400 shrink-0">
                        <Compass className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-cinzel font-bold text-xs text-[#f5e4be] truncate">
                        {zm.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingVisualItem({
                              kind: 'map',
                              id: zm.id,
                              title: zm.title,
                              imageUrl: zm.imageUrl,
                              folder: zm.folder,
                            })
                          }
                          className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-amber-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-2.5 h-2.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleEnqueueVisual({
                              id: zm.id,
                              kind: 'map',
                              title: zm.title,
                              imageUrl: zm.imageUrl,
                              folder: zm.folder,
                            })
                          }
                          className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-[10px] text-emerald-200 flex items-center gap-1 cursor-pointer"
                        >
                          <ListPlus className="w-2.5 h-2.5" />
                          <span>+ Cola</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {!folderCoverMapUrl && folderExtraMaps.length === 0 && (
                <p className="text-[11px] text-stone-500 italic">
                  No hay mapas guardados en esta carpeta.
                </p>
              )}
            </div>

            {/* 3. Mapas Tácticos */}
            <div>
              <h5 className="font-cinzel font-bold text-xs text-amber-300 uppercase mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Mapas Tácticos ({folderTacticalMaps.length})</span>
              </h5>
              {folderTacticalMaps.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {folderTacticalMaps.map((loc) => (
                    <div
                      key={loc.id}
                      className="p-2.5 rounded-xl bg-[#161924] border border-stone-800 flex items-center gap-2.5"
                    >
                      {loc.mapImageUrl ? (
                        <img
                          src={loc.mapImageUrl}
                          alt={loc.name}
                          className="w-14 h-14 rounded-lg object-cover border border-stone-700 shrink-0 bg-black"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400 shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-cinzel font-bold text-xs text-[#f5e4be] truncate">
                          {loc.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingVisualItem({
                                kind: 'tactical',
                                id: loc.id,
                                title: loc.name,
                                imageUrl: loc.mapImageUrl || '',
                                folder: loc.folder || activeExplorerFolder,
                              })
                            }
                            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-amber-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-2.5 h-2.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleEnqueueVisual({
                                id: loc.id,
                                kind: 'tactical',
                                title: loc.name,
                                imageUrl: loc.mapImageUrl || '',
                                folder: loc.folder || activeExplorerFolder,
                              })
                            }
                            className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-[10px] text-emerald-200 flex items-center gap-1 cursor-pointer"
                          >
                            <ListPlus className="w-2.5 h-2.5" />
                            <span>+ Cola</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-stone-500 italic">
                  Sin mapas tácticos en esta carpeta.
                </p>
              )}
            </div>

            {/* 4. Álbum de Fotos */}
            <div>
              <h5 className="font-cinzel font-bold text-xs text-amber-300 uppercase mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span>Álbum de Fotos e Imágenes ({folderAlbumPhotos.length})</span>
              </h5>
              {folderAlbumPhotos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {folderAlbumPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="p-2.5 rounded-xl bg-[#161924] border border-stone-800 flex items-center gap-2.5"
                    >
                      <img
                        src={photo.imageUrl}
                        alt={photo.title}
                        className="w-14 h-14 rounded-lg object-cover border border-stone-700 shrink-0 bg-black"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-cinzel font-bold text-xs text-[#f5e4be] truncate">
                          {photo.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingVisualItem({
                                kind: 'album',
                                id: photo.id,
                                title: photo.title,
                                imageUrl: photo.imageUrl,
                                folder: photo.folder,
                              })
                            }
                            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-amber-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-2.5 h-2.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleEnqueueVisual({
                                id: photo.id,
                                kind: 'album',
                                title: photo.title,
                                imageUrl: photo.imageUrl,
                                folder: photo.folder,
                              })
                            }
                            className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-[10px] text-emerald-200 flex items-center gap-1 cursor-pointer"
                          >
                            <ListPlus className="w-2.5 h-2.5" />
                            <span>+ Cola</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-stone-500 italic">
                  Sin fotos de álbum en esta carpeta.
                </p>
              )}
            </div>

            {/* 5. Personajes y Criaturas en la Carpeta */}
            {(folderNpcs.length > 0 || folderMonsters.length > 0) && (
              <div>
                <h5 className="font-cinzel font-bold text-xs text-amber-300 uppercase mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    NPCs ({folderNpcs.length}) y Monstruos ({folderMonsters.length}) en esta Carpeta
                  </span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {folderNpcs.map((n) => (
                    <div
                      key={n.id}
                      className="px-2.5 py-1.5 rounded-lg bg-[#161924] border border-stone-800 flex items-center justify-between text-xs"
                    >
                      <span className="truncate font-semibold text-stone-200">👤 {n.name}</span>
                      <select
                        value={n.folder || 'General'}
                        onChange={(e) =>
                          onUpdateWorkspace({
                            ...workspace,
                            npcs: (workspace.npcs || []).map((item) =>
                              item.id === n.id ? { ...item, folder: e.target.value } : item
                            ),
                          })
                        }
                        className="bg-[#0e1017] border border-stone-700 rounded px-1.5 py-0.5 text-[10px] text-amber-300"
                      >
                        <option value="General">General</option>
                        {currentFolders.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {folderMonsters.map((m) => (
                    <div
                      key={m.id}
                      className="px-2.5 py-1.5 rounded-lg bg-[#161924] border border-stone-800 flex items-center justify-between text-xs"
                    >
                      <span className="truncate font-semibold text-red-200">💀 {m.name}</span>
                      <select
                        value={m.folder || 'General'}
                        onChange={(e) =>
                          onUpdateWorkspace({
                            ...workspace,
                            monsters: (workspace.monsters || []).map((item) =>
                              item.id === m.id ? { ...item, folder: e.target.value } : item
                            ),
                          })
                        }
                        className="bg-[#0e1017] border border-stone-700 rounded px-1.5 py-0.5 text-[10px] text-amber-300"
                      >
                        <option value="General">General</option>
                        {currentFolders.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-800 mt-3 flex justify-between items-center text-xs text-stone-400">
          <span>
            Jerarquía de Carpetas: Mundo → Nivel 1 (Continente/Región) → Nivel 2 (Ciudad) → Nivel 3 (Lugar) → Nivel 4 (Sub-lugar)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-cinzel font-black transition cursor-pointer"
          >
            Cerrar Explorador
          </button>
        </div>
      </div>
    </div>
  );
};
