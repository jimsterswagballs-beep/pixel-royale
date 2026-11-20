# Pixel Royale

A browser-based 3D battle royale game.

## Run locally

Install dependencies and start a local static server:

```bash
npm install
npm run build
```

The build creates `index.html` in the project root (ready for GitHub Pages) and a copy in `dist/`.

## Recent visual update

- Reworked floor pickups into distinct low-profile 3D item models.
- Added detailed ammo stacks, medical supplies, shields, throwables, and utility item models.
- Added animated rarity rings, orbiting sparkles, pulsing ground effects, and smoother floating/spinning motion.
- Rebuilt chest and ammo-crate models with reinforced corners, trim, latches, and glowing beacons.
- Added subtle idle motion to loot crates.

## Loot update

- Floor loot is much rarer (~60% fewer items); chests and ammo crates are the main source of good gear.
- Floor items are mostly healing/utility, with occasional low-rarity weapons (max Epic) and ammo stacks.
- Picked-up loot now disappears with a coloured pop effect.
- Floor item glow scales with rarity: commons are subtle, Rare+ get halo and sparkles, Epic+ get a beam.

## Lobby UI update

- New top navigation bar (Lobby / Online / Locker / News / Settings) with your player badge.
- Lobby home: party panel, hero on a glowing pad, game-mode card and a big PLAY button.
- Locker rebuilt as rarity-coloured item tiles (Outfit, Name Color, Sprint Trail, Emote); hero select now lives here.
- Settings uses a sidebar of categories; Online Party and the party lobby use slot cards.

## Bot AI update

- `botnav.js`: lazy 1m walkability grid + A* (time-budgeted) so bots path through doors and around props/trees/water.
- `bots.js`: personality system (8 archetypes + quirks), perception (FOV, hearing gunshots/footsteps), modes: loot, roam, rotate, fight, chase, investigate, flee (to cover), hide (heal when low), camp.
- Anti-stuck: progress monitor escalates jump -> ban blocked cells & re-plan -> random detour -> pop out to nearest open cell.
- `botnames.js`: curated + procedurally combined names, themed per personality, with random cosmetics.

## Multiplayer fix

- "Back to Lobby" after a match now returns everyone to the party lobby instead of kicking guests to the title screen.
- Hosts can still take new players after a match.
- A guest who quits mid-match hands their character to a bot.

## Building and destruction

- **Build mode**: press B. The wheel (or the next/previous keys) changes the piece (wall, floor, ramp), T rotates it, Y changes the material, and left click places it. The ghost preview is green when the placement is valid and red otherwise, with the reason shown under the build bar.
- **Pieces**: walls, floors and ramps snap to a 4 m grid. Ramps are six solid steps, so players and bots walk up them with the normal step-up rule.
- **Materials**: wood, stone and metal, shown at the top left. Wood and stone come from shooting trees and rocks (a tree takes 4 hits, a rock 6). Metal and other material stacks come from loot and chests.
- **Destruction**: each piece has HP that depends on its material. Bullets and explosions damage pieces. Destroyed pieces leave debris that falls, bounces on terrain and expires after a few seconds. Anything that loses its support collapses.
- **Multiplayer**: the host validates placement, cost and damage and sends the results as events (`bp`, `bh`, `bx`, `mats`, `dec`, `hv`), the same way other effects are sent. Guests send build requests (`build`) to the host.
- **Bots**: bots damage pieces with their shots and path around new walls. They do not place pieces, and they do not harvest trees or rocks yet.

Known limits: harvesting by melee is not implemented, and multiplayer has only been tested with fake networking, not with real PeerJS.

## Item models

- Consumables and throwables use one builder (`makeFloorItem` in `loot.js`) for both the dropped item and the item in the player's hand, so the shape matches before and after pickup. Previously the hand showed a plain coloured box.
- Weapons already shared one builder (`makeWeaponModel`) for the floor, the hand and other players.

## HUD: loadout, materials and abilities

- **Loadout**: six slots, each with its number, a rarity strip along the bottom, and the weapon's rarity name or the item's stack count. Empty slots are dashed.
- **Abilities**: three cards with their key, icon and name. Cooldowns show as a radial sweep with the seconds left. The icon dims while cooling down, and a ready ability pulses.
- **Materials**: a panel above the abilities with wood, stone and metal. A count flashes when it changes.
- **Layout**: the bottom bar is a three-column grid (abilities and materials, health and loadout, ammo). Below 900px it stacks vertically so nothing overlaps.

## HUD fit to the screen

- The HUD is laid out for a 1280×720 screen and scaled to the window (between 0.7× and 1.6×). It rescales when the window is resized.
- Damage numbers are placed with the same scale, so they stay on their targets.

## Heroes update (v1.3)

- Two new playable characters: **Chill Guy** (stealth glass cannon) and **Jay** (chef support), each with 3 abilities and a passive. See `ABILITIES.md` for balance values and multiplayer behaviour.
- Character select artwork and ability icons are generated in `icons.js`; all hero logic is in `abilities.js`; tunables are in `BAL` (`data.js`).
- Sprite imports in `shared.js` now use `./` paths so the build works from this folder layout.
- Teams: party members share team 0. Bots and solo players get a unique negative team, so Jay's healing and banana zones only treat real teammates as allies (in solo, nobody is allied by accident).
- Bots are drawn from all four characters (`botnames.js`), so Chill Guy and Jay appear in bot matches and use their own bot logic (`botChill`, `botJay`).
- The HUD shows the hero ability icons, the next food in Jay's bag, and a buffs row (Cloaked, Cold Blooded, Cooking).
