import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';

export interface GeoJsonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[] | number[][][] | number[][][][];
  };
  properties: Record<string, any>;
}

export interface GeoJsonCollection {
  type: string;
  features: GeoJsonFeature[];
}

@Injectable({ providedIn: 'root' })
export class IpmetService {
  private readonly BASE = 'https://www.ipmetradar.com.br';

  now(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  private nativeFetch(url: string, responseType: 'json' | 'text' = 'json'): Observable<any> {
    return new Observable((observer: Observer<any>) => {
      console.log('[IPMet] fetching:', url);

      try {
        const nsHttp = require('@nativescript/core/http');
        nsHttp
          .request({
            url,
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' },
          })
          .then((response: any) => {
            const content = response.content?.toString() || '';
            const preview = content.substring(0, 120);
            console.log(`[IPMet] response [${url.substring(url.indexOf('share/') + 6, url.indexOf('?'))}]: ${preview}`);

            if (responseType === 'text') {
              observer.next(content.trim());
            } else {
              try {
                const parsed = JSON.parse(content);
                observer.next(parsed);
              } catch (e) {
                console.error(`[IPMet] JSON parse error [${url}]: content length=${content.length}`);
                observer.next(null);
              }
            }
            observer.complete();
          })
          .catch((err: any) => {
            console.error('[IPMet] request error:', url, err?.message || err);
            observer.next(null);
            observer.complete();
          });
      } catch (err) {
        console.error('[IPMet] native fetch error:', err);
        observer.next(null);
        observer.complete();
      }
    });
  }

  getUltimo(dataHora?: string): Observable<string | null> {
    const dh = dataHora || this.now();
    return this.nativeFetch(`${this.BASE}/alerta/ppigis/share/ultimo.php?data_hora=${encodeURIComponent(dh)}`, 'text');
  }

  getLightning(dataHora: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch(`${this.BASE}/alerta/ppigis/share/ltg.php?data_hora=${encodeURIComponent(dataHora)}`);
  }

  getMetar(dataHora: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch(`${this.BASE}/alerta/ppigis/share/metar.php?data_hora=${encodeURIComponent(dataHora)}`);
  }

  getInmet(dataHora: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch(`${this.BASE}/alerta/ppigis/share/inmet2.php?data_hora=${encodeURIComponent(dataHora)}`);
  }

  getTitan(dataHora: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch(`${this.BASE}/alerta/ppigis/share/titan.php?data_hora=${encodeURIComponent(dataHora)}`);
  }

  getTitanv(dataHora: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch(`${this.BASE}/alerta/ppigis/share/titanv.php?data_hora=${encodeURIComponent(dataHora)}`);
  }

  getAlerta(dataHora: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch(`${this.BASE}/alerta/ppigis/share/alerta.php?data_hora=${encodeURIComponent(dataHora)}`);
  }

  getCidade(cidade: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch(`${this.BASE}/alerta/ppigis/share/cidades.php?cidade=${encodeURIComponent(cidade)}`);
  }
}
