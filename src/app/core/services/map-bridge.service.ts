import { Injectable, signal } from '@angular/core';
import { WebView, isAndroid, isIOS } from '@nativescript/core';
import { MapBounds } from '../models/map-bounds.model';
import {
  MapMessage,
  MapMessageAction,
  SetLayerVisibilityPayload,
  UpdateGeojsonLayerPayload,
  UpdateRadarImagePayload,
  UpdateTimestampPayload,
  SetMapCenterPayload,
} from '../models/map-message.model';

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
    this.send('setRadarVisibility', { visible });
  }

  setSatVisibility(visible: boolean): void {
    this.send('setSatVisibility', { visible });
  }

  setAcumVisibility(visible: boolean): void {
    this.send('setAcumVisibility', { visible });
  }

  setLayerVisibility(layerId: string, visible: boolean): void {
    this.send('setLayerVisibility', { layerId, visible } as SetLayerVisibilityPayload);
  }

  updateRadarImage(filePath: string, bounds: MapBounds): void {
    this.send('updateRadarImage', { filePath, bounds } as UpdateRadarImagePayload);
  }

  updateSatelliteImage(filePath: string): void {
    this.send('updateSatelliteImage', { filePath });
  }

  updateAcumImage(filePath: string, bounds: MapBounds): void {
    this.send('updateAcumImage', { filePath, bounds } as UpdateRadarImagePayload);
  }

  updateGeojsonLayer(layerId: string, data: unknown): void {
    this.send('updateGeojsonLayer', { layerId, data } as UpdateGeojsonLayerPayload);
  }

  updateTimestamp(text: string): void {
    this.send('updateTimestamp', { text } as UpdateTimestampPayload);
  }

  setMapCenter(lat: number, lng: number, zoom = 7): void {
    this.send('setMapCenter', { lat, lng, zoom } as SetMapCenterPayload);
  }

  stopRadarAnim(): void {
    this.send('stopRadarAnim', {});
  }

  private send(action: MapMessageAction, payload: unknown): void {
    const message: MapMessage = { action, payload };
    this.enqueue(() => this.execMessage(message));
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

  private execMessage(message: MapMessage): void {
    if (!this.webView) return;

    const json = JSON.stringify(message);
    // Escapa a string JSON para ser injetada como argumento string dentro de
    // JSON.parse('...'). Isso evita concatenação direta de valores dinâmicos.
    const escaped = json
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');

    const js = `window.handleMapMessage(JSON.parse('${escaped}'))`;

    try {
      if (isAndroid) {
        this.webView.android.evaluateJavascript(js, null);
      } else if (isIOS) {
        this.webView.ios.evaluateJavaScriptCompletionHandler(js, () => {});
      }
    } catch (err) {
      console.error('[MapBridge] execMessage error:', err);
    }
  }
}
