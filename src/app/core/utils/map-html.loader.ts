import { File, knownFolders, path } from '@nativescript/core/file-system';

export class MapHtmlLoader {
  private static readonly ASSET_PATH = 'assets/map.html';

  static async load(): Promise<string> {
    const filePath = path.join(knownFolders.currentApp().path, this.ASSET_PATH);
    const file = File.fromPath(filePath);
    return file.readText();
  }
}
