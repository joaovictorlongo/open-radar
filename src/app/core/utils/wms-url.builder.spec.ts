import { WmsUrlBuilder } from './wms-url.builder';

describe('WmsUrlBuilder', () => {
  const bounds = { south: -26.3, west: -53.0, north: -18.3, east: -45.0 };

  describe('build', () => {
    it('should build a WMS URL with default size', () => {
      const url = WmsUrlBuilder.build({ mapFile: '/path/to/map.map', bounds });

      expect(url).toContain('https://www.ipmetradar.com.br/cgi-bin/mapserv.fcgi');
      expect(url).toContain('map=%2Fpath%2Fto%2Fmap.map');
      expect(url).toContain('width=800');
      expect(url).toContain('height=800');
      expect(url).toContain('bbox=-53,-26.3,-45,-18.3');
      expect(url).toContain('t=');
    });

    it('should allow custom width and height', () => {
      const url = WmsUrlBuilder.build({ mapFile: '/map.map', bounds, width: 400, height: 400 });
      expect(url).toContain('width=400');
      expect(url).toContain('height=400');
    });
  });

  describe('satelliteUrl', () => {
    it('should return GOES satellite URL with cache buster', () => {
      const url = WmsUrlBuilder.satelliteUrl();
      expect(url).toContain('https://www.ipmetradar.com.br/alerta/dados/satelite/sat_goes.gif');
      expect(url).toContain('?');
    });
  });
});
