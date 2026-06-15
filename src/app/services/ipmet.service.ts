import { Injectable } from '@angular/core';
import { Http } from '@nativescript/core';
import { Observable, Observer } from 'rxjs';
import { DateFormatterUtil } from '../core/utils/date-formatter.util';

export interface GeoJsonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[] | number[][][] | number[][][][];
  };
  properties: Record<string, unknown>;
}

export interface GeoJsonCollection {
  type: string;
  features: GeoJsonFeature[];
}

type HttpResponse = { content?: { toString: () => string } };

@Injectable({ providedIn: 'root' })
export class IpmetService {
  private readonly baseUrl = 'https://www.ipmetradar.com.br';
  private readonly http = Http;

  private nativeFetch<T>(url: string, responseType: 'json' | 'text' = 'json'): Observable<T | null> {
    return new Observable((observer: Observer<T | null>) => {
      console.log('[IPMet] fetching:', url);

      this.http
        .request({
          url,
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' },
        })
        .then((response: HttpResponse) => {
          const content = response.content?.toString() || '';
          const preview = content.substring(0, 120);
          console.log(`[IPMet] response: ${preview}`);

          if (responseType === 'text') {
            observer.next(content.trim() as T);
          } else {
            try {
              const parsed = JSON.parse(content) as T;
              observer.next(parsed);
            } catch {
              console.error(`[IPMet] JSON parse error [${url}]: content length=${content.length}`);
              observer.next(null);
            }
          }
          observer.complete();
        })
        .catch((err: { message?: string }) => {
          console.error('[IPMet] request error:', url, err?.message || err);
          observer.next(null);
          observer.complete();
        });
    });
  }

  getUltimo(dataHora?: string): Observable<string | null> {
    const dh = dataHora || DateFormatterUtil.now();
    return this.nativeFetch<string>(
      `${this.baseUrl}/alerta/ppigis/share/ultimo.php?data_hora=${encodeURIComponent(dh)}`,
      'text'
    );
  }

  getLightning(dataHora: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch<GeoJsonCollection>(
      `${this.baseUrl}/alerta/ppigis/share/ltg.php?data_hora=${encodeURIComponent(dataHora)}`
    );
  }

  getMetar(dataHora: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch<GeoJsonCollection>(
      `${this.baseUrl}/alerta/ppigis/share/metar.php?data_hora=${encodeURIComponent(dataHora)}`
    );
  }

  getInmet(dataHora: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch<GeoJsonCollection>(
      `${this.baseUrl}/alerta/ppigis/share/inmet2.php?data_hora=${encodeURIComponent(dataHora)}`
    );
  }

  getTitan(dataHora: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch<GeoJsonCollection>(
      `${this.baseUrl}/alerta/ppigis/share/titan.php?data_hora=${encodeURIComponent(dataHora)}`
    );
  }

  getTitanv(dataHora: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch<GeoJsonCollection>(
      `${this.baseUrl}/alerta/ppigis/share/titanv.php?data_hora=${encodeURIComponent(dataHora)}`
    );
  }

  getAlerta(dataHora: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch<GeoJsonCollection>(
      `${this.baseUrl}/alerta/ppigis/share/alerta.php?data_hora=${encodeURIComponent(dataHora)}`
    );
  }

  getCidade(cidade: string): Observable<GeoJsonCollection | null> {
    return this.nativeFetch<GeoJsonCollection>(
      `${this.baseUrl}/alerta/ppigis/share/cidades.php?cidade=${encodeURIComponent(cidade)}`
    );
  }
}
