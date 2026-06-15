import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NO_ERRORS_SCHEMA,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Page, WebView, LoadEventData } from '@nativescript/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { Subscription } from 'rxjs';

import { IpmetService } from '../services/ipmet.service';
import { MapBridgeService } from '../core/services/map-bridge.service';
import { RadarImageService } from '../core/services/radar-image.service';
import { LayerStateService } from '../core/services/layer-state.service';
import { RadarAnimationService } from '../core/services/radar-animation.service';
import { LocationService } from '../core/services/location.service';
import { DateFormatterUtil } from '../core/utils/date-formatter.util';
import { MapHtmlLoader } from '../core/utils/map-html.loader';
import { MapBounds } from '../core/models/map-bounds.model';

const DEFAULT_BOUNDS: MapBounds = { south: -26.3, west: -53.0, north: -18.3, east: -45.0 };
const WEBVIEW_READY_TIMEOUT_MS = 5000;
const REFRESH_FALLBACK_MS = 20000;

@Component({
  selector: 'ns-map',
  templateUrl: './map.component.html',
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapWV', { static: false }) wvRef!: ElementRef<WebView>;

  readonly loading = signal(true);
  readonly errorMsg = signal('');
  readonly currentDataHora = signal('');

  readonly layerState = inject(LayerStateService);
  readonly animation = inject(RadarAnimationService);

  private readonly ipmet = inject(IpmetService);
  private readonly bridge = inject(MapBridgeService);
  private readonly radarImage = inject(RadarImageService);
  private readonly location = inject(LocationService);
  private readonly zone = inject(NgZone);
  private readonly page = inject(Page);

  private firstLoad = true;
  private autoPlayed = false;
  private webViewReady = false;
  private readyFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions = new Subscription();

  constructor() {
    this.page.actionBarHidden = true;
  }

  async ngAfterViewInit(): Promise<void> {
    const wv = this.wvRef?.nativeElement;
    if (!wv) return;

    this.bridge.attach(wv);

    try {
      const html = await MapHtmlLoader.load();
      wv.src = html;
    } catch {
      // Fallback silencioso; o WebView pode continuar sem o HTML local,
      // mas em cenário real o app não funcionará sem o asset.
      console.error('[Map] failed to load map.html asset');
    }

    this.readyFallbackTimer = setTimeout(() => {
      if (!this.webViewReady) {
        console.log('[Map] force-ready WebView after timeout');
        this.zone.run(() => {
          this.webViewReady = true;
          this.loading.set(false);
          this.bridge.markReady();
          this.refreshAll();
        });
      }
    }, WEBVIEW_READY_TIMEOUT_MS);
  }

  onLoadFinished(args: LoadEventData): void {
    this.zone.run(() => {
      if (args.error && this.firstLoad) {
        this.loading.set(false);
        this.errorMsg.set('Erro ao carregar mapa: ' + args.error);
        return;
      }
      if (args.error && !this.firstLoad) return;

      this.webViewReady = true;
      this.firstLoad = false;
      this.loading.set(false);
      this.bridge.attach(args.object as WebView);
      this.bridge.markReady();

      if (this.readyFallbackTimer) {
        clearTimeout(this.readyFallbackTimer);
        this.readyFallbackTimer = null;
      }

      this.refreshAll();
      this.requestLocation();
    });
  }

  refreshAll(): void {
    if (!this.webViewReady) return;

    this.loading.set(true);
    this.errorMsg.set('');

    if (!this.layerState.isWmsVisible('radar')) {
      this.layerState.ensureRadarVisible();
      this.bridge.setRadarVisibility(true);
    }

    this.refreshFallbackTimer = setTimeout(() => {
      console.warn('[Map] fallback timer - loading force-dismissed');
      this.loading.set(false);
    }, REFRESH_FALLBACK_MS);

    const dh = DateFormatterUtil.now();

    const sub = this.ipmet.getUltimo(dh).subscribe({
      next: ultimo => {
        this.clearRefreshFallback();
        const dataHora = DateFormatterUtil.parseUltimo(ultimo, DateFormatterUtil.now());
        this.currentDataHora.set(dataHora);
        this.bridge.updateTimestamp(DateFormatterUtil.formatDisplay(dataHora));
        this.loading.set(false);

        this.loadDataLayers(dataHora);
        this.loadWmsLayers();

        if (!this.autoPlayed) {
          this.autoPlayed = true;
          this.toggleAnimation();
        }
      },
      error: err => {
        this.clearRefreshFallback();
        console.error('[Map] ultimo error:', err);
        this.errorMsg.set('Erro ao conectar: ' + (err.message || err));
        this.loading.set(false);
      },
    });

    this.subscriptions.add(sub);
  }

  toggleLayer(id: string): void {
    this.layerState.toggleLayer(id);
    this.bridge.setLayerVisibility(id, this.layerState.isLayerVisible(id));
  }

  async toggleWms(id: string): Promise<void> {
    const wasRadarVisible = this.layerState.isWmsVisible('radar');
    this.layerState.toggleWms(id);
    this.syncWmsVisibility();

    if (id === 'radar') {
      const visible = this.layerState.isWmsVisible('radar');
      if (visible && !this.animation.isPlaying()) {
        await this.toggleAnimation();
      } else if (!visible) {
        this.animation.stop();
      }
      return;
    }

    if (id === 'sat' && this.layerState.isWmsVisible('sat')) {
      if (wasRadarVisible) {
        this.animation.stop();
      }
      await this.loadSatelliteImage();
      return;
    }

    if (id === 'acum' && this.layerState.isWmsVisible('acum')) {
      await this.loadAcumuladaImage();
    }
  }

  async toggleAnimation(): Promise<void> {
    if (!this.currentDataHora()) {
      this.refreshAll();
      return;
    }

    if (this.animation.isPlaying()) {
      this.animation.stop();
      this.refreshAll();
      return;
    }

    this.layerState.ensureRadarVisible();
    this.bridge.setRadarVisibility(true);
    this.bridge.setSatVisibility(false);

    await this.animation.start(this.currentDataHora(), DEFAULT_BOUNDS);
  }

  async requestLocation(): Promise<void> {
    const loc = await this.location.requestCurrentLocation();
    if (loc) {
      this.bridge.setMapCenter(loc.lat, loc.lng, 6);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.animation.stop();
    this.bridge.detach();

    if (this.readyFallbackTimer) {
      clearTimeout(this.readyFallbackTimer);
      this.readyFallbackTimer = null;
    }
    this.clearRefreshFallback();
  }

  private clearRefreshFallback(): void {
    if (this.refreshFallbackTimer) {
      clearTimeout(this.refreshFallbackTimer);
      this.refreshFallbackTimer = null;
    }
  }

  private loadDataLayers(dataHora: string): void {
    const layers = [
      { id: 'lightning', fetcher: this.ipmet.getLightning(dataHora) },
      { id: 'metar', fetcher: this.ipmet.getMetar(dataHora) },
      { id: 'inmet', fetcher: this.ipmet.getInmet(dataHora) },
    ];

    for (const { id, fetcher } of layers) {
      const sub = fetcher.subscribe({
        next: data => this.bridge.updateGeojsonLayer(id, data),
        error: e => console.error(`[Map] ${id} error`, e),
      });
      this.subscriptions.add(sub);
    }

    this.layerState.layers().forEach(l => this.bridge.setLayerVisibility(l.id, l.visible));
  }

  private syncWmsVisibility(): void {
    this.layerState.wmsLayers().forEach(l => {
      if (l.id === 'radar') {
        this.bridge.setRadarVisibility(l.visible);
      } else if (l.id === 'sat') {
        this.bridge.setSatVisibility(l.visible);
      } else if (l.id === 'acum') {
        this.bridge.setAcumVisibility(l.visible);
      }
    });
  }

  private async loadWmsLayers(): Promise<void> {
    this.syncWmsVisibility();

    if (this.layerState.isWmsVisible('radar') && !this.animation.isPlaying()) {
      await this.loadLatestRadarImage();
    }
    if (this.layerState.isWmsVisible('sat')) {
      await this.loadSatelliteImage();
    }
    if (this.layerState.isWmsVisible('acum')) {
      await this.loadAcumuladaImage();
    }
  }

  private async loadLatestRadarImage(): Promise<void> {
    const dataHora = this.currentDataHora();
    if (!dataHora) return;
    const result = await this.radarImage.loadLatestRadar(dataHora, DEFAULT_BOUNDS);
    if (result) {
      this.bridge.updateRadarImage(result.filePath, result.bounds);
    }
  }

  private async loadSatelliteImage(): Promise<void> {
    const filePath = await this.radarImage.loadSatelliteImage();
    if (filePath) {
      this.bridge.updateSatelliteImage(filePath);
    }
  }

  private async loadAcumuladaImage(): Promise<void> {
    const result = await this.radarImage.loadAcumuladaImage(DEFAULT_BOUNDS);
    if (result) {
      this.bridge.updateAcumImage(result.filePath, result.bounds);
    }
  }
}
