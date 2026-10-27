/**
 * Procedural Web Audio API sound synthesis for D&D dice rolls, skin profiles, and DM soundboard.
 * 100% offline, zero external sound files required.
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  // Rolling dice click/tumble sound with optional skin profile
  public playDiceTumble(
    profile: 'wood_classic' | 'crystal_arcane' | 'tablet_digital' | 'clockwork_gears' | 'runic_stone' = 'wood_classic'
  ) {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const clicks = 5;

    for (let i = 0; i < clicks; i++) {
      const timeOffset = now + i * 0.065 + Math.random() * 0.025;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (profile === 'tablet_digital') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(520 + i * 110, timeOffset);
        osc.frequency.exponentialRampToValueAtTime(880, timeOffset + 0.04);
        gain.gain.setValueAtTime(0.14, timeOffset);
      } else if (profile === 'crystal_arcane') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900 + Math.random() * 400, timeOffset);
        osc.frequency.exponentialRampToValueAtTime(600, timeOffset + 0.05);
        gain.gain.setValueAtTime(0.18, timeOffset);
      } else if (profile === 'clockwork_gears') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240 + (i % 2) * 80, timeOffset);
        osc.frequency.exponentialRampToValueAtTime(90, timeOffset + 0.035);
        gain.gain.setValueAtTime(0.2, timeOffset);
      } else if (profile === 'runic_stone') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110 + Math.random() * 60, timeOffset);
        osc.frequency.exponentialRampToValueAtTime(45, timeOffset + 0.055);
        gain.gain.setValueAtTime(0.28, timeOffset);
      } else {
        // wood_classic
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180 + Math.random() * 120, timeOffset);
        osc.frequency.exponentialRampToValueAtTime(80, timeOffset + 0.04);
        gain.gain.setValueAtTime(0.25, timeOffset);
      }

      gain.gain.exponentialRampToValueAtTime(0.001, timeOffset + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(timeOffset);
      osc.stop(timeOffset + 0.055);
    }
  }

  // Alias for rolling dice
  public playDiceRoll(
    isCritical?: boolean,
    profile?: 'wood_classic' | 'crystal_arcane' | 'tablet_digital' | 'clockwork_gears' | 'runic_stone'
  ) {
    if (isCritical) {
      this.playCriticalHit();
    } else {
      this.playDiceTumble(profile || 'wood_classic');
    }
  }

  // Chime alert for combat turn notification
  public playTurnAlert() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Sound effect when damage is taken (supports skin profile)
  public playDamageHit(
    profile: 'sword_slash' | 'cyber_glitch' | 'gear_grind' | 'crimson_pulse' = 'sword_slash'
  ) {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (profile === 'cyber_glitch') {
      [340, 120, 680, 95].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.035);
        gain.gain.setValueAtTime(0.16, now + idx * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.035);
        osc.stop(now + idx * 0.035 + 0.045);
      });
      return;
    }

    if (profile === 'gear_grind') {
      [180, 140, 110].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.22, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.07);
      });
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = profile === 'crimson_pulse' ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(profile === 'crimson_pulse' ? 130 : 220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Sound effect when healed (supports skin profile)
  public playHealChime(
    profile: 'holy_chime' | 'arcane_recharge' | 'alchemical_potion' = 'holy_chime'
  ) {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs =
      profile === 'arcane_recharge'
        ? [330, 440, 659.25, 880]
        : profile === 'alchemical_potion'
        ? [400, 500, 600]
        : [523.25, 659.25, 783.99];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = profile === 'arcane_recharge' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.075);
      gain.gain.setValueAtTime(0.15, now + idx * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.075 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.075);
      osc.stop(now + idx * 0.075 + 0.35);
    });
  }

  // Inventory / Backpack Open Sound
  public playInventoryOpen(
    profile: 'leather_bag' | 'metal_chest' | 'holo_screen' = 'leather_bag'
  ) {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (profile === 'holo_screen') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
    } else if (profile === 'metal_chest') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.14);
      gain.gain.setValueAtTime(0.2, now);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
    }

    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Tarot Card 3D Flip Sound
  public playCardFlip(
    profile: 'parchment_whisper' | 'heavy_tome' | 'mystic_hum' = 'parchment_whisper'
  ) {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (profile === 'mystic_hum') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, now);
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.18);
      gain.gain.setValueAtTime(0.15, now);
    } else if (profile === 'heavy_tome') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.16);
      gain.gain.setValueAtTime(0.22, now);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.1);
      gain.gain.setValueAtTime(0.14, now);
    }

    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // DM Soundboard Effects (independent from skins)
  public playDmSoundboardEffect(
    effectId: 'dragon_roar' | 'wolf_howl' | 'dungeon_gate' | 'thunder_strike' | 'war_horn' | 'sword_clash'
  ) {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (effectId === 'dragon_roar') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.55);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (effectId === 'war_horn') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(146.83, now);
      osc.frequency.setValueAtTime(220, now + 0.15);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (effectId === 'thunder_strike') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.45);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  // Triumphant chord for Natural 20 (Critical Success)
  public playCriticalHit() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major fanfarria

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.2, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.6);
    });
  }

  // Low thud for Natural 1 (Critical Fumble)
  public playCriticalFumble() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Gentle coin/item click
  public playClick() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const soundFx = new SoundEffectsManager();
export const soundManager = soundFx;

