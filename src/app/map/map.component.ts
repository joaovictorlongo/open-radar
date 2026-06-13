import { Component, ElementRef, NgZone, ViewChild, AfterViewInit, OnDestroy, NO_ERRORS_SCHEMA } from '@angular/core';
import { WebView, LoadEventData, isAndroid, isIOS, Page } from '@nativescript/core';
import { enableLocationRequest, getCurrentLocation } from '@nativescript/geolocation';

import { NativeScriptCommonModule } from '@nativescript/angular';
import { IpmetService } from '../services/ipmet.service';
import { getMapHtml } from './map.template';


interface LayerState {
  id: string;
  label: string;
  visible: boolean;
  icon: string;
}

@Component({
  selector: 'ns-map',
  templateUrl: './map.component.html',
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapWV', { static: false }) wvRef: ElementRef<WebView>;

  loading = true;
  errorMsg = '';
  autoRefresh = false;
  currentDataHora = '';

  layers: LayerState[] = [
    { id: 'lightning', label: 'Raios', visible: true, icon: '\u26a1' },
    { id: 'metar', label: 'METAR', visible: false, icon: '\u2302' },
    { id: 'inmet', label: 'INMET', visible: false, icon: '\u2302' },
  ];

  wmsLayers: LayerState[] = [
    { id: 'radar', label: 'Radar PPI', visible: true, icon: '\u2601' },
    { id: 'sat', label: 'Satélite', visible: false, icon: '\uD83C\uDF0D' },
    { id: 'acum', label: 'Chuva Acum.', visible: false, icon: '\u2614' },
  ];

  private webView: WebView | null = null;
  private ready = false;
  private pendingData: Array<() => void> = [];
  private requestingLocation = false;
  private cachedBounds = { south: -26.3, west: -53.0, north: -18.3, east: -45.0 };
  private autoPlayed = false;

  constructor(private ipmet: IpmetService, private zone: NgZone, private page: Page) {
    this.page.actionBarHidden = true;
  }

  ngAfterViewInit(): void {
    const wv = this.wvRef?.nativeElement;
    if (wv) {
      wv.src = getMapHtml();
    }

    setTimeout(() => {
      if (!this.ready) {
        console.log('[IPMet] force-ready WebView after timeout');
        this.zone.run(() => {
          this.webView = wv || null;
          this.ready = true;
          this.loading = false;
          this.refreshAll();
        });
      }
    }, 5000);
  }

  private firstLoad = true;

  onLoadFinished(args: LoadEventData): void {
    this.zone.run(() => {
      if (args.error && this.firstLoad) {
        this.loading = false;
        this.errorMsg = 'Erro ao carregar mapa: ' + args.error;
        return;
      }
      if (args.error && !this.firstLoad) return;

      this.webView = args.object as WebView;
      this.ready = true;
      this.loading = false;
      this.firstLoad = false;
      this.pendingData.forEach(fn => fn());
      this.pendingData = [];
      this.refreshAll();
      this.requestLocation();
    });
  }

  private execJs(js: string): void {
    if (!this.webView) return;
    const nativeView = (this.webView as any).nativeViewProtected;
    if (!nativeView) return;
    try {
      if (isAndroid) {
        nativeView.evaluateJavascript(js, null);
      } else if (isIOS) {
        nativeView.evaluateJavaScript(js, null);
      }
    } catch (err) {
      console.error('execJs error:', err);
    }
  }

  private sendToMap(layerId: string, data: any): void {
    const json = JSON.stringify(data);
    const safe = json.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    this.execJs(`window.updateGeojsonLayer('${layerId}', ${safe})`);
  }

  private updateTimestamp(text: string): void {
    const safe = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    this.execJs(`window.updateTimestamp('${safe}')`);
  }

  private parseUltimo(text: string | null): string {
    if (!text) return this.ipmet.now();
    const m = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}):(\d{2}):(\d{2})/);
    if (m) return `${m[3]}${m[2]}${m[1]}_${m[4]}${m[5]}${m[6]}`;
    return this.ipmet.now();
  }

  refreshAll(): void {
    if (!this.ready) return;
    this.loading = true;
    this.errorMsg = '';

    const radar = this.wmsLayers.find(l => l.id === 'radar');
    if (radar && !radar.visible) {
      radar.visible = true;
      this.execJs('window.setRadarVisibility(true)');
    }

    console.log('[IPMet] refreshAll started');

    const fallbackTimer = setTimeout(() => {
      console.warn('[IPMet] fallback timer - loading force-dismissed');
      this.loading = false;
    }, 20000);

    const dh = this.ipmet.now();
    console.log('[IPMet] requesting ultimo with:', dh);

    this.ipmet.getUltimo(dh).subscribe({
      next: ultimo => {
        clearTimeout(fallbackTimer);
        const dataHora = this.parseUltimo(ultimo);
        this.zone.run(() => {
          console.log('[IPMet] ultimo response:', ultimo);
          this.currentDataHora = dataHora;
          const displayHora = `${dataHora.slice(6,8)}/${dataHora.slice(4,6)}/${dataHora.slice(0,4)} ${dataHora.slice(9,11)}:${dataHora.slice(11,13)}:${dataHora.slice(13,15)}`;
          this.updateTimestamp(displayHora);
          this.loading = false;
        });

        if (this.autoRefresh) {
          if (this.animTimer) { clearTimeout(this.animTimer); this.animTimer = null; }
          this.execJs('window.stopRadarAnim()');
          this.animBoundsCache = this.cachedBounds;
          this.animFramesList = this.generateFrames(dataHora, 8, 10);
          this.preloadedFrames = [];
          this.animFrameIdx = 0;
          this.preloadAnimFrames();
        }

        this.ipmet.getLightning(dataHora).subscribe({
          next: data => this.sendToMap('lightning', data),
          error: e => console.error('[IPMet] lightning error', e),
        });
        this.ipmet.getMetar(dataHora).subscribe({
          next: data => this.sendToMap('metar', data),
          error: e => console.error('[IPMet] metar error', e),
        });
        this.ipmet.getInmet(dataHora).subscribe({
          next: data => this.sendToMap('inmet', data),
          error: e => console.error('[IPMet] inmet error', e),
        });
        if (!this.autoRefresh) this.loadRadarImage();
        this.layers.forEach(l => this.execJs(`window.setLayerVisibility('${l.id}', ${l.visible})`));
        this.wmsLayers.forEach(l => {
          if (l.id === 'radar') {
            this.execJs(`window.setRadarVisibility(${l.visible})`);
          } else if (l.id === 'sat') {
            this.execJs(`window.setSatVisibility(${l.visible})`);
          } else if (l.id === 'acum') {
            this.execJs(`window.setAcumVisibility(${l.visible})`);
          }
        });
        if (this.wmsLayers.find(l => l.id === 'sat')?.visible) this.loadSatImage();
        if (this.wmsLayers.find(l => l.id === 'acum')?.visible) this.loadAcumImage();
        if (!this.autoPlayed) {
          this.autoPlayed = true;
          this.zone.run(() => this.toggleAnimation());
        }
      },
      error: err => {
        clearTimeout(fallbackTimer);
        this.zone.run(() => {
          console.error('[IPMet] ultimo error:', err);
          this.errorMsg = 'Erro ao conectar: ' + (err.message || err);
          this.loading = false;
        });
      },
    });
  }

  toggleLayer(layer: LayerState): void {
    this.zone.run(() => {
      layer.visible = !layer.visible;
      this.execJs(`window.setLayerVisibility('${layer.id}', ${layer.visible})`);
    });
  }

  toggleWms(layer: LayerState): void {
    this.zone.run(() => {
      layer.visible = !layer.visible;

      if (layer.id === 'radar') {
        if (layer.visible) {
          const satLayer = this.wmsLayers.find(l => l.id === 'sat');
          if (satLayer?.visible) {
            satLayer.visible = false;
            this.execJs('window.setSatVisibility(false)');
          }
          this.execJs('window.setRadarVisibility(true)');
          if (!this.autoRefresh) this.toggleAnimation();
        } else {
          this.stopAnimation();
          this.execJs('window.setRadarVisibility(false)');
        }
        return;
      }

      if (layer.id === 'sat' && layer.visible) {
        const radarLayer = this.wmsLayers.find(l => l.id === 'radar');
        if (radarLayer?.visible) {
          radarLayer.visible = false;
          this.execJs('window.setRadarVisibility(false)');
          this.stopAnimation();
        }
      }

      const fnMap: Record<string, string> = {
        sat: 'setSatVisibility',
        acum: 'setAcumVisibility',
      };
      const fn = fnMap[layer.id];
      if (fn) {
        if (!layer.visible) {
          this.execJs(`window.${fn}(false)`);
          if (layer.id === 'sat') {
            const radar = this.wmsLayers.find(l => l.id === 'radar');
            if (radar && !radar.visible) {
              radar.visible = true;
              this.execJs('window.setRadarVisibility(true)');
              this.autoRefresh = true;
              this.refreshAll();
            }
          }
        }
        if (layer.id === 'sat' && layer.visible) this.loadSatImage();
        if (layer.id === 'acum' && layer.visible) this.loadAcumImage();
      }
    });
  }

  private loadSatImage(): void {
    const http = require('@nativescript/core/http');
    const fs = require('@nativescript/core/file-system');
    const filePath = fs.path.join(fs.knownFolders.temp().path, 'sat_goes.gif');
    http.request({
      url: 'https://www.ipmetradar.com.br/alerta/dados/satelite/sat_goes.gif?' + Date.now(),
      method: 'GET',
      headers: { Referer: 'https://www.ipmetradar.com.br/' },
    }).then((response: any) => {
      const content = response.content;
      if (content && content.toFile) {
        content.toFile(filePath);
        this.execJs('window.updateSatelliteImage("file://' + filePath + '")');
      }
    }).catch((err: any) => {
      console.warn('[IPMet] sat download failed:', err);
    });
  }

  private loadRadarImage(dataHora?: string): void {
    if (!this.wmsLayers.find(l => l.id === 'radar')?.visible) return;
    const http = require('@nativescript/core/http');
    const fs = require('@nativescript/core/file-system');
    const ts = dataHora || this.currentDataHora;
    if (!ts) return;
    const mapFile = dataHora
      ? '/home/webadm/alerta/dados/ppi/' + ts.replace('_', '') + '.map'
      : '/home/webadm/alerta/dados/ppi/ultimo.map';
    const b = this.cachedBounds;
    const url = 'https://www.ipmetradar.com.br/cgi-bin/mapserv.fcgi' +
      '?layers=merged&styles=&map=' + mapFile +
      '&transparent=true&format=image/png&version=1.1.1&service=WMS&request=GetMap' +
      '&srs=EPSG:4326&width=800&height=800' +
      '&bbox=' + b.west + ',' + b.south + ',' + b.east + ',' + b.north +
      '&t=' + Date.now();
    const filePath = fs.path.join(fs.knownFolders.temp().path, 'radar_' + (dataHora || 'latest') + '.png');
    http.request({
      url: url,
      method: 'GET',
      headers: { Referer: 'https://www.ipmetradar.com.br/' },
    }).then((response: any) => {
      const content = response.content;
      if (content && content.toFile) {
        content.toFile(filePath);
        const file = fs.File.fromPath(filePath);
        if (file.size < 3000) {
          file.remove();
          console.warn('[IPMet] radar blank image');
          return;
        }
        this.execJs('window.updateRadarImage("file://' + filePath + '", ' + b.south + ', ' + b.west + ', ' + b.north + ', ' + b.east + ')');
      }
    }).catch((err: any) => {
      console.warn('[IPMet] radar download failed:', err);
    });
  }

  private loadAcumImage(): void {
    if (!this.wmsLayers.find(l => l.id === 'acum')?.visible) return;
    const http = require('@nativescript/core/http');
    const fs = require('@nativescript/core/file-system');
    const b = this.cachedBounds;
    const url = 'https://www.ipmetradar.com.br/cgi-bin/mapserv.fcgi' +
      '?layers=merged&styles=&map=/home/webadm/alerta/dados/acum/ultimo.map' +
      '&transparent=true&format=image/png&version=1.1.1&service=WMS&request=GetMap' +
      '&srs=EPSG:4326&width=800&height=800' +
      '&bbox=' + b.west + ',' + b.south + ',' + b.east + ',' + b.north +
      '&t=' + Date.now();
    const filePath = fs.path.join(fs.knownFolders.temp().path, 'acum_latest.png');
    http.request({
      url: url,
      method: 'GET',
      headers: { Referer: 'https://www.ipmetradar.com.br/' },
    }).then((response: any) => {
      const content = response.content;
      if (content && content.toFile) {
        content.toFile(filePath);
        this.execJs('window.updateAcumImage("file://' + filePath + '", ' + b.south + ', ' + b.west + ', ' + b.north + ', ' + b.east + ')');
      }
    }).catch((err: any) => {
      console.warn('[IPMet] acum download failed:', err);
    });
  }

  private animPlaying = false;
  private animTimer: any = null;
  private animFramesList: string[] = [];
  private animFrameIdx = 0;
  private preloadedFrames: string[] = [];
  private animBoundsCache: {south: number, west: number, north: number, east: number} | null = null;

  toggleAnimation(): void {
    this.zone.run(() => {
      if (!this.currentDataHora) {
        this.refreshAll();
        return;
      }
      this.autoRefresh = !this.autoRefresh;
      if (this.autoRefresh) {
        const radar = this.wmsLayers.find(l => l.id === 'radar');
        if (radar && !radar.visible) {
          radar.visible = true;
          const sat = this.wmsLayers.find(l => l.id === 'sat');
          if (sat?.visible) { sat.visible = false; this.execJs('window.setSatVisibility(false)'); }
          this.execJs('window.setRadarVisibility(true)');
        }
        this.animBoundsCache = this.cachedBounds;
        this.execJs('window.stopRadarAnim()');
        this.animFramesList = this.generateFrames(this.currentDataHora, 8, 10);
        this.preloadedFrames = [];
        this.animFrameIdx = 0;
        this.loading = true;
        this.preloadAnimFrames();
      } else {
        this.stopAnimation();
        this.refreshAll();
      }
    });
  }

  private generateFrames(latestRaw: string, count: number, intervalMin: number): string[] {
    const frames: string[] = [];
    let current = latestRaw.replace('_', '');
    for (let i = 0; i < count; i++) {
      frames.push(current);
      const y = parseInt(current.substring(0, 4));
      const m = parseInt(current.substring(4, 6)) - 1;
      const d = parseInt(current.substring(6, 8));
      const h = parseInt(current.substring(8, 10));
      const mi = parseInt(current.substring(10, 12));
      const s = parseInt(current.substring(12, 14));
      const dt = new Date(y, m, d, h, mi, s);
      dt.setMinutes(dt.getMinutes() - intervalMin);
      current = this.pad(dt.getFullYear(), 4) + this.pad(dt.getMonth() + 1, 2) +
        this.pad(dt.getDate(), 2) + this.pad(dt.getHours(), 2) +
        this.pad(dt.getMinutes(), 2) + this.pad(dt.getSeconds(), 2);
    }
    frames.reverse();
    return frames;
  }

  private pad(n: number, d: number): string {
    return String(n).padStart(d, '0');
  }

  private preloadAnimFrames(): void {
    if (this.animFrameIdx >= this.animFramesList.length) {
      this.loading = false;
      this.startAnimation();
      return;
    }
    const ts = this.animFramesList[this.animFrameIdx];
    this.downloadRadarFrame(ts).then(filePath => {
      this.preloadedFrames.push(filePath);
      this.animFrameIdx++;
      this.preloadAnimFrames();
    }).catch(() => {
      const last = this.preloadedFrames[this.preloadedFrames.length - 1];
      this.preloadedFrames.push(last || '');
      this.animFrameIdx++;
      this.preloadAnimFrames();
    });
  }

  private downloadRadarFrame(ts: string): Promise<string> {
    const http = require('@nativescript/core/http');
    const fs = require('@nativescript/core/file-system');
    const mapFile = '/home/webadm/alerta/dados/ppi/' + ts + '.map';
    const bounds = this.animBoundsCache || this.cachedBounds;
    if (!bounds) return Promise.reject('no bounds');
    const url = 'https://www.ipmetradar.com.br/cgi-bin/mapserv.fcgi' +
      '?layers=merged&styles=&map=' + mapFile +
      '&transparent=true&format=image/png&version=1.1.1&service=WMS&request=GetMap' +
      '&srs=EPSG:4326&width=800&height=800' +
      '&bbox=' + bounds.west + ',' + bounds.south + ',' + bounds.east + ',' + bounds.north +
      '&t=' + Date.now();
    const filePath = fs.path.join(fs.knownFolders.temp().path, 'radar_' + ts + '.png');
    return http.request({
      url: url,
      method: 'GET',
      headers: { Referer: 'https://www.ipmetradar.com.br/' },
    }).then((response: any) => {
      const content = response.content;
      if (content && content.toFile) {
        content.toFile(filePath);
        const file = fs.File.fromPath(filePath);
        if (file.size < 3000) {
          file.remove();
          throw new Error('blank image');
        }
        return 'file://' + filePath;
      }
      throw new Error('no content');
    });
  }

  private startAnimation(): void {
    this.animPlaying = true;
    this.animFrameIdx = 0;
    this.showAnimFrame();
  }

  private showAnimFrame(): void {
    if (!this.autoRefresh) return;
    const filePath = this.preloadedFrames[this.animFrameIdx];
    const ts = this.animFramesList[this.animFrameIdx];
    if (ts && filePath && this.animBoundsCache) {
      const b = this.animBoundsCache;
      this.execJs('window.updateRadarImage("' + filePath + '", ' + b.south + ', ' + b.west + ', ' + b.north + ', ' + b.east + ')');
      const displayHora = ts.slice(6, 8) + '/' + ts.slice(4, 6) + '/' + ts.slice(0, 4) +
        ' ' + ts.slice(8, 10) + ':' + ts.slice(10, 12) + ':' + ts.slice(12, 14) +
        ' [' + (this.animFrameIdx + 1) + '/' + this.animFramesList.length + ']';
      this.updateTimestamp(displayHora);
    }
    const len = this.preloadedFrames.length || 1;
    this.animFrameIdx = (this.animFrameIdx + 1) % len;
    this.animTimer = setTimeout(() => this.showAnimFrame(), 1200);
  }

  private stopAnimation(): void {
    this.autoRefresh = false;
    this.animPlaying = false;
    if (this.animTimer) { clearTimeout(this.animTimer); this.animTimer = null; }
    this.execJs('window.stopRadarAnim()');
  }

  requestLocation(): void {
    if (!this.ready || this.requestingLocation) return;
    this.requestingLocation = true;

    enableLocationRequest(false, false).then(() => {
      getCurrentLocation({ timeout: 15000, maximumAge: 120000 }).then(loc => {
        this.requestingLocation = false;
        const lat = loc.latitude;
        const lng = loc.longitude;
        this.zone.run(() => {
          this.execJs(`window.setMapCenter(${lat.toFixed(4)}, ${lng.toFixed(4)}, 6)`);
        });
      }).catch(() => {
        this.requestingLocation = false;
      });
    }).catch(() => {
      this.requestingLocation = false;
    });
  }

  ngOnDestroy(): void {
  }
}
