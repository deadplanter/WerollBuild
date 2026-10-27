import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyColorWithOpacity,
  computeLobbyBlockContainerStyle,
  computeLobbyInnerButtonStyle,
  createDefaultLobbyPageLayout,
  moveLobbyBlockOrder,
  moveLobbyInnerButtonOrder,
  resetLobbyBlockToDefault,
  resolveLobbyPageLayout,
  updateLobbyBlock,
  updateLobbyInnerButton,
} from './lobbyPageLayout';

describe('lobbyPageLayout engine', () => {
  it('applyColorWithOpacity converts hex to rgba and returns transparent at 0', () => {
    assert.equal(applyColorWithOpacity('#16110d', 0), 'transparent');
    assert.equal(applyColorWithOpacity('#ff0000', 0.5), 'rgba(255, 0, 0, 0.5)');
    assert.equal(applyColorWithOpacity('rgba(10, 20, 30, 0.8)', 0.5), 'rgba(10, 20, 30, 0.4)');
  });

  it('resolveLobbyPageLayout returns all 7 real Lobby blocks with defaults and preserves overrides', () => {
    const resolved = resolveLobbyPageLayout({
      friendsBoxCustomPngUrl: 'https://example.com/friends-frame.png',
      lobbyPageLayout: {
        version: 1,
        canvasWidthPx: 1280,
        blocksOrder: ['top_header', 'welcome_banner', 'admin_greeting'],
        blocks: {
          friends_box: {
            x: 120,
            y: -45,
            widthPx: 460,
            heightPx: 520,
            boxBgOpacity: 0,
          } as any,
        } as any,
      },
    });

    assert.equal(resolved.blocksOrder.length, 7);
    assert.equal(resolved.blocks.friends_box.x, 120);
    assert.equal(resolved.blocks.friends_box.y, -45);
    assert.equal(resolved.blocks.friends_box.widthPx, 460);
    assert.equal(resolved.blocks.friends_box.heightPx, 520);
    assert.equal(resolved.blocks.friends_box.boxBgOpacity, 0);
    assert.equal(resolved.blocks.friends_box.bgImageUrl, 'https://example.com/friends-frame.png');
  });

  it('computeLobbyBlockContainerStyle applies pixel translation, pixel dimensions, and transparent box frame when boxBgOpacity=0', () => {
    let layout = createDefaultLobbyPageLayout();
    layout = updateLobbyBlock(layout, 'friends_box', {
      x: 85,
      y: 30,
      widthPx: 420,
      heightPx: 380,
      boxBgOpacity: 0,
      opacity: 1,
    });

    const style = computeLobbyBlockContainerStyle(layout.blocks.friends_box);
    assert.equal(style.transform, 'translate(85px, 30px)');
    assert.equal(style.width, '420px');
    assert.equal(style.minHeight, '380px');
    assert.equal(style.backgroundColor, 'transparent');
    assert.equal(style.borderColor, 'transparent');
    assert.equal(style.opacity, 1);
  });

  it('updateLobbyInnerButton & moveLobbyInnerButtonOrder customize and reorder buttons inside any block', () => {
    let layout = createDefaultLobbyPageLayout();
    const initialOrder = [...layout.blocks.welcome_banner.innerButtonsOrder];
    assert.equal(initialOrder[0], 'security');
    assert.equal(initialOrder[1], 'admin_panel');

    layout = moveLobbyInnerButtonOrder(layout, 'welcome_banner', 'admin_panel', 'left');
    assert.equal(layout.blocks.welcome_banner.innerButtonsOrder[0], 'admin_panel');
    assert.equal(layout.blocks.welcome_banner.innerButtonsOrder[1], 'security');

    layout = updateLobbyInnerButton(layout, 'welcome_banner', 'security', {
      x: 15,
      y: -8,
      widthPx: 140,
      heightPx: 42,
      iconSizePx: 20,
      bgOpacity: 0,
    });

    const btnStyle = computeLobbyInnerButtonStyle(
      layout.blocks.welcome_banner.innerButtonsConfig.security
    );
    assert.equal(btnStyle.transform, 'translate(15px, -8px)');
    assert.equal(btnStyle.width, '140px');
    assert.equal(btnStyle.height, '42px');
    assert.equal(btnStyle.backgroundColor, 'transparent');
  });

  it('moveLobbyBlockOrder and resetLobbyBlockToDefault work cleanly', () => {
    let layout = createDefaultLobbyPageLayout();
    layout = moveLobbyBlockOrder(layout, 'welcome_banner', 'up');
    assert.equal(layout.blocksOrder[1], 'welcome_banner');
    assert.equal(layout.blocksOrder[2], 'admin_greeting');

    layout = updateLobbyBlock(layout, 'welcome_banner', { x: 250, widthPx: 900 });
    assert.equal(layout.blocks.welcome_banner.x, 250);
    layout = resetLobbyBlockToDefault(layout, 'welcome_banner');
    assert.equal(layout.blocks.welcome_banner.x, 0);
    assert.equal(layout.blocks.welcome_banner.widthPx, 0);
  });
});
