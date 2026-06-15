export class DateFormatterUtil {
  private static pad(n: number, d: number): string {
    return String(n).padStart(d, '0');
  }

  static now(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  static parseUltimo(text: string | null, fallback: string): string {
    if (!text) return fallback;
    const m = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}):(\d{2}):(\d{2})/);
    if (m) return `${m[3]}${m[2]}${m[1]}_${m[4]}${m[5]}${m[6]}`;
    return fallback;
  }

  static generateFrames(latestRaw: string, count: number, intervalMin: number): string[] {
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
      current =
        this.pad(dt.getFullYear(), 4) +
        this.pad(dt.getMonth() + 1, 2) +
        this.pad(dt.getDate(), 2) +
        this.pad(dt.getHours(), 2) +
        this.pad(dt.getMinutes(), 2) +
        this.pad(dt.getSeconds(), 2);
    }
    frames.reverse();
    return frames;
  }

  static formatDisplay(dataHora: string): string {
    return `${dataHora.slice(6, 8)}/${dataHora.slice(4, 6)}/${dataHora.slice(0, 4)} ${dataHora.slice(9, 11)}:${dataHora.slice(11, 13)}:${dataHora.slice(13, 15)}`;
  }

  static formatAnimDisplay(ts: string, index: number, total: number): string {
    return (
      ts.slice(6, 8) +
      '/' +
      ts.slice(4, 6) +
      '/' +
      ts.slice(0, 4) +
      ' ' +
      ts.slice(8, 10) +
      ':' +
      ts.slice(10, 12) +
      ':' +
      ts.slice(12, 14) +
      ' [' +
      (index + 1) +
      '/' +
      total +
      ']'
    );
  }
}
