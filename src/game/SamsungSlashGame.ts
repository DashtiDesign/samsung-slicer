import type { GameItem, Particle, BladePoint, Star, GameScreen, Vec2 } from './types';

import watchImg from '@/assets/samsung-watch.png';
import budsImg from '@/assets/samsung-buds.png';
import flipImg from '@/assets/samsung-flip.png';
import tabImg from '@/assets/samsung-tab.png';
import logoSvg from '@/assets/Samsung_Slasher.svg';
import bombImg from '@/assets/Bomb.png';
import sliceWav from '@/assets/slice.wav';
import bombThrowWav from '@/assets/Bomb-throw.wav';
import bombExplodeWav from '@/assets/Bomb-explode.wav';

const PRODUCT_SRCS = [watchImg, budsImg, flipImg, tabImg];
const PRODUCT_COLORS = [
  ['#1a1a2e', '#4a4a6a', '#8888aa'], // watch
  ['#f5f5f5', '#cccccc', '#999999'], // buds
  ['#2d1b4e', '#6b3fa0', '#a855f7'], // flip
  ['#1e293b', '#334155', '#64748b'], // tab
];
const GRAVITY = 0.35;
const BLADE_TRAIL_DURATION = 150;
const ITEM_SIZE = 70;

export class SamsungSlashGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private screen: GameScreen = 'start';
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private items: GameItem[] = [];
  private particles: Particle[] = [];
  private blade: BladePoint[] = [];
  private stars: Star[] = [];
  private images: HTMLImageElement[] = [];
  private logoImage: HTMLImageElement;
  private bombImage: HTMLImageElement;
  private sliceSound: HTMLAudioElement;
  private bombThrowSound: HTMLAudioElement;
  private bombExplodeSound: HTMLAudioElement;
  private imagesLoaded = 0;
  private animFrame = 0;
  private lastTime = 0;
  private spawnTimer = 0;
  private spawnInterval = 1800;
  private difficulty = 1;
  private gameTime = 0;
  private combo = 0;
  private comboTimer = 0;
  private comboDisplay = 0;
  private comboDisplayTimer = 0;
  private nextId = 0;
  private isSwiping = false;
  private time = 0;
  private destroyed = false;
  private totalSliced = 0;
  private audioUnlocked = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.highScore = parseInt(localStorage.getItem('samsungSlasherHighScore') || '0', 10);
    this.logoImage = new Image();
    this.logoImage.src = logoSvg;
    this.bombImage = new Image();
    this.bombImage.src = bombImg;
    this.sliceSound = new Audio(sliceWav);
    this.bombThrowSound = new Audio(bombThrowWav);
    this.bombExplodeSound = new Audio(bombExplodeWav);
    this.loadImages();
    this.initStars();
    this.resize();
    this.bindEvents();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loadImages() {
    PRODUCT_SRCS.forEach((src) => {
      const img = new Image();
      img.onload = () => { this.imagesLoaded++; };
      img.src = src;
      this.images.push(img);
    });
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2.5 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 2 + 1,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private bindEvents() {
    const getPos = (e: TouchEvent | MouseEvent): Vec2 => {
      const rect = this.canvas.getBoundingClientRect();
      if ('touches' in e && e.touches.length > 0) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
      if ('clientX' in e) {
        return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
      }
      return { x: 0, y: 0 };
    };

    const onDown = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      this.unlockAudio();
      const pos = getPos(e);
      if (this.screen === 'start') {
        if (this.isInStartButton(pos.x, pos.y)) {
          this.startGame();
        }
        return;
      }
      if (this.screen === 'gameover') {
        if (this.isInPlayAgainButton(pos.x, pos.y)) {
          this.startGame();
        }
        return;
      }
      this.isSwiping = true;
      this.blade = [{ x: pos.x, y: pos.y, time: performance.now() }];
      this.combo = 0;
    };

    const onMove = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      if (!this.isSwiping || this.screen !== 'playing') return;
      const pos = getPos(e);
      this.blade.push({ x: pos.x, y: pos.y, time: performance.now() });
      this.checkSlice(pos);
    };

    const onUp = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      if (this.combo >= 3 && this.screen === 'playing') {
        this.score += 5;
        this.comboDisplay = this.combo;
        this.comboDisplayTimer = 1.5;
      }
      this.isSwiping = false;
      this.combo = 0;
    };

    this.canvas.addEventListener('touchstart', onDown, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    this.canvas.addEventListener('touchend', onUp, { passive: false });
    this.canvas.addEventListener('mousedown', onDown);
    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onUp);
  }

  private isInStartButton(x: number, y: number): boolean {
    const bx = this.width / 2;
    const by = this.height / 2 + 40;
    return Math.abs(x - bx) < 80 && Math.abs(y - by) < 28;
  }

  private isInPlayAgainButton(x: number, y: number): boolean {
    const bx = this.width / 2;
    const by = this.height / 2 + 60;
    return Math.abs(x - bx) < 90 && Math.abs(y - by) < 28;
  }

  private startGame() {
    this.screen = 'playing';
    this.score = 0;
    this.lives = 3;
    this.items = [];
    this.particles = [];
    this.blade = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1800;
    this.difficulty = 1;
    this.gameTime = 0;
    this.combo = 0;
    this.comboDisplay = 0;
    this.comboDisplayTimer = 0;
    this.totalSliced = 0;
  }

  private unlockAudio() {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    // Play and immediately pause each sound to unlock audio on iOS/Chrome
    [this.sliceSound, this.bombThrowSound, this.bombExplodeSound].forEach(a => {
      a.volume = 0;
      a.play().then(() => { a.pause(); a.currentTime = 0; a.volume = 1; }).catch(() => {});
    });
  }

  private playSound(audio: HTMLAudioElement) {
    const clone = new Audio(audio.src);
    clone.play().catch(() => {});
  }

  private checkSlice(pos: Vec2) {
    for (const item of this.items) {
      if (item.sliced) continue;
      const dx = pos.x - item.x;
      const dy = pos.y - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ITEM_SIZE * 0.6) {
        item.sliced = true;
        if (item.isBomb) {
          this.lives--;
          this.playSound(this.bombExplodeSound);
          this.spawnBombExplosion(item);
          if (this.lives <= 0) this.gameOver();
        } else {
          this.score += 1;
          this.combo += 1;
          this.totalSliced += 1;
          this.playSound(this.sliceSound);
          this.spawnExplosion(item);
        }
      }
    }
  }

  private spawnExplosion(item: GameItem) {
    const colors = PRODUCT_COLORS[item.imageIndex];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        x: item.x,
        y: item.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
      });
    }
  }

  private spawnBombExplosion(item: GameItem) {
    const colors = ['#ff4444', '#ff6600', '#ff2200', '#ffaa00'];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        x: item.x, y: item.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1, maxLife: 1,
      });
    }
  }

  private spawnItem() {
    const fromX = this.width * 0.15 + Math.random() * this.width * 0.7;
    const targetX = this.width * 0.3 + Math.random() * this.width * 0.4;
    const vx = (targetX - fromX) * 0.015 * (0.8 + Math.random() * 0.4);
    const vy = -(this.height * 0.018 + Math.random() * this.height * 0.008) * (1 + this.difficulty * 0.1);

    this.items.push({
      id: this.nextId++,
      x: fromX, y: this.height + ITEM_SIZE,
      vx, vy,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
      width: ITEM_SIZE, height: ITEM_SIZE,
      imageIndex: Math.floor(Math.random() * 4),
      sliced: false, offScreen: false, counted: false,
      isBomb: false,
    });
  }

  private spawnBomb() {
    const fromX = this.width * 0.15 + Math.random() * this.width * 0.7;
    const targetX = this.width * 0.3 + Math.random() * this.width * 0.4;
    const vx = (targetX - fromX) * 0.015 * (0.8 + Math.random() * 0.4);
    const vy = -(this.height * 0.018 + Math.random() * this.height * 0.008) * (1 + this.difficulty * 0.1);

    this.items.push({
      id: this.nextId++,
      x: fromX, y: this.height + ITEM_SIZE,
      vx, vy,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
      width: ITEM_SIZE, height: ITEM_SIZE,
      imageIndex: -1,
      sliced: false, offScreen: false, counted: false,
      isBomb: true,
    });
    this.playSound(this.bombThrowSound);
  }

  private loop = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min(now - this.lastTime, 33);
    this.lastTime = now;
    this.time = now;
    this.update(dt / 1000);
    this.draw();
    this.animFrame = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (this.screen !== 'playing') return;

    this.gameTime += dt;
    this.difficulty = 1 + Math.floor(this.gameTime / 10) * 0.5;
    this.spawnInterval = Math.max(400, 1800 - this.gameTime * 15);

    // Spawn items
    this.spawnTimer += dt * 1000;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      let count = 1;
      if (this.totalSliced >= 4) {
        // Post-warmup: spawn multiple items for combo opportunities
        const r = Math.random();
        if (this.difficulty > 3 && r < 0.3) {
          count = 4;
        } else if (this.difficulty > 2 && r < 0.5) {
          count = 3;
        } else {
          count = 2;
        }
      }
      for (let i = 0; i < count; i++) {
        this.spawnItem();
      }

      // Bomb spawning
      const activeBombs = this.items.filter(i => i.isBomb && !i.sliced && !i.offScreen).length;
      const maxBombs = this.score >= 250 ? 2 : 1;
      const bombChance = Math.min(0.4, 0.15 + this.difficulty * 0.03);
      if (activeBombs < maxBombs && Math.random() < bombChance) {
        this.spawnBomb();
      }
    }

    // Update items
    for (const item of this.items) {
      item.x += item.vx;
      item.y += item.vy;
      item.vy += GRAVITY;
      item.rotation += item.rotationSpeed;

      // Clamp to screen bounds (X and top)
      if (item.x < ITEM_SIZE / 2) {
        item.x = ITEM_SIZE / 2;
        item.vx *= -0.5;
      }
      if (item.x > this.width - ITEM_SIZE / 2) {
        item.x = this.width - ITEM_SIZE / 2;
        item.vx *= -0.5;
      }
      if (item.y < ITEM_SIZE / 2) {
        item.y = ITEM_SIZE / 2;
        item.vy *= -0.5;
      }

      if (item.y > this.height + ITEM_SIZE * 2 && !item.sliced && !item.counted) {
        item.counted = true;
        item.offScreen = true;
        if (!item.isBomb) {
          this.lives--;
          if (this.lives <= 0) {
            this.gameOver();
          }
        }
      }
    }

    // Remove off-screen / sliced items
    this.items = this.items.filter(
      (i) => !(i.sliced && i.y > this.height + 50) && !(i.offScreen)
    );

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= dt * 1.5;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    // Blade trail cleanup
    const now = performance.now();
    this.blade = this.blade.filter((b) => now - b.time < BLADE_TRAIL_DURATION);

    // Combo display timer
    if (this.comboDisplayTimer > 0) {
      this.comboDisplayTimer -= dt;
    }
  }

  private gameOver() {
    this.screen = 'gameover';
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('samsungSlasherHighScore', String(this.highScore));
    }
  }

  private draw() {
    this.drawSpaceBackground();

    if (this.screen === 'start') {
      this.drawStartScreen();
    } else if (this.screen === 'playing') {
      this.drawGameplay();
    } else {
      this.drawGameOver();
    }
  }

  private drawSpaceBackground() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
    grad.addColorStop(0, '#0d1117');
    grad.addColorStop(0.4, '#070b14');
    grad.addColorStop(1, '#000005');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const t = this.time * 0.0003;
    const nebula = ctx.createRadialGradient(
      w * 0.3 + Math.sin(t) * 40, h * 0.4 + Math.cos(t * 0.7) * 30, 0,
      w * 0.3 + Math.sin(t) * 40, h * 0.4 + Math.cos(t * 0.7) * 30, w * 0.5
    );
    nebula.addColorStop(0, 'rgba(99, 50, 200, 0.08)');
    nebula.addColorStop(0.5, 'rgba(30, 60, 180, 0.04)');
    nebula.addColorStop(1, 'transparent');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, w, h);

    const nebula2 = ctx.createRadialGradient(
      w * 0.7 + Math.cos(t * 1.3) * 50, h * 0.6 + Math.sin(t * 0.9) * 40, 0,
      w * 0.7 + Math.cos(t * 1.3) * 50, h * 0.6 + Math.sin(t * 0.9) * 40, w * 0.4
    );
    nebula2.addColorStop(0, 'rgba(50, 100, 220, 0.06)');
    nebula2.addColorStop(0.6, 'rgba(20, 40, 100, 0.03)');
    nebula2.addColorStop(1, 'transparent');
    ctx.fillStyle = nebula2;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.03 + Math.sin(t * 2) * 0.01;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 0.5;
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(w / 2 + Math.cos(angle) * w, h / 2 + Math.sin(angle) * h);
      ctx.lineTo(w / 2 + Math.cos(angle + 0.1) * w, h / 2 + Math.sin(angle + 0.1) * h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(150, 180, 255, 0.3)';
      ctx.fill();
    }
    ctx.restore();

    for (const star of this.stars) {
      const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.time * 0.001 * star.twinkleSpeed + star.twinkleOffset));
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.size * twinkle, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 230, 255, ${twinkle * 0.9})`;
      ctx.fill();
    }
  }

  private drawStartScreen() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Draw SVG logo instead of text title
    if (this.logoImage.complete && this.logoImage.naturalWidth > 0) {
      const logoW = w * 0.6;
      const aspect = this.logoImage.naturalHeight / this.logoImage.naturalWidth;
      const logoH = logoW * aspect;
      ctx.drawImage(this.logoImage, (w - logoW) / 2, h / 2 - logoH - 20, logoW, logoH);
    }

    // Start button
    const bx = w / 2;
    const by = h / 2 + 40;
    ctx.fillStyle = 'rgba(60, 100, 255, 0.8)';
    ctx.beginPath();
    ctx.roundRect(bx - 80, by - 25, 160, 50, 25);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillText('START', bx, by + 7);

    // High score
    if (this.highScore > 0) {
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(200, 210, 255, 0.6)';
      ctx.fillText(`High Score: ${this.highScore}`, w / 2, h / 2 + 100);
    }
  }

  private drawGameplay() {
    const ctx = this.ctx;
    const w = this.width;

    if (this.blade.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(this.blade[0].x, this.blade[0].y);
      for (let i = 1; i < this.blade.length; i++) {
        ctx.lineTo(this.blade[i].x, this.blade[i].y);
      }
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.7)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(100, 180, 255, 0.8)';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    for (const item of this.items) {
      if (item.sliced) continue;
      const img = item.isBomb ? this.bombImage : this.images[item.imageIndex];
      if (!img || !img.complete) continue;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rotation);
      ctx.drawImage(img, -item.width / 2, -item.height / 2, item.width, item.height);
      ctx.restore();
    }

    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'left';
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${this.score}`, 20, 40);
    ctx.shadowBlur = 0;

    ctx.textAlign = 'right';
    ctx.font = '22px "Segoe UI", sans-serif';
    let hearts = '';
    for (let i = 0; i < 3; i++) {
      hearts += i < this.lives ? '❤️' : '🖤';
    }
    ctx.fillText(hearts, w - 15, 40);

    if (this.comboDisplayTimer > 0 && this.comboDisplay >= 3) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 32px "Segoe UI", sans-serif';
      ctx.fillStyle = `rgba(255, 220, 50, ${Math.min(1, this.comboDisplayTimer)})`;
      ctx.shadowColor = 'rgba(255, 200, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText(`COMBO x${this.comboDisplay}!`, w / 2, 90);
      ctx.shadowBlur = 0;
    }
  }

  private drawGameOver() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 40px "Segoe UI", sans-serif';
    ctx.shadowColor = 'rgba(255, 50, 50, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText('GAME OVER', w / 2, h / 2 - 60);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '22px "Segoe UI", sans-serif';
    ctx.fillText(`Score: ${this.score}`, w / 2, h / 2 - 10);

    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(200, 210, 255, 0.7)';
    ctx.fillText(`Best: ${this.highScore}`, w / 2, h / 2 + 20);

    const bx = w / 2;
    const by = h / 2 + 60;
    ctx.fillStyle = 'rgba(60, 100, 255, 0.8)';
    ctx.beginPath();
    ctx.roundRect(bx - 90, by - 25, 180, 50, 25);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillText('PLAY AGAIN', bx, by + 7);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animFrame);
  }
}
