import React, { useState, useEffect } from 'react';
import { Send, Users, Shield, Check, AlertCircle, Sparkles, X, Gift, RefreshCw } from 'lucide-react';
import {
  InventoryItem,
  SpellItem,
  SharedFeatureOrAbility,
  DMCustomItemOrSpell,
  PlayerSheetRecord,
  PartyMemberLive,
} from '../../types/dnd';

export interface DMTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: {
    kind: 'item' | 'spell' | 'ability';
    title: string;
    item?: InventoryItem;
    spell?: SpellItem;
    ability?: SharedFeatureOrAbility;
    customObj?: DMCustomItemOrSpell;
  } | null;
  roomCode?: string;
  vaultSheets?: PlayerSheetRecord[];
  partyMembers?: PartyMemberLive[];
  onSuccessMessage: (msg: string) => void;
}

export const DMTransferModal: React.FC<DMTransferModalProps> = ({
  isOpen,
  onClose,
  entity,
  roomCode = 'MESA-PRINCIPAL',
  partyMembers = [],
  onSuccessMessage,
}) => {
  const [selectedCharId, setSelectedCharId] = useState<string>('');
  const [includeDmSecrets, setIncludeDmSecrets] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isLoadingRoom, setIsLoadingRoom] = useState<boolean>(false);
  const [liveRoomParty, setLiveRoomParty] = useState<PartyMemberLive[]>(partyMembers);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchLiveRoomPlayers = async () => {
    if (!roomCode) return;
    setIsLoadingRoom(true);
    try {
      const res = await fetch(`/api/session/room/${encodeURIComponent(roomCode.trim().toUpperCase())}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.party)) {
          setLiveRoomParty(data.party);
          if (data.party.length === 1 && !selectedCharId) {
            setSelectedCharId(data.party[0].characterId);
          }
        }
      }
    } catch (e) {
      // Fallback to partyMembers prop
    } finally {
      setIsLoadingRoom(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLiveRoomParty(partyMembers);
      if (partyMembers.length === 1) {
        setSelectedCharId(partyMembers[0].characterId);
      } else {
        setSelectedCharId('');
      }
      fetchLiveRoomPlayers();
    }
  }, [isOpen, roomCode]);

  if (!isOpen || !entity) return null;

  // Only allow sharing with players currently connected in the SAME room
  const sameRoomPlayersMap = new Map<string, PartyMemberLive>();
  for (const p of [...partyMembers, ...liveRoomParty]) {
    if (p && p.characterId) {
      sameRoomPlayersMap.set(p.characterId, p);
    }
  }
  const sameRoomPlayers = Array.from(sameRoomPlayersMap.values());

  const kindLabel =
    entity.kind === 'spell'
      ? 'Conjuro'
      : entity.kind === 'ability'
      ? 'Habilidad / Rasgo'
      : 'Objeto';

  const handleTransfer = async () => {
    setErrorMsg('');
    if (!selectedCharId) {
      setErrorMsg('Por favor selecciona al jugador en tu misma sala al que deseas compartir este elemento.');
      return;
    }

    const targetChar = sameRoomPlayers.find((c) => c.characterId === selectedCharId);
    if (!targetChar) {
      setErrorMsg('El jugador seleccionado no se encuentra actualmente en tu misma sala.');
      return;
    }

    setIsSending(true);

    try {
      const fullDescription =
        (entity.customObj?.description ||
          entity.item?.description ||
          entity.spell?.description ||
          entity.ability?.description ||
          '') +
        (entity.customObj?.properties ? `\nPropiedades: ${entity.customObj.properties}` : '') +
        (includeDmSecrets && entity.customObj?.dmSecrets ? `\nSecretos DM: ${entity.customObj.dmSecrets}` : '');

      let itemObj: InventoryItem | undefined;
      let spellObj: SpellItem | undefined;
      let abilityObj: SharedFeatureOrAbility | undefined;

      if (entity.kind === 'item') {
        const inferredGroup =
          entity.item?.itemGroup ||
          entity.customObj?.itemGroup ||
          ((entity.customObj?.category || '').toLowerCase().includes('armadura') ||
          (entity.customObj?.category || '').toLowerCase().includes('escudo')
            ? 'armor'
            : (entity.customObj?.category || '').toLowerCase().includes('arma') ||
              (entity.customObj?.category || '').toLowerCase().includes('espada') ||
              (entity.customObj?.weaponAttacks && entity.customObj.weaponAttacks.length > 0)
            ? 'weapon'
            : 'common');
        itemObj = entity.item
          ? {
              ...entity.item,
              id: `inv-transfer-${Date.now()}`,
              itemGroup: entity.item.itemGroup || inferredGroup,
              weaponAttacks: entity.item.weaponAttacks || entity.customObj?.weaponAttacks,
              statModifiers: entity.item.statModifiers || entity.customObj?.statModifiers,
              itemActions: entity.item.itemActions || entity.customObj?.itemActions,
            }
          : {
              id: `inv-transfer-${Date.now()}`,
              name: entity.customObj?.name || entity.title,
              quantity: 1,
              weight: entity.customObj?.weight ?? 1,
              category:
                inferredGroup === 'weapon'
                  ? 'Arma'
                  : inferredGroup === 'armor'
                  ? 'Armadura'
                  : ((entity.customObj?.category as any) || 'Objeto'),
              itemGroup: inferredGroup,
              rarity: entity.customObj?.rarity || 'Raro',
              description: fullDescription.trim() || 'Objeto otorgado por el Dungeon Master.',
              equipped: false,
              weaponAttacks: entity.customObj?.weaponAttacks,
              statModifiers: entity.customObj?.statModifiers,
              itemActions: entity.customObj?.itemActions,
            };
      } else if (entity.kind === 'spell') {
        spellObj = entity.spell
          ? {
              ...entity.spell,
              id: `spell-transfer-${Date.now()}`,
              statModifiers: entity.spell.statModifiers || entity.customObj?.statModifiers,
              itemActions: entity.spell.itemActions || entity.customObj?.itemActions,
            }
          : {
              id: `spell-transfer-${Date.now()}`,
              name: entity.customObj?.name || entity.title,
              level: 1,
              school: entity.customObj?.category || 'Arcano',
              castingTime: '1 acción',
              range: '60 pies',
              components: 'V, S',
              duration: 'Instantánea',
              description: fullDescription.trim() || 'Conjuro enseñado por el Dungeon Master.',
              prepared: true,
              statModifiers: entity.customObj?.statModifiers,
              itemActions: entity.customObj?.itemActions,
            };
      } else if (entity.kind === 'ability') {
        abilityObj = entity.ability
          ? {
              ...entity.ability,
              id: `feat-transfer-${Date.now()}`,
              abilityStat: entity.ability.abilityStat || entity.customObj?.abilityStat || 'int',
              isSkill: true,
              statModifiers: entity.ability.statModifiers || entity.customObj?.statModifiers,
              itemActions: entity.ability.itemActions || entity.customObj?.itemActions,
            }
          : {
              id: `feat-transfer-${Date.now()}`,
              name: entity.customObj?.name || entity.title,
              source: 'Dote',
              description: fullDescription.trim() || 'Habilidad especial otorgada por el Dungeon Master.',
              abilityStat: entity.customObj?.abilityStat || 'int',
              isSkill: true,
              statModifiers: entity.customObj?.statModifiers,
              itemActions: entity.customObj?.itemActions,
            };
      }

      const normRoomCode = (roomCode || 'MESA-PRINCIPAL').trim().toUpperCase();
      const res = await fetch(`/api/session/room/${encodeURIComponent(normRoomCode)}/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCharacterId: targetChar.characterId,
          targetCharacterName: targetChar.characterName,
          targetPlayerName: targetChar.playerName,
          kind: entity.kind,
          title: entity.title,
          rarity: entity.customObj?.rarity || entity.item?.rarity || 'Especial',
          category:
            entity.customObj?.category ||
            entity.item?.category ||
            entity.spell?.school ||
            entity.ability?.source ||
            kindLabel,
          description: fullDescription.trim(),
          item: itemObj,
          spell: spellObj,
          ability: abilityObj,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al compartir con el jugador.');

      // Broadcast to live table session for instant same-browser notification
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('dnd_5e_session_channel');
        bc.postMessage({
          type: 'DM_OFFER_CREATED',
          payload: data.offer,
        });
        bc.close();
      }

      onSuccessMessage(
        `📨 Oferta enviada a ${targetChar.characterName} en la sala ${normRoomCode}: esperando a que acepte o rechace "${entity.title}"...`
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en la conexión con el servidor.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-[#181920] border-2 border-amber-900/80 rounded-3xl shadow-2xl p-6 text-stone-200 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-950 border border-amber-600/80 flex items-center justify-center text-amber-300 shadow">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-base text-amber-300">
                Compartir {kindLabel} en Sala
              </h3>
              <p className="text-xs text-stone-400">
                Elemento: <strong className="text-stone-200">{entity.title}</strong> • Sala:{' '}
                <span className="font-mono text-amber-400 font-bold">{roomCode}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Character Selector (Restricted ONLY to players in the SAME active room) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-cinzel font-bold uppercase text-stone-400">
              Jugadores Conectados en tu Misma Sala ({sameRoomPlayers.length}):
            </label>
            <button
              type="button"
              onClick={fetchLiveRoomPlayers}
              disabled={isLoadingRoom}
              className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-cinzel"
              title="Actualizar lista de jugadores en la sala"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingRoom ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>

          {sameRoomPlayers.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#121316] border border-amber-900/40 text-stone-400 text-xs text-center space-y-1.5">
              <Users className="w-6 h-6 text-amber-500/60 mx-auto" />
              <p className="font-cinzel font-bold text-amber-300">
                No hay jugadores conectados en la sala {roomCode}
              </p>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Solo puedes compartir objetos, conjuros y habilidades con usuarios que estén dentro de tu misma sala activa. Pide a tus jugadores que se unan con el código <strong>{roomCode}</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {sameRoomPlayers.map((char) => {
                const isSelected = selectedCharId === char.characterId;
                return (
                  <button
                    key={char.characterId}
                    type="button"
                    onClick={() => setSelectedCharId(char.characterId)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow ring-1 ring-amber-500'
                        : 'bg-[#121316] border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-cinzel font-bold text-xs text-stone-100">
                          {char.characterName}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 block font-sans mt-0.5">
                        {char.characterClass} • Nivel {char.level} (Jugador: {char.playerName})
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Notice about Player Acceptance */}
        <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-[11px] text-amber-200/90 leading-relaxed">
          Al compartir, el jugador recibirá una <strong>notificación en pantalla</strong> preguntándole si desea recibir <strong>"{entity.title}"</strong>. Tú recibirás un aviso inmediato cuando lo acepte o lo rechace.
        </div>

        {/* DM Secrets checkbox if present */}
        {entity.customObj?.dmSecrets && (
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#121316] border border-stone-800 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDmSecrets}
              onChange={(e) => setIncludeDmSecrets(e.target.checked)}
              className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-amber-500"
            />
            <div>
              <span className="text-xs font-cinzel font-semibold text-stone-200 block">
                Incluir Notas Secretas del DM
              </span>
              <span className="text-[10px] text-stone-400 block">
                Permite que el jugador descubra el efecto secreto o la maldición en la descripción.
              </span>
            </div>
          </label>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-stone-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-cinzel transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleTransfer}
            disabled={isSending || sameRoomPlayers.length === 0 || !selectedCharId}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSending ? 'Enviando oferta...' : `Compartir ${kindLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
};
