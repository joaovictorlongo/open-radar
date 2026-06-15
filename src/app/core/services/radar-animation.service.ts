import { Injectable, signal, inject } from '@angular/core';
import { MapBounds } from '../models/map-bounds.model';
import { MapBridgeService } from './map-bridge.service';
import { RadarImageService } from './radar-image.service';
import { DateFormatterUtil } from '../utils/date-formatter.util';

@Injectable({ providedIn: 'root' })
export class RadarAnimationService {
  private readonly bridge = inject(MapBridgeService);
  private readonly radarImage = inject(RadarImageService);

  readonly isPlaying = signal(false);
  readonly loading = signal(false);
  readonly currentFrame = signal<string>('');
  readonly currentIndex = signal(0);
  readonly totalFrames = signal(0);

  private frames: string[] = [];
  private preloadedFrames: (string | null)[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private bounds: MapBounds | null = null;

  async start(latestDataHora: string, bounds: MapBounds): Promise<void> {
    this.stop();
    this.bounds = bounds;
    this.frames = DateFormatterUtil.generateFrames(latestDataHora, 8, 10);
    this.totalFrames.set(this.frames.length);
    this.preloadedFrames = [];
    this.currentIndex.set(0);
    this.isPlaying.set(true);
    this.loading.set(true);

    await this.preloadFrames(bounds);

    if (!this.isPlaying()) return;

    this.loading.set(false);
    this.startPlayback();
  }

  stop(): void {
    this.isPlaying.set(false);
    this.loading.set(false);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.frames = [];
    this.preloadedFrames = [];
    this.currentFrame.set('');
    this.currentIndex.set(0);
    this.totalFrames.set(0);
    this.bridge.stopRadarAnim();
  }

  private async preloadFrames(bounds: MapBounds): Promise<void> {
    const results = await Promise.all(this.frames.map(ts => this.radarImage.loadRadarFrame(ts, bounds)));
    this.preloadedFrames = results.map((path, idx) => path ?? results[idx - 1] ?? '');
  }

  private startPlayback(): void {
    this.currentIndex.set(0);
    this.showFrame();
  }

  private showFrame(): void {
    if (!this.isPlaying()) return;

    const idx = this.currentIndex();
    const filePath = this.preloadedFrames[idx];
    const ts = this.frames[idx];

    if (ts && filePath && this.bounds) {
      const b = this.bounds;
      this.bridge.updateRadarImage(filePath, b);
      this.currentFrame.set(ts);
      this.bridge.updateTimestamp(DateFormatterUtil.formatAnimDisplay(ts, idx, this.frames.length));
    }

    const len = this.preloadedFrames.length || 1;
    this.currentIndex.set((idx + 1) % len);
    this.timer = setTimeout(() => this.showFrame(), 1200);
  }
}
