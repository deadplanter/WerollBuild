import React, { useState } from 'react';
import {
  Shield,
  User,
  Users,
  Compass,
  KeyRound,
  Lock,
  Plus,
  Download,
  Upload,
  ArrowRight,
  Folder,
  Sparkles,
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Settings,
  LogOut,
} from 'lucide-react';
import { Character5e, UserRole, WorldSheetSummary } from '../../types/dnd';

interface HubSessionPortalProps {
  userRole: UserRole;
  userEmail: string;
  userDisplayName: string;
  currentRoomCode: string;
  characters: Character5e[];
  activeCharId: string;
  onSelectCharacter: (id: string) => void;
  onCreateCharacter: () => void;
  onEnterPlayerSession: (roomCode: string, roomPassword: string, characterId: string) => Promise<{ success: boolean; error?: string }>;
  dmWorldSheets: WorldSheetSummary[];
  activeWorldSheetId: string;
  onSelectWorldSheet: (id: string) => void;
  onCreateWorldSheet: (name: string, description: string) => void;
  onExportWorldSheet: (world: WorldSheetSummary) => void;
  onImportWorldSheet: (file: File) => void;
  onLaunchDmSession: (worldSheetId: string, roomCode: string, roomPassword: string) => Promise<{ success: boolean; error?: string }>;
  onOpenAdminSettings?: () => void;
  onLogoutRole: () => void;
}

export const HubSessionPortal: React.FC<HubSessionPortalProps> = ({
  userRole,
  userEmail,
  userDisplayName,
  currentRoomCode,
  characters,
  activeCharId,
  onSelectCharacter,
  onCreateCharacter,
  onEnterPlayerSession,
  dmWorldSheets,
  activeWorldSheetId,
  onSelectWorldSheet,
  onCreateWorldSheet,
  onExportWorldSheet,
  onImportWorldSheet,
  onLaunchDmSession,
  onOpenAdminSettings,
  onLogoutRole,
}) => {
  // Player Room Connect State
  const [playerRoomCode, setPlayerRoomCode] = useState<string>(currentRoomCode || 'MESA-DRAGON');
  const [playerRoomPassword, setPlayerRoomPassword] = useState<string>('');
  const [playerConnecting, setPlayerConnecting] = useState<boolean>(false);
  const [playerError, setPlayerError] = useState<string>('');

  // DM Room Config State
  const [dmRoomCode, setDmRoomCode] = useState<string>(currentRoomCode || 'MESA-DRAGON');
  const [dmRoomPassword, setDmRoomPassword] = useState<string>('');
  const [dmLaunching, setDmLaunching] = useState<boolean>(false);
  const [dmError, setDmError] = useState<string>('');

  // Create World Sheet Modal State
  const [showCreateWorldModal, setShowCreateWorldModal] = useState<boolean>(false);
  const [newWorldName, setNewWorldName] = useState<string>('');
  const [newWorldDesc, setNewWorldDesc] = useState<string>('');

  const activeCharacter = characters.find((c) => c.id === activeCharId) || characters[0];
  const activeWorld = dmWorldSheets.find((w) => w.id === activeWorldSheetId) || dmWorldSheets[0];

  const handlePlayerJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlayerError('');
    if (!activeCharacter) {
      setPlayerError('Debes seleccionar o crear una ficha de personaje primero.');
      return;
    }
    if (!playerRoomCode.trim()) {
      setPlayerError('Introduce el código de la mesa.');
      return;
    }

    setPlayerConnecting(true);
    try {
      const res = await onEnterPlayerSession(playerRoomCode.trim(), playerRoomPassword.trim(), activeCharacter.id);
      if (!res.success) {
        setPlayerError(res.error || 'No se pudo conectar a la mesa. Verifica el código y la contraseña.');
      }
    } catch (err: any) {
      setPlayerError(err.message || 'Error al conectar con la mesa.');
    } finally {
      setPlayerConnecting(false);
    }
  };

  const handleDmLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDmError('');
    if (!activeWorld) {
      setDmError('Debes seleccionar o crear un World Sheet de campaña.');
      return;
    }
    if (!dmRoomCode.trim()) {
      setDmError('Define el código de la mesa.');
      return;
    }

    setDmLaunching(true);
    try {
      const res = await onLaunchDmSession(activeWorld.id, dmRoomCode.trim(), dmRoomPassword.trim());
      if (!res.success) {
        setDmError(res.error || 'Error al iniciar la sala del DM.');
      }
    } catch (err: any) {
      setDmError(err.message || 'Error al lanzar la sesión de DM.');
    } finally {
      setDmLaunching(false);
    }
  };

  const handleCreateWorldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorldName.trim()) return;
    onCreateWorldSheet(newWorldName.trim(), newWorldDesc.trim());
    setNewWorldName('');
    setNewWorldDesc('');
    setShowCreateWorldModal(false);
  };

  return (
    <div className="min-h-screen bg-[#0e0f14] text-[#e3ded4] font-sans flex flex-col p-4 sm:p-6 lg:p-8">
      {/* Top Bar inside Hub */}
      <header className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-amber-900/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-500 flex items-center justify-center text-amber-200 shadow-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-cinzel font-black text-xl text-amber-300 tracking-wider leading-tight">
              WeRoll
            </h1>
            <span className="text-[11px] text-stone-400 uppercase tracking-widest block font-cinzel">
              Hub de Partidas & Selector de Campaña
            </span>
          </div>
        </div>

        {/* User Badge & Actions */}
        <div className="flex items-center gap-3">
          <div className="bg-[#161720] border border-stone-800 px-3 py-1.5 rounded-xl flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                userRole === 'dm'
                  ? 'bg-purple-950 text-purple-300 border border-purple-700/60'
                  : userRole === 'moderator'
                  ? 'bg-blue-950 text-blue-300 border border-blue-700/60'
                  : 'bg-amber-950 text-amber-300 border border-amber-700/60'
              }`}
            >
              {userRole === 'dm' ? <Shield className="w-4 h-4" /> : userRole === 'moderator' ? <KeyRound className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className="text-left">
              <span className="block text-xs font-semibold text-stone-200 truncate max-w-[140px]">
                {userDisplayName}
              </span>
              <span className="block text-[10px] text-stone-500 font-mono">
                {userRole === 'dm' ? 'Dungeon Master' : userRole === 'moderator' ? 'Administrador' : 'Jugador'}
              </span>
            </div>
          </div>

          {userRole === 'moderator' && onOpenAdminSettings && (
            <button
              onClick={onOpenAdminSettings}
              className="p-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-700/50 text-blue-300 text-xs font-cinzel font-semibold transition flex items-center gap-1.5 shadow"
              title="Panel de Administrador & Bóveda del Servidor"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">Panel Admin</span>
            </button>
          )}

          <button
            onClick={onLogoutRole}
            className="p-2 text-stone-400 hover:text-stone-100 rounded-xl hover:bg-stone-800 border border-stone-800 transition"
            title="Cambiar Perfil o Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Hub Content */}
      <main className="max-w-6xl w-full mx-auto flex-1 py-8">
        {userRole === 'dm' ? (
          /* ================================================= */
          /* DUNGEON MASTER WORLD SHEETS PORTAL                */
          /* ================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: World Sheets Catalog (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-cinzel font-bold text-lg text-purple-300 flex items-center gap-2">
                    <Compass className="w-5 h-5 text-purple-400" />
                    Tus World Sheets (Campañas)
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Selecciona el mundo donde dirigirás la partida o crea uno nuevo con su propio archivero.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateWorldModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-cinzel font-bold text-xs shadow transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo Mundo</span>
                  </button>
                </div>
              </div>

              {/* Worlds List */}
              <div className="space-y-3">
                {dmWorldSheets.map((world) => {
                  const isSelected = world.id === activeWorldSheetId;
                  const npcsCount = world.workspace?.npcs?.length || 0;
                  const monstersCount = world.workspace?.monsters?.length || 0;
                  const locationsCount = world.workspace?.locations?.length || 0;
                  const logsCount = world.workspace?.campaignLogs?.length || 0;

                  return (
                    <div
                      key={world.id}
                      onClick={() => onSelectWorldSheet(world.id)}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition shadow-md relative overflow-hidden ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#201533] via-[#181922] to-[#1a1524] border-purple-500 shadow-purple-950/40'
                          : 'bg-[#15161e] border-stone-800 hover:border-purple-800/80 hover:bg-[#191a24]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-cinzel font-black ${
                              isSelected ? 'bg-purple-600 text-white' : 'bg-stone-800 text-stone-300'
                            }`}
                          >
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-cinzel font-bold text-base text-stone-100 flex items-center gap-2">
                              {world.name}
                              {isSelected && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 border border-purple-600 text-purple-300 font-bold uppercase">
                                  Activo
                                </span>
                              )}
                            </h3>
                            <span className="text-xs text-stone-400 line-clamp-1">
                              {world.description || 'Campaña sin descripción'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExportWorldSheet(world);
                          }}
                          className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 border border-stone-800 transition"
                          title="Descargar World Sheet en JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Content stats */}
                      <div className="flex items-center gap-4 text-[11px] text-stone-400 pt-2 border-t border-stone-800/80">
                        <span>👥 <strong>{npcsCount}</strong> NPCs</span>
                        <span>💀 <strong>{monstersCount}</strong> Monstruos</span>
                        <span>🗺️ <strong>{locationsCount}</strong> Lugares</span>
                        <span>📖 <strong>{logsCount}</strong> Sesiones</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: DM Launch Form (5 cols) */}
            <div className="lg:col-span-5 bg-[#161720] border-2 border-purple-900/60 rounded-2xl p-6 shadow-xl space-y-5">
              <div>
                <h3 className="font-cinzel font-bold text-lg text-purple-300 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-purple-400" />
                  Configurar y Lanzar Mesa
                </h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Establece el nombre de la sala y una contraseña. Los jugadores deberán ingresar ambos datos para acceder a tu sesión.
                </p>
              </div>

              {dmError && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{dmError}</span>
                </div>
              )}

              <form onSubmit={handleDmLaunch} className="space-y-4">
                <div>
                  <label className="block text-xs font-cinzel font-bold uppercase tracking-wider text-purple-300 mb-1.5">
                    Código o Nombre de la Mesa
                  </label>
                  <input
                    type="text"
                    value={dmRoomCode}
                    onChange={(e) => setDmRoomCode(e.target.value.toUpperCase())}
                    placeholder="MESA-DRAGON"
                    className="w-full bg-[#121316] border border-stone-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm font-mono tracking-wider outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-cinzel font-bold uppercase tracking-wider text-purple-300 mb-1.5 flex items-center justify-between">
                    <span>Contraseña de la Mesa</span>
                    <span className="text-[10px] text-stone-500 font-normal">Opcional pero recomendada</span>
                  </label>
                  <input
                    type="password"
                    value={dmRoomPassword}
                    onChange={(e) => setDmRoomPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#121316] border border-stone-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm font-mono outline-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/40 text-xs text-purple-200 leading-snug">
                  🛡️ <strong>Mundo Seleccionado:</strong> {activeWorld?.name || 'Ninguno'}
                </div>

                <button
                  type="submit"
                  disabled={dmLaunching}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white font-cinzel font-bold text-sm tracking-wide shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {dmLaunching ? 'Iniciando Sala...' : '⚔️ Lanzar Pantalla del Dungeon Master'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ================================================= */
          /* PLAYER CHARACTER SHEETS PORTAL                    */
          /* ================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Player Sheets Catalog (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-cinzel font-bold text-lg text-amber-300 flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-500" />
                    Tus Fichas de Personaje
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Selecciona tu aventurero para la sesión o crea uno nuevo en el creador 5E.
                  </p>
                </div>

                <button
                  onClick={onCreateCharacter}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs shadow transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Aventurero</span>
                </button>
              </div>

              {/* Characters List */}
              <div className="space-y-3">
                {characters.map((char) => {
                  const isSelected = char.id === activeCharId;
                  return (
                    <div
                      key={char.id}
                      onClick={() => onSelectCharacter(char.id)}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition shadow-md relative overflow-hidden ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#261f14] via-[#181922] to-[#1c1815] border-amber-500 shadow-amber-950/40'
                          : 'bg-[#15161e] border-stone-800 hover:border-amber-800/80 hover:bg-[#191a24]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-700 to-stone-900 border border-amber-600/40 flex items-center justify-center font-cinzel font-black text-amber-200 text-sm overflow-hidden">
                            {char.avatarUrl ? (
                              <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                            ) : (
                              char.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h3 className="font-cinzel font-bold text-base text-stone-100 flex items-center gap-2">
                              {char.name}
                              {isSelected && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 border border-amber-600 text-amber-300 font-bold uppercase">
                                  Seleccionado
                                </span>
                              )}
                            </h3>
                            <span className="text-xs text-stone-400">
                              {char.race} • {char.characterClass} Nivel {char.level}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-stone-300">
                          <span className="bg-stone-900/80 px-2.5 py-1 rounded-lg border border-stone-800">
                            ❤️ {char.currentHp}/{char.maxHp} PG
                          </span>
                          <span className="bg-stone-900/80 px-2.5 py-1 rounded-lg border border-stone-800">
                            🛡️ {char.armorClass} CA
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Player Join Room Form (5 cols) */}
            <div className="lg:col-span-5 bg-[#161720] border-2 border-amber-900/60 rounded-2xl p-6 shadow-xl space-y-5">
              <div>
                <h3 className="font-cinzel font-bold text-lg text-amber-300 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-500" />
                  Unirse a la Mesa del Dungeon Master
                </h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Ingresa el código de mesa y la contraseña provista por tu Dungeon Master para acceder a la partida en tiempo real.
                </p>
              </div>

              {playerError && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{playerError}</span>
                </div>
              )}

              <form onSubmit={handlePlayerJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-cinzel font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                    Código de la Mesa
                  </label>
                  <input
                    type="text"
                    value={playerRoomCode}
                    onChange={(e) => setPlayerRoomCode(e.target.value.toUpperCase())}
                    placeholder="MESA-DRAGON"
                    className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm font-mono tracking-wider outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-cinzel font-bold uppercase tracking-wider text-amber-400 mb-1.5 flex items-center justify-between">
                    <span>Contraseña de la Mesa</span>
                    <span className="text-[10px] text-stone-500 font-normal">Solicítala al DM</span>
                  </label>
                  <input
                    type="password"
                    value={playerRoomPassword}
                    onChange={(e) => setPlayerRoomPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm font-mono outline-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/40 text-xs text-amber-200 leading-snug">
                  👤 <strong>Aventurero:</strong> {activeCharacter?.name || 'Ninguno'} ({activeCharacter?.characterClass} Niv {activeCharacter?.level})
                </div>

                <button
                  type="submit"
                  disabled={playerConnecting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-cinzel font-bold text-sm tracking-wide shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {playerConnecting ? 'Conectando a la Mesa...' : '🛡️ Entrar a la Sesión de Juego'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Create World Modal */}
      {showCreateWorldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#181920] border-2 border-purple-800 rounded-2xl p-6 text-stone-200 shadow-2xl">
            <h3 className="font-cinzel font-bold text-lg text-purple-300 mb-2">
              Crear Nuevo World Sheet
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              Un World Sheet es una campaña completa con su propio mapa, NPCs, monstruos, diarios de sesión y combates.
            </p>

            <form onSubmit={handleCreateWorldSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-300 mb-1">
                  Nombre de la Campaña / Mundo
                </label>
                <input
                  type="text"
                  value={newWorldName}
                  onChange={(e) => setNewWorldName(e.target.value)}
                  placeholder="ej. Las Tierras Sombrías de Barovia"
                  autoFocus
                  className="w-full bg-[#121316] border border-stone-700 focus:border-purple-500 rounded-xl px-3 py-2 text-stone-100 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-300 mb-1">
                  Descripción o Sinopsis
                </label>
                <textarea
                  value={newWorldDesc}
                  onChange={(e) => setNewWorldDesc(e.target.value)}
                  placeholder="Sinopsis breve del escenario de campaña..."
                  rows={3}
                  className="w-full bg-[#121316] border border-stone-700 focus:border-purple-500 rounded-xl px-3 py-2 text-stone-100 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateWorldModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-cinzel font-bold text-xs"
                >
                  Crear Campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
