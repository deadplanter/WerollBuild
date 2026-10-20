import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateModifier,
  formatModifier,
  calculateProficiencyBonus,
  calculatePassivePerception,
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  calculateCarryCapacity,
  parseDiceExpression,
  evaluateD20Roll,
} from './dnd-math.ts';

test('calculateModifier computes 5E ability modifiers accurately', () => {
  assert.equal(calculateModifier(1), -5);
  assert.equal(calculateModifier(8), -1);
  assert.equal(calculateModifier(9), -1);
  assert.equal(calculateModifier(10), 0);
  assert.equal(calculateModifier(11), 0);
  assert.equal(calculateModifier(12), 1);
  assert.equal(calculateModifier(14), 2);
  assert.equal(calculateModifier(18), 4);
  assert.equal(calculateModifier(20), 5);
});

test('formatModifier formats positive, zero, and negative signs', () => {
  assert.equal(formatModifier(3), '+3');
  assert.equal(formatModifier(0), '+0');
  assert.equal(formatModifier(-2), '-2');
});

test('calculateProficiencyBonus matches 5E level progression', () => {
  // Lvl 1-4: +2
  assert.equal(calculateProficiencyBonus(1), 2);
  assert.equal(calculateProficiencyBonus(4), 2);
  // Lvl 5-8: +3
  assert.equal(calculateProficiencyBonus(5), 3);
  assert.equal(calculateProficiencyBonus(8), 3);
  // Lvl 9-12: +4
  assert.equal(calculateProficiencyBonus(9), 4);
  // Lvl 13-16: +5
  assert.equal(calculateProficiencyBonus(13), 5);
  // Lvl 17-20: +6
  assert.equal(calculateProficiencyBonus(17), 6);
  assert.equal(calculateProficiencyBonus(20), 6);
});

test('calculatePassivePerception computes base, proficiency and expertise', () => {
  // WIS 10 (+0), None, prof +2 => 10 + 0 + 0 = 10
  assert.equal(calculatePassivePerception(10, 'none', 2), 10);
  // WIS 14 (+2), Proficient, prof +3 => 10 + 2 + 3 = 15
  assert.equal(calculatePassivePerception(14, 'proficient', 3), 15);
  // WIS 16 (+3), Expertise, prof +3 => 10 + 3 + (3*2) = 19
  assert.equal(calculatePassivePerception(16, 'expertise', 3), 19);
});

test('calculateSpellSaveDC and attack bonus work accurately', () => {
  // INT 16 (+3), Prof +2 => DC = 8 + 2 + 3 = 13, Attack = 2 + 3 = 5
  assert.equal(calculateSpellSaveDC(16, 2), 13);
  assert.equal(calculateSpellAttackBonus(16, 2), 5);
});

test('calculateCarryCapacity complies with 5E rules', () => {
  const cap = calculateCarryCapacity(15);
  assert.equal(cap.maxCarry, 225);
  assert.equal(cap.pushDragLift, 450);
});

test('parseDiceExpression parses standard dice notation', () => {
  assert.deepEqual(parseDiceExpression('1d20+4'), { count: 1, sides: 20, modifier: 4 });
  assert.deepEqual(parseDiceExpression('2d6-1'), { count: 2, sides: 6, modifier: -1 });
  assert.deepEqual(parseDiceExpression('d8'), { count: 1, sides: 8, modifier: 0 });
});

test('evaluateD20Roll handles normal, advantage, and disadvantage', () => {
  // Advantage: [12, 19] with +3 => 19 + 3 = 22
  const adv = evaluateD20Roll(3, 'advantage', [12, 19]);
  assert.equal(adv.chosenRoll, 19);
  assert.equal(adv.total, 22);
  assert.equal(adv.isCrit, false);

  // Disadvantage: [18, 4] with +2 => 4 + 2 = 6
  const dis = evaluateD20Roll(2, 'disadvantage', [18, 4]);
  assert.equal(dis.chosenRoll, 4);
  assert.equal(dis.total, 6);

  // Crit natural 20
  const crit = evaluateD20Roll(5, 'normal', [20]);
  assert.equal(crit.isCrit, true);
  assert.equal(crit.total, 25);

  // Fumble natural 1
  const botch = evaluateD20Roll(5, 'normal', [1]);
  assert.equal(botch.isFumble, true);
  assert.equal(botch.total, 6);
});

import { folderMatchesFilter, getFolderDepth } from './storage.ts';

import {
  classifyInventoryItemGroup,
  formatWeaponAttackFormula,
  deriveEquippedWeaponAttacks,
  getSpanishAbilityLabel,
} from './dnd-math.ts';

test('getFolderDepth returns correct level from 1 to 3', () => {
  assert.equal(getFolderDepth('Ciudad Olvidada'), 1);
  assert.equal(getFolderDepth('Ciudad Olvidada / Taberna del Jabalí'), 2);
  assert.equal(getFolderDepth('Ciudad Olvidada / Taberna del Jabalí / Sótano Secreto'), 3);
});

test('folderMatchesFilter returns true for all child subfolders and exact matches', () => {
  // 'all' matches everything
  assert.equal(folderMatchesFilter('Cualquier Cosa', 'all'), true);
  assert.equal(folderMatchesFilter(undefined, 'all'), true);

  // Exact match
  assert.equal(folderMatchesFilter('Ciudad Olvidada', 'Ciudad Olvidada'), true);

  // Parent matches subfolder (depth 2)
  assert.equal(folderMatchesFilter('Ciudad Olvidada / Taberna del Jabalí', 'Ciudad Olvidada'), true);

  // Parent matches sub-subfolder (depth 3)
  assert.equal(folderMatchesFilter('Ciudad Olvidada / Taberna del Jabalí / Sótano', 'Ciudad Olvidada'), true);

  // Subfolder matches sub-subfolder
  assert.equal(folderMatchesFilter('Ciudad Olvidada / Taberna del Jabalí / Sótano', 'Ciudad Olvidada / Taberna del Jabalí'), true);

  // Subfolder does NOT match parent
  assert.equal(folderMatchesFilter('Ciudad Olvidada', 'Ciudad Olvidada / Taberna del Jabalí'), false);

  // Unrelated folder does not match
  assert.equal(folderMatchesFilter('Campamento del Valle', 'Ciudad Olvidada'), false);
});

test('classifyInventoryItemGroup classifies into Armas, Armaduras, and Objetos comunes', () => {
  assert.equal(classifyInventoryItemGroup('Arma'), 'Armas');
  assert.equal(classifyInventoryItemGroup('Arma (Marcial Cuerpo a cuerpo)'), 'Armas');
  assert.equal(classifyInventoryItemGroup('Armadura'), 'Armaduras');
  assert.equal(classifyInventoryItemGroup('Escudo'), 'Armaduras');
  assert.equal(classifyInventoryItemGroup('Objeto Común'), 'Objetos comunes');
  assert.equal(classifyInventoryItemGroup('Poción'), 'Objetos comunes');
  assert.equal(classifyInventoryItemGroup('Equipo'), 'Objetos comunes');
});

test('formatWeaponAttackFormula formats dice and bonus', () => {
  assert.equal(formatWeaponAttackFormula('1d6', 2), '1d6+2');
  assert.equal(formatWeaponAttackFormula('1d8', 0), '1d8');
  assert.equal(formatWeaponAttackFormula('2d6', -1), '2d6-1');
});

test('deriveEquippedWeaponAttacks returns attacks only from equipped weapons', () => {
  const inventory = [
    {
      id: 'w-1',
      name: 'Espada Ígnea',
      category: 'Arma',
      equipped: true,
      weaponAttacks: [
        {
          id: 'a1',
          name: 'Corte Principal',
          description: 'Tajo físico con potenciador',
          dice: '1d6',
          bonus: 2,
          damageType: 'Cortante',
          attackType: 'melee' as const,
        },
        {
          id: 'a2',
          name: 'Habilidad Secundaria: Llamarada',
          description: 'Descarga de fuego sin potenciador',
          dice: '1d8',
          bonus: 0,
          damageType: 'Fuego',
          attackType: 'melee' as const,
        },
      ],
    },
    {
      id: 'w-2',
      name: 'Daga Oculta',
      category: 'Arma',
      equipped: false,
      weaponAttacks: [
        {
          id: 'a3',
          name: 'Puñalada',
          description: 'Ataque rápido',
          dice: '1d4',
          bonus: 1,
          damageType: 'Perforante',
        },
      ],
    },
    {
      id: 'arm-1',
      name: 'Cota de Malla',
      category: 'Armadura',
      equipped: true,
    },
  ];

  const derived = deriveEquippedWeaponAttacks(inventory, 16, 12, 2); // STR 16 (+3), Prof +2
  assert.equal(derived.length, 2);
  assert.equal(derived[0].attackName, 'Corte Principal');
  assert.equal(derived[0].damageFormula, '1d6+2');
  assert.equal(derived[0].toHitBonus, 7); // +2 prof +3 str +2 bonus
  assert.equal(derived[1].attackName, 'Habilidad Secundaria: Llamarada');
  assert.equal(derived[1].damageFormula, '1d8');
  assert.equal(derived[1].toHitBonus, 5); // +2 prof +3 str +0 bonus
});

test('getSpanishAbilityLabel returns Spanish labels for all 6 stats', () => {
  assert.equal(getSpanishAbilityLabel('str'), 'Fuerza (FUE)');
  assert.equal(getSpanishAbilityLabel('dex'), 'Destreza (DES)');
  assert.equal(getSpanishAbilityLabel('con'), 'Constitución (CON)');
  assert.equal(getSpanishAbilityLabel('int'), 'Inteligencia (INT)');
  assert.equal(getSpanishAbilityLabel('wis'), 'Sabiduría (SAB)');
  assert.equal(getSpanishAbilityLabel('cha'), 'Carisma (CAR)');
});

import {
  normalizeRoomIdentifier,
  validateUniqueRoomNameAndCode,
  validateUniqueUserIdentity,
  deduplicateUsersIdentity,
  buildPlayerMessageToDM,
} from './dnd-math.ts';

test('validateUniqueRoomNameAndCode blocks duplicate room names or codes across DMs', () => {
  assert.equal(normalizeRoomIdentifier('  mesa   uno '), 'MESA-UNO');

  const existingWorlds = [
    { id: 'w-1', name: 'Mesa Uno', roomCode: 'MESA-UNO', ownerEmail: 'dm1@weroll.app' },
  ];

  // Another DM tries to create "mesa uno"
  const check1 = validateUniqueRoomNameAndCode({
    proposedRoomCode: 'mesa uno',
    proposedName: 'Mesa Uno',
    existingWorlds,
  });
  assert.equal(check1.valid, false);

  // Same world sheet updating itself is allowed
  const checkSelf = validateUniqueRoomNameAndCode({
    proposedRoomCode: 'MESA-UNO',
    proposedName: 'Mesa Uno',
    excludeWorldId: 'w-1',
    existingWorlds,
  });
  assert.equal(checkSelf.valid, true);

  // Distinct room name & code is allowed
  const checkNew = validateUniqueRoomNameAndCode({
    proposedRoomCode: 'MESA-DOS',
    proposedName: 'Mesa Dos',
    existingWorlds,
  });
  assert.equal(checkNew.valid, true);
});

test('validateUniqueUserIdentity and deduplicateUsersIdentity enforce unique displayName and userTagId', () => {
  const existing = [
    { id: 'u1', displayName: 'Aragorn', userTagId: 'rey' },
    { id: 'u2', displayName: 'Legolas', userTagId: 'elf' },
  ];

  assert.equal(
    validateUniqueUserIdentity({
      displayName: 'aragorn',
      userTagId: '999',
      existingUsers: existing,
    }).valid,
    false
  );

  assert.equal(
    validateUniqueUserIdentity({
      displayName: 'Gimli',
      userTagId: 'ELF',
      existingUsers: existing,
    }).valid,
    false
  );

  assert.equal(
    validateUniqueUserIdentity({
      displayName: 'Gimli',
      userTagId: 'axa',
      existingUsers: existing,
    }).valid,
    true
  );

  const duped = [
    { id: 'u1', displayName: 'Tester', userTagId: '123' },
    { id: 'u2', displayName: 'Tester', userTagId: '123' },
  ];
  const deduped = deduplicateUsersIdentity(duped);
  assert.equal(deduped.changed, true);
  assert.notEqual(deduped.users[0].displayName, deduped.users[1].displayName);
  assert.notEqual(deduped.users[0].userTagId, deduped.users[1].userTagId);
});

test('buildPlayerMessageToDM builds a structured private message for the DM', () => {
  const msg = buildPlayerMessageToDM({
    roomCode: 'mesa uno',
    characterId: 'char-1',
    characterName: 'Kaelen Vientosombrío',
    playerName: 'deadplanter',
    playerTagId: 'top',
    title: 'Susurro en la taberna',
    description: 'Uso mi juego de manos para esconder la llave debajo de la capa.',
  });
  assert.equal(msg.roomCode, 'MESA-UNO');
  assert.equal(msg.characterName, 'Kaelen Vientosombrío');
  assert.equal(msg.playerFullTag, 'deadplanter@top');
  assert.equal(msg.title, 'Susurro en la taberna');
  assert.equal(msg.read, false);
});



