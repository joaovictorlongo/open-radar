import { Injectable, signal } from '@angular/core';
import { WebView, isAndroid, isIOS } from '@nativescript/core';
import { MapBounds } from '../models/map-bounds.model';

@Injectable({ providedIn: 'root' })
export class MapBridgeService {
  private webView: WebView | null = null;
  private commandQueue: Array<() => void> = [];
  private ready = signal(false);

  readonly isReady = this.ready.asReadonly();

  attach(webView: WebView): void {
    this.webView = webView;
  }

  detach(): void {
    this.webView = null;
    this.ready.set(false);
    this.commandQueue = [];
  }

  markReady(): void {
    this.ready.set(true);
    this.flushQueue();
  }

  setRadarVisibility(visible: boolean): void {
    this.enqueue(() => this.execJs(`window.setRadarVisibility(${visible})`));
  }

  setSatVisibility(visible: boolean): void {
    this.enqueue(() => this.execJs(`window.setSatVisibility(${visible})`));
  }

  setAcumVisibility(visible: boolean): void {
    this.enqueue(() => this.execJs(`window.setAcumVisibility(${visible})`));
  }

  setLayerVisibility(layerId: string, visible: boolean): void {
    this.enqueue(() => this.execJs(`window.setLayerVisibility('${layerId}', ${visible})`));
  }

  updateRadarImage(filePath: string, bounds: MapBounds): void {
    this.enqueue(() =>
      this.execJs(
        `window.updateRadarImage("${filePath}", ${bounds.south}, ${bounds.west}, ${bounds.north}, ${bounds.east})`
      )
    );
  }

  updateSatelliteImage(filePath: string): void {
    this.enqueue(() => this.execJs(`window.updateSatelliteImage("${filePath}")`));
  }

  updateAcumImage(filePath: string, bounds: MapBounds): void {
    this.enqueue(() =>
      this.execJs(
        `window.updateAcumImage("${filePath}", ${bounds.south}, ${bounds.west}, ${bounds.north}, ${bounds.east})`
      )
    );
  }

  updateGeojsonLayer(layerId: string, data: unknown): void {
    this.enqueue(() => this.execJs(`window.updateGeojsonLayer('${layerId}', ${this.serializeData(data)})`));
  }

  updateTimestamp(text: string): void {
    this.enqueue(() => this.execJs(`window.updateTimestamp('${this.escapeString(text)}')`));
  }

  setMapCenter(lat: number, lng: number, zoom = 7): void {
    this.enqueue(() => this.execJs(`window.setMapCenter(${lat.toFixed(4)}, ${lng.toFixed(4)}, ${zoom})`));
  }

  stopRadarAnim(): void {
    this.enqueue(() => this.execJs('window.stopRadarAnim()'));
  }

  private enqueue(command: () => void): void {
    if (this.ready()) {
      command();
    } else {
      this.commandQueue.push(command);
    }
  }

  private flushQueue(): void {
    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift();
      if (command) command();
    }
  }

  private execJs(js: string): void {
    if (!this.webView) return;
    try {
      if (isAndroid) {
        this.webView.android.evaluateJavascript(js, null);
      } else if (isIOS) {
        this.webView.ios.evaluateJavaScriptCompletionHandler(js, () => {});
      }
    } catch (err) {
      console.error('[MapBridge] execJs error:', err);
    }
  }

  private serializeData(data: unknown): string {
    const json = JSON.stringify(data ?? null);
    return json.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  private escapeString(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}
