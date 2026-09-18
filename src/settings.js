export const gameModes = {
  easy: { label: 'Лёгкая', speed: 13, gap: .625, obstacleChance: .20 },
  normal: { label: 'Обычная', speed: 16.4, gap: .225, obstacleChance: .33 },
  hard: { label: 'Сложная', speed: 23, gap: .06, obstacleChance: .45 },
};
export function normalizeSettings(value = {}) {
  return {
    muted: value?.muted === true,
    music: value?.music !== false,
    autoMusic: value?.autoMusic === true,
    transcription: value?.transcription !== false,
    track: ['main', 'folk', 'morning', 'evening', 'silkroad'].includes(value?.track) ? value.track : 'main',
    location: value?.location === 'park' ? 'park' : 'museum',
    mode: Object.hasOwn(gameModes, value?.mode) ? value.mode : 'normal',
  };
}
export function collectsWord(horizontalDistance, jumpHeight) {
  return Math.abs(horizontalDistance) < 1.05 && jumpHeight < .8;
}
export function formatElapsed(seconds) {
  const total=Math.max(0,Math.floor(seconds));
  return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}
