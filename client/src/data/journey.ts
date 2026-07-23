export interface JourneyStop {
  id: string;
  worldLabel: string;   // 'WORLD 1-1'
  statusLabel: string;  // '★★★ CLEARED' or blinking '▶ NOW PLAYING'
  current: boolean;
  title: string;
  body: string;
}

export const JOURNEY_STOPS: JourneyStop[] = [
  { id: 'journey-ph', worldLabel: 'WORLD 1-1', statusLabel: '★★★ CLEARED', current: false, title: 'Roots · Philippines', body: 'Born and raised in the Philippines — where curiosity about how games worked turned into curiosity about how everything worked.' },
  { id: 'journey-ca', worldLabel: 'WORLD 2-1', statusLabel: '★★★ CLEARED', current: false, title: 'The Move · California', body: 'Immigrated to the Bay Area — new country, new everything. Started over at De Anza College and made it count: 3.74 GPA, club president, two game jams directed.' },
  { id: 'journey-uci', worldLabel: 'WORLD 3-1', statusLabel: '▶ NOW PLAYING', current: true, title: 'Now · CS @ UCI', body: 'Studying CS at UC Irvine while shipping real systems — an internship at Unimode AI and an AI/ML externship with Pfizer.' },
];
