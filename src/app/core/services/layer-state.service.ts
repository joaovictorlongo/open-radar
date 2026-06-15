import { Injectable, signal } from '@angular/core';
import { LayerState } from '../models/layer.model';

@Injectable({ providedIn: 'root' })
export class LayerStateService {
  private readonly _layers = signal<LayerState[]>([
    { id: 'lightning', label: 'Raios', visible: true, icon: '\u26a1' },
    { id: 'metar', label: 'METAR', visible: false, icon: '\u2302' },
    { id: 'inmet', label: 'INMET', visible: false, icon: '\u2302' },
  ]);

  private readonly _wmsLayers = signal<LayerState[]>([
    { id: 'radar', label: 'Radar PPI', visible: true, icon: '\u2601' },
    { id: 'sat', label: 'Satélite', visible: false, icon: '\uD83C\uDF0D' },
    { id: 'acum', label: 'Chuva Acum.', visible: false, icon: '\u2614' },
  ]);

  readonly layers = this._layers.asReadonly();
  readonly wmsLayers = this._wmsLayers.asReadonly();

  isLayerVisible(id: string): boolean {
    return this._layers().some(l => l.id === id && l.visible);
  }

  isWmsVisible(id: string): boolean {
    return this._wmsLayers().some(l => l.id === id && l.visible);
  }

  activeWmsLayerId(): string | null {
    return this._wmsLayers().find(l => l.visible)?.id ?? null;
  }

  toggleLayer(id: string): void {
    this._layers.update(layers =>
      layers.map(l => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }

  toggleWms(id: string): void {
    this._wmsLayers.update(layers => {
      const target = layers.find(l => l.id === id);
      if (!target) return layers;

      const willBeVisible = !target.visible;

      // Radar e satélite são mutuamente exclusivos.
      if (id === 'radar' && willBeVisible) {
        return layers.map(l => {
          if (l.id === 'radar') return { ...l, visible: true };
          if (l.id === 'sat') return { ...l, visible: false };
          return l;
        });
      }

      if (id === 'sat' && willBeVisible) {
        return layers.map(l => {
          if (l.id === 'sat') return { ...l, visible: true };
          if (l.id === 'radar') return { ...l, visible: false };
          return l;
        });
      }

      return layers.map(l => (l.id === id ? { ...l, visible: !l.visible } : l));
    });
  }

  ensureRadarVisible(): void {
    this._wmsLayers.update(layers =>
      layers.map(l => (l.id === 'radar' ? { ...l, visible: true } : l.id === 'sat' ? { ...l, visible: false } : l))
    );
  }

  setWmsVisibility(id: string, visible: boolean): void {
    this._wmsLayers.update(layers => layers.map(l => (l.id === id ? { ...l, visible } : l)));
  }
}
