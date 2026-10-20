import React, { useState } from 'react';
import {
  Users,
  Wifi,
  Radio,
  Bell,
  Eye,
  Shield,
  Heart,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  AlertTriangle,
  Dices,
  Sparkles,
  Coins,
  Skull,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import { DiceRollResult, PartyMemberLive, PresenceStatus, LiveCombatantMini } from '../../types/dnd';
import { EntityAvatar } from '../common/EntityAvatar';

interface PartySessionBarProps {
  roomCode: string;
  onChangeRoomCode: (code: string) => void;
  partyMembers: PartyMemberLive[];
  recentRollsCount?: number;
  dmLastRoll?: DiceRollResult;
  onOpenRollFeed: () => void;
  currentQuest?: string;
  quickNotification?: string;
  onDismissNotification?: () => void;
  activeAnnouncement?: { title: string; content: string } | null;
  onDismissAnnouncement?: () => void;
  isDmMode: boolean;
  dmConnected?: boolean;
  dmLiveMessage?: string;
  dmPresenceStatus?: PresenceStatus;
  dmIdleSeconds?: number;
  onUpdateDmLiveMessage?: (msg: string) => void;
  showCombatantsOnTable?: boolean;
  liveCombatants?: LiveCombatantMini[];
  currentCharacterId?: string;
  currentCharacterName?: string;
  currentPlayerName?: string;
  currentPlayerTagId?: string;
  currentPlayerEmail?: string;
  onSendPlayerMessageToDM?: (
    title: string,
    description: string
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
}

export const PartySessionBar: React.FC<PartySessionBarProps> = ({
  roomCode,
  onChangeRoomCode,
  partyMembers,
  dmLastRoll,
  onOpenRollFeed,
  currentQuest,
  quickNotification,
  onDismissNotification,
  activeAnnouncement,
  onDismissAnnouncement,
  isDmMode,
  dmConnected = false,
  dmLiveMessage = '',
  dmPresenceStatus = 'active',
  dmIdleSeconds = 0,
  onUpdateDmLiveMessage,
  showCombatantsOnTable = false,
  liveCombatants = [],
  currentCharacterId,
  currentCharacterName,
  currentPlayerName,
  currentPlayerTagId,
  currentPlayerEmail,
  onSendPlayerMessageToDM,
}) => {
  const [showRoomModal, setShowRoomModal] = useState<boolean>(false);
  const [inputCode, setInputCode] = useState<string>(roomCode);
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditingDmMsg, setIsEditingDmMsg] = useState<boolean>(false);
  const [localDmMsg, setLocalDmMsg] = useState<string>(dmLiveMessage);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Private Message to DM Modal state (for players in a room)
  const [showDmMessageModal, setShowDmMessageModal] = useState<boolean>(false);
  const [msgTitle, setMsgTitle] = useState<string>('');
  const [msgDescription, setMsgDescription] = useState<string>('');
  const [isSendingMsg, setIsSendingMsg] = useState<boolean>(false);
  const [msgFeedback, setMsgFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleOpenPrivateMessageModal = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isDmMode) return;
    setMsgFeedback(null);
    setShowDmMessageModal(true);
  };

  const handleSubmitPrivateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTitle.trim() || !msgDescription.trim()) {
      setMsgFeedback({ type: 'err', text: 'Por favor escribe un título y la descripción del mensaje.' });
      return;
    }
    setIsSendingMsg(true);
    setMsgFeedback(null);
    try {
      if (onSendPlayerMessageToDM) {
        const res = await onSendPlayerMessageToDM(msgTitle.trim(), msgDescription.trim());
        if (!res.ok) {
          setMsgFeedback({ type: 'err', text: res.error || 'Error al enviar el mensaje al DM.' });
        } else {
          setMsgFeedback({ type: 'ok', text: res.message || '¡Mensaje privado enviado al Dungeon Master!' });
          setMsgTitle('');
          setMsgDescription('');
          setTimeout(() => {
            setShowDmMessageModal(false);
            setMsgFeedback(null);
          }, 1200);
        }
      } else {
        const cleanTag = (currentPlayerTagId || '123').replace(/^@+/, '').trim() || '123';
        const pName = currentPlayerName || 'Jugador';
        const response = await fetch(`/api/session/room/${encodeURIComponent(roomCode)}/player-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: currentCharacterId || 'char-live',
            characterName: currentCharacterName || 'Aventurero',
            playerName: pName,
            playerTagId: cleanTag,
            playerFullTag: `${pName}@${cleanTag}`,
            playerEmail: currentPlayerEmail,
            title: msgTitle.trim(),
            description: msgDescription.trim(),
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          setMsgFeedback({ type: 'err', text: data.error || 'Error al enviar el mensaje.' });
        } else {
          setMsgFeedback({ type: 'ok', text: data.message || '¡Mensaje enviado al Dungeon Master!' });
          setMsgTitle('');
          setMsgDescription('');
          setTimeout(() => {
            setShowDmMessageModal(false);
            setMsgFeedback(null);
          }, 1200);
        }
      }
    } catch {
      setMsgFeedback({ type: 'err', text: 'No se pudo conectar con la sala para enviar el mensaje.' });
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}?room=${roomCode}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // Compile list of dice to show (DM die + each player's last roll)
  const allDiceBadges: { name: string; isDm?: boolean; roll?: DiceRollResult }[] = [];

  // DM Die
  allDiceBadges.push({
    name: 'Dungeon Master',
    isDm: true,
    roll: dmLastRoll,
  });

  // Each connected party member
  partyMembers.forEach((member) => {
    allDiceBadges.push({
      name: member.characterName,
      roll: member.lastRoll,
    });
  });

  const renderPresenceBadge = (status?: string, idleSec: number = 0) => {
    if (status === 'afk' || idleSec > 600) {
      const mins = Math.max(1, Math.floor(idleSec / 60));
      return (
        <span className="flex items-center gap-1 text-[9px] text-stone-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
          Ausente ({mins}m)
        </span>
      );
    }
    if (status === 'thinking' || idleSec > 180) {
      return (
        <span className="flex items-center gap-1 text-[9px] text-blue-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Pensando...
        </span>
      );
    }
    if (status === 'idle' || idleSec > 60) {
      return (
        <span className="flex items-center gap-1 text-[9px] text-amber-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          En Pausa
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        En Línea
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* 1. Misión / Objetivo Actual Pinned Banner */}
      {currentQuest && (
        <div className="bg-gradient-to-r from-[#1f1b14] via-[#241f17] to-[#1c1914] border border-amber-600/40 rounded-xl px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Compass className="w-4 h-4 text-amber-400 shrink-0 animate-spin-slow" />
            <div>
              <span className="font-cinzel font-bold text-amber-300 mr-2 tracking-wide uppercase text-[11px]">
                Misión Actual:
              </span>
              <span className="text-stone-200">{currentQuest}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Notificación Rápida del DM */}
      {quickNotification && (
        <div className="bg-gradient-to-r from-red-950/70 via-stone-900 to-red-950/70 border border-red-700/60 rounded-xl px-4 py-2 shadow-md flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-bold font-cinzel text-red-300">Aviso Rápido del DM:</span>
            <span>{quickNotification}</span>
          </div>
          {onDismissNotification && (
            <button
              onClick={onDismissNotification}
              className="text-stone-400 hover:text-stone-100 text-[10px] px-2 py-0.5 rounded bg-stone-800"
            >
              Entendido
            </button>
          )}
        </div>
      )}

      {/* 3. Narrativa / Anuncio Especial Revelado */}
      {activeAnnouncement && (
        <div className="p-4 bg-gradient-to-r from-amber-950 via-[#221c17] to-amber-950 border-2 border-amber-500 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="font-cinzel font-bold text-amber-300 text-sm tracking-wider uppercase">
                Mensaje del Dungeon Master: {activeAnnouncement.title}
              </span>
            </div>
            {onDismissAnnouncement && (
              <button
                onClick={onDismissAnnouncement}
                className="text-stone-400 hover:text-stone-100 text-xs px-2 py-0.5 rounded bg-stone-900 border border-stone-700"
              >
                Cerrar
              </button>
            )}
          </div>
          <p className="mt-2 text-xs sm:text-sm text-amber-100/90 leading-relaxed italic bg-black/30 p-3 rounded-lg border border-amber-900/40">
            "{activeAnnouncement.content}"
          </p>
        </div>
      )}

      {/* 4. Main Party & Live Dice Bar Header */}
      <div className="bg-[#181920] border border-amber-900/40 rounded-xl px-4 py-3 shadow flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Left: Room identifier */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setShowRoomModal(true)}
            className="cursor-pointer flex items-center gap-2 bg-[#121316] hover:bg-[#1a1b22] px-3 py-1.5 rounded-lg border border-stone-800 hover:border-amber-700/60 transition group"
            title="Cambiar o compartir código de sala de juego"
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-stone-400">Mesa:</span>
            <span className="font-mono font-bold text-amber-300 group-hover:text-amber-200">
              {roomCode}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-stone-400">
            <Users className="w-3.5 h-3.5 text-amber-500" />
            <span>{partyMembers.length} Jugadores en Vivo</span>
          </div>
        </div>

        {/* Center / Right: Individual Live Dice per Character & DM */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-cinzel font-bold text-stone-400 whitespace-nowrap mr-1 flex items-center gap-1">
            <Dices className="w-4 h-4 text-amber-500" />
            Últimos Dados:
          </span>

          <div className="flex items-center gap-2">
            {allDiceBadges.map((badge, idx) => {
              const r = badge.roll;
              return (
                <div
                  key={idx}
                  onClick={onOpenRollFeed}
                  className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition shadow-sm ${
                    r
                      ? r.isCrit
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse'
                        : r.isFumble
                        ? 'bg-red-950/80 border-red-700 text-red-300'
                        : 'bg-[#121316] border-stone-700 text-stone-200 hover:border-amber-600'
                      : 'bg-[#121316] border-stone-800 text-stone-500'
                  }`}
                  title={
                    r
                      ? `${badge.name}: ${r.rollTitle} -> ${r.total} (${r.formula})`
                      : `${badge.name}: Aún no ha lanzado dados`
                  }
                >
                  <div className="flex flex-col">
                    <span className="text-[9px] font-cinzel font-bold text-stone-400 truncate max-w-[80px]">
                      {badge.name}
                    </span>
                    <span className="text-[9px] font-mono text-stone-500">
                      {r ? `d${r.diceType}` : 'd20'}
                    </span>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center font-cinzel font-black text-sm border ${
                      r
                        ? r.isCrit
                          ? 'bg-amber-600/30 border-amber-400 text-amber-300 shadow-sm'
                          : r.isFumble
                          ? 'bg-red-600/30 border-red-500 text-red-300'
                          : 'bg-[#181920] border-stone-700 text-amber-400'
                        : 'bg-[#181920] border-stone-800 text-stone-600'
                    }`}
                  >
                    {r ? r.total : '-'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toggle party list expand */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-[#121316] text-stone-400 hover:text-stone-200 ml-1 shrink-0"
            title={isExpanded ? 'Contraer grupo' : 'Expandir grupo'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 5. Connected Party Member Cards & Dungeon Master Live Card */}
      {isExpanded && (dmConnected || isDmMode || partyMembers.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {/* Dungeon Master Live Card */}
          {(dmConnected || isDmMode) && (
            <div
              onClick={() => !isDmMode && setSelectedCardId(selectedCardId === 'dm' ? null : 'dm')}
              className="bg-gradient-to-br from-[#1a1426] via-[#161720] to-[#14121a] border-2 border-purple-600/70 rounded-xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 rounded-full blur-xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-purple-700 flex items-center justify-center text-purple-200">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-cinzel font-bold text-purple-300 text-xs tracking-wide">
                      Dungeon Master
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {renderPresenceBadge(dmPresenceStatus, dmIdleSeconds)}
                    {!isDmMode && (
                      <button
                        type="button"
                        onClick={handleOpenPrivateMessageModal}
                        title="Enviar mensaje privado al Dungeon Master"
                        className="p-1 rounded-md bg-purple-900/60 hover:bg-purple-700 text-purple-200 border border-purple-500/40 transition shadow-sm"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-purple-400 font-semibold mb-1">
                  Guía de Mesa • Narrador
                </div>

                {/* DM Live Message Box */}
                <div className="bg-purple-950/40 border border-purple-800/40 rounded-lg p-2 my-1 text-xs">
                  <div className="text-[9px] font-cinzel uppercase text-purple-300 font-bold mb-0.5 flex items-center justify-between">
                    <span>Mensaje para la Mesa:</span>
                    {isDmMode && !isEditingDmMsg && (
                      <button
                        onClick={() => {
                          setLocalDmMsg(dmLiveMessage || '');
                          setIsEditingDmMsg(true);
                        }}
                        className="text-[9px] text-amber-400 hover:text-amber-300 underline font-normal"
                      >
                        Editar
                      </button>
                    )}
                  </div>

                  {isEditingDmMsg ? (
                    <div className="space-y-1.5 mt-1">
                      <textarea
                        value={localDmMsg}
                        onChange={(e) => setLocalDmMsg(e.target.value)}
                        placeholder="Escribe el mensaje en vivo para todos los jugadores..."
                        rows={2}
                        className="w-full bg-[#121316] border border-purple-500 rounded p-1.5 text-xs text-stone-100"
                      />
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditingDmMsg(false)}
                          className="px-2 py-0.5 rounded text-[10px] text-stone-400 hover:bg-stone-800"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateDmLiveMessage) onUpdateDmLiveMessage(localDmMsg);
                            setIsEditingDmMsg(false);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] bg-purple-600 hover:bg-purple-500 text-white font-bold"
                        >
                          Enviar a Mesa
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-stone-200 text-xs italic leading-snug">
                      "{dmLiveMessage || 'El Dungeon Master está orquestando los hilos del destino...'}"
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-purple-900/40 flex items-center justify-between text-[10px] text-stone-400">
                <span className="text-stone-400">Rol: <strong>Director de Juego</strong></span>
                <span className="font-mono text-purple-300">Sala: {roomCode}</span>
              </div>
            </div>
          )}

          {partyMembers.map((member) => {
            const formatMod = (score?: number) => {
              if (score === undefined || score === null) return '-';
              const mod = Math.floor((score - 10) / 2);
              return mod >= 0 ? `+${mod}` : `${mod}`;
            };
            const isCardSelected = selectedCardId === member.characterId;

            return (
              <div
                key={member.characterId}
                onClick={() => setSelectedCardId(isCardSelected ? null : member.characterId)}
                className={`bg-[#181920] border rounded-xl p-3 flex flex-col justify-between shadow transition cursor-pointer ${
                  isCardSelected ? 'border-amber-600/80 ring-1 ring-amber-500/30' : 'border-stone-800 hover:border-amber-900/40'
                }`}
              >
                <div>
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <EntityAvatar
                      avatarType={
                        member.avatarType ||
                        (member.avatarCustomUrl || member.avatarUrl ? 'custom' : 'icon')
                      }
                      customUrl={member.avatarCustomUrl || member.avatarUrl}
                      iconId={member.avatarIcon || 'anonymous'}
                      size="md"
                      className="shrink-0 shadow-md border border-amber-700/60"
                      title={`Foto / Avatar de ${member.characterName}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <span
                          className="font-cinzel font-bold text-stone-100 text-xs sm:text-sm truncate"
                          title={member.characterName}
                        >
                          {member.characterName}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {renderPresenceBadge(member.presenceStatus, member.idleSeconds)}
                          {!isDmMode && (
                            <button
                              type="button"
                              onClick={handleOpenPrivateMessageModal}
                              title="Enviar mensaje privado al Dungeon Master"
                              className={`p-1 rounded-md border transition ${
                                isCardSelected
                                  ? 'bg-amber-600 text-stone-950 border-amber-400 shadow'
                                  : 'bg-[#121316] hover:bg-amber-950/80 text-amber-400/90 hover:text-amber-300 border-stone-700 hover:border-amber-600/60'
                              }`}
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1.5 text-[10px] text-stone-400">
                        <span className="truncate" title={member.playerFullTag || member.playerName}>
                          Jugador:{' '}
                          <strong className="text-stone-300">
                            {member.playerFullTag ||
                              (member.playerTagId
                                ? `${member.playerName}@${member.playerTagId}`
                                : member.playerName)}
                          </strong>
                        </span>
                        <span className="text-amber-400/90 font-mono text-[10px] shrink-0">
                          Niv {member.level} {member.characterClass}
                        </span>
                      </div>
                      {!isDmMode && isCardSelected && (
                        <div className="mt-1.5 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={handleOpenPrivateMessageModal}
                            className="w-full py-1 px-2 rounded bg-amber-950/60 hover:bg-amber-900/70 border border-amber-700/60 text-amber-300 text-[10px] font-cinzel font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Mandar Mensaje Privado al DM
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* HP Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="flex items-center gap-1 text-red-400 font-bold">
                        <Heart className="w-3 h-3" /> PG:
                      </span>
                      <span className="text-stone-200 font-bold">
                        {member.currentHp} / {member.maxHp}
                      </span>
                    </div>
                    <div className="h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          member.currentHp / member.maxHp > 0.5
                            ? 'bg-emerald-500'
                            : member.currentHp / member.maxHp > 0.2
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, (member.currentHp / member.maxHp) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats de Habilidades (FUE, DES, CON, INT, SAB, CAR) */}
                  {member.abilities && (
                    <div className="mt-2 pt-1.5 border-t border-stone-800/60">
                      <div className="text-[9px] uppercase tracking-wider font-cinzel text-stone-400 mb-1 flex items-center justify-between">
                        <span>Atributos:</span>
                      </div>
                      <div className="grid grid-cols-6 gap-1 text-center">
                        <div className="bg-[#121316] rounded py-0.5 border border-stone-800/80">
                          <div className="text-[8px] font-cinzel font-bold text-stone-400">FUE</div>
                          <div className="text-[10px] font-mono font-bold text-amber-300">{member.abilities.str}</div>
                          <div className="text-[8px] font-mono text-stone-400">{formatMod(member.abilities.str)}</div>
                        </div>
                        <div className="bg-[#121316] rounded py-0.5 border border-stone-800/80">
                          <div className="text-[8px] font-cinzel font-bold text-stone-400">DES</div>
                          <div className="text-[10px] font-mono font-bold text-amber-300">{member.abilities.dex}</div>
                          <div className="text-[8px] font-mono text-stone-400">{formatMod(member.abilities.dex)}</div>
                        </div>
                        <div className="bg-[#121316] rounded py-0.5 border border-stone-800/80">
                          <div className="text-[8px] font-cinzel font-bold text-stone-400">CON</div>
                          <div className="text-[10px] font-mono font-bold text-amber-300">{member.abilities.con}</div>
                          <div className="text-[8px] font-mono text-stone-400">{formatMod(member.abilities.con)}</div>
                        </div>
                        <div className="bg-[#121316] rounded py-0.5 border border-stone-800/80">
                          <div className="text-[8px] font-cinzel font-bold text-stone-400">INT</div>
                          <div className="text-[10px] font-mono font-bold text-amber-300">{member.abilities.int}</div>
                          <div className="text-[8px] font-mono text-stone-400">{formatMod(member.abilities.int)}</div>
                        </div>
                        <div className="bg-[#121316] rounded py-0.5 border border-stone-800/80">
                          <div className="text-[8px] font-cinzel font-bold text-stone-400">SAB</div>
                          <div className="text-[10px] font-mono font-bold text-amber-300">{member.abilities.wis}</div>
                          <div className="text-[8px] font-mono text-stone-400">{formatMod(member.abilities.wis)}</div>
                        </div>
                        <div className="bg-[#121316] rounded py-0.5 border border-stone-800/80">
                          <div className="text-[8px] font-cinzel font-bold text-stone-400">CAR</div>
                          <div className="text-[10px] font-mono font-bold text-amber-300">{member.abilities.cha}</div>
                          <div className="text-[8px] font-mono text-stone-400">{formatMod(member.abilities.cha)}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bolsa de Monedas */}
                  {member.currency && (
                    <div className="mt-1.5 pt-1 border-t border-stone-800/40 flex items-center justify-between text-[10px] font-mono bg-[#131418] px-2 py-0.5 rounded border border-stone-800/60">
                      <span className="flex items-center gap-1 text-stone-400 text-[9px] font-cinzel font-semibold">
                        <Coins className="w-3 h-3 text-amber-400" /> Bolsa:
                      </span>
                      <div className="flex items-center gap-1.5 text-stone-300 text-[9px]">
                        <span className="text-amber-300 font-bold" title="Piezas de Oro">
                          {member.currency.gp ?? 0} <span className="text-[8px] text-amber-400/80">PO</span>
                        </span>
                        <span className="text-stone-300" title="Piezas de Plata">
                          {member.currency.sp ?? 0} <span className="text-[8px] text-stone-400">PP</span>
                        </span>
                        <span className="text-amber-600" title="Piezas de Cobre">
                          {member.currency.cp ?? 0} <span className="text-[8px] text-amber-700">PC</span>
                        </span>
                        {((member.currency.pp ?? 0) > 0 || (member.currency.ep ?? 0) > 0) && (
                          <span className="text-cyan-300 text-[8px]" title="Platino / Electro">
                            +{member.currency.pp ?? 0}PPT
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] text-stone-400">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-500" /> CA: <strong className="text-stone-200">{member.ac}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-blue-400" /> PP: <strong className="text-stone-200">{member.passivePerception}</strong>
                  </span>
                </div>
              </div>
            );
          })}

          {/* 6. Combatientes en Escena (Enemigos y Aliados) activados por el DM */}
          {showCombatantsOnTable && liveCombatants && liveCombatants.length > 0 && (
            <div className="col-span-full mt-2 pt-3 border-t border-stone-800/80 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Skull className="w-4 h-4 text-red-400" />
                  <span className="font-cinzel font-bold text-xs uppercase tracking-wider text-stone-300">
                    Combatientes en Escena ({liveCombatants.length})
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-800 font-mono font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    En Vivo en Mesa
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 font-cinzel">
                  Mostrado por el Dungeon Master
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {liveCombatants.map((c) => {
                  const isAlly = c.faction === 'ally';
                  const hpRatio = c.maxHp > 0 ? c.hp / c.maxHp : 0;
                  return (
                    <div
                      key={c.id}
                      className={`rounded-xl p-2.5 border shadow-md flex flex-col justify-between transition relative overflow-hidden ${
                        isAlly
                          ? 'bg-gradient-to-br from-[#101b13] via-[#141a16] to-[#0e1410] border-emerald-600/70 text-emerald-100'
                          : 'bg-gradient-to-br from-[#221012] via-[#1a1215] to-[#140e10] border-red-700/70 text-red-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1 gap-1">
                          <span
                            className="font-cinzel font-bold text-[11px] truncate text-stone-100 block"
                            title={c.name}
                          >
                            {c.name}
                          </span>
                          <span
                            className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded font-mono shrink-0 ${
                              isAlly
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : 'bg-red-950 text-red-300 border border-red-800'
                            }`}
                          >
                            {isAlly ? 'Aliado' : 'Enemigo'}
                          </span>
                        </div>

                        {/* HP Mini Bar */}
                        <div className="space-y-0.5 my-1">
                          <div className="flex items-center justify-between text-[9px] font-mono">
                            <span className="flex items-center gap-0.5 text-stone-400 font-bold">
                              <Heart className="w-2.5 h-2.5 text-red-400" /> PG:
                            </span>
                            <span className="font-bold text-stone-200">
                              {c.hp} / {c.maxHp}
                            </span>
                          </div>
                          <div className="h-1.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                            <div
                              className={`h-full transition-all duration-300 ${
                                hpRatio > 0.5
                                  ? isAlly ? 'bg-emerald-500' : 'bg-red-500'
                                  : hpRatio > 0.2
                                  ? 'bg-amber-500'
                                  : 'bg-red-600 animate-pulse'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, hpRatio * 100))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-1 pt-1 border-t border-stone-800/80 flex items-center justify-between text-[9px] text-stone-400 font-mono">
                        <span className="flex items-center gap-0.5">
                          <Shield className="w-2.5 h-2.5 text-amber-500" /> CA: <strong className="text-stone-200">{c.ac}</strong>
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5 text-blue-400" /> PP: <strong className="text-stone-200">{c.passivePerception}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Room Code Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#181920] border-2 border-amber-900/60 rounded-xl p-5 text-stone-200 shadow-2xl">
            <h3 className="font-cinzel font-bold text-lg mb-2 text-amber-300">
              Conexión de la Mesa de Juego
            </h3>
            <p className="text-xs text-stone-400 mb-4 leading-relaxed">
              Ingresa el mismo código de sala (o IP de red) que tus compañeros. El DM y todos los jugadores compartirán las tiradas en vivo, la misión activa y los dados de cada aventurero.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase text-stone-400 mb-1">
                Código de Sala o IP
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Ej. MESA-DRAGON o 192.168.1.100"
                className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-2 text-stone-100 font-mono font-bold text-sm tracking-wider"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangeRoomCode(inputCode.trim() || 'MESA-DRAGON');
                    setShowRoomModal(false);
                  }}
                  className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs"
                >
                  Unirse a Sala
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Private Message to DM Modal (Player -> DM) */}
      {showDmMessageModal && !isDmMode && (
        <div
          onClick={() => setShowDmMessageModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#16171d] border-2 border-purple-700/70 rounded-2xl p-5 text-stone-200 shadow-2xl relative"
          >
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-sm sm:text-base text-purple-200">
                    Mensaje Privado al Dungeon Master
                  </h3>
                  <p className="text-[10px] text-stone-400">
                    Mesa: <span className="font-mono text-amber-300 font-bold">{roomCode}</span> • Solo el DM verá este mensaje
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDmMessageModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-3 bg-[#101116] border border-stone-800 rounded-lg px-3 py-2 flex items-center justify-between text-[11px]">
              <div>
                <span className="text-stone-400">Personaje: </span>
                <strong className="text-amber-300 font-cinzel">{currentCharacterName || 'Aventurero'}</strong>
              </div>
              <div>
                <span className="text-stone-400">Jugador: </span>
                <strong className="text-purple-300 font-mono">
                  {currentPlayerName || 'Jugador'}@{(currentPlayerTagId || '123').replace(/^@+/, '')}
                </strong>
              </div>
            </div>

            <form onSubmit={handleSubmitPrivateMessage} className="space-y-3">
              <div>
                <label className="block text-[11px] font-cinzel font-bold uppercase text-stone-300 mb-1">
                  Título del Mensaje *
                </label>
                <input
                  type="text"
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  placeholder="Ej. Acción secreta, Pregunta sobre el NPC, Susurro..."
                  maxLength={120}
                  className="w-full bg-[#101116] border border-stone-700 focus:border-purple-500 rounded-lg px-3 py-2 text-xs text-stone-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-cinzel font-bold uppercase text-stone-300 mb-1">
                  Descripción del Mensaje *
                </label>
                <textarea
                  value={msgDescription}
                  onChange={(e) => setMsgDescription(e.target.value)}
                  placeholder="Escribe aquí los detalles del mensaje privado para el Dungeon Master..."
                  rows={4}
                  maxLength={2000}
                  className="w-full bg-[#101116] border border-stone-700 focus:border-purple-500 rounded-lg px-3 py-2 text-xs text-stone-100 outline-none resize-y"
                  required
                />
              </div>

              {msgFeedback && (
                <div
                  className={`p-2.5 rounded-lg text-xs border ${
                    msgFeedback.type === 'ok'
                      ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                      : 'bg-red-950/60 border-red-700/60 text-red-300'
                  }`}
                >
                  {msgFeedback.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowDmMessageModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingMsg}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-cinzel font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingMsg ? 'Enviando...' : 'Enviar Mensaje al DM'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
