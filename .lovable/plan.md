

# Bombs, Sound Effects, and Combo Update

## Overview
Add bomb items that cost a life when sliced, integrate 3 sound effects (slice, bomb throw, bomb explode), and update the combo bonus to award +5 points for slicing 3+ items in one swipe.

## Changes

### 1. New Assets
Copy the following uploaded files into `src/assets/`:
- `Bomb.png` - bomb image
- `slice.wav` - played on every successful product slice
- `Bomb-throw.wav` - played when a bomb is spawned/thrown
- `Bomb-explode.wav` - played when a bomb is sliced

### 2. Update `GameItem` type (`src/game/types.ts`)
Add an `isBomb` boolean field to `GameItem` to distinguish bombs from products.

### 3. Update Game Engine (`src/game/SamsungSlashGame.ts`)

**New imports and assets:**
- Import `Bomb.png` as an image, load it alongside product images
- Import all 3 `.wav` files and create `Audio` objects for each

**Sound playback helper:**
- Create a `playSound(audio)` method that clones and plays audio (allows overlapping sounds)

**Bomb spawning logic (in the spawn section of `update()`):**
- After the normal product spawn batch, roll a chance to also spawn a bomb
- Bomb spawn chance increases with difficulty (starting ~15%, scaling up)
- Before score reaches 250: only 1 bomb at a time (check active bomb count)
- At 250+ score: allow up to 2 bombs at a time
- When a bomb spawns, play `Bomb-throw.wav`
- Bombs use `isBomb: true` and a special `imageIndex` (e.g., -1) to identify them

**Slice logic (in `checkSlice()`):**
- If the sliced item is a bomb: lose a life, play `Bomb-explode.wav`, spawn red/orange explosion particles, do NOT add score
- If the sliced item is a product: play `slice.wav`, add score as before

**Combo bonus update (in `onUp` handler):**
- Change the combo bonus from awarding `combo` points to a flat +5 when `combo >= 3`

**Drawing (in `drawGameplay()`):**
- For bomb items, draw the bomb image instead of a product image

**Bomb falling off screen:**
- Bombs that fall off-screen should NOT cost a life (only products do). Update the off-screen check to skip bombs.

## Technical Details

### types.ts changes
```
GameItem gets: isBomb: boolean
```

### SamsungSlashGame.ts key changes

**New fields:**
- `private bombImage: HTMLImageElement`
- `private sliceSound: HTMLAudioElement`
- `private bombThrowSound: HTMLAudioElement`
- `private bombExplodeSound: HTMLAudioElement`

**Bomb spawn (after product spawns):**
- Count active bombs: `this.items.filter(i => i.isBomb && !i.sliced && !i.offScreen).length`
- Max bombs = score >= 250 ? 2 : 1
- If active bombs < max and random chance hits, call `spawnBomb()` which is like `spawnItem()` but with `isBomb: true` and plays throw sound

**checkSlice update:**
- If `item.isBomb`: set sliced, lose life, play bomb-explode, red explosion, check game over
- Else: existing product slice logic + play slice sound

**onUp combo update:**
- `if (this.combo >= 3) { this.score += 5; ... }`

**drawGameplay update:**
- When rendering items, check `item.isBomb` to pick bomb image vs product image

**Off-screen check:**
- Add `&& !item.isBomb` condition so bombs falling off screen don't cost lives

