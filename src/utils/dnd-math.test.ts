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

