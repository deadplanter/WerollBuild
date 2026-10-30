import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PLAYER_SHEET_BLOCK_IDS,
  ALL_PLAYER_MAP_BLOCK_IDS,
  ALL_9_ALIGNMENTS_5E,
  SAMPLE_ROOM_PLAYERS_5E,
  createDefaultPlayerSheetLayout,
  resolvePlayerSheetLayout,
  updatePlayerSheetBlock,
  movePlayerSheetBlockOrder,
  createDefaultPlayerMapLayout,
  resolvePlayerMapLayout,
  updatePlayerMapBlock,
  resolveDeckCardTemplate,
  resolveStatBoxGraphicConfig,
  resolveTarotStudioConfig,
  updateTarotModule,
  duplicateTarotModule,
  addCustomTarotModule,
  removeTarotModule,
  resolveModalPopupConfig,
  updateSpatialBlockInnerButton,
  moveSpatialBlockInnerButtonOrder,
  getGeometricClipPath,
  getGeometricPolygonPoints,
  getEdgeFadeMaskCss,
  getAspectRatioCssValue,
  buildSpatialBlockInlineStyle,
  buildGeometricElementStyle,
} from './playerSkinLayout';

describe('playerSkinLayout pure logic tests', () => {
  it('creates default player sheet layout with all 9 spatial blocks including live table bars and tarot dock', () => {
    const layout = createDefaultPlayerSheetLayout();
    assert.equal(layout.blocksOrder.length, 9);
    assert.deepEqual(layout.blocksOrder, [...ALL_PLAYER_SHEET_BLOCK_IDS]);
    assert.ok(layout.blocks.session_top_bar);
    assert.ok(layout.blocks.live_table_combatants_bar);
    assert.ok(layout.blocks.sheet_tarot_dock);
    for (const id of ALL_PLAYER_SHEET_BLOCK_IDS) {
      assert.ok(layout.blocks[id], `Block ${id} should exist`);
      assert.equal(layout.blocks[id].visible, true);
      assert.equal(layout.blocks[id].hidden, false);
      assert.ok(Array.isArray(layout.blocks[id].innerButtonsOrder));
      assert.ok(layout.blocks[id].innerButtonsOrder!.length > 0);
    }
    assert.equal(Array.isArray(layout), true);
  });

  it('updates and reorders player sheet spatial blocks and inner elements cleanly', () => {
    const initial = createDefaultPlayerSheetLayout();
    const updated = updatePlayerSheetBlock(initial, 'combat_stats_bar', {
      x: 42,
      y: -18,
      scale: 1.25,
      opacity: 0.8,
      hideBorder: true,
    });
    assert.equal(updated.blocks.combat_stats_bar.x, 42);
    assert.equal(updated.blocks.combat_stats_bar.offsetX, 42);
    assert.equal(updated.blocks.combat_stats_bar.y, -18);
    assert.equal(updated.blocks.combat_stats_bar.offsetY, -18);
    assert.equal(updated.blocks.combat_stats_bar.scale, 1.25);
    assert.equal(updated.blocks.combat_stats_bar.opacity, 0.8);
    assert.equal(updated.blocks.combat_stats_bar.hideBorder, true);

    const updatedBtnBlock = updateSpatialBlockInnerButton(
      updated.blocks.combat_stats_bar,
      'box_ac',
      { x: 15, y: 8, shape: 'hexagon', label: 'DEF' }
    );
    assert.equal(updatedBtnBlock.innerButtonsConfig?.box_ac.x, 15);
    assert.equal(updatedBtnBlock.innerButtonsConfig?.box_ac.shape, 'hexagon');
    assert.equal(updatedBtnBlock.innerButtonsConfig?.box_ac.label, 'DEF');

    const reorderedBtnBlock = moveSpatialBlockInnerButtonOrder(updatedBtnBlock, 'box_init', 'up');
    assert.equal(reorderedBtnBlock.innerButtonsOrder?.[0], 'box_init');

    const reordered = movePlayerSheetBlockOrder(updated, 'combat_stats_bar', 'up');
    assert.equal(reordered.blocksOrder[2], 'combat_stats_bar');
    assert.equal(reordered.blocksOrder[3], 'identity_header');
  });

  it('creates and updates default player map layout with all 8 blocks and inner buttons', () => {
    const mapLayout = createDefaultPlayerMapLayout();
    assert.equal(mapLayout.blocksOrder.length, 8);
    assert.deepEqual(mapLayout.blocksOrder, [...ALL_PLAYER_MAP_BLOCK_IDS]);

    const updated = updatePlayerMapBlock(mapLayout, 'map_canvas_area', {
      x: 15,
      y: 25,
      scale: 1.15,
      boxBgOpacity: 0.75,
    });
    const resolved = resolvePlayerMapLayout({ playerMapLayout: updated });
    assert.equal(resolved.blocks.map_canvas_area.x, 15);
    assert.equal(resolved.blocks.map_canvas_area.y, 25);
    assert.equal(resolved.blocks.map_canvas_area.scale, 1.15);
    assert.equal(resolved.blocks.map_canvas_area.boxBgOpacity, 0.75);
    assert.ok(resolved.blocks.map_dice_box_panel.innerButtonsConfig?.die_d20);
  });

  it('resolves deck card templates, stat box graphics, popups, and modular tarot studio config', () => {
    const combatTpl = resolveDeckCardTemplate(
      {
        combatCardTemplate: {
          deckKind: 'combat',
          cardShape: 'hexagon',
          edgeFadePercent: 35,
          illustrationShape: 'diamond',
          hideBorder: true,
        } as any,
      },
      'combat'
    );
    assert.equal(combatTpl.cardShape, 'hexagon');
    assert.equal(combatTpl.edgeFadePercent, 35);
    assert.equal(combatTpl.illustrationShape, 'diamond');
    assert.equal(combatTpl.hideBorder, true);
    assert.ok(combatTpl.innerButtonsConfig?.card_header_title);

    const statCfg = resolveStatBoxGraphicConfig({
      statBoxGraphicConfig: {
        shape: 'octagon',
        edgeFadePercent: 20,
        hideBorder: true,
      } as any,
    });
    assert.equal(statCfg.shape, 'octagon');
    assert.equal(statCfg.edgeFadePercent, 20);
    assert.equal(statCfg.hideBorder, true);
    assert.ok(statCfg.innerButtonsConfig?.part_label);
    assert.ok(statCfg.innerButtonsConfig?.part_total);

    const friendChatPopup = resolveModalPopupConfig({}, 'modal_friend_chat');
    assert.ok(friendChatPopup.innerElementsConfig?.chat_header);
    assert.ok(friendChatPopup.innerElementsConfig?.msg_received_1);
    assert.ok(friendChatPopup.innerElementsConfig?.msg_sent_1);
    assert.ok(friendChatPopup.innerElementsConfig?.chat_send_btn);

    const invPopup = resolveModalPopupConfig({}, 'modal_inventory');
    assert.ok(invPopup.innerElementsConfig?.tab_weapons);
    assert.ok(invPopup.innerElementsConfig?.tab_armors);
    assert.ok(invPopup.innerElementsConfig?.tab_objects);
    assert.ok(invPopup.innerElementsConfig?.tab_spells);
    assert.ok(invPopup.innerElementsConfig?.btn_add_item);

    const tarotCfg = resolveTarotStudioConfig({});
    assert.equal(tarotCfg.outerBleedPercent, 20);
    assert.equal(tarotCfg.tokenShape, 'circle');
    assert.equal(tarotCfg.tokenSquareSizePx, 180);
    assert.ok(Array.isArray(tarotCfg.modules));
    assert.ok(tarotCfg.modules!.length >= 21);
    // Default tactical token starts with only the circular character portrait
    const defaultTokenMods = tarotCfg.modules!.filter((m) => m.side === 'token');
    assert.equal(defaultTokenMods.length, 1);
    assert.equal(defaultTokenMods[0].id, 'mod_token_portrait');
    assert.equal(defaultTokenMods[0].shape, 'circle');

    // Test duplicating an HP bar module onto the back of the card
    const { config: withDupHp, createdModuleId } = duplicateTarotModule(
      tarotCfg,
      'mod_hp_bar',
      'back'
    );
    const dupMod = withDupHp.modules!.find((m) => m.id === createdModuleId);
    assert.ok(dupMod);
    assert.equal(dupMod!.kind, 'hp_bar');
    assert.equal(dupMod!.side, 'back');

    // Test copying HP bar and Gold modules from Tarot Card onto the Ficha de Jugador ('token')
    const { config: withTokenHp, createdModuleId: tokenHpId } = duplicateTarotModule(
      withDupHp,
      'mod_hp_bar',
      'token'
    );
    const tokenHpMod = withTokenHp.modules!.find((m) => m.id === tokenHpId);
    assert.ok(tokenHpMod);
    assert.equal(tokenHpMod!.side, 'token');
    assert.equal(tokenHpMod!.kind, 'hp_bar');

    // Test updating a module's coordinates and clearing its label
    const movedCfg = updateTarotModule(withTokenHp, 'mod_ability_str', {
      x: -18,
      y: 310,
      label: '',
      shape: 'diamond',
    });
    const strMod = movedCfg.modules!.find((m) => m.id === 'mod_ability_str');
    assert.equal(strMod?.x, -18);
    assert.equal(strMod?.label, '');
    assert.equal(strMod?.shape, 'diamond');

    // Test adding and removing a custom layer module
    const { config: withCustom, createdModuleId: customId } = addCustomTarotModule(
      movedCfg,
      'front',
      'custom_layer'
    );
    assert.ok(withCustom.modules!.some((m) => m.id === customId));
    const afterRemove = removeTarotModule(withCustom, customId);
    assert.equal(afterRemove.modules!.some((m) => m.id === customId), false);
  });

  it('computes geometric clip paths, unbroken SVG polygon points, edge fade masks, and inline styles', () => {
    assert.ok(getGeometricClipPath('hexagon')?.includes('polygon('));
    assert.ok(getGeometricClipPath('diamond')?.includes('polygon('));
    assert.equal(getGeometricClipPath('rounded'), undefined);

    assert.ok(getGeometricPolygonPoints('triangle')?.includes(','));
    assert.ok(getGeometricPolygonPoints('diamond')?.includes(','));
    assert.ok(getGeometricPolygonPoints('pentagon')?.includes(','));
    assert.ok(getGeometricPolygonPoints('hexagon')?.includes(','));
    assert.ok(getGeometricPolygonPoints('octagon')?.includes(','));
    assert.equal(getGeometricPolygonPoints('rounded'), undefined);

    assert.ok(getEdgeFadeMaskCss(40)?.includes('radial-gradient('));
    assert.equal(getEdgeFadeMaskCss(0), undefined);

    assert.equal(getAspectRatioCssValue('3:4'), '3 / 4');
    assert.equal(getAspectRatioCssValue('custom', 2, 3), '2 / 3');

    const geoStyle = buildGeometricElementStyle({
      shape: 'hexagon',
      edgeFadePercent: 30,
      hideBorder: false,
      borderColor: '#c8a45c',
      borderWidthPx: 2,
    });
    assert.ok(geoStyle.clipPath?.includes('polygon('));
    assert.ok(String(geoStyle.maskImage).includes('radial-gradient('));
    // Polygonal shapes suppress CSS rectangular border so GeometricSvgBorder renders unbroken SVG polygon border
    assert.equal(geoStyle.borderColor, 'transparent');
    assert.equal(geoStyle.borderWidth, 0);

    const layout = createDefaultPlayerSheetLayout();
    const moved = updatePlayerSheetBlock(layout, 'identity_header', { x: 20, y: 10, scale: 1.1 });
    const withTransform = buildSpatialBlockInlineStyle(moved.blocks.identity_header, false);
    const withoutTransform = buildSpatialBlockInlineStyle(moved.blocks.identity_header, true);
    assert.ok(String(withTransform.transform).includes('translate(20px, 10px)'));
    assert.equal(withoutTransform.transform, undefined);

    assert.equal(ALL_9_ALIGNMENTS_5E.length, 9);
  });

  it('provides 8 diverse 5e sample room players with stats, hp, ac, and roles for live preview', () => {
    assert.equal(SAMPLE_ROOM_PLAYERS_5E.length, 8);
    for (let count = 1; count <= 8; count++) {
      const slice = SAMPLE_ROOM_PLAYERS_5E.slice(0, count);
      assert.equal(slice.length, count);
    }
    const valeros = SAMPLE_ROOM_PLAYERS_5E[0];
    assert.equal(valeros.name, 'Valeros del Alba');
    assert.equal(valeros.hp, 44);
    assert.equal(valeros.maxHp, 44);
    assert.equal(valeros.ac, 18);
    assert.equal(valeros.stats.str, 18);
    for (const p of SAMPLE_ROOM_PLAYERS_5E) {
      assert.ok(p.id.length > 0);
      assert.ok(p.name.length > 0);
      assert.ok(p.role.length > 0);
      assert.ok(p.hp > 0);
      assert.ok(p.maxHp >= p.hp);
      assert.ok(p.ac >= 10);
      assert.ok(p.stats.str >= 8);
    }
  });
});
