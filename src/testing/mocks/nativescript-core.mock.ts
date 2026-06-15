export const WebView = class WebView {};
export const isAndroid = true;
export const isIOS = false;
export const Page = class Page {
  actionBarHidden = false;
};

export const Http = {
  request: jest.fn().mockResolvedValue({ content: { toString: () => '{}', toFile: () => undefined } }),
};

export const knownFolders = {
  temp: () => ({ path: '/tmp' }),
  currentApp: () => ({ path: '/app' }),
};

export const path = {
  join: (...parts: string[]) => parts.join('/'),
};

export const File = {
  fromPath: jest.fn().mockReturnValue({ size: 5000, remove: jest.fn() }),
};
