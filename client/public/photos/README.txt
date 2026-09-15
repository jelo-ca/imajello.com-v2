Drop photos here, then point content.json at them.

Journey (World Map) — add imageSrc on each journey stop:
  client/public/photos/journey/ph.jpg       → "imageSrc": "/photos/journey/ph.jpg"
  client/public/photos/journey/ca.jpg
  client/public/photos/journey/uci.jpg

Inventory hobbies — add src on each photos[] entry:
  client/public/photos/inventory/music-1.jpg      → "src": "/photos/inventory/music-1.jpg"
  client/public/photos/inventory/music-2.jpg
  client/public/photos/inventory/muaythai-1.jpg
  …same pattern for tcg, gaming, travel

JPG/PNG/WebP all work. Prefer landscape-ish crops for inventory cards.
