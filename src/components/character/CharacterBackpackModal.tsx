import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sword,
  Shield,
  Package,
  Coins,
  Sparkles,
  Scale,
  Edit3,
} from 'lucide-react';
import {
  Character5e,
  InventoryItem,
  WeaponAttack,
  SpellItem,
  Currency,
} from '../../types/dnd';
import {
  calculateCarryCapacity,
  classifyInventoryItemKey,
  formatWeaponAttackFormula,
} from '../../utils/dnd-math';

interface CharacterBackpackModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character5e;
  onUpdateCharacter: (updated: Character5e) => void;
  isLocked?: boolean;
  onUnlockRequest?: () => void;
}

type BackpackTab = 'weapons' | 'armor' | 'common' | 'spells';

const DAMAGE_TYPES = [
  'Cortante',
  'Perforante',
  'Contundente',
  'Fuego',
  'Frío',
  'Relámpago',
  'Trueno',
  'Ácido',
  'Veneno',
  'Necrótico',
  'Radiante',
  'Psíquico',
  'Fuerza',
];

export const CharacterBackpackModal: React.FC<CharacterBackpackModalProps> = ({
  isOpen,
  onClose,
  character,
  onUpdateCharacter,
  isLocked = false,
  onUnlockRequest,
}) => {
  const [activeTab, setActiveTab] = useState<BackpackTab>('weapons');

  // Quick coin delta input state
  const [coinDelta, setCoinDelta] = useState<{
    currency: keyof Currency;
    amount: string;
  }>({ currency: 'gp', amount: '10' });

  // Item / Weapon / Armor modal state
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [activeAttackTabIdx, setActiveAttackTabIdx] = useState<number>(0);
  const [itemDraft, setItemDraft] = useState<{
    name: string;
    quantity: number;
    weight: number;
    itemGroup: 'weapon' | 'armor' | 'common';
    category: InventoryItem['category'];
    rarity: InventoryItem['rarity'];
    equipped: boolean;
    description: string;
    weaponAttacks: WeaponAttack[];
  }>({
    name: '',
    quantity: 1,
    weight: 2,
    itemGroup: 'weapon',
    category: 'Arma',
    rarity: 'Común',
    equipped: true,
    description: '',
    weaponAttacks: [
      {
        id: 'atk-1',
        name: 'Ataque Principal',
        description: '',
        dice: '1d8',
        potenciador: 0,
        damageType: 'Cortante',
        attackType: 'melee',
        range: '5 pies',
      },
    ],
  });

  // Spell Form state
  const [showSpellForm, setShowSpellForm] = useState(false);
  const [editingSpellId, setEditingSpellId] = useState<string | null>(null);
  const [spellDraft, setSpellDraft] = useState<{
    name: string;
    level: number;
    school: string;
    castingTime: string;
    range: string;
    components: string;
    duration: string;
    damageOrHeal: string;
    description: string;
    prepared: boolean;
  }>({
    name: '',
    level: 1,
    school: 'Evocación',
    castingTime: '1 Acción',
    range: '60 pies',
    components: 'V, S',
    duration: 'Instantáneo',
    damageOrHeal: '1d8',
    description: '',
    prepared: true,
  });

  if (!isOpen) return null;

  const inventory = character.inventory || [];
  const totalWeight = inventory.reduce(
    (sum, item) => sum + (Number(item.weight) || 0) * (Number(item.quantity) || 1),
    0
  );
  const carryCap = calculateCarryCapacity(character.abilities.str.score);
  const maxWeight = carryCap.maxCarry;
  const weightPct = Math.min(100, Math.round((totalWeight / Math.max(1, maxWeight)) * 100));

  const currency: Currency = character.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

  const updateCurrency = (key: keyof Currency, value: number) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    onUpdateCharacter({
      ...character,
      currency: {
        ...currency,
        [key]: Math.max(0, Math.floor(Number(value) || 0)),
      },
    });
  };

  const handleApplyCoinDelta = (sign: 1 | -1) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const amt = parseInt(coinDelta.amount, 10);
    if (isNaN(amt) || amt <= 0) return;
    const current = currency[coinDelta.currency] || 0;
    updateCurrency(coinDelta.currency, current + sign * amt);
  };

  const weaponsList = inventory.filter((i) => classifyInventoryItemKey(i) === 'weapon');
  const armorList = inventory.filter((i) => classifyInventoryItemKey(i) === 'armor');
  const commonList = inventory.filter((i) => classifyInventoryItemKey(i) === 'common');
  const spellsList = character.spells || [];

  const handleOpenNewItemForm = (group: 'weapon' | 'armor' | 'common') => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    setEditingItemId(null);
    setActiveAttackTabIdx(0);
    setItemDraft({
      name: '',
      quantity: 1,
      weight: group === 'armor' ? 15 : group === 'weapon' ? 3 : 1,
      itemGroup: group,
      category: group === 'weapon' ? 'Arma' : group === 'armor' ? 'Armadura' : 'Objeto Común',
      rarity: 'Común',
      equipped: group !== 'common',
      description: '',
      weaponAttacks:
        group === 'weapon'
          ? [
              {
                id: `iatk-${Date.now()}-1`,
                name: 'Ataque Principal',
                description: '',
                dice: '1d8',
                potenciador: 0,
                damageType: 'Cortante',
                attackType: 'melee',
                range: '5 pies',
              },
            ]
          : [],
    });
    setShowItemForm(true);
  };

  const handleOpenEditItemForm = (item: InventoryItem) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const group = classifyInventoryItemKey(item);
    setEditingItemId(item.id);
    setActiveAttackTabIdx(0);
    setItemDraft({
      name: item.name,
      quantity: item.quantity || 1,
      weight: item.weight || 0,
      itemGroup: group,
      category: item.category || (group === 'weapon' ? 'Arma' : group === 'armor' ? 'Armadura' : 'Objeto Común'),
      rarity: item.rarity || 'Común',
      equipped: Boolean(item.equipped),
      description: item.description || '',
      weaponAttacks:
        Array.isArray(item.weaponAttacks) && item.weaponAttacks.length > 0
          ? item.weaponAttacks.map((a) => ({ ...a }))
          : [
              {
                id: `iatk-${Date.now()}-1`,
                name: 'Ataque Principal',
                description: item.description || '',
                dice: '1d8',
                potenciador: 0,
                damageType: 'Cortante',
                attackType: 'melee',
                range: '5 pies',
              },
            ],
    });
    setShowItemForm(true);
  };

  const handleSetAttackCount = (count: number) => {
    const safeCount = Math.max(1, Math.min(8, count));
    const current = [...itemDraft.weaponAttacks];
    if (safeCount > current.length) {
      for (let i = current.length; i < safeCount; i++) {
        current.push({
          id: `iatk-${Date.now()}-${i + 1}`,
          name: i === 0 ? 'Ataque Principal' : `Ataque ${i + 1}`,
          description: '',
          dice: '1d6',
          potenciador: 0,
          damageType: 'Fuego',
          attackType: 'melee',
          range: '5 pies',
        });
      }
    } else if (safeCount < current.length) {
      current.splice(safeCount);
    }
    setItemDraft((prev) => ({ ...prev, weaponAttacks: current }));
    if (activeAttackTabIdx >= safeCount) {
      setActiveAttackTabIdx(Math.max(0, safeCount - 1));
    }
  };

  const handleUpdateAttackInDraft = (idx: number, patch: Partial<WeaponAttack>) => {
    const next = [...itemDraft.weaponAttacks];
    if (!next[idx]) return;
    next[idx] = { ...next[idx], ...patch };
    setItemDraft((prev) => ({ ...prev, weaponAttacks: next }));
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDraft.name.trim()) return;

    const newItem: InventoryItem = {
      id: editingItemId || `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: itemDraft.name.trim(),
      quantity: Math.max(1, Number(itemDraft.quantity) || 1),
      weight: Math.max(0, Number(itemDraft.weight) || 0),
      itemGroup: itemDraft.itemGroup,
      category: itemDraft.category,
      rarity: itemDraft.rarity,
      equipped: itemDraft.equipped,
      description: itemDraft.description.trim(),
      weaponAttacks: itemDraft.itemGroup === 'weapon' ? itemDraft.weaponAttacks : undefined,
    };

    const nextInv = editingItemId
      ? inventory.map((i) => (i.id === editingItemId ? newItem : i))
      : [...inventory, newItem];

    onUpdateCharacter({
      ...character,
      inventory: nextInv,
    });
    setShowItemForm(false);
    setEditingItemId(null);
  };

  const toggleItemEquipped = (id: string) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    onUpdateCharacter({
      ...character,
      inventory: inventory.map((i) => (i.id === id ? { ...i, equipped: !i.equipped } : i)),
    });
  };

  const updateItemQuantity = (id: string, delta: number) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    onUpdateCharacter({
      ...character,
      inventory: inventory
        .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, (i.quantity || 1) + delta) } : i))
        .filter((i) => i.quantity > 0),
    });
  };

  const removeItem = (id: string) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    onUpdateCharacter({
      ...character,
      inventory: inventory.filter((i) => i.id !== id),
    });
  };

  const handleOpenNewSpellForm = () => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    setEditingSpellId(null);
    setSpellDraft({
      name: '',
      level: 1,
      school: 'Evocación',
      castingTime: '1 Acción',
      range: '60 pies',
      components: 'V, S',
      duration: 'Instantáneo',
      damageOrHeal: '',
      description: '',
      prepared: true,
    });
    setShowSpellForm(true);
  };

  const handleOpenEditSpellForm = (sp: SpellItem) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    setEditingSpellId(sp.id);
    setSpellDraft({
      name: sp.name,
      level: sp.level ?? 1,
      school: sp.school || 'Evocación',
      castingTime: sp.castingTime || '1 Acción',
      range: sp.range || '60 pies',
      components: sp.components || 'V, S',
      duration: sp.duration || 'Instantáneo',
      damageOrHeal: sp.damageOrHeal || '',
      description: sp.description || '',
      prepared: sp.prepared !== false,
    });
    setShowSpellForm(true);
  };

  const handleSaveSpell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spellDraft.name.trim()) return;
    const newSpell: SpellItem = {
      id: editingSpellId || `spell-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: spellDraft.name.trim(),
      level: Number(spellDraft.level) || 0,
      school: spellDraft.school.trim() || 'Evocación',
      castingTime: spellDraft.castingTime.trim() || '1 Acción',
      range: spellDraft.range.trim() || '60 pies',
      components: spellDraft.components.trim() || 'V, S',
      duration: spellDraft.duration.trim() || 'Instantáneo',
      damageOrHeal: spellDraft.damageOrHeal.trim() || undefined,
      description: spellDraft.description.trim() || 'Conjuro registrado en el grimorio.',
      prepared: spellDraft.prepared,
    };

    const nextSpells = editingSpellId
      ? spellsList.map((s) => (s.id === editingSpellId ? newSpell : s))
      : [...spellsList, newSpell];

    onUpdateCharacter({
      ...character,
      spells: nextSpells,
    });
    setShowSpellForm(false);
    setEditingSpellId(null);
  };

  const toggleSpellPrepared = (id: string) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    onUpdateCharacter({
      ...character,
      spells: spellsList.map((s) => (s.id === id ? { ...s, prepared: !s.prepared } : s)),
    });
  };

  const removeSpell = (id: string) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    onUpdateCharacter({
      ...character,
      spells: spellsList.filter((s) => s.id !== id),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Mochila Abierta: Equipo, Inventario, Dinero y Conjuros"
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl border-2 border-[#c8a45c] bg-gradient-to-b from-[#231912] via-[#1a130e] to-[#120d09] shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Leather Flap & Open Backpack Header */}
        <div className="relative bg-gradient-to-r from-[#2e1e12] via-[#3c2818] to-[#2e1e12] border-b-2 border-[#c8a45c] px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Open Backpack Graphic */}
            <div className="w-14 h-14 rounded-xl bg-gradient-to-b from-[#5a3b22] to-[#2d1c0f] border-2 border-[#e2c275] shadow-inner flex items-center justify-center relative shrink-0">
              <svg viewBox="0 0 64 64" className="w-10 h-10">
                <path
                  d="M20 15 C20 8, 44 8, 44 15"
                  fill="none"
                  stroke="#e2c275"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <rect
                  x="12"
                  y="16"
                  width="40"
                  height="38"
                  rx="8"
                  fill="#8b5a2b"
                  stroke="#e2c275"
                  strokeWidth="2.5"
                />
                <path
                  d="M12 25 Q32 35 52 25 L50 16 L14 16 Z"
                  fill="#a86f38"
                  stroke="#e2c275"
                  strokeWidth="2"
                />
                <rect x="21" y="19" width="6" height="16" rx="2" fill="#c8a45c" />
                <rect x="37" y="19" width="6" height="16" rx="2" fill="#c8a45c" />
                <circle cx="32" cy="41" r="6" fill="#e2c275" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#e2c275] font-bold block">
                EL RINCÓN DEL AVENTURERO
              </span>
              <h2 className="font-cinzel text-xl sm:text-2xl font-black text-[#f6e7c8] tracking-wide uppercase">
                MOCHILA ABIERTA DE {character.name}
              </h2>
              <p className="text-xs text-[#cbb692]">
                Armas equipadas, armaduras, objetos comunes, bolsa de monedas y grimorio general de conjuros
              </p>
            </div>
          </div>

          {/* Carry Weight Meter + Close */}
          <div className="flex items-center gap-3">
            <div className="bg-[#160f0a]/90 border border-[#8b6b35] rounded-xl px-3.5 py-2 min-w-[195px]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#cbb692] font-semibold flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[#e2c275]" /> Carga Actual:
                </span>
                <span
                  className={`font-mono font-bold ${
                    totalWeight > maxWeight ? 'text-red-400' : 'text-[#f6e7c8]'
                  }`}
                >
                  {totalWeight.toFixed(1)} / {maxWeight} lb
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/70 overflow-hidden border border-[#5a4323]">
                <div
                  className={`h-full transition-all ${
                    totalWeight > maxWeight
                      ? 'bg-red-500'
                      : weightPct > 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${weightPct}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar mochila"
              className="w-10 h-10 rounded-xl bg-[#2a1c12] hover:bg-[#3d281a] border border-[#c8a45c]/60 text-[#f6e7c8] flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BOLSA DE MONEDAS / DINERO BAR */}
        <div className="bg-[#1b130d] border-b border-[#6b4f28]/60 px-5 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-cinzel font-bold text-[#f3deb3] uppercase tracking-wider">
                Bolsa de Monedas (Tu Dinero)
              </div>
              <div className="text-[11px] text-[#a89270]">
                Edita directamente o suma/resta botín de tus aventuras
              </div>
            </div>
          </div>

          {/* 5 Currency Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: 'gp', short: 'PO', label: 'Oro', color: 'border-amber-400/70 text-amber-300 bg-amber-950/40' },
                { key: 'sp', short: 'PP', label: 'Plata', color: 'border-slate-300/60 text-slate-200 bg-slate-900/50' },
                { key: 'cp', short: 'PC', label: 'Cobre', color: 'border-orange-500/60 text-orange-300 bg-orange-950/40' },
                { key: 'ep', short: 'PE', label: 'Electro', color: 'border-teal-400/60 text-teal-200 bg-teal-950/40' },
                { key: 'pp', short: 'PL', label: 'Platino', color: 'border-indigo-300/70 text-indigo-200 bg-indigo-950/40' },
              ] as const
            ).map((c) => (
              <div
                key={c.key}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${c.color}`}
                title={`Piezas de ${c.label} (${c.short})`}
              >
                <span className="text-xs font-extrabold tracking-wider">{c.short}</span>
                <input
                  type="number"
                  min={0}
                  aria-label={`Monedas ${c.short}`}
                  value={currency[c.key] ?? 0}
                  onChange={(e) => updateCurrency(c.key, parseInt(e.target.value, 10) || 0)}
                  className="w-16 bg-black/50 border border-white/15 rounded px-1.5 py-0.5 text-right text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            ))}
          </div>

          {/* Quick Add/Subtract Money */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-[#5e4522] rounded-lg p-1">
            <input
              type="number"
              min={1}
              aria-label="Cantidad de monedas a sumar o gastar"
              value={coinDelta.amount}
              onChange={(e) => setCoinDelta({ ...coinDelta, amount: e.target.value })}
              className="w-14 bg-transparent px-2 py-1 text-xs font-mono text-white focus:outline-none"
            />
            <select
              value={coinDelta.currency}
              onChange={(e) =>
                setCoinDelta({
                  ...coinDelta,
                  currency: e.target.value as keyof Currency,
                })
              }
              className="bg-[#271b11] text-amber-200 text-xs font-bold px-1.5 py-1 rounded border border-[#6b4f28]"
            >
              <option value="gp">PO</option>
              <option value="sp">PP</option>
              <option value="cp">PC</option>
              <option value="ep">PE</option>
              <option value="pp">PL</option>
            </select>
            <button
              type="button"
              onClick={() => handleApplyCoinDelta(1)}
              className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer"
            >
              + Ganar
            </button>
            <button
              type="button"
              onClick={() => handleApplyCoinDelta(-1)}
              className="px-2.5 py-1 rounded bg-red-800/80 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
            >
              - Gastar
            </button>
          </div>
        </div>

        {/* Compartment Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 pt-3 bg-[#16100b] border-b border-[#5e4522]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('weapons');
              setShowItemForm(false);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-t-xl font-cinzel text-xs sm:text-sm font-bold border-t-2 border-x-2 transition cursor-pointer ${
              activeTab === 'weapons'
                ? 'bg-[#281c12] border-[#e2c275] text-[#f8e7c2]'
                : 'bg-[#120d09] border-transparent text-[#9d8768] hover:text-[#e2c275]'
            }`}
          >
            <Sword className="w-4 h-4 text-amber-400" />
            <span>Armas ({weaponsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('armor');
              setShowItemForm(false);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-t-xl font-cinzel text-xs sm:text-sm font-bold border-t-2 border-x-2 transition cursor-pointer ${
              activeTab === 'armor'
                ? 'bg-[#281c12] border-[#e2c275] text-[#f8e7c2]'
                : 'bg-[#120d09] border-transparent text-[#9d8768] hover:text-[#e2c275]'
            }`}
          >
            <Shield className="w-4 h-4 text-sky-400" />
            <span>Armaduras ({armorList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('common');
              setShowItemForm(false);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-t-xl font-cinzel text-xs sm:text-sm font-bold border-t-2 border-x-2 transition cursor-pointer ${
              activeTab === 'common'
                ? 'bg-[#281c12] border-[#e2c275] text-[#f8e7c2]'
                : 'bg-[#120d09] border-transparent text-[#9d8768] hover:text-[#e2c275]'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Objetos Comunes ({commonList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('spells');
              setShowItemForm(false);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-t-xl font-cinzel text-xs sm:text-sm font-bold border-t-2 border-x-2 transition cursor-pointer ${
              activeTab === 'spells'
                ? 'bg-[#281c12] border-[#e2c275] text-[#f8e7c2]'
                : 'bg-[#120d09] border-transparent text-[#9d8768] hover:text-[#e2c275]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Conjuros ({spellsList.length})</span>
          </button>
        </div>

        {/* Compartment Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* WEAPONS / ARMOR / COMMON ITEMS COMPARTMENTS */}
          {activeTab !== 'spells' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#20160f] border border-[#634824] rounded-xl p-3.5">
                <div>
                  <h3 className="font-cinzel font-bold text-[#f6e7c8] text-sm">
                    {activeTab === 'weapons'
                      ? 'Compartimento de Armas y Ataques'
                      : activeTab === 'armor'
                      ? 'Compartimento de Armaduras y Escudos'
                      : 'Compartimento de Objetos Comunes, Pociones y Equipo'}
                  </h3>
                  <p className="text-xs text-[#b59e7a]">
                    {activeTab === 'weapons'
                      ? 'Las armas marcadas como Equipadas agregan automáticamente sus cartas de ataque al mazo de Combates y Acciones.'
                      : activeTab === 'armor'
                      ? 'Equipa o guarda tus armaduras y escudos.'
                      : 'Guarda raciones, antorchas, cuerdas, pociones y reliquias.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleOpenNewItemForm(
                      activeTab === 'weapons' ? 'weapon' : activeTab === 'armor' ? 'armor' : 'common'
                    )
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#b88c38] to-[#d6ab54] hover:from-[#c99b42] hover:to-[#e3ba64] text-stone-950 font-cinzel font-black text-xs transition cursor-pointer shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {activeTab === 'weapons'
                      ? 'Nueva Arma'
                      : activeTab === 'armor'
                      ? 'Nueva Armadura / Escudo'
                      : 'Nuevo Objeto'}
                  </span>
                </button>
              </div>

              {/* Add / Edit Item Form */}
              {showItemForm && (
                <form
                  onSubmit={handleSaveItem}
                  className="bg-[#251a11] border-2 border-[#e2c275] rounded-2xl p-4 space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-[#5e4522] pb-2">
                    <h4 className="font-cinzel font-bold text-amber-300 text-sm">
                      {editingItemId ? 'Editar Elemento de la Mochila' : 'Añadir a la Mochila'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowItemForm(false)}
                      className="text-xs text-stone-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] text-[#cbb692] block mb-1 font-cinzel font-bold">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        required
                        value={itemDraft.name}
                        onChange={(e) => setItemDraft({ ...itemDraft, name: e.target.value })}
                        placeholder={
                          itemDraft.itemGroup === 'weapon'
                            ? 'Ej. Espada Larga Flamígera'
                            : itemDraft.itemGroup === 'armor'
                            ? 'Ej. Cota de Mallas Élfica'
                            : 'Ej. Poción de Curación Mayor'
                        }
                        className="w-full bg-black/50 border border-[#6e522b] rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#cbb692] block mb-1 font-cinzel font-bold">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={itemDraft.quantity}
                        onChange={(e) =>
                          setItemDraft({ ...itemDraft, quantity: parseInt(e.target.value, 10) || 1 })
                        }
                        className="w-full bg-black/50 border border-[#6e522b] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#cbb692] block mb-1 font-cinzel font-bold">
                        Peso (lb)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={itemDraft.weight}
                        onChange={(e) =>
                          setItemDraft({ ...itemDraft, weight: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-black/50 border border-[#6e522b] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Multi-Attack Weapon Configuration if Weapon */}
                  {itemDraft.itemGroup === 'weapon' && (
                    <div className="bg-[#18110b] border border-[#634824] rounded-xl p-3.5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-cinzel font-bold text-amber-300">
                          Ataques que otorga esta arma al equiparse:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#cbb692]">Nº de Ataques:</span>
                          <select
                            value={itemDraft.weaponAttacks.length}
                            onChange={(e) => handleSetAttackCount(parseInt(e.target.value, 10) || 1)}
                            className="bg-[#251a11] border border-[#8b6b35] rounded px-2 py-1 text-xs text-amber-200 font-bold"
                          >
                            {[1, 2, 3, 4].map((n) => (
                              <option key={n} value={n}>
                                {n} {n === 1 ? 'ataque' : 'ataques'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {itemDraft.weaponAttacks.length > 1 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {itemDraft.weaponAttacks.map((atk, idx) => (
                            <button
                              key={atk.id}
                              type="button"
                              onClick={() => setActiveAttackTabIdx(idx)}
                              className={`px-3 py-1 rounded-lg text-xs font-cinzel font-bold border ${
                                activeAttackTabIdx === idx
                                  ? 'bg-amber-600 text-black border-amber-300'
                                  : 'bg-[#251a11] text-[#cbb692] border-[#5e4522]'
                              }`}
                            >
                              {atk.name || `Ataque ${idx + 1}`}
                            </button>
                          ))}
                        </div>
                      )}

                      {itemDraft.weaponAttacks[activeAttackTabIdx] && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <div>
                            <label className="block text-[10px] text-[#cbb692] mb-0.5">
                              Nombre del Ataque
                            </label>
                            <input
                              type="text"
                              value={itemDraft.weaponAttacks[activeAttackTabIdx].name}
                              onChange={(e) =>
                                handleUpdateAttackInDraft(activeAttackTabIdx, { name: e.target.value })
                              }
                              className="w-full bg-black/50 border border-[#6e522b] rounded px-2.5 py-1 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-[#cbb692] mb-0.5">
                              Dados de Daño (ej. 1d8)
                            </label>
                            <input
                              type="text"
                              value={itemDraft.weaponAttacks[activeAttackTabIdx].dice}
                              onChange={(e) =>
                                handleUpdateAttackInDraft(activeAttackTabIdx, { dice: e.target.value })
                              }
                              className="w-full bg-black/50 border border-[#6e522b] rounded px-2.5 py-1 text-xs text-amber-300 font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-[#cbb692] mb-0.5">
                              Potenciador (+0 a +5)
                            </label>
                            <input
                              type="number"
                              value={itemDraft.weaponAttacks[activeAttackTabIdx].potenciador ?? 0}
                              onChange={(e) =>
                                handleUpdateAttackInDraft(activeAttackTabIdx, {
                                  potenciador: parseInt(e.target.value, 10) || 0,
                                  bonus: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              className="w-full bg-black/50 border border-[#6e522b] rounded px-2.5 py-1 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-[#cbb692] mb-0.5">
                              Tipo de Daño
                            </label>
                            <select
                              value={itemDraft.weaponAttacks[activeAttackTabIdx].damageType}
                              onChange={(e) =>
                                handleUpdateAttackInDraft(activeAttackTabIdx, {
                                  damageType: e.target.value,
                                })
                              }
                              className="w-full bg-black/50 border border-[#6e522b] rounded px-2.5 py-1 text-xs text-white"
                            >
                              {DAMAGE_TYPES.map((dt) => (
                                <option key={dt} value={dt}>
                                  {dt}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <input
                      type="text"
                      value={itemDraft.description}
                      onChange={(e) => setItemDraft({ ...itemDraft, description: e.target.value })}
                      placeholder="Descripción, propiedades o notas del objeto..."
                      className="flex-1 bg-black/50 border border-[#6e522b] rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                    <label className="flex items-center gap-2 text-xs text-amber-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={itemDraft.equipped}
                        onChange={(e) => setItemDraft({ ...itemDraft, equipped: e.target.checked })}
                      />
                      <span>Equipado ahora</span>
                    </label>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-cinzel font-black text-xs cursor-pointer"
                    >
                      Guardar en Mochila
                    </button>
                  </div>
                </form>
              )}

              {/* Items List */}
              {(() => {
                const currentList =
                  activeTab === 'weapons'
                    ? weaponsList
                    : activeTab === 'armor'
                    ? armorList
                    : commonList;

                if (currentList.length === 0) {
                  return (
                    <div className="text-center py-10 text-sm text-[#9c8665] border border-dashed border-[#5c4423] rounded-2xl">
                      No tienes elementos en este compartimento todavía.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentList.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 transition ${
                          item.equipped
                            ? 'bg-gradient-to-r from-[#2c1e12] to-[#1f150d] border-[#e2c275]'
                            : 'bg-[#17100b] border-[#4d3920]'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-cinzel font-bold text-sm text-[#f6e7c8]">
                              {item.name}
                            </span>
                            {item.equipped && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                                Equipado
                              </span>
                            )}
                          </div>

                          {item.weaponAttacks && item.weaponAttacks.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {item.weaponAttacks.map((atk) => (
                                <span
                                  key={atk.id}
                                  className="text-[11px] px-2 py-0.5 rounded bg-black/50 border border-amber-500/30 text-amber-300 font-mono"
                                >
                                  {atk.name}:{' '}
                                  {formatWeaponAttackFormula(
                                    atk.dice,
                                    Number(atk.bonus ?? atk.potenciador) || 0
                                  )}{' '}
                                  {atk.damageType}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.description && (
                            <p className="text-xs text-[#cbb692] line-clamp-2">{item.description}</p>
                          )}

                          <div className="text-[11px] text-[#9b8462] font-mono">
                            Peso: {item.weight} lb c/u • Cant: {item.quantity}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center bg-black/50 rounded-lg border border-[#5e4522]">
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(item.id, -1)}
                              className="px-2 py-1 text-xs text-amber-200 hover:bg-white/10"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-mono font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(item.id, 1)}
                              className="px-2 py-1 text-xs text-amber-200 hover:bg-white/10"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleItemEquipped(item.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                              item.equipped
                                ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                            }`}
                          >
                            {item.equipped ? 'Equipado' : 'Equipar'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditItemForm(item)}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 cursor-pointer"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 4: GRIMORIO GENERAL DE CONJUROS */}
          {activeTab === 'spells' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#20160f] border border-[#634824] rounded-xl p-3.5">
                <div>
                  <h3 className="font-cinzel font-bold text-[#f6e7c8] text-sm">
                    Grimorio Completo de Conjuros (Preparados y No Preparados)
                  </h3>
                  <p className="text-xs text-[#b59e7a]">
                    Marca cualquier conjuro como{' '}
                    <span className="text-purple-300 font-bold">Preparado</span> para que aparezca como carta lista para lanzar en tu mazo de <strong>Lanzar Conjuros</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenNewSpellForm}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-cinzel font-bold text-xs transition cursor-pointer shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Conjuro al Grimorio</span>
                </button>
              </div>

              {showSpellForm && (
                <form
                  onSubmit={handleSaveSpell}
                  className="bg-[#21152b] border-2 border-purple-400/70 rounded-2xl p-4 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] text-purple-200 block mb-1 font-cinzel font-bold">
                        Nombre del Conjuro *
                      </label>
                      <input
                        type="text"
                        required
                        value={spellDraft.name}
                        onChange={(e) => setSpellDraft({ ...spellDraft, name: e.target.value })}
                        placeholder="Ej. Llama Sagrada / Bola de Fuego"
                        className="w-full bg-black/50 border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-purple-200 block mb-1 font-cinzel font-bold">
                        Nivel (0 = Truco)
                      </label>
                      <select
                        value={spellDraft.level}
                        onChange={(e) =>
                          setSpellDraft({ ...spellDraft, level: parseInt(e.target.value, 10) || 0 })
                        }
                        className="w-full bg-black/50 border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-white"
                      >
                        <option value={0}>Truco (Niv 0)</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            Nivel {lvl}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-purple-200 block mb-1 font-cinzel font-bold">
                        Dados Daño/Cura (Opc.)
                      </label>
                      <input
                        type="text"
                        value={spellDraft.damageOrHeal}
                        onChange={(e) =>
                          setSpellDraft({ ...spellDraft, damageOrHeal: e.target.value })
                        }
                        placeholder="Ej. 1d8 o 8d6"
                        className="w-full bg-black/50 border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <input
                      type="text"
                      value={spellDraft.description}
                      onChange={(e) =>
                        setSpellDraft({ ...spellDraft, description: e.target.value })
                      }
                      placeholder="Descripción del conjuro, alcance y efectos..."
                      className="flex-1 bg-black/50 border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                    <label className="flex items-center gap-2 text-xs text-purple-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spellDraft.prepared}
                        onChange={(e) =>
                          setSpellDraft({ ...spellDraft, prepared: e.target.checked })
                        }
                      />
                      <span>Preparado en Mazo</span>
                    </label>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-cinzel font-bold text-xs cursor-pointer"
                    >
                      Guardar Conjuro
                    </button>
                  </div>
                </form>
              )}

              {spellsList.length === 0 ? (
                <div className="text-center py-10 text-sm text-[#9c8665] border border-dashed border-[#5c4423] rounded-2xl">
                  Tu grimorio aún no tiene conjuros registrados.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {spellsList.map((sp) => (
                    <div
                      key={sp.id}
                      className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 transition ${
                        sp.prepared
                          ? 'bg-gradient-to-r from-[#241634] to-[#170f21] border-purple-400/80'
                          : 'bg-[#150f0a] border-[#4d3920] opacity-75'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-cinzel font-bold text-sm text-[#f6e7c8]">
                            {sp.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 font-bold">
                            {sp.level === 0 ? 'Truco' : `Nivel ${sp.level}`}
                          </span>
                          {sp.damageOrHeal && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-black/50 text-amber-300 font-mono">
                              {sp.damageOrHeal}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#cbb692] line-clamp-2">{sp.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleSpellPrepared(sp.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            sp.prepared
                              ? 'bg-purple-600 hover:bg-purple-500 text-white'
                              : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                          }`}
                        >
                          {sp.prepared ? 'Preparado' : 'Preparar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditSpellForm(sp)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-purple-300 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSpell(sp.id)}
                          className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
