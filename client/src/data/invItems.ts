export interface InvPhoto { id: string; placeholder: string; }
export interface InvItem { key: string; icon: string; tag: string; label: string; desc: string; photos: InvPhoto[]; }

export const INV_ITEMS: InvItem[] = [
  { key: 'music', icon: '🎸', tag: 'LUTE', label: 'Lute', desc: 'Guitar started as a way to unwind between problem sets and turned into writing and recording my own stuff — mostly lo-fi, mostly late at night.', photos: [
    { id: 'gal-music-1', placeholder: 'photo: playing guitar' },
    { id: 'gal-music-2', placeholder: 'photo: recording session' } ] },
  { key: 'muaythai', icon: '🥊', tag: 'GLOVES', label: 'Boxing Gloves', desc: 'Muay Thai is where I go to think about nothing. A few sessions a week keeps me sharp and honest about how much I can actually push through.', photos: [
    { id: 'gal-muaythai-1', placeholder: 'photo: pad work' },
    { id: 'gal-muaythai-2', placeholder: 'photo: sparring' } ] },
  { key: 'tcg', icon: '🃏', tag: 'TCG', label: 'TCG Cards', desc: 'Collecting and deck-building scratches the same itch as engineering — optimizing under constraints, just with more foil cards involved.', photos: [
    { id: 'gal-tcg-1', placeholder: 'photo: card collection' },
    { id: 'gal-tcg-2', placeholder: 'photo: deck build' } ] },
  { key: 'gaming', icon: '🎮', tag: 'CTRL', label: 'Controller', desc: 'Where I first got curious about how software works. Still my go-to for game nights and co-op runs with friends.', photos: [
    { id: 'gal-gaming-1', placeholder: 'photo: gaming setup' },
    { id: 'gal-gaming-2', placeholder: 'photo: game night' } ] },
  { key: 'travel', icon: '🧭', tag: 'COMPASS', label: 'Compass', desc: 'New cities force me to problem-solve outside my usual toolkit — reading transit maps, ordering in another language, getting comfortably lost. Every trip resets how I see a problem.', photos: [
    { id: 'gal-travel-1', placeholder: 'photo: city skyline' },
    { id: 'gal-travel-2', placeholder: 'photo: on the road' } ] },
];

// Reference lines 1209-1225: 18-slot grid, only these positions (0-indexed) are filled,
// in this order, mapped 1:1 to INV_ITEMS above.
export const INV_GRID_SIZE = 18;
export const INV_FILLED_POSITIONS = [1, 3, 6, 10, 13];
