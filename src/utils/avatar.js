// src/utils/avatar.js

const STYLES = ['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'lorelei', 'notionists', 'open-peeps', 'personas'];

export function getAvatarUrl(seed, style = 'bottts') {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1f4cc,ffdfbf,ffd5dc`;
}

export function getRandomAvatarOptions(name) {
  return STYLES.map((style) => ({
    style,
    url: getAvatarUrl(name || 'default', style),
  }));
}
