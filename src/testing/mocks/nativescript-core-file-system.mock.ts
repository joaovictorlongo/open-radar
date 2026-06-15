export const File = {
  fromPath: jest.fn().mockReturnValue({
    readText: jest.fn().mockResolvedValue('<html></html>'),
  }),
};

export const knownFolders = {
  temp: () => ({ path: '/tmp' }),
  currentApp: () => ({ path: '/app' }),
};

export const path = {
  join: (...parts: string[]) => parts.join('/'),
};
