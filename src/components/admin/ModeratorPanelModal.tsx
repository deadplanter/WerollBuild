import React, { useState, useEffect } from 'react';
import {
  Shield,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Search,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { AuthSessionUser } from '../auth/RoleSelectionModal';

interface ModeratorPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser: AuthSessionUser;
  onNavigateToForum?: () => void;
}

export const ModeratorPanelModal: React.FC<ModeratorPanelModalProps> = ({
  isOpen,
  onClose,
  authUser,
  onNavigateToForum,
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [actionMessage, setActionMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchModerationUsers = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/moderator/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar usuarios');
      setUsers(data.users || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchModerationUsers();
      setActionMessage('');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Approve User
  const handleApprove = async (userId: string) => {
    setActionMessage('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al aprobar');
      setActionMessage(`Cuenta aprobada con éxito.`);
      fetchModerationUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al aprobar usuario.');
    }
  };

  // Reject User
  const handleReject = async (userId: string) => {
    if (!confirm('¿Rechazar solicitud de acceso de este usuario?')) return;
    setActionMessage('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/reject`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al rechazar');
      setActionMessage(`Solicitud de usuario rechazada.`);
      fetchModerationUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al rechazar usuario.');
    }
  };

  // Toggle Forum Permission
  const handleToggleForumPermission = async (userId: string, currentAllowed: boolean) => {
    setActionMessage('');
    try {
      const res = await fetch(`/api/moderator/users/${userId}/forum-permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed: !currentAllowed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al modificar permisos');
      setActionMessage(data.message || 'Permiso de foro actualizado.');
      fetchModerationUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al actualizar permiso de foro.');
    }
  };

  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const filteredUsers = users.filter((u) => {
    if (statusFilter === 'pending' && u.status !== 'pending') return false;
    if (statusFilter === 'approved' && u.status !== 'approved') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        u.email?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q) ||
        u.userTagId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#14151b] border border-purple-800/80 rounded-2xl w-full max-w-4xl h-[680px] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
        {/* Header */}
        <div className="bg-[#181920] border-b border-stone-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/70 border border-purple-600 flex items-center justify-center text-purple-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-cinzel font-black text-base text-purple-200">
                  Panel de Moderación WeRoll
                </h3>
                <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300">
                  Acceso de Moderador
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Aprobación de nuevos usuarios, gestión de permisos para escribir en el foro y moderación comunitaria.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications Bar */}
        {actionMessage && (
          <div className="bg-emerald-950/60 border-b border-emerald-800 px-5 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{actionMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-950/60 border-b border-red-800 px-5 py-2.5 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-[#16171e] border-b border-stone-800/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-cinzel font-bold transition ${
                statusFilter === 'all'
                  ? 'bg-purple-900/60 text-purple-200 border border-purple-600'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              Todos ({users.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-cinzel font-bold transition flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-amber-900/60 text-amber-200 border border-amber-600'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>Pendientes</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-cinzel font-bold transition ${
                statusFilter === 'approved'
                  ? 'bg-emerald-950 text-emerald-200 border border-emerald-700'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              Aprobados
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por correo o @ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121318] border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-purple-600"
            />
          </div>
        </div>

        {/* Users Table / List */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#101115]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-500">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mb-2" />
              <span className="text-xs font-cinzel">Cargando cuentas de usuarios...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-stone-500 text-xs">
              No se encontraron usuarios con los filtros aplicados.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => {
                const isUserPending = u.status === 'pending';
                const hasForumPerm = Boolean(u.canPostInForum || u.appRole === 'admin' || u.appRole === 'moderator');
                const requestedPerm = Boolean(u.forumPermissionsRequested);

                return (
                  <div
                    key={u.id}
                    className={`bg-[#181920] border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-sm ${
                      isUserPending
                        ? 'border-amber-700/60 bg-amber-950/10'
                        : 'border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {/* User Identity Info */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-950/50 border border-purple-800 flex items-center justify-center text-purple-300 font-bold font-cinzel shrink-0">
                        {u.displayName?.slice(0, 2).toUpperCase() || 'US'}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm font-cinzel font-bold text-stone-100">
                            {u.displayName}
                          </strong>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-amber-300 font-bold">
                            @{u.userTagId || '123'}
                          </span>
                          {/* Player Type Badge */}
                          <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                            Tipo: {u.playerType === 'dm' ? 'Dungeon Master' : u.playerType === 'player' ? 'Jugador' : 'DM y Jugador'}
                          </span>
                          {/* App Role Badge */}
                          <span className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-full border ${
                            u.appRole === 'admin'
                              ? 'bg-red-950 text-red-300 border-red-700'
                              : u.appRole === 'moderator'
                              ? 'bg-purple-950 text-purple-300 border-purple-700'
                              : 'bg-stone-800 text-stone-300 border-stone-700'
                          }`}>
                            App: {u.appRole === 'admin' ? 'Administrador' : u.appRole === 'moderator' ? 'Moderador' : 'Cliente'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">{u.email}</p>
                      </div>
                    </div>

                    {/* Moderation Controls: Approval & Forum Perms */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {isUserPending ? (
                        <>
                          <button
                            onClick={() => handleApprove(u.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-stone-100 font-cinzel font-bold text-xs transition flex items-center gap-1 shadow"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Aprobar Registro</span>
                          </button>
                          <button
                            onClick={() => handleReject(u.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-cinzel font-bold text-xs transition flex items-center gap-1"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Rechazar</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* Forum Posting Permission Toggle (Denegar / Permitir) */}
                          <button
                            onClick={() => handleToggleForumPermission(u.id, hasForumPerm)}
                            disabled={u.appRole === 'admin' || u.appRole === 'moderator'}
                            className={`px-3 py-1.5 rounded-xl text-xs font-cinzel font-bold transition flex items-center gap-1.5 border shadow-sm ${
                              u.appRole === 'admin' || u.appRole === 'moderator'
                                ? 'bg-purple-950/30 border-purple-800/40 text-purple-400 cursor-not-allowed'
                                : hasForumPerm
                                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 hover:bg-red-950/80 hover:border-red-600 hover:text-red-300'
                                : requestedPerm
                                ? 'bg-amber-950/80 border-amber-600 text-amber-200 animate-pulse hover:bg-emerald-950/80 hover:border-emerald-600'
                                : 'bg-red-950/40 border-red-900/60 text-red-300 hover:bg-emerald-950/80 hover:border-emerald-600 hover:text-emerald-200'
                            }`}
                            title={
                              u.appRole === 'admin' || u.appRole === 'moderator'
                                ? 'Administradores y moderadores siempre tienen permiso para publicar'
                                : hasForumPerm
                                ? 'Permitido actualmente. Haz clic para DENEGAR permiso'
                                : 'Negado actualmente. Haz clic para PERMITIR publicar'
                            }
                          >
                            {u.appRole === 'admin' || u.appRole === 'moderator' ? (
                              <>
                                <Shield className="w-3.5 h-3.5 text-purple-400" />
                                <span>Permiso Total (Admin/Mod)</span>
                              </>
                            ) : hasForumPerm ? (
                              <>
                                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Permitido (Denegar Permiso)</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-red-400" />
                                <span>Negado {requestedPerm ? '(Solicitó - Aprobar)' : '(Permitir Publicar)'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#181920] border-t border-stone-800 p-4 flex items-center justify-between">
          <p className="text-[11px] text-stone-500">
            Los moderadores tienen control de acceso y foros. Para cambios en servidores, bóvedas o contraseñas, contacta al Administrador.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold text-xs transition"
          >
            Cerrar Panel
          </button>
        </div>
      </div>
    </div>
  );
};
