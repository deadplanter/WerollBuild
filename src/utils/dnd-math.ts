/**
 * D&D 5E mathematical calculations and dice evaluation
 * Pure decoupled functions, tested via node:test
 */

export function calculateModifier(score: number): number {
  if (isNaN(score)) return 0;
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  if (isNaN(mod)) return '+0';
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function calculateProficiencyBonus(level: number): number {
  const safeLevel = Math.max(1, Math.min(20, Math.floor(level || 1)));
  return Math.floor((safeLevel - 1) / 4) + 2;
}

export function calculatePassivePerception(
  wisScore: number,
  proficiencyLevel: 'none' | 'proficient' | 'expertise',
  profBonus: number
): number {
  const wisMod = calculateModifier(wisScore);
  const bonus =
    proficiencyLevel === 'expertise'
      ? profBonus * 2
      : proficiencyLevel === 'proficient'
      ? profBonus
      : 0;
  return 10 + wisMod + bonus;
}

export function calculateSpellSaveDC(abilityScore: number, profBonus: number): number {
  return 8 + profBonus + calculateModifier(abilityScore);
}

export function calculateSpellAttackBonus(abilityScore: number, profBonus: number): number {
  return profBonus + calculateModifier(abilityScore);
}

export function calculateCarryCapacity(strScore: number): {
  maxCarry: number;
  pushDragLift: number;
} {
  const safeStr = Math.max(1, strScore || 10);
  return {
    maxCarry: safeStr * 15,
    pushDragLift: safeStr * 30,
  };
}

export function parseDiceExpression(expression: string): {
  count: number;
  sides: number;
  modifier: number;
} {
  const cleaned = expression.replace(/\s+/g, '').toLowerCase();
  const match = cleaned.match(/^(\d*)d(\d+)([+-]\d+)?$/);

  if (!match) {
    // Check if it's just a number or simple dice
    return { count: 1, sides: 20, modifier: 0 };
  }

  const count = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  return {
    count: Math.max(1, count),
    sides: Math.max(2, sides),
    modifier: isNaN(modifier) ? 0 : modifier,
  };
}

export interface EvaluatedD20 {
  rolls: number[];
  chosenRoll: number;
  modifier: number;
  total: number;
  isCrit: boolean;
  isFumble: boolean;
}

export function evaluateD20Roll(
  modifier: number,
  mode: 'normal' | 'advantage' | 'disadvantage' = 'normal',
  forcedRolls?: number[]
): EvaluatedD20 {
  let rolls: number[];

  if (forcedRolls && forcedRolls.length > 0) {
    rolls = [...forcedRolls];
  } else {
    if (mode === 'normal') {
      rolls = [Math.floor(Math.random() * 20) + 1];
    } else {
      rolls = [
        Math.floor(Math.random() * 20) + 1,
        Math.floor(Math.random() * 20) + 1,
      ];
    }
  }

  let chosenRoll = rolls[0];
  if (mode === 'advantage') {
    chosenRoll = Math.max(rolls[0], rolls[1] ?? rolls[0]);
  } else if (mode === 'disadvantage') {
    chosenRoll = Math.min(rolls[0], rolls[1] ?? rolls[0]);
  }

  const total = chosenRoll + modifier;
  const isCrit = chosenRoll === 20;
  const isFumble = chosenRoll === 1;

  return {
    rolls,
    chosenRoll,
    modifier,
    total,
    isCrit,
    isFumble,
  };
}

export function rollDiceExpression(expression: string): { rolls: number[]; total: number; formula: string } {
  const { count, sides, modifier } = parseDiceExpression(expression);
  const rolls: number[] = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * sides) + 1;
    rolls.push(r);
    sum += r;
  }
  const total = Math.max(1, sum + modifier);
  return {
    rolls,
    total,
    formula: `${count}d${sides}${modifier > 0 ? '+' + modifier : modifier < 0 ? modifier : ''}`,
  };
}

export const ABILITY_SPANISH_LABELS: Record<
  'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha',
  { nameEs: string; abbr: string; fullLabel: string }
> = {
  str: { nameEs: 'Fuerza', abbr: 'FUE', fullLabel: 'Fuerza (FUE)' },
  dex: { nameEs: 'Destreza', abbr: 'DES', fullLabel: 'Destreza (DES)' },
  con: { nameEs: 'Constitución', abbr: 'CON', fullLabel: 'Constitución (CON)' },
  int: { nameEs: 'Inteligencia', abbr: 'INT', fullLabel: 'Inteligencia (INT)' },
  wis: { nameEs: 'Sabiduría', abbr: 'SAB', fullLabel: 'Sabiduría (SAB)' },
  cha: { nameEs: 'Carisma', abbr: 'CAR', fullLabel: 'Carisma (CAR)' },
};

export function getSpanishAbilityLabel(ability: string): string {
  const key = (ability || 'str').toLowerCase() as keyof typeof ABILITY_SPANISH_LABELS;
  return ABILITY_SPANISH_LABELS[key]?.fullLabel || 'Fuerza (FUE)';
}

export type InventoryMainGroup = 'Armas' | 'Armaduras' | 'Objetos comunes';

export function classifyInventoryItemGroup(
  categoryOrItem?: string | { itemGroup?: string; category?: string; name?: string } | null
): InventoryMainGroup {
  if (typeof categoryOrItem === 'object' && categoryOrItem !== null) {
    const grp = (categoryOrItem.itemGroup || '').toLowerCase();
    if (grp === 'weapon' || grp === 'armas' || grp === 'arma') return 'Armas';
    if (grp === 'armor' || grp === 'armaduras' || grp === 'armadura') return 'Armaduras';
    if (grp === 'common' || grp === 'objetos comunes') return 'Objetos comunes';
    const combined = `${categoryOrItem.category || ''} ${categoryOrItem.name || ''}`.trim().toLowerCase();
    if (
      combined === 'arma' ||
      combined.startsWith('arma ') ||
      combined.startsWith('arma(') ||
      combined.includes('espada') ||
      combined.includes('arco') ||
      combined.includes('daga') ||
      combined.includes('hacha') ||
      combined.includes('maza') ||
      combined.includes('lanza') ||
      combined.includes('ballesta') ||
      combined.includes('martillo') ||
      combined.includes('bastón')
    ) {
      return 'Armas';
    }
    if (
      combined === 'armadura' ||
      combined.startsWith('armadura') ||
      combined.includes('escudo') ||
      combined.includes('cota') ||
      combined.includes('cuero tachonado') ||
      combined.includes('placas')
    ) {
      return 'Armaduras';
    }
    return 'Objetos comunes';
  }

  const norm = String(categoryOrItem || '').trim().toLowerCase();
  if (
    norm === 'weapon' ||
    norm === 'arma' ||
    norm === 'armas' ||
    norm.startsWith('arma ') ||
    norm.startsWith('arma(') ||
    norm.includes('espada') ||
    norm.includes('arco') ||
    norm.includes('daga') ||
    norm.includes('hacha') ||
    norm.includes('ballesta')
  ) {
    return 'Armas';
  }
  if (
    norm === 'armor' ||
    norm === 'armadura' ||
    norm === 'armaduras' ||
    norm.startsWith('armadura') ||
    norm.includes('escudo') ||
    norm.includes('cota')
  ) {
    return 'Armaduras';
  }
  return 'Objetos comunes';
}

export function classifyInventoryItemKey(
  categoryOrItem?: string | { itemGroup?: string; category?: string; name?: string } | null
): 'weapon' | 'armor' | 'common' {
  const group = classifyInventoryItemGroup(categoryOrItem);
  if (group === 'Armas') return 'weapon';
  if (group === 'Armaduras') return 'armor';
  return 'common';
}

export function formatWeaponAttackFormula(dice: string, bonus: number): string {
  const cleanDice = String(dice || '1d6').trim().replace(/\s+/g, '');
  const numBonus = Number(bonus) || 0;
  if (numBonus > 0) return `${cleanDice}+${numBonus}`;
  if (numBonus < 0) return `${cleanDice}${numBonus}`;
  return cleanDice;
}

export interface DerivedEquippedAttack {
  id: string;
  weaponId: string;
  weaponName: string;
  name: string;
  attackName: string;
  description: string;
  dice: string;
  bonus: number;
  potenciador: number;
  formula: string;
  damageFormula: string;
  damageType: string;
  attackType: 'melee' | 'ranged' | 'spell';
  attackBonus: number;
  toHitBonus: number;
  range?: string;
}

export function deriveEquippedWeaponAttacks(
  inventory: {
    id: string;
    name: string;
    itemGroup?: string;
    category?: string;
    equipped?: boolean;
    description?: string;
    weaponAttacks?: {
      id: string;
      name: string;
      description: string;
      dice: string;
      bonus?: number;
      potenciador?: number;
      attackBonus?: number;
      damageType: string;
      attackType?: 'melee' | 'ranged' | 'spell';
      range?: string;
    }[];
  }[],
  strScore: number = 10,
  dexScore: number = 10,
  profBonus: number = 2
): DerivedEquippedAttack[] {
  const strMod = calculateModifier(strScore);
  const dexMod = calculateModifier(dexScore);
  const result: DerivedEquippedAttack[] = [];

  for (const item of inventory || []) {
    if (!item.equipped) continue;
    const group = classifyInventoryItemGroup(item);
    if (group !== 'Armas') continue;

    if (Array.isArray(item.weaponAttacks) && item.weaponAttacks.length > 0) {
      item.weaponAttacks.forEach((atk, idx) => {
        const cleanDice = String(atk.dice || '1d6').trim();
        const pot = Number(atk.bonus ?? atk.potenciador) || 0;
        const aType = atk.attackType || 'melee';
        const statMod = aType === 'ranged' ? dexMod : strMod;
        const atkName = atk.name || `Ataque ${idx + 1}`;
        const dmgFormula = formatWeaponAttackFormula(cleanDice, pot);
        result.push({
          id: `${item.id}-atk-${atk.id || idx}`,
          weaponId: item.id,
          weaponName: item.name,
          name: atkName,
          attackName: atkName,
          description: atk.description || item.description || '',
          dice: cleanDice,
          bonus: pot,
          potenciador: pot,
          formula: dmgFormula,
          damageFormula: dmgFormula,
          damageType: atk.damageType || 'Cortante',
          attackType: aType,
          attackBonus: statMod + pot,
          toHitBonus: profBonus + statMod + pot,
          range: atk.range,
        });
      });
    } else {
      // Fallback for legacy weapon without explicit weaponAttacks array
      const desc = item.description || '';
      const diceMatch = desc.match(/(\d+d\d+)([+-]\d+)?/i);
      const baseDice = diceMatch ? diceMatch[1] : '1d8';
      const parsedBonus = diceMatch && diceMatch[2] ? parseInt(diceMatch[2], 10) || 0 : 0;
      const isRanged = /distancia|arco|ballesta/i.test(desc) || /arco|ballesta/i.test(item.name);
      const aType = isRanged ? 'ranged' : 'melee';
      const statMod = isRanged ? dexMod : strMod;
      const dmgFormula = formatWeaponAttackFormula(baseDice, parsedBonus);

      result.push({
        id: `${item.id}-atk-default`,
        weaponId: item.id,
        weaponName: item.name,
        name: item.name,
        attackName: item.name,
        description: desc || 'Ataque principal con arma equipada',
        dice: baseDice,
        bonus: parsedBonus,
        potenciador: parsedBonus,
        formula: dmgFormula,
        damageFormula: dmgFormula,
        damageType: /perforante/i.test(desc)
          ? 'Perforante'
          : /contundente/i.test(desc)
          ? 'Contundente'
          : /fuego/i.test(desc)
          ? 'Fuego'
          : 'Cortante',
        attackType: aType,
        attackBonus: statMod + parsedBonus,
        toHitBonus: profBonus + statMod + parsedBonus,
      });
    }
  }

  return result;
}

export function normalizeRoomIdentifier(raw?: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export function validateUniqueRoomNameAndCode(params: {
  proposedRoomCode: string;
  proposedName?: string;
  excludeWorldId?: string;
  requesterEmail?: string;
  existingWorlds: { id: string; name?: string; roomCode?: string; ownerEmail?: string }[];
  activeRooms?: { roomCode: string; name?: string; dmEmail?: string; worldSheetId?: string }[];
}): { valid: boolean; error?: string } {
  const normCode = normalizeRoomIdentifier(params.proposedRoomCode);
  const normName = normalizeRoomIdentifier(params.proposedName || params.proposedRoomCode);

  if (!normCode) {
    return { valid: false, error: 'El nombre o código de la sala es obligatorio.' };
  }

  for (const w of params.existingWorlds || []) {
    if (params.excludeWorldId && w.id === params.excludeWorldId) continue;
    const wCode = normalizeRoomIdentifier(w.roomCode);
    const wName = normalizeRoomIdentifier(w.name);

    if (wCode && (wCode === normCode || (normName && wCode === normName))) {
      return {
        valid: false,
        error: `Ya existe una sala/mesa registrada con el código o nombre "${w.roomCode || w.name}". Elige un nombre único para evitar confusión entre salas.`,
      };
    }
    if (wName && normName && (wName === normName || wName === normCode)) {
      return {
        valid: false,
        error: `Ya existe una sala/mesa llamada "${w.name}". No pueden existir múltiples salas con el mismo nombre.`,
      };
    }
  }

  for (const r of params.activeRooms || []) {
    if (params.excludeWorldId && r.worldSheetId && r.worldSheetId === params.excludeWorldId) {
      continue;
    }
    const rCode = normalizeRoomIdentifier(r.roomCode);
    const rName = normalizeRoomIdentifier(r.name);
    const sameOwner =
      params.requesterEmail &&
      r.dmEmail &&
      r.dmEmail.trim().toLowerCase() === params.requesterEmail.trim().toLowerCase() &&
      !r.worldSheetId;

    if (!sameOwner) {
      if (rCode && (rCode === normCode || (normName && rCode === normName))) {
        return {
          valid: false,
          error: `La sala/mesa "${r.roomCode}" ya se encuentra activa o registrada por otro Dungeon Master.`,
        };
      }
      if (rName && normName && (rName === normName || rName === normCode)) {
        return {
          valid: false,
          error: `La sala/mesa "${r.name}" ya se encuentra activa o registrada por otro Dungeon Master.`,
        };
      }
    }
  }

  return { valid: true };
}

export function validateUniqueUserIdentity(params: {
  displayName?: string;
  userTagId?: string;
  excludeUserId?: string;
  existingUsers: { id: string; displayName: string; userTagId?: string }[];
}): { valid: boolean; error?: string } {
  const normName = String(params.displayName || '').trim().toLowerCase();
  const normTag = String(params.userTagId || '')
    .replace(/^@+/, '')
    .trim()
    .toLowerCase();

  for (const u of params.existingUsers || []) {
    if (params.excludeUserId && u.id === params.excludeUserId) continue;
    const uName = String(u.displayName || '').trim().toLowerCase();
    const uTag = String(u.userTagId || '')
      .replace(/^@+/, '')
      .trim()
      .toLowerCase();

    if (normName && uName === normName) {
      return {
        valid: false,
        error: `El nombre de usuario "${params.displayName?.trim()}" ya está en uso. El nombre de usuario debe ser único.`,
      };
    }
    if (normTag && uTag === normTag) {
      return {
        valid: false,
        error: `El ID "@${normTag}" ya está registrado por otro usuario (${u.displayName}@${u.userTagId}). El ID debe ser único en todos los usuarios.`,
      };
    }
  }

  return { valid: true };
}

export function deduplicateUsersIdentity<
  T extends { id: string; displayName: string; userTagId?: string; email?: string }
>(users: T[]): { users: T[]; changed: boolean } {
  const usedNames = new Set<string>();
  const usedTags = new Set<string>();
  let changed = false;

  const candidateChars = '123456789abcdefghjkmnpqrstuvwxyz';
  const pickUniqueTag = (base: string): string => {
    const cleanBase = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 3) || '123';
    if (!usedTags.has(cleanBase)) return cleanBase;
    for (let i = 1; i < 999; i++) {
      const candidate = String(i).padStart(3, '0').slice(0, 3);
      if (!usedTags.has(candidate)) return candidate;
    }
    for (let a = 0; a < candidateChars.length; a++) {
      for (let b = 0; b < candidateChars.length; b++) {
        const candidate = `u${candidateChars[a]}${candidateChars[b]}`;
        if (!usedTags.has(candidate)) return candidate;
      }
    }
    return '999';
  };

  const result = users.map((u, idx) => {
    const copy = { ...u };
    let rawName = String(copy.displayName || `Usuario${idx + 1}`).trim();
    if (!rawName) rawName = `Usuario${idx + 1}`;

    if (usedNames.has(rawName.toLowerCase())) {
      let suffix = 2;
      while (usedNames.has(`${rawName}_${suffix}`.toLowerCase())) {
        suffix++;
      }
      copy.displayName = `${rawName}_${suffix}`;
      changed = true;
    }
    usedNames.add(copy.displayName.trim().toLowerCase());

    const rawTag = String(copy.userTagId || '')
      .replace(/^@+/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 3);
    const uniqueTag = pickUniqueTag(rawTag || `u${idx + 1}`);
    if (uniqueTag !== copy.userTagId) {
      copy.userTagId = uniqueTag;
      changed = true;
    }
    usedTags.add(uniqueTag.toLowerCase());

    return copy;
  });

  return { users: result, changed };
}

export function buildPlayerMessageToDM(params: {
  id?: string;
  roomCode: string;
  characterId: string;
  characterName: string;
  playerName: string;
  playerTagId?: string;
  playerEmail?: string;
  title: string;
  description: string;
  createdAt?: number;
}) {
  const cleanTitle = String(params.title || '').trim();
  const cleanDesc = String(params.description || '').trim();
  if (!cleanTitle || !cleanDesc) {
    throw new Error('El título y la descripción del mensaje son obligatorios.');
  }
  const cleanTag =
    String(params.playerTagId || '')
      .replace(/^@+/, '')
      .trim() || '123';
  const cleanPlayer = String(params.playerName || 'Jugador').trim();

  return {
    id: params.id || `pmsg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    roomCode: normalizeRoomIdentifier(params.roomCode) || 'MESA-PRINCIPAL',
    characterId: String(params.characterId || 'char-unknown'),
    characterName: String(params.characterName || 'Aventurero').trim(),
    playerName: cleanPlayer,
    playerTagId: cleanTag,
    playerFullTag: cleanPlayer.includes('@') ? cleanPlayer : `${cleanPlayer}@${cleanTag}`,
    playerEmail: params.playerEmail,
    title: cleanTitle,
    description: cleanDesc,
    createdAt: params.createdAt || Date.now(),
    read: false,
  };
}


