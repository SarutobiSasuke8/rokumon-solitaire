import { SolitaireEngine } from './engine/SolitaireEngine';
import { SoundSynth } from './engine/SoundSynth';
import { SolitaireUI } from './ui/SolitaireUI';
import { CardBackStyle } from './gfx/CardRenderer';
import { music } from './music';
import { isSixSealsDeal } from './engine/SixSealsDeals';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('playfield-container') as HTMLElement;
  const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const fxCanvas = document.getElementById('fx-canvas') as HTMLCanvasElement;

  if (!container || !gameCanvas || !fxCanvas) return;

  const soundSynth = new SoundSynth();
  const engine = new SolitaireEngine(1); // Standard Draw 1
  const ui = new SolitaireUI(container, gameCanvas, fxCanvas, engine, soundSynth);

  // Bind Footer Action Buttons
  document.getElementById('btn-new-game')?.addEventListener('click', () => ui.newGame());
  document.getElementById('btn-loss-undo')?.addEventListener('click', () => ui.undo());
  document.getElementById('btn-loss-retry')?.addEventListener('click', () => ui.retryDeal());
  document.getElementById('btn-loss-new')?.addEventListener('click', () => ui.newGame());
  document.getElementById('btn-win-new-game')?.addEventListener('click', () => ui.newGame());
  document.getElementById('btn-undo')?.addEventListener('click', () => ui.undo());
  document.getElementById('btn-redo')?.addEventListener('click', () => ui.redo());
  document.getElementById('btn-hint')?.addEventListener('click', () => ui.showHint());
  document.getElementById('btn-auto-finish')?.addEventListener('click', () => ui.startAutoComplete());

  // Independent music controls, restored after player input.
  const btnMusic = document.getElementById('btn-music')!;
  const toggleMusicEffect = document.getElementById('toggle-music-effect') as HTMLInputElement;
  const volume = document.getElementById('music-volume') as HTMLInputElement;
  const track = document.getElementById('music-track')!;
  music.onChange = () => {
    btnMusic.classList.toggle('active', music.enabled);
    btnMusic.setAttribute('aria-pressed', String(music.enabled));
    btnMusic.setAttribute('aria-label', music.enabled ? 'Music on' : 'Music off');
    btnMusic.querySelector('.music-label')!.textContent = music.enabled ? 'Music on' : 'Music off';
    btnMusic.title = music.title + ' · ' + music.status;
    toggleMusicEffect.checked = music.enabled;
    volume.value = String(Math.round(music.volume * 100));
    track.textContent = music.title + ' · ' + (music.status === 'Ready' ? 'Starts when you play' : music.status);
  };
  btnMusic.addEventListener('click', () => soundSynth.toggleMusic());
  toggleMusicEffect.addEventListener('change', () => {
    if (toggleMusicEffect.checked) soundSynth.startMusic();
    else soundSynth.stopMusic();
  });
  document.getElementById('music-next')!.addEventListener('click', () => { music.next(); music.unlock(); });
  volume.addEventListener('input', () => music.setVolume(Number(volume.value) / 100));
  document.addEventListener('pointerdown', () => music.unlock());
  document.addEventListener('keydown', () => music.unlock());
  music.onChange();

  // Bind Sound Effects Toggle Button
  const btnSound = document.getElementById('btn-sound');
  const toggleSoundEffect = document.getElementById('toggle-sound-effect') as HTMLInputElement;

  btnSound?.addEventListener('click', () => {
    soundSynth.enabled = !soundSynth.enabled;
    if (btnSound) btnSound.innerHTML = soundSynth.enabled ? '<span class="icon">🔊</span>' : '<span class="icon">🔇</span>';
    if (toggleSoundEffect) toggleSoundEffect.checked = soundSynth.enabled;
  });

  toggleSoundEffect?.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    soundSynth.enabled = checked;
    if (btnSound) btnSound.innerHTML = checked ? '<span class="icon">🔊</span>' : '<span class="icon">🔇</span>';
  });

  // Help Modal Handlers
  const helpModal = document.getElementById('help-modal');
  const helpButton = document.getElementById('btn-help');
  const closeHelpButton = document.getElementById('close-help');
  helpButton?.addEventListener('click', () => {
    helpModal?.classList.remove('hidden');
    closeHelpButton?.focus();
  });
  const closeHelp = () => {
    helpModal?.classList.add('hidden');
    helpButton?.focus();
  };
  closeHelpButton?.addEventListener('click', closeHelp);
  helpModal?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeHelp();
    if (event.key === 'Tab') event.preventDefault();
  });

  // Settings Modal Handlers
  const settingsModal = document.getElementById('settings-modal');
  document.getElementById('btn-settings')?.addEventListener('click', () => settingsModal?.classList.remove('hidden'));
  document.getElementById('close-settings')?.addEventListener('click', () => settingsModal?.classList.add('hidden'));

  // Stats Modal Handlers
  const statsModal = document.getElementById('stats-modal');
  document.getElementById('btn-stats')?.addEventListener('click', () => {
    ui.updateStatsModalUI();
    statsModal?.classList.remove('hidden');
  });
  document.getElementById('close-stats')?.addEventListener('click', () => statsModal?.classList.add('hidden'));
  document.getElementById('btn-reset-stats')?.addEventListener('click', () => ui.resetStats());

  const selectMode = document.querySelector<HTMLSelectElement>('#select-mode')!;
  const selectDeal = document.querySelector<HTMLSelectElement>('#select-six-deal')!;
  const selectDrawMode = document.querySelector<HTMLSelectElement>('#select-draw-mode')!;

  function changeMode() {
    const sixSeals = selectMode.value === 'six-seals';
    document.getElementById('six-seals-controls')?.classList.toggle('hidden', !sixSeals);
    document.getElementById('six-seals-help')?.classList.toggle('hidden', !sixSeals);
    selectDrawMode.disabled = sixSeals;
    if (sixSeals && isSixSealsDeal(selectDeal.value)) {
      ui.newSixSealsDeal(selectDeal.value);
    } else {
      ui.newGame(selectDrawMode.value === '3' ? 3 : 1);
    }
  }

  selectMode.addEventListener('change', changeMode);
  selectDeal.addEventListener('change', changeMode);
  selectDrawMode.addEventListener('change', changeMode);

  // Theme Selector Handler
  const selectTheme = document.getElementById('select-theme') as HTMLSelectElement;
  selectTheme?.addEventListener('change', (e) => {
    const theme = (e.target as HTMLSelectElement).value;
    document.body.setAttribute('data-theme', theme);
  });

  // Card Back Selector Handler
  const selectCardBack = document.getElementById('select-card-back') as HTMLSelectElement;
  selectCardBack?.addEventListener('change', (e) => {
    const backStyle = (e.target as HTMLSelectElement).value as CardBackStyle;
    ui.setCardBackStyle(backStyle);
  });
});
