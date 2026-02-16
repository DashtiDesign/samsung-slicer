
# Sound Fixes, Logo Update, Speed Normalization, Haptics, and Item Size Increase

## 1. Replace logo with new SVG
- Copy `user-uploads://samsung_slicer.svg` to `src/assets/Samsung_Slasher.svg` (overwrite)
- No code changes needed since it's already imported by the same filename

## 2. Fix sound system
**Problem:** `unlockAudio()` restores volume to 1 in an async `.then()` callback, which can race and cause random sounds. Also, `playSound()` doesn't set volume.

**Fix in `unlockAudio()`:** Remove the `.then()` that restores volume. Just fire-and-forget at volume 0:
```
[this.sliceSound, this.bombThrowSound, this.bombExplodeSound].forEach(a => {
  a.volume = 0;
  a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
});
```

**Fix in `playSound()`:** Set volume to 0.4 on every cloned audio:
```
private playSound(audio: HTMLAudioElement) {
  const clone = new Audio(audio.src);
  clone.volume = 0.4;
  clone.play().catch(() => {});
}
```

## 3. Make items 25% bigger
Change `ITEM_SIZE` from `70` to `88`.

## 4. Consistent speed across devices
Replace `this.height` with `Math.min(this.height, 800)` in the `vy` calculation of both `spawnItem()` and `spawnBomb()` so desktop screens don't launch items excessively fast.

## 5. Bomb overlap prevention
In `spawnBomb()`, after choosing `fromX`, check all active non-sliced items. If any item is within `ITEM_SIZE * 2` on the X-axis, offset the bomb's X position to avoid overlap.

## 6. Haptic feedback on life loss
Add `navigator.vibrate?.(100)` in both life-loss code paths:
- When a bomb is sliced (in `checkSlice`)
- When a product falls off screen (in `update`)

## Technical Details

All changes are in `src/game/SamsungSlashGame.ts` plus replacing the SVG asset.

**Line 22:** `ITEM_SIZE = 70` becomes `ITEM_SIZE = 88`

**Line 202-209 (unlockAudio):** Remove volume restore in `.then()`

**Line 212-215 (playSound):** Add `clone.volume = 0.4`

**Lines 278, 297 (spawnItem/spawnBomb vy):** Use `Math.min(this.height, 800)` instead of `this.height`

**Lines 293-311 (spawnBomb):** Add X-overlap check against active items, offset if too close

**Lines 226-229 (bomb slice):** Add `navigator.vibrate?.(100)` after life loss

**Lines 383-387 (missed item):** Add `navigator.vibrate?.(100)` after life loss
