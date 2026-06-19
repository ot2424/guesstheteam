import type { PrestigeVisual, ProgressionReward, Rank, UserInventory } from '../types';

export const XP_REWARDS: ProgressionReward[] = [
  { id: 'title-kreisliga-legende', level: 1, kind: 'user_title', name: 'Kreisliga-Legende', description: 'Starttitel für dein Profil.' },
  { id: 'frame-green-rookie', level: 3, kind: 'avatar_frame', name: 'Grüner Rahmen', description: 'Farbiger Avatar-Rahmen.' },
  { id: 'pack-shield-1', level: 5, kind: 'inventory_pack', name: 'Schild-Paket', description: 'Team-Skip-Schild x1.' },
  { id: 'banner-night-pitch', level: 10, kind: 'profile_banner', name: 'Nachtspiel-Banner', description: 'WM-Modus und Profilbanner freigeschaltet.' },
  { id: 'pack-shield-2', level: 15, kind: 'inventory_pack', name: 'Schild-Paket II', description: 'Team-Skip-Schild x2.' },
  { id: 'anthem-home-end', level: 20, kind: 'anthem', name: 'Heimkurve', description: 'Torhymne bei 100 Prozent gelösten Teams.' },
  { id: 'pack-joker-1', level: 25, kind: 'inventory_pack', name: 'Auto-Solve-Joker', description: 'Seltener Spieler-Auto-Solve-Joker x1.' },
  { id: 'title-transfermarkt-insider', level: 50, kind: 'user_title', name: 'Transfermarkt-Insider', description: 'Exklusiver Langzeit-Titel.' },
];

export function getUnlockedRewards(level: number) {
  return XP_REWARDS.filter((reward) => level >= reward.level);
}

export function getInventoryRewardDelta(fromLevel: number, toLevel: number): UserInventory {
  const earned = XP_REWARDS.filter((reward) => reward.level > fromLevel && reward.level <= toLevel);
  return earned.reduce<UserInventory>((inventory, reward) => {
    if (reward.id === 'pack-shield-1') inventory.skipShields += 1;
    if (reward.id === 'pack-shield-2') inventory.skipShields += 2;
    if (reward.id === 'pack-joker-1') inventory.autoSolveJokers += 1;
    return inventory;
  }, { skipShields: 0, autoSolveJokers: 0 });
}

export function getPrestigeVisual(rank: Rank): PrestigeVisual {
  if (rank.startsWith('Platinum')) return { emblem: 'platinum-storm', nameGlow: '#67d6c9' };
  if (rank.startsWith('Gold')) return { emblem: 'gold-winged', nameGlow: '#f5d142' };
  if (rank.startsWith('Silver')) return { emblem: 'silver', nameGlow: null };
  return { emblem: 'bronze', nameGlow: null };
}
