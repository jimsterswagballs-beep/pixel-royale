# Pixel Royale: v29 five-left finale

- **Five left**: when five players are still alive (counting bots), "5 PEOPLE LEFT" flashes in red across the top of the screen and fades away.
- **Red tint**: the screen then slowly gains a red tint over about 20 seconds.
- **Finale song**: the background music is replaced with the finale song and loops until the next match. The music returns to the normal playlist when the match resets.
- **Fire**: 28 fires ignite one after another across the island and burn for the rest of the match. Fires only draw when they are within about 240 m of you.
- **Beat reaction**: the song's bass is tracked. On each beat the screen gives a small camera kick and a red flash, the tint pulses, and the fires near you throw extra sparks.

Known limits: the finale was checked with Node tests (beat detection on a synthetic 120 BPM track, fire placement), not in a browser. The song is bundled into the HTML file, so the file is about 7 MB larger.

# Pixel Royale: v28 map, bots and scenery

- **Roads**: the road network is rebuilt. Roads join at real junctions, curve smoothly, never cross each other, and stay out of districts, lakes and steep slopes. Districts were spread apart so their roads fit.
- **Buildings**: buildings sit on dry land, off the roads, and never overlap. Each building stands on a plinth so it never floats on a slope.
- **Collapsing buildings**: every building is held up by support pillars. Destroy all of them and the building tips over in 1.6 s, leaves rubble, and clears from the map after 25 s. Anyone inside the footprint takes crush damage (host decides; everyone sees the same fall).
- **Bots and windows**: bots could slip sideways through window sills while airborne (during jumps or stuck recovery). Collision now measures steps from the ground under the body, so sills and low walls block airborne bodies too. Doorways still work.
- **Scenery**: street lamps along the roads, grass and wildflower tufts in open ground, and a flock of birds overhead.

Known limits: the map, bot and collapse changes were checked with Node tests, not in a browser. Bot stair-climbing is not reworked yet.

# Pixel Royale: v27 mobile support

- Platform choice: on first open you pick PC or Mobile, with a picture of each. The device your browser looks like is marked "Suggested". Your choice is remembered, and you can switch in Settings > Controls.
- Mobile controls: drag anywhere on the left half for a joystick (push it to the edge to sprint). Drag on the right half to look. Buttons cover fire, aim, jump, crouch, sprint, reload, interact, the three abilities, map and menu. More holds emote, drop, build, rotate, material, roll, car seat swap and previous/next weapon. Tap a hotbar slot to select it.
- Touch controls only show during a match and hide while paused. Dragging a menu background turns the starter island camera, as the mouse does on PC.
- Settings > Controls has a touch look sensitivity slider.
- Touch buttons use the same key bindings as the keyboard, so remapped actions still apply.
- Not done yet: on-screen hints still name keyboard keys (for example "Press Space"). Mobile was tested in a headless browser, not on real phones.

# Pixel Royale: v26 revive and reboot screens

- **Downed screen** (you are knocked): a panel low on screen with a bleed-out bar and seconds left, a revive bar when a teammate is reviving you, and what to do (crawl to cover, and where a teammate needs to stand to revive you). Teammates show as chips: up, down or out.
- **Reboot screen** (you are eliminated but a teammate can still reboot you): three steps to get you back (teammate finds your card, card carried to a reboot van, rebooted), a line saying what is happening now, card time left and van time left, how many reboot vans are ready, and your teammates.
- **Elimination card**: now only shows when no reboot is possible (no card, or the card has gone). It used to show straight away in team modes, hiding the reboot.
- **Reviver card**: a clearer card with the seconds left for the revive you are doing.

Known limits: the new screens were checked with a headless test, not in a browser. The reboot screen follows the card and van state the host sends, so it can lag a moment behind on guests.

# Pixel Royale: v25 cars remake

- **Six kinds of car**: Hatch, Sedan, Pickup, Van, Sports and Jeep. Each has its own body: a boot lip on sedans, a bed on pickups, a roof rack and spare wheel on jeeps, a rear wing and side intakes on sports cars, and a tall rear on vans.
- **16 paints** with four styles: solid, two-tone roof, racing stripe, and taxi (yellow with a roof sign and checker band, sedans only). Each car's look depends only on its id, so everyone sees the same car.
- **Details**: window pillars, bumpers, grille, plates, door seams, mirrors, hubcaps and tail lights that glow while the car brakes.
- **Grip and slides**: tyres now have grip. A car slides in fast turns, slides more on wet roads, and braking hard in a turn lets the back end go. Grip pulls the car back into line.
- **Car bumps**: cars push apart when they hit each other, and a hard bump damages both.
- **Getting in**: walk to a door and climb in over about half a second. The nearest free door decides the seat (driver's door, passenger door, or the two rear doors). The prompt shows which seat you will get. You can't climb in while the car is doing more than 5 m/s.
- **Getting out**: step out of the seat to a clear spot beside or behind the car, checked for walls. The seat is freed straight away.
- **Smooth for everyone**: your own character animates on your screen when you climb in or out, and the host runs the same animation for everyone else. Your camera switches to third person while you climb in.

Known limits: the bump and slide feel has only been checked with headless tests, and the new car models have not been looked at in a browser. Bots still don't drive or ride in cars.

# Pixel Royale: v24 weather remake

- **Changing weather**: each match runs a schedule of weather periods taken from the match seed, so everyone sees the same sequence. Periods last about 70 to 160 seconds and never repeat back to back. The first 70 seconds are always clear.
- **Seven periods**: Clear, Overcast, Drizzle, Thunderstorm, Coastal fog, Night and Sandstorm. Each has its own sky, cloud cover, sun, fog distance, wetness and wind.
- **Smooth transitions**: the sky, clouds, sun, fog and wetness blend over 14 seconds. A toast announces each new period.
- **Sky**: a new sky shader draws clouds that drift with the wind, stars at night, a sun glow, sand haze in sandstorms, and a flash during lightning.
- **Lightning**: in a thunderstorm, a warning ring appears near a player, then a bolt, a flash and a thunderclap. The host decides where strikes land, so everyone sees the same ones.
- **Rain and sand**: rain and sand particles fall around the camera and are blown by the period's wind.
- **Cars**: grip and top speed scale with wetness instead of a single on/off rain flag, so drizzle is only a little slippery and storms are much more so.
- **Fog**: coastal fog still closes in near the water. Quality and view distance settings still apply to fog distance.

Known limits: the weather timing runs on each player's own match clock. Clocks can drift by a second or two, so the change to a new period may land slightly apart for different players. Lightning strikes are host-decided, so they match for everyone. The sky shader and the new thunder sound have not been checked in a browser.

# Pixel Royale: v23 map remake

- **Terrain**: rolling ground with a low, sandy east coast with dunes, and hills (Mount Muffin, Radio Hill, a south-east ridge, a north ridge and a western range). Cliff walls are gone.
- **Lake Muffin**: a lake in the middle of the island, with a bank that slopes down to the water. Lakeside Docks has a pier, a boathouse and canoes.
- **Roads**: each road is routed with A* over the height grid, so it avoids the lake and the sea and keeps to gentle slopes. Roads are smoothed into curves and the road-side scenery keeps clear of them.
- **New districts**: Thunder Dome (stadium with tiered stands, gates and floodlights), Old Keep (broken castle with towers and rubble), Camp Pinecone (tents, picnic tables and a fire ring), Lakeside Docks, and a church in the town districts.
- **New landmarks**: a radio lattice tower on Radio Hill, a windfarm on the ridge, a water tower by Dusty Depot, a shipwreck on the beach, a stone arch and a sand pyramid, plus the lighthouse and Mount Muffin flag from before.
- **Car spawns**: most cars spawn in district car parks (the new `parking` list), and the rest sit on quiet roads outside districts. No car spawns within 55 m of a player or on top of another car.
- **Chest spawns**: the old random wilderness chests are replaced by scenic chests on hilltops, along the lake and on the coast, kept 50 m apart. Each landmark has its own chest, and districts keep their chests.
- **Bug fix (chests not showing until the bus ends)**: chests were only created within about 60 m of the camera, so on the bus and during the drop most of them were not drawn. While you are on the bus or in the air, chests now show from up to 240 m away (supply drops 320 m) and floor loot from 160 m.

Known limits: the map was checked with a Node harness (districts on land, no overlaps, all districts connected by road, roads dry, chests not in water), but not played in a browser. The bus fix is based on reading the code, so please check it in a live match.

# Pixel Royale: v23 map

- New layout: 24 districts with spaced positions and size tiers (large, medium, small). Roads are generated from the layout, so they stay connected as districts move.
- New districts: Downtown Dunk (towers and apartment blocks), Stack Street (apartments), Skyline Point (tower), Salty Shores Hotel, Retail Rodeo (mall), Fuel Stop 9 and Gas and Go (gas stations), Brick Row and Pleasant Pickle.
- New buildings: multi-storey apartments, towers, hotels and malls, all with a stair core that every floor connects to. Upper floors have loot and sometimes chests.
- Terrain is calmer, with hills and dips in one list. Cliffs were moved clear of districts.
- Loot: outdoor loot now scales with district size. Bots prefer the new districts by persona.

# Pixel Royale: v22 update

- Interact (E by default) gets in and out of cars. Loot on the ground still comes first when you stand on it. The separate "Enter / Exit Car" key is gone; swap seat is still its own key.
- Five car kinds: Sedan, Pickup, Van, Sports and Jeep. Each has its own health, top speed, acceleration and handling. The kind is sent to everyone in the match.
- Driving feel: the engine pulls hard from a stop and tapers near top speed, hills slow you going up and speed you going down, turns build up and fade, and the wheels spin and steer.
- Cars tilt over slopes and lean in turns.
- Roads have real surfaces: asphalt, white edge lines, a dashed centre line and kerbs. They follow the hills.

## v21 update

Fixes from the v20 report:
- Joining a match no longer leaves the map invisible. Night and fog weather used to close the view while the Battle Bus was still far out. The view now stays open during the bus ride.
- Driving a car now uses a third-person camera until you exit.
- Chaos Rising shows a countdown ("next event in Ns") and plays a sound when each event starts.
- Car bodies stay visible at all times. Headlight beams show at night.

## v20 update

- **Gamemodes menu**: the Gamemodes button on the lobby screens opens a menu for team size (Solo, Duos, Trios, Squads), the game mode, and bot filling. In a party, only the host can change it.
- **Chaos Rising** (game mode): a random chaos event every 30 seconds. Events are a meteor (3 s warning), a gale that pushes everyone, a surprise supply drop, or a car frenzy (three cars on the roads).
- **Weather** (picked per match from the seed, so everyone gets the same): clear (40%), rain (20%), coastal fog (15%), night (13%) or lightning storm (12%).
  - Rain: cars have less grip, so they speed up more slowly, top out lower, brake more weakly and steer more sharply. Rain falls around the camera.
  - Coastal fog: the view closes in when you are near the water.
  - Night: the sky goes dark, the sun and sky light drop, and cars show headlight beams.
  - Lightning storm: a strike every 7 seconds on a random spot near a player, with a red warning circle first.
- **Flare Gun**: a new throwable item. When it lands it lights the area for 25 seconds (up to three flares at once).
- **Knocked and waiting-for-reboot screens**: no background panels, and the reboot screen is simpler.

Not done: there is no timed day and night cycle (night is a weather type for the whole match). The new events have not been tested with real multiplayer connections.

# Pixel Royale: Season 1

## Season 1 update

- **Bigger map**: the island is about 25% larger, with 7 new places (Sandy Cove, Pier Point, Harbor Heights, Gas and Go, Sawmill Creek, Sunset Cabins, Quarry Rock), 14 new road links, extra hills, and dark asphalt roads with light kerbs.
- **Bigger starter island**: the waiting area is about 1.5x the size, with more palms, rocks and spawn space.
- **Cars**: cars spawn on the roads. Up to four players can ride in one car (driver plus three passengers). Cars have 250 hp, catch fire at 90 hp or less, and explode at 0 hp, hurting everyone nearby. Running people over hurts them, and bullets and explosions damage cars.
- **Car controls** (rebindable in Controls): Enter / Exit Car (default U) and Swap Car Seat (default O). Drive with the normal move keys, and jump to brake.
- **Multiplayer**: the host runs all car physics, seats and damage, and sends the cars in the snapshot. Guests send their drive input.
- **Bots**: up to 75 bots in solo, and the party bot slider also goes to 75.
- **Effects**: smoke and dust while driving, flames on burning cars, and sparkles while using items.
- **Cliffs**: six cliffs with rock walls and a height step. You can't walk up them; go around.
- **Waiting for reboot**: when you're knocked, a screen shows your bleed-out timer, where your reboot card is, reboot van availability, and your teammates' status.

Known limits: bots do not drive or ride in cars yet. Multiplayer car sync has only been checked by reading the code, not with real PeerJS connections.

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

## Destruction and mining

- **Destructible**: trees, rocks, boulders, building walls, roofs and props, and everything built by players. Ground slabs, sign posts and the round silos, windmill and lighthouse are not.
- **Damage**: each part has hp (`PART_RES` in `materials.js` sets how each material resists). Bullets, the pickaxe and explosions all damage parts. Wood is weak to explosions, stone resists bullets, metal resists bullets most. Trees take less from bullets, rocks take less from bullets than from the pickaxe.
- **Cracks**: a damaged part shows crack overlays that get heavier below 75%, 50% and 25% hp (`cracks.js`).
- **Collapse**: when a part breaks, anything it was holding up falls, including roofs left without walls and players' pieces without support.
- **Mining**: the pickaxe mines what it hits. Trees give wood (plus a bonus when felled), rocks give stone (plus a bonus when broken), and buildings and pieces give their own material. Guns and explosions do not give materials.
- **Multiplayer**: the host decides all damage and breaks. Guests get `ph` / `px` (world part hp / destroyed), `bh` / `bx` (piece hp / destroyed) and `gain` events. Bots shoot and blow things up but do not mine.

Known limits: the multiplayer code has only been tested with fake networking, not with real PeerJS, and the crack visuals have not been checked in a browser.

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

## Team modes and bot teammates

- **Modes**: Solo (1 per team), Duos (2), Trios (3) and Squads (4). Pick one in the solo lobby or the party lobby (host). `MODES` and `buildEntrants` live in `teams.js`.
- **Party and teams**: in team modes the party is grouped in join order, so a party of 3 in Trios is one team. Extra party members start new teams.
- **Fill with bots**: when on, bots fill empty teammate slots first. When off, partly filled teams stay partly filled and the bot slider only adds bot teams.
- **Win condition**: the match ends when one team is left (in Solo, when one player is left). A team's place counts teams still standing.
- **No friendly fire**: bullets, melee, abilities and explosions never hit a teammate (`isAlly` in `combat.js`). Jay's food still heals teammates.
- **Team panel**: top-left shows your teammates with health and distance. Teammates show as green dots on the minimap.
- **Bot teammates** (`bots.js`):
  - Bots never treat a teammate as an enemy, whether seen or heard.
  - A bot that is far from its team walks back to it (`regroup`). It follows the nearest teammate and stops when it is close again.
  - A bot with a healing item gives it to a hurt teammate who is nearby. A bot with spare ammo gives some to a teammate who is nearly out.

## Knocked, revive, reboot cards and vans (team modes)

- **Knocked** (`knock.js`): in team modes a player who runs out of health is knocked instead of eliminated. Knocked players crawl slowly (`CRAWL`), cannot shoot, use abilities, drop or pick up items, and have `KNOCK_T` (30 s) before they are eliminated. Enemies can finish them off with any damage.
- **Revive**: a standing teammate holds interact within 2.6 m for `REVIVE_T` (4 s). Damage to the reviver cancels the revive, and moving out of range resets the progress. The revived player comes back with `REVIVE_HP` (30).
- **Team out**: when nobody on a team is standing, its knocked players are finished off.
- **Reboot cards**: when a player is eliminated and a teammate is still standing, a card drops. A teammate picks it up with interact within 2.4 m. Cards last `CARD_T` (120 s). If the carrier is eliminated, the card falls where they fell.
- **Reboot vans**: five vans are placed across the map from the match seed, so every client has the same positions. A carrier who presses interact near a ready van starts a `VAN_T` (8 s) reboot. The carrier must stay within about 5.5 m, or the reboot is cancelled and the card goes back to them. A rebooted player returns with `REBOOT_HP` (50), a pistol and 30 light ammo. The van then cools down for `VAN_COOL` (60 s).
- **HUD**: your own knock shows a countdown and your revive progress. The team panel shows knocked teammates with a revive bar, and eliminated teammates with a reboot card status. Notifications appear as toasts for your team.
- **Sync**: knocked is a flag bit, and cards and vans are in each snapshot. The host decides everything. Clients send a `hold` message when they press or release interact.
- **Tests**: `knock.js` logic was checked with a Node harness (timers, revive and interrupts, team out, cards, vans, cooldowns and expiry).

- **Bots revive** (`botThink`, mode `revive`): a bot with no enemy in sight, a safe distance from the storm and enough health walks to the nearest knocked teammate within 60 m and holds interact within 2.2 m. It is interrupted if it is hit or an enemy appears.

Not built yet: bots rebooting teammates from cards and vans, pings, and a bot-side knocked response. A knocked bot stands still until it is finished.

## Lobby remake and Starter Island

- **Solo lobby** (the Lobby tab): match setup (name, bots, difficulty) sits on the left next to a hero showcase with stats and a Change hero button. Play drops straight into a match with a quick fade. The battle royale map shows behind the screen.
- **Party lobby** (after you create or join a party): the squad panel is on the left, match settings and Board Bus are on the right, and your hero picker sits in a bar under the island.
- **Starter Island** (`starter.js`): a walkable island shown only behind the party lobby. Your hero stands on the plaza, the Battle Bus is parked on the north side, and a cabin, palms, rocks and training dummies fill the island. WASD walks (relative to the camera), ← / → turn the camera, and G dances.
- **Board Bus** (party host): the bus flies off with your hero aboard, the screen fades to black, and the match starts (`App.boardThen` in `main.js`). Solo Play skips the bus and just fades.
- Player names in the lobby are escaped before they are written to the page.

## Dive and glide camera

- While skydiving and gliding the camera is third person, behind the hero. On landing it blends back to first person in about a third of a second (`tpPose` and `tpK` in `game.js`).
- Gliding shows a glider canopy with strings to the hero's shoulders, coloured by hero (`makeGliderModel` in `game.js`). It opens with a short deploy animation and sways in the wind. Other players see it too.

## Weapon damage and new items

- **Weapon damage**: every weapon's damage is multiplied by `WEAPON_DMG_MUL` in `shared.js`, now `.55` (it was `.7`). Change that one number to tune how fast fights end.
- **Homing Missile Launcher** (rockets ammo): each missile re-picks a target every 0.25 s, the nearest enemy within about 40 degrees either side of its flight path, up to 90 m away, with a clear line of sight. It steers toward that target at a limited turn rate. The host runs the steering and sends `pjv` updates so every client draws the same flight path.
- **Jetpack** (`jet`): drinking it gives 6 s of fuel. Hold Space in the air to climb, up to 11 m/s. Fuel only burns while you thrust.
- **Energy Drink** (`energy`): +10 HP and +25% move speed for 8 s.
- **Chili Pepper** (`pepper`): Spicy for 8 s, +30% weapon damage (host-side, from flag bit `262144`), plus a fire trail while sprinting.
- **Invisibility Cloak** (`cloak`): invisible for 8 s, using the same cloak flag as Chill Guy. Attacking reveals you, and so does taking damage from someone else.
- **Recon Drone** (`drone`, deploy): placed 2.4 m in front of you and hovers for 14 s. Every 0.8 s it shoots the nearest enemy within 40 m that it has a clear line to, for 7 damage (host-run, sends `dz` tracers).
- **Air Strike** (`strike`, call-in): aim at the ground (up to 150 m) and a red ring marks the spot for 2.5 s. Then six bombs fall within about 6.5 m of it (host-run; clients send a `strike` message).
- **Frost Grenade** (`frost`, throwable): bursts after 1.8 s, slows enemies in the blast by 50% for 3 s, and deals damage.
- **Shock Trap** (`shock`, placed): the first enemy to step on it within about 1.5 m is stunned for 1.3 s and the trap is removed. The owner never triggers it.

Known limits:
- Bots do not use the new items; they only use the homing launcher through normal weapon scoring.
- The jetpack, energy and spicy effects are not drawn on remote players.
- Multiplayer with real PeerJS has not been tested. Headless tests cover single-player and bot logic only.

## Kill feed

- Weapon kills show the weapon name and its rarity colour. The kill event's weapon id is `weapon*10+rarity`, decoded before lookup.
- Each row reads killer, weapon, victim. You appear as "You" (highlighted for kills, red for your death).
- The storm, self kills ("own goal"), and a killer who has left the match each get their own label.
- Headshot kills get a "Headshot" tag. The kill event carries a `h` flag for this.
- Frag and Boogie grenades have separate kill names (`-5`, `-17`).
- Player names are written as text, not HTML, so a name containing markup can't inject anything.

## Starter island intermission

- **Play** (solo) or **Board Bus** (party host) now opens a 10 second intermission on the Starter Island (`INTER_SECS` in `main.js`).
- Everyone in the match stands on the island with their character and name tag, so you can see the other players while the timer runs. Bots are shown too. You can walk around with WASD and turn with the arrow keys.
- When the timer hits zero, the Battle Bus boards with your hero aboard, the screen fades, and the match starts with the in-match bus.
- Multiplayer: the host sends `inter` (roster and seconds, plus each guest's own entity id) when the intermission starts, then `start` when the timer ends. Guests show the same island from `inter`, then board when `start` arrives.
- If a guest's connection to the host drops during the intermission, the intermission is cancelled and the lobby returns as before.
- Pointer lock is requested from the Play or Board Bus click so mouse control carries into the match. Clicking during the intermission also takes it.
- Code: `starter.js` (`setCrowd`, `updateCrowd`, `clearCrowd`), `main.js` (`soloStart`, `hostStart`, `beginIntermission`, `tickInter`, `endIntermission`, `guestInter`, `boardThen`).
