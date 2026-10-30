import React, { useState } from 'react';
import {
  Package,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  FolderPlus,
  Skull,
  Users,
  Sword,
  MapPin,
  Image as ImageIcon,
  BookOpen,
  Sparkles,
  Check,
  Shield,
  Heart,
  Info,
  X,
  Grid,
  Lock,
  Eye,
} from 'lucide-react';
import {
  DLCPackageRecord,
  CampaignLogEntryType,
  MonsterRecord,
  NPCRecord,
  DMCustomItemOrSpell,
  LocationRecord,
  WeaponAttack,
  ItemSpecialAction,
  ItemStatModifier,
  StatModifierTarget,
} from '../../types/dnd';

interface DlcWorkspaceStudioProps {
  dlc: DLCPackageRecord;
  isAdmin: boolean;
  currentUserEmail: string;
  currentUserName: string;
  currentUserRole: string;
  onSave: (updatedDlc: DLCPackageRecord) => Promise<void>;
  onClose: () => void;
}

export const DlcWorkspaceStudio: React.FC<DlcWorkspaceStudioProps> = ({
  dlc,
  currentUserName,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<DLCPackageRecord>(() => {
    const copy = JSON.parse(JSON.stringify(dlc));
    if (!copy.monsters) copy.monsters = copy.contentPayload?.monsters || [];
    if (!copy.npcs) copy.npcs = copy.contentPayload?.npcs || [];
    if (!copy.itemsAndSpells) copy.itemsAndSpells = copy.contentPayload?.itemsAndSpells || [];
    if (!copy.locations) copy.locations = copy.contentPayload?.locations || [];
    if (!copy.albumPhotos) copy.albumPhotos = copy.contentPayload?.albumPhotos || [];
    if (!copy.campaignLogs) copy.campaignLogs = copy.contentPayload?.campaignLogs || [];
    if (!copy.contentPayload?.folders) {
      copy.contentPayload = {
        ...(copy.contentPayload || {}),
        folders: ['Costa de la Espada / General'],
      };
    }
    return copy;
  });

  const [activeStudioTab, setActiveStudioTab] = useState<
    'info' | 'monsters' | 'npcs' | 'items' | 'locations' | 'photos' | 'logs'
  >('info');

  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState('');

  // Full-Parity DM Pop-up Modals State
  const [editingMonsterIdx, setEditingMonsterIdx] = useState<number | null>(null);
  const [editingNpcIdx, setEditingNpcIdx] = useState<number | null>(null);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingLocationIdx, setEditingLocationIdx] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const folders: string[] = draft.contentPayload?.folders || ['General'];

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(''), 4000);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const payload: DLCPackageRecord = {
        ...draft,
        counts: {
          maps: draft.locations?.length || 0,
          albums: draft.albumPhotos?.length || 0,
          monsters: draft.monsters?.length || 0,
          itemsAndWeapons: draft.itemsAndSpells?.length || 0,
          stories: draft.campaignLogs?.length || 0,
          npcs: draft.npcs?.length || 0,
        },
        contentPayload: {
          ...(draft.contentPayload || {}),
          folders,
          monsters: draft.monsters || [],
          npcs: draft.npcs || [],
          itemsAndSpells: draft.itemsAndSpells || [],
          locations: draft.locations || [],
          albumPhotos: draft.albumPhotos || [],
          campaignLogs: draft.campaignLogs || [],
        },
        updatedAt: Date.now(),
      };
      await onSave(payload);
      triggerToast('💾 ¡DLC y todo su contenido guardado exitosamente en la nube!');
    } catch {
      triggerToast('⚠️ Error al guardar el DLC');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    const clean = newFolderName.trim();
    if (!folders.includes(clean)) {
      const nextFolders = [...folders, clean];
      setDraft((d) => ({
        ...d,
        contentPayload: { ...(d.contentPayload || {}), folders: nextFolders },
      }));
    }
    setNewFolderName('');
  };

  const handleDeleteFolder = (folderName: string) => {
    const nextFolders = folders.filter((f) => f !== folderName);
    setDraft((d) => ({
      ...d,
      contentPayload: { ...(d.contentPayload || {}), folders: nextFolders },
    }));
  };

  const formatMod = (score: number = 10) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div
      data-testid="dlc-workspace-studio"
      className="fixed inset-0 z-50 bg-[#0d0e14] text-stone-100 flex flex-col overflow-hidden animate-fadeIn"
    >
      {/* Studio Header Bar */}
      <header className="px-5 py-3.5 bg-[#141620] border-b-2 border-amber-500/50 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="btn-dlc-studio-back"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold text-xs flex items-center gap-1.5 border border-stone-600 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Volver al Catálogo</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/60 text-[10px] font-mono text-amber-300 font-bold">
                ESTUDIO DE CREACIÓN DE DLC (PARIDAD TOTAL DM)
              </span>
              <span className="text-xs font-mono text-stone-400">
                {draft.id} • v{draft.version}
              </span>
            </div>
            <h1 className="font-cinzel font-black text-lg sm:text-xl text-[#f5e4be] leading-tight">
              {draft.name || 'Nuevo Paquete DLC'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {saveToast && (
            <span className="px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1 animate-pulse">
              <Check className="w-3.5 h-3.5" />
              {saveToast}
            </span>
          )}

          <button
            type="button"
            data-testid="btn-dlc-studio-save-all"
            disabled={isSaving}
            onClick={handleSaveAll}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-cinzel font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar DLC Completo'}</span>
          </button>
        </div>
      </header>

      {/* Sub-Tabs Navigation */}
      <nav className="px-5 py-2.5 bg-[#10121a] border-b border-stone-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
        <button
          type="button"
          data-testid="tab-dlc-info"
          onClick={() => setActiveStudioTab('info')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-cinzel font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            activeStudioTab === 'info'
              ? 'bg-amber-600 text-stone-950 shadow'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>General & Carpetas ({folders.length})</span>
        </button>

        <button
          type="button"
          data-testid="tab-dlc-monsters"
          onClick={() => setActiveStudioTab('monsters')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-cinzel font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            activeStudioTab === 'monsters'
              ? 'bg-red-700 text-white shadow'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <Skull className="w-3.5 h-3.5" />
          <span>Bestiario ({(draft.monsters || []).length})</span>
        </button>

        <button
          type="button"
          data-testid="tab-dlc-npcs"
          onClick={() => setActiveStudioTab('npcs')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-cinzel font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            activeStudioTab === 'npcs'
              ? 'bg-amber-700 text-amber-100 shadow'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>PNJs ({(draft.npcs || []).length})</span>
        </button>

        <button
          type="button"
          data-testid="tab-dlc-items"
          onClick={() => setActiveStudioTab('items')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-cinzel font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            activeStudioTab === 'items'
              ? 'bg-purple-700 text-purple-100 shadow'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <Sword className="w-3.5 h-3.5" />
          <span>Objetos, Armas & Conjuros ({(draft.itemsAndSpells || []).length})</span>
        </button>

        <button
          type="button"
          data-testid="tab-dlc-locations"
          onClick={() => setActiveStudioTab('locations')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-cinzel font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            activeStudioTab === 'locations'
              ? 'bg-emerald-700 text-emerald-100 shadow'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Atlas, Mapas Tácticos & Zonas ({(draft.locations || []).length})</span>
        </button>

        <button
          type="button"
          data-testid="tab-dlc-photos"
          onClick={() => setActiveStudioTab('photos')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-cinzel font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            activeStudioTab === 'photos'
              ? 'bg-cyan-700 text-cyan-100 shadow'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Galería de Escenas ({(draft.albumPhotos || []).length})</span>
        </button>

        <button
          type="button"
          data-testid="tab-dlc-logs"
          onClick={() => setActiveStudioTab('logs')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-cinzel font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            activeStudioTab === 'logs'
              ? 'bg-blue-700 text-blue-100 shadow'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Crónicas & Prólogo ({(draft.campaignLogs || []).length})</span>
        </button>
      </nav>

      {/* Main Workspace Body */}
      <main className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#0f1118]">
        {/* =================================================================== */}
        {/* 1. GENERAL & FOLDERS                                                */}
        {/* =================================================================== */}
        {activeStudioTab === 'info' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-5 rounded-2xl bg-[#141722] border border-[#c8a45c]/50 space-y-4">
              <h3 className="font-cinzel font-black text-base text-[#f5e4be] uppercase flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Datos Básicos del Paquete DLC</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-cinzel font-bold text-amber-300 mb-1">
                    Nombre del Paquete DLC:
                  </label>
                  <input
                    type="text"
                    data-testid="input-dlc-title"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="w-full bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:border-amber-400 focus:outline-none"
                    placeholder="ej. Crónicas de la Mina Esmeralda"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-cinzel font-bold text-amber-300 mb-1">
                    Código de Canje / Reclamación:
                  </label>
                  <input
                    type="text"
                    value={draft.claimCode || draft.acquisitionCode || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        claimCode: e.target.value.toUpperCase(),
                        acquisitionCode: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono text-amber-200 focus:border-amber-400 focus:outline-none"
                    placeholder="MINA-ESMERALDA-2026"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-cinzel font-bold text-amber-300 mb-1">
                  Descripción del Mundo y Campaña:
                </label>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="w-full bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 leading-relaxed focus:border-amber-400 focus:outline-none"
                  placeholder="Detalla qué incluye la aventura, atmósfera, nivel recomendado para los aventureros..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-cinzel font-bold text-stone-300 mb-1">
                    Temporada / Tag:
                  </label>
                  <input
                    type="text"
                    value={draft.seasonTag || ''}
                    onChange={(e) => setDraft({ ...draft, seasonTag: e.target.value })}
                    className="w-full bg-[#10121a] border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200"
                    placeholder="ej. Temporada 2026"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-cinzel font-bold text-stone-300 mb-1">
                    Versión:
                  </label>
                  <input
                    type="text"
                    value={draft.version || '1.0.0'}
                    onChange={(e) => setDraft({ ...draft, version: e.target.value })}
                    className="w-full bg-[#10121a] border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-cinzel font-bold text-stone-300 mb-1">
                    Nombre del Autor en Créditos:
                  </label>
                  <input
                    type="text"
                    value={draft.editorCreditName || draft.authorName || currentUserName}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        editorCreditName: e.target.value,
                        authorName: e.target.value,
                      })
                    }
                    className="w-full bg-[#10121a] border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200"
                  />
                </div>
              </div>
            </div>

            {/* Folder Hierarchy Management */}
            <div className="p-5 rounded-2xl bg-[#141722] border border-[#c8a45c]/50 space-y-4">
              <div>
                <h3 className="font-cinzel font-black text-base text-[#f5e4be] uppercase flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-emerald-400" />
                  <span>Estructura de Carpetas del Atlas y Campaña ({folders.length})</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Organiza los lugares, monstruos, PNJs y fotos en carpetas jerárquicas (usa &apos;/&apos; para subzonas, ej. &quot;Valle Helado / Cripta del Hielo&quot;).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nueva carpeta o subzona (ej. Costa / Mazmorra Norte)..."
                  className="flex-1 bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
                <button
                  type="button"
                  onClick={handleAddFolder}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Carpeta</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                {folders.map((fName) => (
                  <div
                    key={fName}
                    className="p-3 rounded-xl bg-[#10121a] border border-stone-800 flex items-center justify-between gap-2"
                  >
                    <span className="font-mono text-xs text-amber-200 truncate">{fName}</span>
                    {folders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(fName)}
                        className="text-stone-500 hover:text-red-400 p-1 cursor-pointer"
                        title="Eliminar carpeta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 2. BESTIARIO & MONSTRUOS (PARIDAD TOTAL DM CON POP-UP COMPLETO)     */}
        {/* =================================================================== */}
        {activeStudioTab === 'monsters' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-cinzel font-black text-base text-[#f5e4be] uppercase flex items-center gap-2">
                  <Skull className="w-4 h-4 text-red-400" />
                  <span>Bestiario Completo del DLC ({(draft.monsters || []).length} Criaturas)</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Edición completa como en una hoja de Dungeon Master: imagen de portada, 6 características, competencias, sentidos, rasgos, acciones de ataque e imagen por ataque.
                </p>
              </div>

              <button
                type="button"
                data-testid="btn-add-new-monster"
                onClick={() => {
                  const newMon: MonsterRecord = {
                    id: `mon-${Date.now()}`,
                    name: `Nuevo Monstruo ${(draft.monsters || []).length + 1}`,
                    cr: '2',
                    ac: 14,
                    hp: 45,
                    maxHp: 45,
                    size: 'Mediano',
                    type: 'Monstruosidad',
                    alignment: 'Neutral Maligno',
                    speed: '30 pies',
                    str: 16,
                    dex: 12,
                    con: 14,
                    int: 10,
                    wis: 12,
                    cha: 8,
                    savingThrows: 'Con +4, Fue +5',
                    skills: 'Percepción +3, Atletismo +5',
                    senses: 'Visión en la oscuridad 60 pies, Percepción pasiva 13',
                    languages: 'Común, Dracónico',
                    imageUrl: '',
                    folder: folders[0] || 'General',
                    traits: [
                      {
                        name: 'Furia Salvaje',
                        description: 'Ventaja en ataques cuerpo a cuerpo cuando tiene menos de la mitad de sus PG.',
                      },
                    ],
                    actions: [
                      {
                        id: `atk-${Date.now()}`,
                        name: 'Zarpazo Desgarrador',
                        type: 'melee',
                        toHit: 5,
                        damage: '1d8+3',
                        damageType: 'Cortante',
                        range: '5 pies',
                        description: 'Ataque con garras afiladas.',
                        imageUrl: '',
                      },
                    ],
                    legendaryActions: [],
                    notes: 'Tácticas secretas y comportamiento para el DM.',
                  };
                  const nextList = [...(draft.monsters || []), newMon];
                  setDraft({ ...draft, monsters: nextList });
                  setEditingMonsterIdx(nextList.length - 1);
                }}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-cinzel font-black text-xs flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo Monstruo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(draft.monsters || []).map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="p-4 rounded-2xl bg-[#141620] border border-stone-800 hover:border-red-500/50 transition flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    {m.imageUrl || m.avatarUrl ? (
                      <img
                        src={m.imageUrl || m.avatarUrl}
                        alt={m.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover border border-red-500/40 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center shrink-0">
                        <Skull className="w-6 h-6 text-red-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-mono text-[10px] font-bold">
                        CR {m.cr || '1'} • {m.size} {m.type}
                      </span>
                      <h4 className="font-cinzel font-black text-base text-[#f5e4be] mt-1 truncate">
                        {m.name}
                      </h4>
                      <span className="text-[11px] font-mono text-stone-400 block truncate">
                        📁 {m.folder || 'General'} • CA {m.ac} • PG {m.hp}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-stone-300 space-y-1 pt-2 border-t border-stone-800">
                    <div className="text-[11px] text-amber-200 truncate">
                      ⚔️ Acciones: {(m.actions || []).map((a) => a.name).join(', ') || 'Ninguna'}
                    </div>
                    <p className="line-clamp-2 text-[11px] text-stone-400">
                      {m.notes || 'Sin secretos de DM.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                    <button
                      type="button"
                      onClick={() => setEditingMonsterIdx(idx)}
                      className="px-3 py-1.5 rounded-lg bg-red-900/70 hover:bg-red-800 text-red-100 font-cinzel font-bold text-xs cursor-pointer"
                    >
                      Abrir Editor Completo (Pop-up)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (draft.monsters || []).filter((_, i) => i !== idx);
                        setDraft({ ...draft, monsters: next });
                      }}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 3. PNJS (PARIDAD TOTAL DM CON POP-UP COMPLETO)                      */}
        {/* =================================================================== */}
        {activeStudioTab === 'npcs' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-cinzel font-black text-base text-[#f5e4be] uppercase flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>PNJs y Aliados del Mundo ({(draft.npcs || []).length} Personajes)</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Personaliza imagen de portada, actitud, alineamiento, personalidad, ideales, vínculos, defectos, secretos de DM y estadísticas de combate.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newNpc: NPCRecord = {
                    id: `npc-${Date.now()}`,
                    name: `Nuevo PNJ ${(draft.npcs || []).length + 1}`,
                    folder: folders[0] || 'General',
                    race: 'Humano',
                    occupation: 'Explorador / Informante',
                    attitude: 'Amistoso',
                    alignment: 'Neutral Bueno',
                    location: 'Taberna Principal',
                    appearance: 'Capa de viaje con broche de plata y mirada atenta.',
                    personality: 'Amable, curioso y conocedor de leyendas locales.',
                    ideals: 'Conocimiento y lealtad hacia sus compañeros.',
                    bonds: 'Protege un antiguo relicario familiar.',
                    flaws: 'Demasiado confiado ante promesas de oro.',
                    secretOrHook: 'Conoce la entrada oculta bajo el altar del templo.',
                    equipment: 'Daga élfica +1, mapa enrollado y 45 po.',
                    imageUrl: '',
                    stats: { hp: 27, ac: 14, cr: '1' },
                  };
                  const nextList = [...(draft.npcs || []), newNpc];
                  setDraft({ ...draft, npcs: nextList });
                  setEditingNpcIdx(nextList.length - 1);
                }}
                className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo PNJ</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(draft.npcs || []).map((npc, idx) => (
                <div
                  key={npc.id || idx}
                  className="p-4 rounded-2xl bg-[#141620] border border-stone-800 hover:border-amber-500/50 transition flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    {npc.imageUrl || npc.avatarUrl ? (
                      <img
                        src={npc.imageUrl || npc.avatarUrl}
                        alt={npc.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover border border-amber-500/40 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <Users className="w-6 h-6 text-amber-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-mono text-[10px] font-bold">
                        {npc.attitude} • {npc.race}
                      </span>
                      <h4 className="font-cinzel font-black text-base text-[#f5e4be] mt-1 truncate">
                        {npc.name}
                      </h4>
                      <span className="text-[11px] font-mono text-stone-400 block truncate">
                        💼 {npc.occupation} • 📍 {npc.location}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-300 line-clamp-2">{npc.personality || npc.appearance}</p>
                  {npc.secretOrHook && (
                    <div className="p-2 rounded-lg bg-[#0d0f17] border border-amber-500/30 text-[11px] text-amber-200 line-clamp-2">
                      🔑 Secreto DM: {npc.secretOrHook}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                    <button
                      type="button"
                      onClick={() => setEditingNpcIdx(idx)}
                      className="px-3 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-100 font-cinzel font-bold text-xs cursor-pointer"
                    >
                      Abrir Editor Completo (Pop-up)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (draft.npcs || []).filter((_, i) => i !== idx);
                        setDraft({ ...draft, npcs: next });
                      }}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 4. OBJETOS, ARMAS & CONJUROS (POP-UP COMPLETO CON ATAQUES E IMÁGENES) */}
        {/* =================================================================== */}
        {activeStudioTab === 'items' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-cinzel font-black text-base text-[#f5e4be] uppercase flex items-center gap-2">
                  <Sword className="w-4 h-4 text-purple-400" />
                  <span>Compendio de Objetos, Armas & Conjuros ({(draft.itemsAndSpells || []).length})</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Edita objetos como en la hoja de DM: ataques múltiples con imagen propia para cada ataque, acciones especiales con imagen, bonificadores de estadísticas, secretos de DM y peso.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newItem: DMCustomItemOrSpell = {
                    id: `item-${Date.now()}`,
                    name: `Nuevo Objeto ${(draft.itemsAndSpells || []).length + 1}`,
                    kind: 'item',
                    itemGroup: 'weapon',
                    rarity: 'Raro',
                    category: 'Arma Mágica',
                    whoHasIt: 'Cámara del Tesoro',
                    whereFound: 'Santuario Antiguo',
                    description: 'Forjada en fuego estelar con inscripciones rúnicas.',
                    properties: 'Versátil (1d8 / 1d10), Mágica +1',
                    dmSecrets: 'Brilla con luz azulada cuando hay dragones a menos de 120 pies.',
                    imageUrl: '',
                    folder: folders[0] || 'General',
                    weight: 3,
                    weaponAttacks: [
                      {
                        id: `wa-${Date.now()}`,
                        name: 'Tajo Principal',
                        dice: '1d8',
                        bonus: 1,
                        damageType: 'Cortante',
                        attackType: 'melee',
                        range: '5 pies',
                        description: 'Corte veloz a una mano.',
                        imageUrl: '',
                      },
                    ],
                    itemActions: [],
                    statModifiers: [],
                  };
                  const nextList = [...(draft.itemsAndSpells || []), newItem];
                  setDraft({ ...draft, itemsAndSpells: nextList });
                  setEditingItemIdx(nextList.length - 1);
                }}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-purple-100 font-cinzel font-black text-xs flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Objeto / Arma / Conjuro</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(draft.itemsAndSpells || []).map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="p-4 rounded-2xl bg-[#141620] border border-stone-800 hover:border-purple-500/50 transition flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    {it.imageUrl ? (
                      <img
                        src={it.imageUrl}
                        alt={it.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover border border-purple-500/40 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center shrink-0">
                        <Sword className="w-6 h-6 text-purple-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-mono text-[10px] font-bold">
                        {it.category || it.kind} • {it.rarity}
                      </span>
                      <h4 className="font-cinzel font-black text-base text-[#f5e4be] mt-1 truncate">
                        {it.name}
                      </h4>
                      <span className="text-[11px] font-mono text-stone-400 block truncate">
                        📁 {it.folder || 'General'} • ⚖️ {it.weight ?? 0} lb
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-300 line-clamp-2">{it.description}</p>
                  <div className="text-[11px] font-mono text-purple-300">
                    ⚔️ {(it.weaponAttacks || []).length} ataques • ✨ {(it.itemActions || []).length} acciones
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                    <button
                      type="button"
                      onClick={() => setEditingItemIdx(idx)}
                      className="px-3 py-1.5 rounded-lg bg-purple-900/70 hover:bg-purple-800 text-purple-100 font-cinzel font-bold text-xs cursor-pointer"
                    >
                      Abrir Editor Completo (Pop-up)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (draft.itemsAndSpells || []).filter((_, i) => i !== idx);
                        setDraft({ ...draft, itemsAndSpells: next });
                      }}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 5. ATLAS, LUGARES, MAPAS TÁCTICOS & GALERÍA POR ZONA                */}
        {/* =================================================================== */}
        {activeStudioTab === 'locations' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-cinzel font-black text-base text-[#f5e4be] uppercase flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Atlas, Mapas de Zona & Mapas Tácticos ({(draft.locations || []).length})</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Sube el mapa de cada lugar, posiciona su pin, vincula su galería de escenas, define qué monstruos/PNJs/objetos se encuentran ahí y configura su cuadrícula táctica (Cuadrada, Hexagonal o Triangular).
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newLoc: LocationRecord = {
                    id: `loc-${Date.now()}`,
                    name: `Nuevo Lugar ${(draft.locations || []).length + 1}`,
                    region: 'Costa de la Espada',
                    type: 'Mazmorra',
                    status: 'Activa',
                    description: 'Complejo subterráneo iluminado por cristales bioluminiscentes.',
                    secretsForDm: 'Tras la estatua del rey hay un pasadizo hacia la cámara del tesoro.',
                    folder: folders[0] || 'General',
                    pinX: 50,
                    pinY: 50,
                    gridType: 'square',
                    gridCols: 12,
                    gridRows: 12,
                    pointsOfInterest: ['Entrada Principal', 'Puente Colgante', 'Altar Rúnico'],
                    suggestedMonsters: [],
                    suggestedNpcs: [],
                    suggestedItems: [],
                  };
                  const nextList = [...(draft.locations || []), newLoc];
                  setDraft({ ...draft, locations: nextList });
                  setEditingLocationIdx(nextList.length - 1);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-emerald-100 font-cinzel font-black text-xs flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Lugar / Mapa Táctico</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(draft.locations || []).map((loc, idx) => (
                <div
                  key={loc.id || idx}
                  className="p-4 rounded-2xl bg-[#141620] border border-stone-800 hover:border-emerald-500/50 transition flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold">
                        {loc.type} • Rejilla: {loc.gridType || 'square'} ({loc.gridCols || 12}x{loc.gridRows || 12})
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        Pin ({loc.pinX ?? 50}%, {loc.pinY ?? 50}%)
                      </span>
                    </div>
                    <h4 className="font-cinzel font-black text-base text-[#f5e4be]">{loc.name}</h4>
                    <span className="text-[11px] font-mono text-stone-400 block">
                      📁 {loc.folder}
                    </span>
                    <p className="text-xs text-stone-300 line-clamp-2">{loc.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                    <button
                      type="button"
                      onClick={() => setEditingLocationIdx(idx)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100 font-cinzel font-bold text-xs cursor-pointer"
                    >
                      Abrir Editor de Zona y Mapa (Pop-up)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (draft.locations || []).filter((_, i) => i !== idx);
                        setDraft({ ...draft, locations: next });
                      }}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 6. GALERÍA DE ESCENAS                                               */}
        {/* =================================================================== */}
        {activeStudioTab === 'photos' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-cinzel font-black text-base text-[#f5e4be] uppercase flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Galería de Escenas Ambientales por Zona ({(draft.albumPhotos || []).length})</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  const newP = {
                    id: `photo-${Date.now()}`,
                    title: `Escena ${(draft.albumPhotos || []).length + 1}`,
                    imageUrl: '',
                    folder: folders[0] || 'General',
                    description: 'Descripción de la escena para los jugadores.',
                    createdAt: Date.now(),
                  };
                  setDraft({ ...draft, albumPhotos: [...(draft.albumPhotos || []), newP] });
                }}
                className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-cyan-100 font-cinzel font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Escena</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(draft.albumPhotos || []).map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="p-4 rounded-2xl bg-[#141722] border border-stone-800 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={p.title}
                      onChange={(e) => {
                        const list = [...(draft.albumPhotos || [])];
                        list[idx] = { ...p, title: e.target.value };
                        setDraft({ ...draft, albumPhotos: list });
                      }}
                      className="flex-1 bg-[#10121a] border border-stone-700 rounded-xl px-2.5 py-1.5 font-cinzel font-bold text-amber-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const list = (draft.albumPhotos || []).filter((_, i) => i !== idx);
                        setDraft({ ...draft, albumPhotos: list });
                      }}
                      className="text-stone-500 hover:text-red-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block mb-1">Carpeta / Lugar Asociado:</label>
                    <select
                      value={p.folder || folders[0]}
                      onChange={(e) => {
                        const list = [...(draft.albumPhotos || [])];
                        list[idx] = { ...p, folder: e.target.value };
                        setDraft({ ...draft, albumPhotos: list });
                      }}
                      className="w-full bg-[#10121a] border border-stone-700 rounded-xl px-2.5 py-1.5"
                    >
                      {folders.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block mb-1">URL de la Imagen:</label>
                    <input
                      type="text"
                      value={p.imageUrl}
                      onChange={(e) => {
                        const list = [...(draft.albumPhotos || [])];
                        list[idx] = { ...p, imageUrl: e.target.value };
                        setDraft({ ...draft, albumPhotos: list });
                      }}
                      placeholder="https://.../escena-taberna.jpg"
                      className="w-full bg-[#10121a] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block mb-1">
                      Descripción / Contexto de la Zona:
                    </label>
                    <textarea
                      rows={2}
                      value={p.description || ''}
                      onChange={(e) => {
                        const list = [...(draft.albumPhotos || [])];
                        list[idx] = { ...p, description: e.target.value };
                        setDraft({ ...draft, albumPhotos: list });
                      }}
                      className="w-full bg-[#10121a] border border-stone-700 rounded-xl px-2.5 py-1.5 text-stone-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 7. CRÓNICAS Y PRÓLOGO                                               */}
        {/* =================================================================== */}
        {activeStudioTab === 'logs' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-cinzel font-black text-base text-[#f5e4be] uppercase flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>Crónicas, Capítulos y Prólogo ({(draft.campaignLogs || []).length})</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  const newLog = {
                    id: `log-${Date.now()}`,
                    sessionNumber: (draft.campaignLogs || []).length + 1,
                    entryType: 'chapter' as CampaignLogEntryType,
                    title: `Capítulo ${(draft.campaignLogs || []).length + 1}`,
                    date: 'Día 1 de la Aventura',
                    summary: 'Resumen general del capítulo.',
                    publicNotes: 'Texto narrativo para leer en voz alta a los jugadores.',
                    privateNotes: 'Secretos de la trama y giros exclusivos para el DM.',
                    tags: ['Historia'],
                    folder: folders[0] || 'General',
                  };
                  setDraft({ ...draft, campaignLogs: [...(draft.campaignLogs || []), newLog] });
                }}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-blue-100 font-cinzel font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Capítulo / Crónica</span>
              </button>
            </div>

            <div className="space-y-4">
              {(draft.campaignLogs || []).map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="p-4 rounded-2xl bg-[#141722] border border-stone-800 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={log.title}
                      onChange={(e) => {
                        const list = [...(draft.campaignLogs || [])];
                        list[idx] = { ...log, title: e.target.value };
                        setDraft({ ...draft, campaignLogs: list });
                      }}
                      className="flex-1 bg-[#10121a] border border-stone-700 rounded-xl px-3 py-1.5 font-cinzel font-bold text-amber-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const list = (draft.campaignLogs || []).filter((_, i) => i !== idx);
                        setDraft({ ...draft, campaignLogs: list });
                      }}
                      className="text-stone-500 hover:text-red-400 p-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-emerald-300 block mb-1">
                        📖 Notas Públicas (Para leer a los jugadores):
                      </label>
                      <textarea
                        rows={3}
                        value={log.publicNotes}
                        onChange={(e) => {
                          const list = [...(draft.campaignLogs || [])];
                          list[idx] = { ...log, publicNotes: e.target.value };
                          setDraft({ ...draft, campaignLogs: list });
                        }}
                        className="w-full bg-[#10121a] border border-stone-700 rounded-xl px-2.5 py-1.5 text-stone-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-red-300 block mb-1">
                        🔒 Notas Secretas del DM:
                      </label>
                      <textarea
                        rows={3}
                        value={log.privateNotes}
                        onChange={(e) => {
                          const list = [...(draft.campaignLogs || [])];
                          list[idx] = { ...log, privateNotes: e.target.value };
                          setDraft({ ...draft, campaignLogs: list });
                        }}
                        className="w-full bg-[#10121a] border border-red-500/40 rounded-xl px-2.5 py-1.5 text-amber-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* FULL-PARITY POP-UP MODAL 1: MONSTER COMPLETE EDITOR                   */}
      {/* ===================================================================== */}
      {editingMonsterIdx !== null && draft.monsters?.[editingMonsterIdx] && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#151219] border-2 border-red-500/70 p-6 space-y-5 shadow-2xl text-xs">
            {(() => {
              const m = draft.monsters![editingMonsterIdx];
              const updateMon = (fields: Partial<MonsterRecord>) => {
                const list = [...(draft.monsters || [])];
                list[editingMonsterIdx] = { ...m, ...fields };
                setDraft({ ...draft, monsters: list });
              };

              return (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-red-500/40">
                    <h3 className="font-cinzel font-black text-lg text-red-200 uppercase flex items-center gap-2">
                      <Skull className="w-5 h-5 text-red-400" />
                      <span>Ficha Completa de Monstruo (Modo DM): {m.name}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingMonsterIdx(null)}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Cerrar Pop-up</span>
                    </button>
                  </div>

                  {/* Row 1: Identity & Image */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="font-bold text-stone-300 block mb-1">Nombre del Monstruo:</label>
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => updateMon({ name: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-3 py-1.5 text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Carpeta / Zona:</label>
                      <select
                        value={m.folder || folders[0]}
                        onChange={(e) => updateMon({ folder: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      >
                        {folders.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Desafío (CR):</label>
                      <input
                        type="text"
                        value={m.cr}
                        onChange={(e) => updateMon({ cr: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                  </div>

                  {/* Image URL */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="font-bold text-amber-300 block mb-1">
                        URL de Imagen / Retrato del Monstruo:
                      </label>
                      <input
                        type="text"
                        value={m.imageUrl || m.avatarUrl || ''}
                        onChange={(e) =>
                          updateMon({ imageUrl: e.target.value, avatarUrl: e.target.value })
                        }
                        placeholder="https://.../retrato-monstruo.png"
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-3 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Tamaño & Tipo:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={m.size}
                          onChange={(e) => updateMon({ size: e.target.value as any })}
                          className="bg-[#0e1017] border border-stone-700 rounded-xl px-2 py-1.5"
                        >
                          <option value="Diminuto">Diminuto</option>
                          <option value="Pequeño">Pequeño</option>
                          <option value="Mediano">Mediano</option>
                          <option value="Grande">Grande</option>
                          <option value="Enorme">Enorme</option>
                          <option value="Gargantuesco">Gargantuesco</option>
                        </select>
                        <input
                          type="text"
                          value={m.type}
                          onChange={(e) => updateMon({ type: e.target.value })}
                          placeholder="Dragón, Bestia..."
                          className="bg-[#0e1017] border border-stone-700 rounded-xl px-2 py-1.5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Combat & 6 Ability Scores */}
                  <div className="grid grid-cols-3 md:grid-cols-9 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-[#0e1017] border border-stone-800">
                      <span className="text-[10px] text-amber-300 block">CA</span>
                      <input
                        type="number"
                        value={m.ac}
                        onChange={(e) => updateMon({ ac: parseInt(e.target.value, 10) || 10 })}
                        className="w-full text-center bg-transparent font-cinzel font-black text-sm"
                      />
                    </div>
                    <div className="p-2 rounded-xl bg-[#0e1017] border border-stone-800">
                      <span className="text-[10px] text-red-300 block">PG Máx</span>
                      <input
                        type="number"
                        value={m.hp}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10) || 10;
                          updateMon({ hp: v, maxHp: v });
                        }}
                        className="w-full text-center bg-transparent font-cinzel font-black text-sm"
                      />
                    </div>
                    <div className="p-2 rounded-xl bg-[#0e1017] border border-stone-800">
                      <span className="text-[10px] text-cyan-300 block">Velocidad</span>
                      <input
                        type="text"
                        value={m.speed}
                        onChange={(e) => updateMon({ speed: e.target.value })}
                        className="w-full text-center bg-transparent font-mono text-[11px]"
                      />
                    </div>
                    {(
                      [
                        ['str', 'FUE'],
                        ['dex', 'DES'],
                        ['con', 'CON'],
                        ['int', 'INT'],
                        ['wis', 'SAB'],
                        ['cha', 'CAR'],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="p-2 rounded-xl bg-[#0e1017] border border-stone-800">
                        <span className="text-[10px] text-stone-400 block">
                          {label} ({formatMod(m[key])})
                        </span>
                        <input
                          type="number"
                          value={m[key]}
                          onChange={(e) =>
                            updateMon({ [key]: parseInt(e.target.value, 10) || 10 } as any)
                          }
                          className="w-full text-center bg-transparent font-mono font-bold text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Senses, Languages, Saves */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-stone-400 block mb-1">Tiradas de Salvación & Habilidades:</label>
                      <input
                        type="text"
                        value={m.savingThrows || ''}
                        onChange={(e) => updateMon({ savingThrows: e.target.value })}
                        placeholder="Fue +6, Con +5..."
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 block mb-1">Sentidos:</label>
                      <input
                        type="text"
                        value={m.senses || ''}
                        onChange={(e) => updateMon({ senses: e.target.value })}
                        placeholder="Visión en la oscuridad 60ft..."
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 block mb-1">Idiomas & Alineamiento:</label>
                      <input
                        type="text"
                        value={m.languages || ''}
                        onChange={(e) => updateMon({ languages: e.target.value })}
                        placeholder="Común, Abisal..."
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                  </div>

                  {/* Actions & Attacks Editor */}
                  <div className="p-4 rounded-xl bg-[#0e1017] border border-red-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-cinzel font-bold text-red-300">
                        ⚔️ Acciones y Ataques del Monstruo ({(m.actions || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextActs = [
                            ...(m.actions || []),
                            {
                              id: `atk-${Date.now()}`,
                              name: 'Nuevo Ataque',
                              type: 'melee' as const,
                              toHit: 5,
                              damage: '1d8+3',
                              damageType: 'Cortante',
                              range: '5 pies',
                              description: 'Descripción del ataque.',
                              imageUrl: '',
                            },
                          ];
                          updateMon({ actions: nextActs });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-red-800 hover:bg-red-700 text-white font-bold text-[11px] cursor-pointer"
                      >
                        + Agregar Ataque
                      </button>
                    </div>

                    {(m.actions || []).map((act, aIdx) => (
                      <div
                        key={act.id || aIdx}
                        className="p-3 rounded-xl bg-[#151822] border border-stone-800 space-y-2"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                          <input
                            type="text"
                            value={act.name}
                            onChange={(e) => {
                              const list = [...(m.actions || [])];
                              list[aIdx] = { ...act, name: e.target.value };
                              updateMon({ actions: list });
                            }}
                            placeholder="Nombre del ataque"
                            className="bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-bold text-amber-200"
                          />
                          <input
                            type="text"
                            value={act.damage}
                            onChange={(e) => {
                              const list = [...(m.actions || [])];
                              list[aIdx] = { ...act, damage: e.target.value };
                              updateMon({ actions: list });
                            }}
                            placeholder="Dados (ej. 2d6+4)"
                            className="bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                          />
                          <input
                            type="text"
                            value={act.damageType}
                            onChange={(e) => {
                              const list = [...(m.actions || [])];
                              list[aIdx] = { ...act, damageType: e.target.value };
                              updateMon({ actions: list });
                            }}
                            placeholder="Tipo daño (Fuego...)"
                            className="bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1"
                          />
                          <input
                            type="text"
                            value={act.imageUrl || ''}
                            onChange={(e) => {
                              const list = [...(m.actions || [])];
                              list[aIdx] = { ...act, imageUrl: e.target.value };
                              updateMon({ actions: list });
                            }}
                            placeholder="URL Imagen del Ataque"
                            className="bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono text-[10px]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const list = (m.actions || []).filter((_, i) => i !== aIdx);
                              updateMon({ actions: list });
                            }}
                            className="text-red-400 hover:text-red-300 text-right px-2 cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DM Private Notes */}
                  <div>
                    <label className="font-bold text-amber-300 block mb-1">
                      🔒 Secretos, Tácticas y Notas del DM:
                    </label>
                    <textarea
                      rows={3}
                      value={m.notes || ''}
                      onChange={(e) => updateMon({ notes: e.target.value })}
                      className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-3 py-2 text-stone-200"
                    />
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULL-PARITY POP-UP MODAL 2: NPC COMPLETE EDITOR                       */}
      {/* ===================================================================== */}
      {editingNpcIdx !== null && draft.npcs?.[editingNpcIdx] && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#171511] border-2 border-amber-500/70 p-6 space-y-4 shadow-2xl text-xs">
            {(() => {
              const npc = draft.npcs![editingNpcIdx];
              const updateNpc = (fields: Partial<NPCRecord>) => {
                const list = [...(draft.npcs || [])];
                list[editingNpcIdx] = { ...npc, ...fields };
                setDraft({ ...draft, npcs: list });
              };

              return (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-amber-500/40">
                    <h3 className="font-cinzel font-black text-lg text-amber-200 uppercase flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-400" />
                      <span>Ficha Completa de PNJ (Modo DM): {npc.name}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingNpcIdx(null)}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Cerrar Pop-up</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Nombre del PNJ:</label>
                      <input
                        type="text"
                        value={npc.name}
                        onChange={(e) => updateNpc({ name: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Ocupación / Rol:</label>
                      <input
                        type="text"
                        value={npc.occupation}
                        onChange={(e) => updateNpc({ occupation: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Actitud Inicial:</label>
                      <select
                        value={npc.attitude}
                        onChange={(e) => updateNpc({ attitude: e.target.value as any })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      >
                        <option value="Aliado">Aliado</option>
                        <option value="Amistoso">Amistoso</option>
                        <option value="Neutral">Neutral</option>
                        <option value="Desconfiado">Desconfiado</option>
                        <option value="Hostil">Hostil</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="font-bold text-amber-300 block mb-1">
                        URL de Imagen de Portada / Retrato del PNJ:
                      </label>
                      <input
                        type="text"
                        value={npc.imageUrl || npc.avatarUrl || ''}
                        onChange={(e) =>
                          updateNpc({ imageUrl: e.target.value, avatarUrl: e.target.value })
                        }
                        placeholder="https://.../retrato-pnj.png"
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Carpeta / Lugar:</label>
                      <select
                        value={npc.folder || folders[0]}
                        onChange={(e) => updateNpc({ folder: e.target.value, location: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      >
                        {folders.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">
                        Personalidad y Apariencia:
                      </label>
                      <textarea
                        rows={2}
                        value={npc.personality || ''}
                        onChange={(e) => updateNpc({ personality: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-amber-300 block mb-1">
                        🔑 Secretos del DM y Gancho de Trama:
                      </label>
                      <textarea
                        rows={2}
                        value={npc.secretOrHook || ''}
                        onChange={(e) => updateNpc({ secretOrHook: e.target.value })}
                        className="w-full bg-[#0e1017] border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-amber-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-stone-400 block mb-1">Ideales & Vínculos:</label>
                      <input
                        type="text"
                        value={npc.ideals || ''}
                        onChange={(e) => updateNpc({ ideals: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 block mb-1">Defectos:</label>
                      <input
                        type="text"
                        value={npc.flaws || ''}
                        onChange={(e) => updateNpc({ flaws: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 block mb-1">Equipo / Botín:</label>
                      <input
                        type="text"
                        value={npc.equipment || ''}
                        onChange={(e) => updateNpc({ equipment: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULL-PARITY POP-UP MODAL 3: ITEM / WEAPON / SPELL COMPLETE EDITOR     */}
      {/* ===================================================================== */}
      {editingItemIdx !== null && draft.itemsAndSpells?.[editingItemIdx] && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#161221] border-2 border-purple-500/70 p-6 space-y-5 shadow-2xl text-xs">
            {(() => {
              const it = draft.itemsAndSpells![editingItemIdx];
              const updateItem = (fields: Partial<DMCustomItemOrSpell>) => {
                const list = [...(draft.itemsAndSpells || [])];
                list[editingItemIdx] = { ...it, ...fields };
                setDraft({ ...draft, itemsAndSpells: list });
              };

              return (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-purple-500/40">
                    <h3 className="font-cinzel font-black text-lg text-purple-200 uppercase flex items-center gap-2">
                      <Sword className="w-5 h-5 text-purple-400" />
                      <span>Editor Completo de Objeto / Arma / Conjuro: {it.name}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingItemIdx(null)}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Cerrar Pop-up</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="font-bold text-stone-300 block mb-1">Nombre:</label>
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => updateItem({ name: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-3 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Categoría (Ficha Jugador):</label>
                      <select
                        value={
                          it.kind === 'spell' || it.category === 'Conjuro'
                            ? 'Conjuro'
                            : it.category === 'Armadura' || it.itemGroup === 'armor'
                            ? 'Armadura'
                            : it.category === 'Objeto Común' || it.itemGroup === 'common'
                            ? 'Objeto Común'
                            : 'Arma'
                        }
                        onChange={(e) => {
                          const nextCat = e.target.value;
                          if (nextCat === 'Conjuro') {
                            updateItem({ kind: 'spell', category: 'Conjuro', itemGroup: undefined });
                          } else {
                            const nextGroup =
                              nextCat === 'Armadura'
                                ? 'armor'
                                : nextCat === 'Objeto Común'
                                ? 'common'
                                : 'weapon';
                            updateItem({ kind: 'item', category: nextCat, itemGroup: nextGroup });
                          }
                        }}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      >
                        <option value="Arma">Arma</option>
                        <option value="Armadura">Armadura</option>
                        <option value="Objeto Común">Objeto Común</option>
                        <option value="Conjuro">Conjuro</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Rareza:</label>
                      <select
                        value={it.rarity}
                        onChange={(e) => updateItem({ rarity: e.target.value as any })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      >
                        <option value="Común">Común</option>
                        <option value="Poco común">Poco común</option>
                        <option value="Raro">Raro</option>
                        <option value="Muy Raro">Muy Raro</option>
                        <option value="Legendario">Legendario</option>
                        <option value="Artefacto">Artefacto</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="font-bold text-amber-300 block mb-1">
                        URL Imagen Ilustrativa del Objeto:
                      </label>
                      <input
                        type="text"
                        value={it.imageUrl || ''}
                        onChange={(e) => updateItem({ imageUrl: e.target.value })}
                        placeholder="https://.../espada-solar.png"
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Peso (lb):</label>
                      <input
                        type="number"
                        value={it.weight ?? 1}
                        onChange={(e) => updateItem({ weight: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Carpeta / Zona:</label>
                      <select
                        value={it.folder || folders[0]}
                        onChange={(e) => updateItem({ folder: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      >
                        {folders.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Weapon Attacks with Per-Attack Image */}
                  <div className="p-4 rounded-xl bg-[#0e1017] border border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-cinzel font-bold text-purple-300">
                        ⚔️ Tipos de Ataque del Arma / Objeto (Cada uno con su propia Imagen)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextAtks: WeaponAttack[] = [
                            ...(it.weaponAttacks || []),
                            {
                              id: `wa-${Date.now()}`,
                              name: 'Nuevo Tipo de Ataque',
                              dice: '1d8',
                              bonus: 1,
                              damageType: 'Cortante',
                              attackType: 'melee',
                              range: '5 pies',
                              description: 'Descripción de la maniobra.',
                              imageUrl: '',
                            },
                          ];
                          updateItem({ weaponAttacks: nextAtks });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold text-[11px] cursor-pointer"
                      >
                        + Agregar Ataque con Imagen
                      </button>
                    </div>

                    {(it.weaponAttacks || []).map((wa, wIdx) => (
                      <div
                        key={wa.id || wIdx}
                        className="p-3 rounded-xl bg-[#151824] border border-stone-800 space-y-2"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                          <input
                            type="text"
                            value={wa.name}
                            onChange={(e) => {
                              const list = [...(it.weaponAttacks || [])];
                              list[wIdx] = { ...wa, name: e.target.value };
                              updateItem({ weaponAttacks: list });
                            }}
                            placeholder="Nombre (ej. Tajo Pesado)"
                            className="bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-bold text-amber-200"
                          />
                          <input
                            type="text"
                            value={wa.dice}
                            onChange={(e) => {
                              const list = [...(it.weaponAttacks || [])];
                              list[wIdx] = { ...wa, dice: e.target.value };
                              updateItem({ weaponAttacks: list });
                            }}
                            placeholder="Dados (1d8)"
                            className="bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                          />
                          <input
                            type="text"
                            value={wa.damageType}
                            onChange={(e) => {
                              const list = [...(it.weaponAttacks || [])];
                              list[wIdx] = { ...wa, damageType: e.target.value };
                              updateItem({ weaponAttacks: list });
                            }}
                            placeholder="Daño (Cortante)"
                            className="bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1"
                          />
                          <input
                            type="text"
                            value={wa.imageUrl || ''}
                            onChange={(e) => {
                              const list = [...(it.weaponAttacks || [])];
                              list[wIdx] = { ...wa, imageUrl: e.target.value };
                              updateItem({ weaponAttacks: list });
                            }}
                            placeholder="URL Imagen de este Ataque"
                            className="bg-[#0b0d14] border border-amber-500/40 rounded-lg px-2 py-1 font-mono text-[10px]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const list = (it.weaponAttacks || []).filter((_, i) => i !== wIdx);
                              updateItem({ weaponAttacks: list });
                            }}
                            className="text-red-400 hover:text-red-300 text-right px-2 cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Special Item Actions with Per-Action Image */}
                  <div className="p-4 rounded-xl bg-[#0e1017] border border-cyan-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-cinzel font-bold text-cyan-300">
                        ✨ Acciones Especiales del Objeto / Conjuro (Con Imagen Ilustrativa)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextActs: ItemSpecialAction[] = [
                            ...(it.itemActions || []),
                            {
                              id: `act-${Date.now()}`,
                              name: 'Nueva Acción Especial',
                              description: 'Efecto especial al activarse.',
                              dice: '2d6',
                              damageType: 'Radiante',
                              actionType: 'action',
                              imageUrl: '',
                            },
                          ];
                          updateItem({ itemActions: nextActs });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-[11px] cursor-pointer"
                      >
                        + Agregar Acción con Imagen
                      </button>
                    </div>

                    {(it.itemActions || []).map((act, aIdx) => (
                      <div
                        key={act.id || aIdx}
                        className="p-3 rounded-xl bg-[#151824] border border-stone-800 grid grid-cols-1 md:grid-cols-4 gap-2"
                      >
                        <input
                          type="text"
                          value={act.name}
                          onChange={(e) => {
                            const list = [...(it.itemActions || [])];
                            list[aIdx] = { ...act, name: e.target.value };
                            updateItem({ itemActions: list });
                          }}
                          placeholder="Nombre de la acción"
                          className="bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-bold text-cyan-200"
                        />
                        <input
                          type="text"
                          value={act.dice}
                          onChange={(e) => {
                            const list = [...(it.itemActions || [])];
                            list[aIdx] = { ...act, dice: e.target.value };
                            updateItem({ itemActions: list });
                          }}
                          placeholder="Dados / Efecto"
                          className="bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                        />
                        <input
                          type="text"
                          value={act.imageUrl || ''}
                          onChange={(e) => {
                            const list = [...(it.itemActions || [])];
                            list[aIdx] = { ...act, imageUrl: e.target.value };
                            updateItem({ itemActions: list });
                          }}
                          placeholder="URL Imagen de esta Acción"
                          className="bg-[#0b0d14] border border-cyan-500/40 rounded-lg px-2 py-1 font-mono text-[10px]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const list = (it.itemActions || []).filter((_, i) => i !== aIdx);
                            updateItem({ itemActions: list });
                          }}
                          className="text-red-400 hover:text-red-300 text-right px-2 cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Description & DM Secrets */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">
                        Descripción e Historia del Objeto:
                      </label>
                      <textarea
                        rows={3}
                        value={it.description}
                        onChange={(e) => updateItem({ description: e.target.value })}
                        className="w-full bg-[#0e1017] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-amber-300 block mb-1">
                        🔒 Secretos del DM / Maldiciones Ocultas:
                      </label>
                      <textarea
                        rows={3}
                        value={it.dmSecrets || ''}
                        onChange={(e) => updateItem({ dmSecrets: e.target.value })}
                        className="w-full bg-[#0e1017] border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-amber-200"
                      />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULL-PARITY POP-UP MODAL 4: LOCATION, ZONE MAP & TACTICAL GRID EDITOR */}
      {/* ===================================================================== */}
      {editingLocationIdx !== null && draft.locations?.[editingLocationIdx] && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111a16] border-2 border-emerald-500/70 p-6 space-y-5 shadow-2xl text-xs">
            {(() => {
              const loc = draft.locations![editingLocationIdx];
              const updateLoc = (fields: Partial<LocationRecord>) => {
                const list = [...(draft.locations || [])];
                list[editingLocationIdx] = { ...loc, ...fields };
                setDraft({ ...draft, locations: list });
              };

              return (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-500/40">
                    <h3 className="font-cinzel font-black text-lg text-emerald-200 uppercase flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                      <span>Editor Completo de Lugar, Mapa de Zona y Rejilla Táctica: {loc.name}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingLocationIdx(null)}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Cerrar Pop-up</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Nombre del Lugar:</label>
                      <input
                        type="text"
                        value={loc.name}
                        onChange={(e) => updateLoc({ name: e.target.value })}
                        className="w-full bg-[#0b0f0d] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">Carpeta del Atlas:</label>
                      <select
                        value={loc.folder || folders[0]}
                        onChange={(e) => updateLoc({ folder: e.target.value })}
                        className="w-full bg-[#0b0f0d] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      >
                        {folders.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-amber-300 block mb-1">
                        Geometría de Cuadrícula Táctica:
                      </label>
                      <select
                        value={loc.gridType || 'square'}
                        onChange={(e) => updateLoc({ gridType: e.target.value as any })}
                        className="w-full bg-[#0b0f0d] border border-emerald-500/50 rounded-xl px-2.5 py-1.5 text-emerald-200"
                      >
                        <option value="square">Cuadrícula Cuadrada Clásica (5 pies)</option>
                        <option value="hex">Cuadrícula Hexagonal Táctica</option>
                        <option value="triangle">Cuadrícula Triangular Arcana</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="font-bold text-amber-300 block mb-1">
                        URL de la Imagen del Mapa de esta Zona:
                      </label>
                      <input
                        type="text"
                        value={loc.mapImageUrl || ''}
                        onChange={(e) => updateLoc({ mapImageUrl: e.target.value })}
                        placeholder="https://.../mapa-mazmorra.jpg"
                        className="w-full bg-[#0b0f0d] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-stone-300 block mb-1">Columnas:</label>
                        <input
                          type="number"
                          value={loc.gridCols ?? 12}
                          onChange={(e) => updateLoc({ gridCols: parseInt(e.target.value, 10) || 12 })}
                          className="w-full bg-[#0b0f0d] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-stone-300 block mb-1">Filas:</label>
                        <input
                          type="number"
                          value={loc.gridRows ?? 12}
                          onChange={(e) => updateLoc({ gridRows: parseInt(e.target.value, 10) || 12 })}
                          className="w-full bg-[#0b0f0d] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interactive Pin Positioning */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-300">
                        📍 Haz clic en el mapa para situar el Pin de esta Zona:
                      </span>
                      <span className="font-mono text-emerald-300">
                        X={loc.pinX ?? 50}%, Y={loc.pinY ?? 50}%
                      </span>
                    </div>
                    <div
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                        const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                        updateLoc({
                          pinX: Math.max(0, Math.min(100, x)),
                          pinY: Math.max(0, Math.min(100, y)),
                        });
                      }}
                      className="relative w-full h-56 rounded-2xl overflow-hidden border-2 border-emerald-500/60 bg-stone-950 cursor-crosshair select-none"
                    >
                      {loc.mapImageUrl ? (
                        <img
                          src={loc.mapImageUrl}
                          alt={loc.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover opacity-85"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-500 font-cinzel">
                          Vista previa del Mapa ({loc.gridType || 'square'})
                        </div>
                      )}
                      <div
                        style={{
                          left: `${loc.pinX ?? 50}%`,
                          top: `${loc.pinY ?? 50}%`,
                          transform: 'translate(-50%, -100%)',
                        }}
                        className="absolute pointer-events-none flex flex-col items-center"
                      >
                        <span className="px-2 py-0.5 rounded bg-black/90 border border-emerald-400 text-emerald-300 text-[10px] font-mono">
                          📍 {loc.name}
                        </span>
                        <div className="w-3 h-3 bg-red-500 border-2 border-white rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Description & DM Secrets */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-300 block mb-1">
                        Descripción Pública del Lugar:
                      </label>
                      <textarea
                        rows={3}
                        value={loc.description}
                        onChange={(e) => updateLoc({ description: e.target.value })}
                        className="w-full bg-[#0b0f0d] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-amber-300 block mb-1">
                        🔒 Secretos del DM en esta Zona (Trampas, Tesoros, Habitantes):
                      </label>
                      <textarea
                        rows={3}
                        value={loc.secretsForDm || ''}
                        onChange={(e) => updateLoc({ secretsForDm: e.target.value })}
                        className="w-full bg-[#0b0f0d] border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-amber-200"
                      />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
