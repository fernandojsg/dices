export const BUILT_IN_PRESETS = [
  {
    name: 'D&D Standard Set',
    dice: [
      { type: 'd4' },
      { type: 'd6' },
      { type: 'd8' },
      { type: 'd10' },
      { type: 'd12' },
      { type: 'd20' },
    ],
  },
  {
    name: 'D&D Attack',
    dice: [
      { type: 'd20' },
      { type: 'd8' },
    ],
  },
  {
    name: 'Yahtzee',
    dice: [
      { type: 'd6' },
      { type: 'd6' },
      { type: 'd6' },
      { type: 'd6' },
      { type: 'd6' },
    ],
  },
  {
    name: 'Monopoly',
    dice: [
      { type: 'd6' },
      { type: 'd6' },
    ],
  },
  {
    name: 'Risk Attacker',
    dice: [
      { type: 'd6' },
      { type: 'd6' },
      { type: 'd6' },
    ],
  },
  {
    name: 'Risk Defender',
    dice: [
      { type: 'd6' },
      { type: 'd6' },
    ],
  },
  {
    name: 'Catan',
    dice: [
      { type: 'd6' },
      { type: 'd6' },
    ],
  },
  {
    name: 'Single d20',
    dice: [
      { type: 'd20' },
    ],
  },
  {
    name: 'Percentile',
    dice: [
      { type: 'd10' },
      { type: 'd10' },
    ],
  },
];

export function describePreset(preset) {
  const counts = {};
  for (const d of preset.dice) {
    counts[d.type] = (counts[d.type] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([type, count]) => count > 1 ? `${count}${type}` : type)
    .join(' + ');
}
