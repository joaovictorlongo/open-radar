import { MapBridgeService } from './map-bridge.service';

class MockWebView {
  android = { evaluateJavascript: jest.fn() };
  ios = { evaluateJavaScriptCompletionHandler: jest.fn() };
}

describe('MapBridgeService', () => {
  let service: MapBridgeService;
  let webView: MockWebView;

  beforeEach(() => {
    service = new MapBridgeService();
    webView = new MockWebView();
    service.attach(webView as unknown as import('@nativescript/core').WebView);
    service.markReady();
  });

  it('should queue commands until ready', () => {
    const freshService = new MapBridgeService();
    freshService.setRadarVisibility(true);
    expect(freshService.isReady()).toBe(false);

    const wv = new MockWebView();
    freshService.attach(wv as unknown as import('@nativescript/core').WebView);
    freshService.markReady();

    expect(wv.android.evaluateJavascript).toHaveBeenCalled();
  });

  it('should send setRadarVisibility message', () => {
    service.setRadarVisibility(true);
    expect(webView.android.evaluateJavascript).toHaveBeenCalled();

    const call = (webView.android.evaluateJavascript as jest.Mock).mock.calls[0][0];
    expect(call).toContain('handleMapMessage');
    expect(call).toContain('setRadarVisibility');
  });

  it('should send updateTimestamp message', () => {
    service.updateTimestamp('15/06/2026 14:30:45');

    const call = (webView.android.evaluateJavascript as jest.Mock).mock.calls[0][0];
    expect(call).toContain('updateTimestamp');
    expect(call).toContain('15/06/2026 14:30:45');
  });
});
