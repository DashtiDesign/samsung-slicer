

# Samsung Slasher Updates

## 1. Replace title with SVG logo
- Copy `Samsung_Slasher.svg` to `src/assets/`
- Load the SVG as an image in the game engine and draw it on the Start Screen instead of the "SAMSUNG SLASH" text title
- Remove the old `ctx.fillText('SAMSUNG SLASH', ...)` call and subtitle text
- Draw the logo centered, scaled appropriately for the canvas width

## 2. Rename game references
- Update `localStorage` key from `samsungSlashHighScore` to `samsungSlasherHighScore`
- Update any internal references

## 3. Keep items within screen bounds (X and top)
- In the item update loop, clamp `item.x` to `[ITEM_SIZE/2, width - ITEM_SIZE/2]` and bounce `vx`
- Clamp `item.y` so it never goes above `ITEM_SIZE/2`, bouncing `vy` if needed
- Items falling below the screen still cost a life (unchanged)

## 4. Warmup + multi-item spawns for combos
- Add a `totalSliced` counter, reset in `startGame()`, incremented in `checkSlice()`
- During warmup (totalSliced < 4): spawn 1 item at a time
- After warmup: spawn 2-4 items together, with higher counts as difficulty increases, giving players combo opportunities

## Technical Details

All changes are in `src/game/SamsungSlashGame.ts` plus copying the SVG asset.

**New field:** `private totalSliced = 0`

**Item boundary clamping** (in `update()` item loop, after velocity application):
```
if (item.x < ITEM_SIZE/2) { item.x = ITEM_SIZE/2; item.vx *= -0.5; }
if (item.x > width - ITEM_SIZE/2) { item.x = width - ITEM_SIZE/2; item.vx *= -0.5; }
if (item.y < ITEM_SIZE/2) { item.y = ITEM_SIZE/2; item.vy *= -0.5; }
```

**Spawn logic** (replaces current count calculation):
```
if totalSliced < 4: count = 1
else: count based on difficulty with randomness (2-4 items)
```

**Logo rendering:** Load SVG as `HTMLImageElement`, draw centered on start screen at ~60% canvas width, maintaining aspect ratio.

