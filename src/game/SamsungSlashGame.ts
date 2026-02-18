import type { GameItem, Particle, BladePoint, Star, GameScreen, Vec2 } from "./types";

import watchImg from "@/assets/samsung-watch.png";
import budsImg from "@/assets/samsung-buds.png";
import flipImg from "@/assets/samsung-flip.png";
import tabImg from "@/assets/samsung-tab.png";
import logoSvg from "@/assets/Samsung_Slasher.svg";
import bombImg from "@/assets/Bomb.png";
import sliceWav from "@/assets/slice.wav";
import bombThrowWav from "@/assets/Bomb-throw.wav";
import bombExplodeWav from "@/assets/Bomb-explode.wav";

const PRODUCT_SRCS = [watchImg, budsImg, flipImg, tabImg];

/* -------------------------------
   TIME-BASED PHYSICS CONSTANTS
--------------------------------*/
const GRAVITY = 2000; // px per second²
const LAUNCH_SPEED_BASE = 1200; // px per second
const LAUNCH_SPEED_RAND = 400;
const ITEM_SIZE = 88;
const BLADE_TRAIL_DURATION = 150;

export class SamsungSlashGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private screen: GameScreen = "start";

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

  private lastTime = 0;
  private animFrame = 0;
  private destroyed = false;

  /* -------------------------------
     AUDIO (MOBILE SAFE)
  --------------------------------*/
  private audioCtx: AudioContext | null = null;
  private audioBuffers = new Map<string, AudioBuffer>();
  private rawBuffers = new Map<string, ArrayBuffer>();
  private audioUnlocked = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.highScore = parseInt(localStorage.getItem("samsungSlasherHighScore") || "0", 10);

    this.logoImage = new Image();
    this.logoImage.src = logoSvg;

    this.bombImage = new Image();
    this.bombImage.src = bombImg;

    PRODUCT_SRCS.forEach((src) => {
      const img = new Image();
      img.src = src;
      this.images.push(img);
    });

    this.resize();
    this.bindEvents();
    this.loadAudio();

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /* ===============================
     AUDIO
  =============================== */

  private async loadAudio() {
    const files = [
      { key: "slice", url: sliceWav },
      { key: "bombThrow", url: bombThrowWav },
      { key: "bombExplode", url: bombExplodeWav },
    ];

    for (const f of files) {
      const res = await fetch(f.url);
      const buffer = await res.arrayBuffer();
      this.rawBuffers.set(f.key, buffer);
    }
  }

  private async unlockAudio() {
    if (this.audioUnlocked) return;

    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    for (const [key, raw] of this.rawBuffers.entries()) {
      const decoded = await this.audioCtx.decodeAudioData(raw.slice(0));
      this.audioBuffers.set(key, decoded);
    }

    this.audioUnlocked = true;
  }

  private playSound(key: string) {
    if (!this.audioCtx) return;

    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    const buffer = this.audioBuffers.get(key);
    if (!buffer) return;

    const source = this.audioCtx.createBufferSource();
    const gain = this.audioCtx.createGain();
    gain.gain.value = 0.4;

    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.audioCtx.destination);
    source.start(0);
  }

  /* ===============================
     SPAWNING (TIME-BASED)
  =============================== */

  private spawnItem() {
    const fromX = this.width * 0.2 + Math.random() * this.width * 0.6;
    const targetX = this.width * 0.3 + Math.random() * this.width * 0.4;

    const vx = (targetX - fromX) * 2;
    const vy = -(LAUNCH_SPEED_BASE + Math.random() * LAUNCH_SPEED_RAND);

    this.items.push({
      id: Math.random(),
      x: fromX,
      y: this.height + ITEM_SIZE,
      vx,
      vy,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 6,
      width: ITEM_SIZE,
      height: ITEM_SIZE,
      imageIndex: Math.floor(Math.random() * 4),
      sliced: false,
      offScreen: false,
      counted: false,
      isBomb: false,
    });
  }

  /* ===============================
     GAME LOOP (DELTA TIME)
  =============================== */

  private loop = (now: number) => {
    if (this.destroyed) return;

    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(dt);
    this.draw();

    this.animFrame = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (this.screen !== "playing") return;

    for (const item of this.items) {
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.vy += GRAVITY * dt;
      item.rotation += item.rotationSpeed * dt;

      if (item.y > this.height + 200) {
        item.offScreen = true;
      }
    }

    this.items = this.items.filter((i) => !i.offScreen);

    const now = performance.now();
    this.blade = this.blade.filter((b) => now - b.time < BLADE_TRAIL_DURATION);
  }

  /* ===============================
     EVENTS
  =============================== */

  private bindEvents() {
    const getPos = (e: TouchEvent | MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      if ("touches" in e && e.touches.length > 0) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top,
      };
    };

    const onDown = async (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      await this.unlockAudio();

      if (this.screen === "start") {
        this.screen = "playing";
        return;
      }

      const pos = getPos(e);
      this.blade = [{ x: pos.x, y: pos.y, time: performance.now() }];
    };

    this.canvas.addEventListener("touchstart", onDown, { passive: false });
    this.canvas.addEventListener("mousedown", onDown);
  }

  /* ===============================
     DRAW
  =============================== */

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.screen === "start") {
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("Tap to Start", this.width / 2, this.height / 2);
      return;
    }

    for (const item of this.items) {
      const img = this.images[item.imageIndex];
      if (!img.complete) continue;

      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rotation);
      ctx.drawImage(img, -item.width / 2, -item.height / 2, item.width, item.height);
      ctx.restore();
    }
  }

  /* ===============================
     RESIZE
  =============================== */

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animFrame);
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}
