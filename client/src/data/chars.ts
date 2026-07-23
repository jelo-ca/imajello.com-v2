export interface CharStat { name: string; mod: string; w: string; }
export interface Char { src: string; name: string; cls: string; stats: CharStat[]; }

export const CHARS: Char[] = [
  { src: '/sprites/professional.png', name: 'THE ENGINEER', cls: 'CLASS: WIZARD', stats: [
    { name: 'PYTHON', mod: '+4', w: '88%' },
    { name: 'ESTIMATING DEADLINES', mod: '-2', w: '20%' },
    { name: 'RAG / LLAMAINDEX', mod: '+3', w: '74%' },
    { name: 'JS / REACT', mod: '+3', w: '78%' } ] },
  { src: '/sprites/muaythai.png', name: 'MUAY THAI', cls: 'CLASS: FIGHTER', stats: [
    { name: 'GRAPPLING', mod: '-3', w: '18%' },
    { name: 'DISCIPLINE', mod: '+4', w: '90%' },
    { name: 'CLINCH', mod: '+2', w: '66%' },
    { name: 'TEEP', mod: '+3', w: '74%' } ] },
  { src: '/sprites/musician.png', name: 'MUSICIAN', cls: 'CLASS: BARD', stats: [
    { name: 'COMPOSING', mod: '-2', w: '24%' },
    { name: 'RHYTHM', mod: '+4', w: '84%' },
    { name: 'EAR TRAINING', mod: '+2', w: '66%' },
    { name: 'IMPROVISATION', mod: '+3', w: '74%' } ] },
  { src: '/sprites/gaming.png', name: 'GAMER', cls: 'CLASS: ROGUE', stats: [
    { name: 'FPS GAMES', mod: '-3', w: '20%' },
    { name: 'STRATEGY', mod: '+3', w: '80%' },
    { name: 'REFLEXES', mod: '+4', w: '86%' },
    { name: 'GRINDING', mod: '+3', w: '76%' } ] },
  { src: '/sprites/travel.png', name: 'THE TRAVELER', cls: 'CLASS: RANGER', stats: [
    { name: 'GETTING LOST', mod: '+3', w: '80%' },
    { name: 'PACKING LIGHT', mod: '-2', w: '22%' },
    { name: 'NEW CUISINE', mod: '+4', w: '88%' },
    { name: 'DIRECTIONS', mod: '-1', w: '30%' } ] },
];
