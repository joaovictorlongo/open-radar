import { Injectable } from '@angular/core';
import { Http, knownFolders, path, File } from '@nativescript/core';
import { MapBounds } from '../models/map-bounds.model';
import { RadarImageResult } from '../models/radar-image-result.model';
import { WmsUrlBuilder } from '../utils/wms-url.builder';

@Injectable({ providedIn: 'root' })
export class RadarImageService {
  private static readonly MIN_VALID_SIZE = 3000;
  private static readonly DEFAULT_SIZE = 800;

  private readonly http = Http;
  private readonly referer = 'https://www.ipmetradar.com.br/';
  private readonly tempFolder = knownFolders.temp();

  async loadLatestRadar(dataHora: string, bounds: MapBounds): Promise<RadarImageResult | null> {
    const mapFile = `/home/webadm/alerta/dados/ppi/${dataHora.replace('_', '')}.map`;
    return this.downloadRadar(mapFile, bounds, dataHora);
  }

  async loadRadarFrame(ts: string, bounds: MapBounds): Promise<string | null> {
    const mapFile = `/home/webadm/alerta/dados/ppi/${ts}.map`;
    const result = await this.downloadRadar(mapFile, bounds, ts);
    return result ? result.filePath : null;
  }

  async loadSatelliteImage(): Promise<string | null> {
    const filePath = path.join(this.tempFolder.path, 'sat_goes.gif');
    try {
      const response = await this.http.request({
        url: WmsUrlBuilder.satelliteUrl(),
        method: 'GET',
        headers: { Referer: this.referer },
      });
      const content = response.content;
      if (content && content.toFile) {
        content.toFile(filePath);
        return 'file://' + filePath;
      }
      return null;
    } catch (err) {
      console.warn('[RadarImage] sat download failed:', err);
      return null;
    }
  }

  async loadAcumuladaImage(bounds: MapBounds): Promise<RadarImageResult | null> {
    const mapFile = '/home/webadm/alerta/dados/acum/ultimo.map';
    const url = WmsUrlBuilder.build({ mapFile, bounds });
    const filePath = path.join(this.tempFolder.path, 'acum_latest.png');
    return this.downloadImage(url, filePath, bounds);
  }

  private async downloadRadar(mapFile: string, bounds: MapBounds, suffix: string): Promise<RadarImageResult | null> {
    const url = WmsUrlBuilder.build({ mapFile, bounds });
    const filePath = path.join(this.tempFolder.path, `radar_${suffix}.png`);
    return this.downloadImage(url, filePath, bounds);
  }

  private async downloadImage(url: string, filePath: string, bounds: MapBounds): Promise<RadarImageResult | null> {
    try {
      const response = await this.http.request({
        url,
        method: 'GET',
        headers: { Referer: this.referer },
      });
      const content = response.content;
      if (content && content.toFile) {
        content.toFile(filePath);
        const file = File.fromPath(filePath);
        if (file.size < RadarImageService.MIN_VALID_SIZE) {
          file.remove();
          console.warn('[RadarImage] blank image detected:', url);
          return null;
        }
        return { filePath: 'file://' + filePath, bounds };
      }
      return null;
    } catch (err) {
      console.warn('[RadarImage] download failed:', url, err);
      return null;
    }
  }
}
