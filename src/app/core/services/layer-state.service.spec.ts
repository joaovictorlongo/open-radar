import { TestBed } from '@angular/core/testing';
import { LayerStateService } from './layer-state.service';

describe('LayerStateService', () => {
  let service: LayerStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LayerStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should toggle layer visibility', () => {
    const initial = service.isLayerVisible('lightning');
    service.toggleLayer('lightning');
    expect(service.isLayerVisible('lightning')).toBe(!initial);
  });

  it('should make radar and satellite mutually exclusive', () => {
    service.toggleWms('sat');
    expect(service.isWmsVisible('sat')).toBe(true);
    expect(service.isWmsVisible('radar')).toBe(false);

    service.toggleWms('radar');
    expect(service.isWmsVisible('radar')).toBe(true);
    expect(service.isWmsVisible('sat')).toBe(false);
  });

  it('should return active WMS layer id', () => {
    expect(service.activeWmsLayerId()).toBe('radar');
    service.toggleWms('radar');
    expect(service.activeWmsLayerId()).toBeNull();
  });

  it('should ensure radar visible turns satellite off', () => {
    service.toggleWms('sat');
    service.ensureRadarVisible();
    expect(service.isWmsVisible('radar')).toBe(true);
    expect(service.isWmsVisible('sat')).toBe(false);
  });
});
