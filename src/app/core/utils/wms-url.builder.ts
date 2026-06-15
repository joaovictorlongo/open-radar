import { MapBounds } from '../models/map-bounds.model';

export interface WmsUrlOptions {
  mapFile: string;
  bounds: MapBounds;
  width?: number;
  height?: number;
  layers?: string;
}

export class WmsUrlBuilder {
  private static readonly BASE = 'https://www.ipmetradar.com.br/cgi-bin/mapserv.fcgi';
  private static readonly DEFAULT_SIZE = 800;

  static build(options: WmsUrlOptions): string {
    const { mapFile, bounds, width = this.DEFAULT_SIZE, height = this.DEFAULT_SIZE, layers = 'merged' } = options;
    return (
      `${this.BASE}?layers=${encodeURIComponent(layers)}&styles=&map=${encodeURIComponent(mapFile)}` +
      `&transparent=true&format=image/png&version=1.1.1&service=WMS&request=GetMap` +
      `&srs=EPSG:4326&width=${width}&height=${height}` +
      `&bbox=${bounds.west},${bounds.south},${bounds.east},${bounds.north}` +
      `&t=${Date.now()}`
    );
  }

  static satelliteUrl(): string {
    return `https://www.ipmetradar.com.br/alerta/dados/satelite/sat_goes.gif?${Date.now()}`;
  }
}
