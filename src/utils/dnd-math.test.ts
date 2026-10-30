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

import {
  getEffectiveAbilityModifier,
  buildJournalIndexEntries,
} from './dnd-math.ts';

test('getEffectiveAbilityModifier supports base score, customModifier bonus, and modifierOverride', () => {
  assert.equal(getEffectiveAbilityModifier(10), 0);
  assert.equal(getEffectiveAbilityModifier({ score: 8 }), -1);
  // Base 8 (-1) + customModifier (+3) = +2
  assert.equal(getEffectiveAbilityModifier({ score: 8, customModifier: 3 }), 2);
  // Direct modifierOverride takes precedence
  assert.equal(getEffectiveAbilityModifier({ score: 8, customModifier: 1, modifierOverride: 4 }), 4);
});

test('buildJournalIndexEntries builds 1-sheet-per-entry index summary accurately', () => {
  const index = buildJournalIndexEntries([
    { id: 'j1', sessionNumber: 1, title: 'La Cripta del Dragón', dateInGame: '14 de Tarsakh' },
    { id: 'j2', sessionNumber: 2, title: 'El Pacto en la Taberna', dateInGame: '' },
  ]);
  assert.equal(index.totalSheets, 2);
  assert.equal(index.items[0].sheetNumber, 1);
  assert.equal(index.items[0].title, 'La Cripta del Dragón');
  assert.equal(index.items[0].dateInGame, '14 de Tarsakh');
  assert.equal(index.items[0].pagesOccupied, 1);
  assert.equal(index.items[1].sheetNumber, 2);
  assert.equal(index.items[1].sessionNumber, 2);
});

import {
  stepInitiativeTurn,
  buildAtlasBreadcrumbs,
  getChildFoldersForAtlas,
  ensureCompleteFolderHierarchy,
  getPinPositionForChildPlace,
  filterAlbumPhotosByPlace,
} from './dnd-math.ts';

test('stepInitiativeTurn steps forward and backward across rounds accurately', () => {
  // 3 combatants (indices 0, 1, 2)
  assert.deepEqual(stepInitiativeTurn(0, 1, 3, 'next'), { currentTurnIndex: 1, round: 1 });
  assert.deepEqual(stepInitiativeTurn(1, 1, 3, 'next'), { currentTurnIndex: 2, round: 1 });
  // Wrapping from last combatant increments round
  assert.deepEqual(stepInitiativeTurn(2, 1, 3, 'next'), { currentTurnIndex: 0, round: 2 });

  // Stepping backward within same round
  assert.deepEqual(stepInitiativeTurn(2, 2, 3, 'prev'), { currentTurnIndex: 1, round: 2 });
  // Stepping backward from index 0 wraps to last combatant and decrements round (min 1)
  assert.deepEqual(stepInitiativeTurn(0, 2, 3, 'prev'), { currentTurnIndex: 2, round: 1 });
  assert.deepEqual(stepInitiativeTurn(0, 1, 3, 'prev'), { currentTurnIndex: 2, round: 1 });
});

test('buildAtlasBreadcrumbs and getChildFoldersForAtlas support 4 hierarchical levels and strict direct children', () => {
  const crumbsAll = buildAtlasBreadcrumbs('all');
  assert.equal(crumbsAll.length, 1);
  assert.equal(crumbsAll[0].label, 'Mundo');

  // 4 levels deep under Mundo: Región -> Ciudad -> Lugar -> Sub-lugar
  const deepPath = 'Costa de la Espada / Ciudad Olvidada / Taberna del Jabalí / Sótano Secreto';
  const crumbs4 = buildAtlasBreadcrumbs(deepPath);
  assert.equal(crumbs4.length, 5); // Mundo + 4 levels
  assert.equal(crumbs4[1].label, 'Costa de la Espada');
  assert.equal(crumbs4[2].label, 'Ciudad Olvidada');
  assert.equal(crumbs4[3].label, 'Taberna del Jabalí');
  assert.equal(crumbs4[4].label, 'Sótano Secreto');

  // Even if only a 4-level leaf path is passed, ensureCompleteFolderHierarchy expands intermediate levels
  const expanded = ensureCompleteFolderHierarchy([deepPath, 'Valle del Norte / Campamento del Valle']);
  assert.deepEqual(getChildFoldersForAtlas(expanded, 'all'), [
    'Costa de la Espada',
    'Valle del Norte',
  ]);
  assert.deepEqual(getChildFoldersForAtlas(expanded, 'Costa de la Espada'), [
    'Costa de la Espada / Ciudad Olvidada',
  ]);
  assert.deepEqual(getChildFoldersForAtlas(expanded, 'Costa de la Espada / Ciudad Olvidada'), [
    'Costa de la Espada / Ciudad Olvidada / Taberna del Jabalí',
  ]);
  assert.deepEqual(
    getChildFoldersForAtlas(expanded, 'Costa de la Espada / Ciudad Olvidada / Taberna del Jabalí'),
    ['Costa de la Espada / Ciudad Olvidada / Taberna del Jabalí / Sótano Secreto']
  );
});

test('getPinPositionForChildPlace and filterAlbumPhotosByPlace work accurately', () => {
  const customPos = {
    'Costa de la Espada / Ciudad Olvidada': { x: 75, y: 22 },
  };
  assert.deepEqual(
    getPinPositionForChildPlace('Costa de la Espada / Ciudad Olvidada', 0, 2, customPos),
    { x: 75, y: 22 }
  );
  const fallbackPos = getPinPositionForChildPlace('Valle del Norte', 0, 2, customPos);
  assert.equal(typeof fallbackPos.x, 'number');
  assert.equal(typeof fallbackPos.y, 'number');

  const photos = [
    { id: 'p1', title: 'Mapa General', folder: 'Costa de la Espada' },
    { id: 'p2', title: 'Barra de la Taberna', folder: 'Costa de la Espada / Ciudad Olvidada / Taberna del Jabalí' },
    { id: 'p3', title: 'Cripta del Sótano', folder: 'Costa de la Espada / Ciudad Olvidada / Taberna del Jabalí / Sótano Secreto' },
    { id: 'p4', title: 'Tienda del Valle', folder: 'Valle del Norte / Campamento del Valle' },
  ];

  // At Mundo ('all'), all 4 photos are returned
  assert.equal(filterAlbumPhotosByPlace(photos, 'all').length, 4);
  // At Taberna del Jabalí, only p2 and p3 (inside Taberna or its sub-places) are returned
  assert.deepEqual(
    filterAlbumPhotosByPlace(photos, 'Costa de la Espada / Ciudad Olvidada / Taberna del Jabalí').map((p) => p.id),
    ['p2', 'p3']
  );
});

import {
  parseAlignmentDescriptor,
  canAddEnemyToEncounter,
  MAX_ENCOUNTER_ENEMIES,
  buildLiveProjectionFromWorkspace,
} from './dnd-math.ts';

test('parseAlignmentDescriptor maps morality to green/gray/red and ethics to spiral/equilibrium/scales', () => {
  // Chaotic Good -> Spiral + Green
  const cg = parseAlignmentDescriptor('Caótico Bueno');
  assert.equal(cg.ethics, 'chaotic');
  assert.equal(cg.morality, 'good');
  assert.equal(cg.shape, 'spiral');
  assert.equal(cg.colorTone, 'green');
  assert.equal(cg.labelEs, 'Caótico Bueno');

  // Lawful Good -> Scales + Green
  const lg = parseAlignmentDescriptor('Legal Bueno');
  assert.equal(lg.ethics, 'lawful');
  assert.equal(lg.morality, 'good');
  assert.equal(lg.shape, 'scales');
  assert.equal(lg.colorTone, 'green');

  // Neutral Evil -> Equilibrium + Red
  const ne = parseAlignmentDescriptor('Neutral Malvado');
  assert.equal(ne.ethics, 'neutral');
  assert.equal(ne.morality, 'evil');
  assert.equal(ne.shape, 'equilibrium');
  assert.equal(ne.colorTone, 'red');

  // True Neutral -> Equilibrium + Gray
  const nn = parseAlignmentDescriptor('Neutral');
  assert.equal(nn.ethics, 'neutral');
  assert.equal(nn.morality, 'neutral');
  assert.equal(nn.shape, 'equilibrium');
  assert.equal(nn.colorTone, 'gray');
  assert.equal(nn.labelEs, 'Neutral Verdadero');

  // Chaotic Evil -> Spiral + Red
  const ce = parseAlignmentDescriptor('Caótico Malo');
  assert.equal(ce.shape, 'spiral');
  assert.equal(ce.colorTone, 'red');
});

test('canAddEnemyToEncounter enforces a strict maximum of 8 enemies while ignoring allies', () => {
  assert.equal(MAX_ENCOUNTER_ENEMIES, 8);

  const sevenEnemiesAndThreeAllies = [
    ...Array.from({ length: 7 }, () => ({ faction: 'enemy' as const, isPlayer: false })),
    ...Array.from({ length: 3 }, () => ({ faction: 'ally' as const, isPlayer: true })),
  ];
  assert.deepEqual(canAddEnemyToEncounter(sevenEnemiesAndThreeAllies), {
    enemyCount: 7,
    maxEnemies: 8,
    canAdd: true,
  });

  const eightEnemies = [
    ...Array.from({ length: 8 }, () => ({ faction: 'enemy' as const, isPlayer: false })),
    { faction: 'ally' as const, isPlayer: true },
  ];
  assert.deepEqual(canAddEnemyToEncounter(eightEnemies), {
    enemyCount: 8,
    maxEnemies: 8,
    canAdd: false,
  });
});

test('buildLiveProjectionFromWorkspace resolves activeLiveVisual album photos, atlasMaps, and tactical visuals accurately', () => {
  // 1. When DM activates an album photo in activeLiveVisual, players receive its exact imageUrl and title
  const projPhoto = buildLiveProjectionFromWorkspace(
    {
      activeAtlasFolder: 'Costa de la Espada / Taberna del Jabalí',
      atlasMaps: {
        'Costa de la Espada / Taberna del Jabalí': 'https://example.com/map-taberna.jpg',
      },
      activeLiveVisual: {
        kind: 'album',
        id: 'alb-1',
        title: 'Interior de la Taberna',
        imageUrl: 'data:image/png;base64,TABERNA_PHOTO',
        folder: 'Costa de la Espada / Taberna del Jabalí',
      },
      placeAlbumPhotos: [
        {
          id: 'alb-1',
          title: 'Interior de la Taberna',
          imageUrl: 'data:image/png;base64,TABERNA_PHOTO',
          folder: 'Costa de la Espada / Taberna del Jabalí',
        },
      ],
    },
    'Reinos Olvidados'
  );
  assert.equal(projPhoto.locationName, 'Taberna del Jabalí');
  assert.equal(projPhoto.visualKind, 'photo');
  assert.equal(projPhoto.visualTitle, 'Interior de la Taberna');
  assert.equal(projPhoto.visualImageUrl, 'data:image/png;base64,TABERNA_PHOTO');
  assert.equal(projPhoto.galleryPhotos.length, 1);

  // 2. When no activeLiveVisual is set, falls back to atlasMaps[activeFolder]
  const projMap = buildLiveProjectionFromWorkspace(
    {
      activeAtlasFolder: 'Costa de la Espada / Taberna del Jabalí',
      atlasMaps: {
        'Costa de la Espada / Taberna del Jabalí': 'https://example.com/map-taberna.jpg',
      },
      placeAlbumPhotos: [],
    },
    'Reinos Olvidados'
  );
  assert.equal(projMap.visualKind, 'map');
  assert.equal(projMap.visualImageUrl, 'https://example.com/map-taberna.jpg');
  assert.equal(projMap.visualTitle, 'Mapa: Taberna del Jabalí');
});

import {
  getParentAtlasFolder,
  getParentPlaceDisplayName,
  getReturnToParentButtonLabel,
  enqueueVisualItem,
  removeVisualFromQueue,
  moveTacticalTokenOnGrid,
} from './dnd-math.ts';

test('getParentAtlasFolder and buildAtlasBreadcrumbs allow returning to any previous zone in Ruta de la Zona and Proyección de Zona', () => {
  assert.equal(getParentAtlasFolder('Costa de la Espada / Taberna del Jabalí / Sótano'), 'Costa de la Espada / Taberna del Jabalí');
  assert.equal(getParentAtlasFolder('Costa de la Espada / Taberna del Jabalí'), 'Costa de la Espada');
  assert.equal(getParentAtlasFolder('Costa de la Espada'), 'all');
  assert.equal(getParentAtlasFolder('all'), 'all');

  const crumbs = buildAtlasBreadcrumbs('Costa de la Espada / Taberna del Jabalí / Sótano');
  assert.equal(crumbs.length, 4);
  assert.equal(crumbs[0].folderPath, 'all');
  assert.equal(crumbs[1].folderPath, 'Costa de la Espada');
  assert.equal(crumbs[2].folderPath, 'Costa de la Espada / Taberna del Jabalí');
  assert.equal(crumbs[3].folderPath, 'Costa de la Espada / Taberna del Jabalí / Sótano');
});

test('getParentPlaceDisplayName and getReturnToParentButtonLabel format top-left return button inside map canvas', () => {
  assert.equal(
    getParentPlaceDisplayName('Faerûn / Aguas Profundas', 'Reinos Olvidados'),
    'Faerûn'
  );
  assert.equal(
    getReturnToParentButtonLabel('Faerûn / Aguas Profundas', 'Reinos Olvidados'),
    'Regresar a Faerûn'
  );
  assert.equal(
    getReturnToParentButtonLabel('Faerûn', 'Reinos Olvidados'),
    'Regresar a Reinos Olvidados'
  );
  assert.equal(
    getReturnToParentButtonLabel('Faerûn'),
    'Regresar a Mundo'
  );
});

test('enqueueVisualItem and removeVisualFromQueue manage the DM visual storytelling queue in order', () => {
  let queue = enqueueVisualItem([], {
    queueId: 'q-1',
    id: 'alb-1',
    kind: 'album',
    title: 'Entrada a la Ciudad',
    imageUrl: 'https://example.com/city.jpg',
    folder: 'Faerûn / Ciudad',
  });
  queue = enqueueVisualItem(queue, {
    queueId: 'q-2',
    id: 'tac-1',
    kind: 'tactical',
    title: 'Emboscada en el Callejón',
    imageUrl: 'https://example.com/alley.jpg',
    folder: 'Faerûn / Ciudad',
  });

  assert.equal(queue.length, 2);
  assert.equal(queue[0].title, 'Entrada a la Ciudad');
  assert.equal(queue[1].title, 'Emboscada en el Callejón');

  // Re-adding same id+kind updates existing item without duplicating
  queue = enqueueVisualItem(queue, {
    id: 'alb-1',
    kind: 'album',
    title: 'Entrada a la Ciudad (Noche)',
    imageUrl: 'https://example.com/city-night.jpg',
    folder: 'Faerûn / Ciudad',
  });
  assert.equal(queue.length, 2);
  assert.equal(queue[0].title, 'Entrada a la Ciudad (Noche)');

  // Crossing off item removes it cleanly
  queue = removeVisualFromQueue(queue, 'q-1');
  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, 'tac-1');
});

test('moveTacticalTokenOnGrid moves tokens on the tactical grid and clamps coordinates to bounds', () => {
  const initialTokens = [
    { id: 'tok-p1', label: 'Tharivol', kind: 'player' as const, x: 2, y: 3 },
    { id: 'tok-m1', label: 'Goblin', kind: 'monster' as const, x: 6, y: 4 },
  ];

  const moved = moveTacticalTokenOnGrid(initialTokens, 'tok-p1', 5, 7, 10, 8);
  assert.equal(moved[0].x, 5);
  assert.equal(moved[0].y, 7);
  assert.equal(moved[1].x, 6);

  // Out of bounds clamps to [0..cols-1] and [0..rows-1]
  const clamped = moveTacticalTokenOnGrid(moved, 'tok-m1', 99, -4, 10, 8);
  assert.equal(clamped[1].x, 9);
  assert.equal(clamped[1].y, 0);
});

test('buildLiveProjectionFromWorkspace keeps projected tavern image locked for players when DM browses another zone unless autoSyncLiveOnZoneChange is enabled', () => {
  // DM projected the Tavern photo, then moved activeAtlasFolder to "Mazmorra Oscura" to inspect maps while autoSyncLiveOnZoneChange is false
  const projLocked = buildLiveProjectionFromWorkspace(
    {
      activeAtlasFolder: 'Costa de la Espada / Mazmorra Oscura',
      autoSyncLiveOnZoneChange: false,
      atlasMaps: {
        'Costa de la Espada / Taberna del Jabalí': 'https://example.com/map-taberna.jpg',
        'Costa de la Espada / Mazmorra Oscura': 'https://example.com/map-mazmorra.jpg',
      },
      activeLiveVisual: {
        kind: 'album',
        id: 'alb-taberna',
        title: 'Interior de la Taberna',
        imageUrl: 'data:image/png;base64,TABERNA_PHOTO',
        folder: 'Costa de la Espada / Taberna del Jabalí',
      },
      placeAlbumPhotos: [
        {
          id: 'alb-taberna',
          title: 'Interior de la Taberna',
          imageUrl: 'data:image/png;base64,TABERNA_PHOTO',
          folder: 'Costa de la Espada / Taberna del Jabalí',
        },
      ],
    },
    'Reinos Olvidados'
  );

  assert.equal(projLocked.locationFolder, 'Costa de la Espada / Taberna del Jabalí');
  assert.equal(projLocked.locationName, 'Taberna del Jabalí');
  assert.equal(projLocked.visualImageUrl, 'data:image/png;base64,TABERNA_PHOTO');
  assert.equal(projLocked.visualTitle, 'Interior de la Taberna');
});

import {
  calculateTotalAbilityScore,
  calculateEquippedItemStatBonuses,
  deriveAllCharacterActions,
} from './dnd-math.ts';

test('calculateTotalAbilityScore cleanly decomposes base points, extra points, and item points and computes total modifier', () => {
  // Base 14, Extra +1, Item +1 => Total = 16 => Mod = +3
  const res = calculateTotalAbilityScore({ score: 14, baseScore: 14, extraScore: 1 }, 1);
  assert.equal(res.baseScore, 14);
  assert.equal(res.extraScore, 1);
  assert.equal(res.itemScore, 1);
  assert.equal(res.totalScore, 16);
  assert.equal(res.modifier, 3);

  // Base 10, Extra 0, Item +2 => Total = 12 => Mod = +1
  const res2 = calculateTotalAbilityScore({ score: 10, baseScore: 10, extraScore: 0 }, 2);
  assert.equal(res2.totalScore, 12);
  assert.equal(res2.modifier, 1);
});

test('calculateEquippedItemStatBonuses aggregates stats only from equipped gear and tracks sources', () => {
  const inv = [
    {
      id: 'arm-1',
      name: 'Armadura de Cuero Mejorada',
      equipped: true,
      statModifiers: [
        { id: 'm1', stat: 'dex', value: 1, label: 'Bono de Destreza' },
        { id: 'm2', stat: 'ac', value: 1, label: 'Refuerzo de CA' },
      ],
    },
    {
      id: 'ring-1',
      name: 'Anillo de Fuerza de Gigante',
      equipped: true,
      statModifiers: [
        { id: 'm3', stat: 'str', value: 2, label: 'Fuerza Titánica' },
        { id: 'm4', stat: 'maxHp', value: 5, label: 'Vigor' },
      ],
    },
    {
      id: 'amulet-unequipped',
      name: 'Amuleto del Sabio',
      equipped: false, // Not equipped!
      statModifiers: [
        { id: 'm5', stat: 'wis', value: 5 },
      ],
    },
  ];

  const bonuses = calculateEquippedItemStatBonuses(inv);
  assert.equal(bonuses.dex, 1);
  assert.equal(bonuses.ac, 1);
  assert.equal(bonuses.str, 2);
  assert.equal(bonuses.maxHp, 5);
  assert.equal(bonuses.wis, 0); // Not equipped so 0
  assert.equal(bonuses.sources.dex[0].itemName, 'Armadura de Cuero Mejorada');
  assert.equal(bonuses.sources.str[0].itemName, 'Anillo de Fuerza de Gigante');
});

test('deriveAllCharacterActions aggregates both weapon attacks and custom item actions in Ataques y Acciones', () => {
  const actions = deriveAllCharacterActions({
    inventory: [
      {
        id: 'w-1',
        name: 'Espada Larga Rúnica',
        itemGroup: 'weapon',
        equipped: true,
        weaponAttacks: [
          {
            id: 'atk-1',
            name: 'Corte Celestial',
            description: 'Tajo bañado en luz solar',
            dice: '1d8',
            bonus: 2,
            damageType: 'Radiante',
            attackType: 'melee',
            range: '5 pies',
          },
        ],
      },
      {
        id: 'arm-boots',
        name: 'Botas del Relámpago',
        itemGroup: 'armor',
        equipped: true,
        itemActions: [
          {
            id: 'act-zap',
            name: 'Paso Atronador',
            description: 'Explosión de trueno al saltar',
            dice: '2d6',
            bonus: 0,
            damageType: 'Trueno',
            actionType: 'bonus',
            range: '10 pies',
          },
        ],
      },
    ],
    strScore: 16, // +3
    dexScore: 14,
    profBonus: 2,
  });

  assert.equal(actions.length, 2);
  assert.equal(actions[0].name, 'Corte Celestial');
  assert.equal(actions[0].formula, '1d8+2');
  assert.equal(actions[1].name, 'Paso Atronador');
  assert.equal(actions[1].formula, '2d6');
  assert.equal(actions[1].damageType, 'Trueno');
  assert.equal(actions[1].isSpecialAction, true);
});

test('buildDeduplicatedPlayerSkillCards prevents duplicate SRD and custom skill cards and preserves descriptions/images', async () => {
  const { buildDeduplicatedPlayerSkillCards } = await import('./dnd-math.ts');

  const srdCatalog = [
    { key: 'intimidation', nameEs: 'Intimidación', ability: 'cha' as const, description: 'Influir mediante amenazas.' },
    { key: 'perception', nameEs: 'Percepción', ability: 'wis' as const, description: 'Detectar presencias.' },
    { key: 'stealth', nameEs: 'Sigilo', ability: 'dex' as const, description: 'Ocultarse en las sombras.' },
  ];

  // Simulate the exact bug scenario: character has intimidation in character.skills AND in character.customSkills
  const cards = buildDeduplicatedPlayerSkillCards(
    {
      level: 1, // profBonus = +2
      abilities: {
        str: { score: 10 },
        dex: { score: 14 },
        con: { score: 10 },
        int: { score: 10 },
        wis: { score: 12 },
        cha: { score: 16 }, // +3
      },
      skills: {
        intimidation: 'proficient',
        perception: 'none',
        stealth: 'none',
      },
      customSkills: [
        {
          id: 'cskill-intim-1',
          srdKey: 'intimidation',
          name: 'Intimidación',
          ability: 'cha',
          proficiency: 'proficient',
          description: 'Mirada aterradora del Norte (+Descripción personalizada)',
          imageUrl: 'data:image/webp;base64,AAA',
        },
        {
          id: 'cskill-intim-dup',
          name: 'intimidacion', // accent-insensitive duplicate
          ability: 'cha',
          proficiency: 'proficient',
          description: 'Duplicado que debe filtrarse',
        },
        {
          id: 'cskill-forge',
          name: 'Herrería Rúnica',
          ability: 'str',
          proficiency: 'expertise',
          description: 'Forjar runas antiguas en armas.',
          imageUrl: 'data:image/webp;base64,BBB',
        },
      ],
    },
    srdCatalog
  );

  // Should contain exactly 2 cards: Intimidación (1 time!) and Herrería Rúnica (1 time!)
  assert.equal(cards.length, 2);
  assert.equal(cards[0].name, 'Intimidación');
  assert.equal(cards[0].totalBonus, 5); // CHA +3 + Prof +2
  assert.equal(cards[0].description, 'Mirada aterradora del Norte (+Descripción personalizada)');
  assert.equal(cards[0].imageUrl, 'data:image/webp;base64,AAA');

  assert.equal(cards[1].name, 'Herrería Rúnica');
  assert.equal(cards[1].totalBonus, 4); // STR +0 + Expertise +4
  assert.equal(cards[1].description, 'Forjar runas antiguas en armas.');
  assert.equal(cards[1].imageUrl, 'data:image/webp;base64,BBB');
});

test('canAccessArcaneOracle and getHeaderRoleButtonsVisibility enforce strict role hierarchy', async () => {
  const { canAccessArcaneOracle, getHeaderRoleButtonsVisibility, clampPortraitGallery } = await import('./dnd-math.ts');

  // Sabio Arcano access: false for clients/players/DMs, true for moderator/creator/admin
  assert.equal(canAccessArcaneOracle('client', 'player'), false);
  assert.equal(canAccessArcaneOracle('client', 'dm'), false);
  assert.equal(canAccessArcaneOracle(undefined, 'both'), false);
  assert.equal(canAccessArcaneOracle('moderator', 'both'), true);
  assert.equal(canAccessArcaneOracle('creator', 'dm'), true);
  assert.equal(canAccessArcaneOracle('admin', 'admin'), true);

  // Header Role Buttons
  const clientVis = getHeaderRoleButtonsVisibility('client', 'player');
  assert.equal(clientVis.showAdminPanel, false);
  assert.equal(clientVis.showCreatorPanel, false);
  assert.equal(clientVis.showModerationPanel, false);
  assert.equal(clientVis.showClientFeedbackOnly, true);

  const modVis = getHeaderRoleButtonsVisibility('moderator', 'moderator');
  assert.equal(modVis.showAdminPanel, false);
  assert.equal(modVis.showCreatorPanel, false);
  assert.equal(modVis.showModerationPanel, true);
  assert.equal(modVis.showClientFeedbackOnly, false);

  const creatorVis = getHeaderRoleButtonsVisibility('creator', 'creator');
  assert.equal(creatorVis.showAdminPanel, false);
  assert.equal(creatorVis.showCreatorPanel, true);
  assert.equal(creatorVis.showModerationPanel, true);
  assert.equal(creatorVis.showClientFeedbackOnly, false);

  const adminVis = getHeaderRoleButtonsVisibility('admin', 'admin');
  assert.equal(adminVis.showAdminPanel, true);
  assert.equal(adminVis.showCreatorPanel, true);
  assert.equal(adminVis.showModerationPanel, true);
  assert.equal(adminVis.showClientFeedbackOnly, false);

  // Portrait Gallery clamped to max 4 unique images
  const clamped = clampPortraitGallery(['img1', 'img2', 'img1', 'img3', 'img4', 'img5']);
  assert.deepEqual(clamped, ['img1', 'img2', 'img3', 'img4']);
});

test('evaluateRoomClosureResilience protects players from premature lobby kick during micro-disconnections', async () => {
  const { evaluateRoomClosureResilience } = await import('./offlineEventQueue.ts');

  // 1. Transient network error (status 0 / 502) never increments closed count and keeps player in table
  const netErr = evaluateRoomClosureResilience({
    httpStatus: 0,
    explicitlyClosedByDm: false,
    previousConsecutiveClosedCount: 0,
  });
  assert.equal(netErr.shouldKickToLobby, false);
  assert.equal(netErr.isReconnecting, true);

  // 2. Single 404 without explicit DM closure does NOT kick immediately (requires 3 consecutive checks)
  const first404 = evaluateRoomClosureResilience({
    httpStatus: 404,
    explicitlyClosedByDm: false,
    previousConsecutiveClosedCount: 0,
  });
  assert.equal(first404.shouldKickToLobby, false);
  assert.equal(first404.nextConsecutiveClosedCount, 1);

  const second404 = evaluateRoomClosureResilience({
    httpStatus: 404,
    explicitlyClosedByDm: false,
    previousConsecutiveClosedCount: 1,
  });
  assert.equal(second404.shouldKickToLobby, false);
  assert.equal(second404.nextConsecutiveClosedCount, 2);

  const third404 = evaluateRoomClosureResilience({
    httpStatus: 404,
    explicitlyClosedByDm: false,
    previousConsecutiveClosedCount: 2,
  });
  assert.equal(third404.shouldKickToLobby, true);
  assert.equal(third404.nextConsecutiveClosedCount, 3);

  // 3. Explicit DM closure (explicitlyClosedByDm: true) kicks immediately
  const dmClosed = evaluateRoomClosureResilience({
    httpStatus: 404,
    explicitlyClosedByDm: true,
    previousConsecutiveClosedCount: 0,
  });
  assert.equal(dmClosed.shouldKickToLobby, true);
});

test('deriveEquippedWeaponAttacks and deriveAllCharacterActions resolve per-attack and per-action custom imageUrl with item fallback', async () => {
  const { deriveAllCharacterActions, formatCompactRollDieBadge } = await import('./dnd-math.ts');

  const inventory = [
    {
      id: 'sword-1',
      name: 'Hoja Gemela',
      category: 'Arma',
      equipped: true,
      imageUrl: 'https://example.com/sword-default.png',
      weaponAttacks: [
        {
          id: 'atk-slash',
          name: 'Tajo Relámpago',
          description: 'Corte veloz',
          dice: '1d8',
          bonus: 1,
          damageType: 'Cortante',
          imageUrl: 'https://example.com/slash-attack.png',
        },
        {
          id: 'atk-thrust',
          name: 'Estocada Profunda',
          description: 'Usa la imagen base del arma si no tiene propia',
          dice: '1d8',
          bonus: 1,
          damageType: 'Perforante',
        },
      ],
      itemActions: [
        {
          id: 'act-parry',
          name: 'Postura Defensiva',
          actionType: 'Reacción' as const,
          description: '+2 CA contra un ataque',
          imageUrl: 'https://example.com/parry-action.png',
        },
        {
          id: 'act-glow',
          name: 'Luz de Guardia',
          actionType: 'Acción Adicional' as const,
          description: 'Emite luz en 20 pies',
        },
      ],
    },
  ];

  const mockChar: any = {
    id: 'c-1',
    name: 'Valerius',
    stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
    proficiencyBonus: 2,
    inventory,
    spells: [],
  };

  const actions = deriveAllCharacterActions(mockChar);
  const slash = actions.find((a) => a.actionName === 'Tajo Relámpago');
  const thrust = actions.find((a) => a.actionName === 'Estocada Profunda');
  const parry = actions.find((a) => a.actionName === 'Postura Defensiva');
  const glow = actions.find((a) => a.actionName === 'Luz de Guardia');

  assert.equal(slash?.imageUrl, 'https://example.com/slash-attack.png');
  assert.equal(thrust?.imageUrl, 'https://example.com/sword-default.png');
  assert.equal(parry?.imageUrl, 'https://example.com/parry-action.png');
  assert.equal(glow?.imageUrl, 'https://example.com/sword-default.png');

  // Verify formatCompactRollDieBadge
  const badge2d4 = formatCompactRollDieBadge({
    total: 6,
    formula: '2d4+1',
    diceType: 4,
  });
  assert.deepEqual(badge2d4, {
    displayValue: 6,
    diceLabel: '2d4',
    sides: 4,
    isCritSuccess: false,
    isCritFail: false,
  });

  const badgeD20 = formatCompactRollDieBadge({
    total: 24,
    formula: '1d20+4',
    isCritSuccess: true,
  });
  assert.deepEqual(badgeD20, {
    displayValue: 24,
    diceLabel: '1d20',
    sides: 20,
    isCritSuccess: true,
    isCritFail: false,
  });
});

test('resolveTarotCardAbilityScores returns total ability scores (e.g. 18 Fuerza for Valeros del Alba) for both Character5e and PartyMemberLive', async () => {
  const { resolveTarotCardAbilityScores } = await import('./dnd-math.ts');

  const valerosChar = {
    abilities: {
      str: { score: 18, baseScore: 16, extraScore: 0, itemScore: 2 },
      dex: { score: 12, baseScore: 12, extraScore: 0 },
      con: { score: 14, baseScore: 14, extraScore: 0 },
      int: { score: 10, baseScore: 10, extraScore: 0 },
      wis: { score: 13, baseScore: 12, extraScore: 1 },
      cha: { score: 10, baseScore: 10, extraScore: 0 },
    },
    inventory: [
      {
        id: 'inv-1',
        name: 'Armadura de Cuero Ligera',
        equipped: true,
        statModifiers: [{ id: 'm1', stat: 'dex', value: 1 }],
      },
    ],
  };

  const resolvedFromChar = resolveTarotCardAbilityScores(valerosChar, null);
  assert.equal(resolvedFromChar.str.totalScore, 18);
  assert.equal(resolvedFromChar.str.modifier, 4);
  assert.equal(resolvedFromChar.dex.totalScore, 13);
  assert.equal(resolvedFromChar.con.totalScore, 14);
  assert.equal(resolvedFromChar.int.totalScore, 10);
  assert.equal(resolvedFromChar.wis.totalScore, 13);
  assert.equal(resolvedFromChar.cha.totalScore, 10);

  const resolvedFromMember = resolveTarotCardAbilityScores(null, {
    abilities: { str: 18, dex: 13, con: 14, int: 10, wis: 13, cha: 10 },
  });
  assert.equal(resolvedFromMember.str.totalScore, 18);
  assert.equal(resolvedFromMember.dex.totalScore, 13);
});

test('normalizePlayerSheetItemCategory strictly locks item categories to Player Sheet categories (Arma, Armadura, Objeto Común) even if DM typed a custom category like "escamas de dragon"', async () => {
  const {
    PLAYER_SHEET_ITEM_CATEGORIES,
    normalizePlayerSheetItemCategory,
    classifyInventoryItemGroup,
    classifyInventoryItemKey,
  } = await import('./dnd-math.ts');

  assert.deepEqual(PLAYER_SHEET_ITEM_CATEGORIES, ['Arma', 'Armadura', 'Objeto Común']);

  // Even if itemGroup defaulted to 'weapon' when DM typed "escamas de dragon" in category, it normalizes to Objeto Común
  const dragonScales = normalizePlayerSheetItemCategory({
    name: 'Escamas Rojas Antiguas',
    category: 'escamas de dragon',
    itemGroup: 'weapon',
  });
  assert.deepEqual(dragonScales, {
    category: 'Objeto Común',
    itemGroup: 'common',
    mainGroup: 'Objetos comunes',
  });
  assert.equal(
    classifyInventoryItemGroup({
      name: 'Escamas Rojas Antiguas',
      category: 'escamas de dragon',
      itemGroup: 'weapon',
    }),
    'Objetos comunes'
  );
  assert.equal(
    classifyInventoryItemKey({
      name: 'Escamas Rojas Antiguas',
      category: 'escamas de dragon',
      itemGroup: 'weapon',
    }),
    'common'
  );

  // Standard Weapon & Armor categories normalize strictly to 'Arma' and 'Armadura'
  assert.deepEqual(normalizePlayerSheetItemCategory({ category: 'Arma (Espada)', itemGroup: 'weapon' }), {
    category: 'Arma',
    itemGroup: 'weapon',
    mainGroup: 'Armas',
  });
  assert.deepEqual(normalizePlayerSheetItemCategory({ category: 'Armadura (Pesada)', itemGroup: 'armor' }), {
    category: 'Armadura',
    itemGroup: 'armor',
    mainGroup: 'Armaduras',
  });
});

test('pickMostRecentRoll and pickMostRecentRollForRoller always return the newest dice roll by timestamp instead of getting stuck on an older localBoxRoll', async () => {
  const { pickMostRecentRoll, pickMostRecentRollForRoller } = await import('./dnd-math.ts');

  const oldBoxRoll = {
    id: 'roll-1',
    rollerName: 'Valeros del Alba',
    total: 14,
    timestamp: 1000,
  };
  const newerOtherRoll = {
    id: 'roll-2',
    rollerName: 'Lyra',
    total: 19,
    timestamp: 2000,
  };
  const newestSelfRollFromSheet = {
    id: 'roll-3',
    rollerName: 'Valeros del Alba',
    total: 22,
    timestamp: 3000,
  };

  // Even when oldBoxRoll is passed first, pickMostRecentRoll picks the roll with highest timestamp
  const latest = pickMostRecentRoll(oldBoxRoll, [oldBoxRoll, newerOtherRoll]);
  assert.equal(latest?.id, 'roll-2');
  assert.equal(latest?.total, 19);

  // And for a specific player's card, pickMostRecentRollForRoller picks their newest roll across rollFeed and localBoxRoll
  const valerosLatest = pickMostRecentRollForRoller({
    characterName: 'Valeros del Alba',
    playerName: 'Jugador',
    rollFeed: [oldBoxRoll, newerOtherRoll, newestSelfRollFromSheet],
    localBoxRoll: oldBoxRoll,
  });
  assert.equal(valerosLatest?.id, 'roll-3');
  assert.equal(valerosLatest?.total, 22);
});

test('resolveAuthoritativePlayerHp prevents HP oscillation when multiple players are online while respecting newer DM adjustments', async () => {
  const { resolveAuthoritativePlayerHp } = await import('./dnd-math.ts');

  // 1. Player mutates HP locally at t=5000 (to 18), while server poll still reports t=4000 (25 HP) and an old DM modification from t=2000:
  // Must keep local HP 18 and NOT bounce back to 25!
  const step1 = resolveAuthoritativePlayerHp({
    localCurrentHp: 18,
    localHpUpdatedAt: 5000,
    serverCurrentHp: 25,
    serverHpUpdatedAt: 4000,
    serverDmModifiedAt: 2000,
    lastSeenDmModifiedAt: 2000,
  });
  assert.equal(step1.currentHp, 18);
  assert.equal(step1.shouldApplyServerToLocal, false);

  // 2. DM adjusts player HP at t=6000 (to 12): dmModifiedAt (6000) > localHpUpdatedAt (5000) and > lastSeenDmModifiedAt (2000)
  // Must adopt 12 HP immediately and advance nextLastSeenDmModifiedAt to 6000
  const step2 = resolveAuthoritativePlayerHp({
    localCurrentHp: 18,
    localHpUpdatedAt: 5000,
    serverCurrentHp: 12,
    serverHpUpdatedAt: 6000,
    serverDmModifiedAt: 6000,
    lastSeenDmModifiedAt: 2000,
  });
  assert.equal(step2.currentHp, 12);
  assert.equal(step2.shouldApplyServerToLocal, true);
  assert.equal(step2.nextLastSeenDmModifiedAt, 6000);

  // 3. Player then heals themselves at t=7000 (to 20) right after DM adjustment at t=6000:
  // Even if server still reports 12 from t=6000, player's localHpUpdatedAt (7000) >= 6000 wins without bouncing!
  const step3 = resolveAuthoritativePlayerHp({
    localCurrentHp: 20,
    localHpUpdatedAt: 7000,
    serverCurrentHp: 12,
    serverHpUpdatedAt: 6000,
    serverDmModifiedAt: 6000,
    lastSeenDmModifiedAt: 6000,
  });
  assert.equal(step3.currentHp, 20);
  assert.equal(step3.shouldApplyServerToLocal, false);
});

test('deriveAllCharacterActions preserves descriptions on weapon attacks, custom character.attacks, and item actions', async () => {
  const { deriveAllCharacterActions } = await import('./dnd-math.ts');

  const actions = deriveAllCharacterActions({
    inventory: [
      {
        id: 'item-sword',
        name: 'Hoja Solar',
        category: 'Arma',
        equipped: true,
        weaponAttacks: [
          {
            id: 'wa-1',
            name: 'Tajo Radiante',
            description: 'Emite un destello solar que ilumina 30 pies y quema sombras.',
            dice: '1d8',
            bonus: 2,
            damageType: 'Radiante',
            attackType: 'melee',
          },
        ],
      },
      {
        id: 'item-amulet',
        name: 'Amuleto del Fénix',
        category: 'Objeto Común',
        equipped: true,
        itemActions: [
          {
            id: 'ia-1',
            name: 'Pulso Ígneo',
            description: 'Libera una onda de calor curativo alrededor del portador.',
            actionType: 'heal',
            dice: '2d4',
            bonus: 2,
          },
        ],
      },
    ],
    strScore: 16,
    dexScore: 14,
    profBonus: 2,
    attacks: [
      {
        id: 'custom-atk-1',
        name: 'Embate con Escudo',
        attackBonus: 5,
        damageDice: '1d4+3',
        damageType: 'Contundente',
        notes: 'Empuja al objetivo 5 pies si falla Fue CD 13.',
      },
    ],
  });

  assert.equal(actions.length, 3);
  const swordAction = actions.find((a) => a.actionName === 'Tajo Radiante');
  assert.equal(swordAction?.description, 'Emite un destello solar que ilumina 30 pies y quema sombras.');

  const amuletAction = actions.find((a) => a.actionName === 'Pulso Ígneo');
  assert.equal(amuletAction?.description, 'Libera una onda de calor curativo alrededor del portador.');

  const customAttackAction = actions.find((a) => a.actionName === 'Embate con Escudo');
  assert.equal(customAttackAction?.description, 'Empuja al objetivo 5 pies si falla Fue CD 13.');
});

test('Player Skin helpers support up to 24 portraits, geometric clip paths, edge fading, and Tarot Front/Back placement', async () => {
  const {
    resolveMaxPortraitGalleryCount,
    clampPortraitGallery,
    getGeometricClipPath,
    getEdgeFadeMaskCss,
    resolvePortraitAspectRatioCss,
    isTarotElementVisibleOnSide,
  } = await import('./dnd-math.ts');
  const {
    resolvePlayerSheetLayout,
    resolvePlayerMapLayout,
    resolveDeckCardTemplate,
    resolveTarotStudioConfig,
  } = await import('./playerSkinLayout.ts');

  // 1. Portrait count defaults to 4 and clamps between 1 and 24
  assert.equal(resolveMaxPortraitGalleryCount(undefined), 4);
  assert.equal(resolveMaxPortraitGalleryCount({ maxPortraitGalleryCount: 12 }), 12);
  assert.equal(resolveMaxPortraitGalleryCount(99), 24);

  const twentyPortraits = Array.from({ length: 20 }, (_, i) => `https://img.test/${i}.png`);
  assert.equal(clampPortraitGallery(twentyPortraits, 4).length, 4);
  assert.equal(clampPortraitGallery(twentyPortraits, 16).length, 16);

  // 2. Geometric shapes & Edge Fade
  assert.ok(getGeometricClipPath('hexagon')?.includes('polygon'));
  assert.ok(getGeometricClipPath('triangle')?.includes('polygon'));
  assert.equal(getGeometricClipPath('rounded'), undefined);
  assert.ok(getEdgeFadeMaskCss(40)?.includes('radial-gradient'));
  assert.equal(getEdgeFadeMaskCss(0), undefined);
  assert.equal(resolvePortraitAspectRatioCss('9:16'), '9 / 16');

  // 3. Tarot Front/Back visibility (both literal placement and element-key lookup)
  assert.equal(isTarotElementVisibleOnSide('front', 'front'), true);
  assert.equal(isTarotElementVisibleOnSide('front', 'back'), false);
  assert.equal(isTarotElementVisibleOnSide('both', 'front'), true);
  assert.equal(isTarotElementVisibleOnSide('both', 'back'), true);
  assert.equal(isTarotElementVisibleOnSide('hidden', 'front'), false);

  // 4. Layout & Tarot Studio resolvers
  const sheetLayout = resolvePlayerSheetLayout({});
  assert.equal(sheetLayout.blocksOrder.length, 9);
  assert.equal(sheetLayout.length, 9);
  assert.equal(sheetLayout.find((b) => b.id === 'identity_header')?.offsetX, 0);

  const mapLayout = resolvePlayerMapLayout({});
  assert.equal(mapLayout.blocksOrder.length, 8);
  assert.equal(mapLayout.length, 8);

  const combatTpl = resolveDeckCardTemplate({}, 'combat');
  assert.equal(combatTpl.deckKind, 'combat');
  assert.equal(combatTpl.borderColor, '#c8a45c');
  assert.equal(combatTpl.label, 'Combates y Acciones');

  const tarotCfg = resolveTarotStudioConfig({
    tarotStudioConfig: {
      hpPlacement: 'both',
      frontHpStyle: 'classic_bar',
      backHpStyle: 'alchemical_potion',
    } as any,
  });
  assert.equal(tarotCfg.hpPlacement, 'both');
  assert.equal(tarotCfg.frontHpStyle, 'classic_bar');
  assert.equal(tarotCfg.backHpStyle, 'alchemical_potion');
  assert.equal(isTarotElementVisibleOnSide('identity', 'front', tarotCfg.elementSides), true);
  assert.equal(isTarotElementVisibleOnSide('combatStats', 'front', tarotCfg.elementSides), true);
  assert.equal(isTarotElementVisibleOnSide('combatStats', 'back', tarotCfg.elementSides), false);
});


