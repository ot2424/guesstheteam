// Transfermarkt IDs for the legacy tutorial clubs whose Wikimedia links can be stale.
const clubIds: Record<string, string> = {
  genk: '1184', atletico: '13', chelsea: '631', 'chelsea-youth': '631',
  'real-madrid': '418', 'real-madrid-b': '418', leverkusen: '15', 'bayer-04': '15',
  'sao-paulo': '585', porto: '720', 'man-city': '281', hoffenheim: '533', bayern: '27',
  'le-havre': '738', lyon: '1041', zrinjski: '970', 'dinamo-zagreb': '419',
  tottenham: '148', rennes: '273', penarol: '861', 'celta-vigo': '940',
  'al-ittihad': '8023', flamengo: '614', liverpool: '31', arsenal: '11',
  barcelona: '131', dortmund: '16', stuttgart: '79', roma: '12', hamburg: '41',
  duesseldorf: '38', hertha: '44', nuernberg: '4', 'koeln-youth': '3', schalke: '33',
};

export function getClubLogoSources(logoUrl?: string, clubId?: string): string[] {
  const id = clubId && (/^\d+$/.test(clubId) ? clubId : clubIds[clubId]);
  const fallback = id ? `https://tmssl.akamaized.net/images/wappen/big/${id}.png` : undefined;
  const sources = logoUrl?.includes('upload.wikimedia.org') ? [fallback, logoUrl] : [logoUrl, fallback];
  return [...new Set(sources.filter((source): source is string => Boolean(source)))];
}
