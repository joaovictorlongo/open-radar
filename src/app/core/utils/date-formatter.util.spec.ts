import { DateFormatterUtil } from './date-formatter.util';

describe('DateFormatterUtil', () => {
  describe('parseUltimo', () => {
    it('should parse formatted date string', () => {
      const result = DateFormatterUtil.parseUltimo('15/06/2026 - 14:30:45', 'fallback');
      expect(result).toBe('20260615_143045');
    });

    it('should return fallback for null', () => {
      expect(DateFormatterUtil.parseUltimo(null, 'fallback')).toBe('fallback');
    });

    it('should return fallback for invalid format', () => {
      expect(DateFormatterUtil.parseUltimo('invalid', 'fallback')).toBe('fallback');
    });
  });

  describe('generateFrames', () => {
    it('should generate 8 frames 10 minutes apart in reverse order', () => {
      const frames = DateFormatterUtil.generateFrames('20260615_143045', 8, 10);

      expect(frames).toHaveLength(8);
      expect(frames[frames.length - 1]).toBe('20260615143045');
      expect(frames[0]).toBe('20260615132045');
    });

    it('should handle count of 1', () => {
      const frames = DateFormatterUtil.generateFrames('20260615_143045', 1, 10);
      expect(frames).toEqual(['20260615143045']);
    });
  });

  describe('formatDisplay', () => {
    it('should format dataHora to display string', () => {
      expect(DateFormatterUtil.formatDisplay('20260615_143045')).toBe('15/06/2026 14:30:45');
    });
  });

  describe('formatAnimDisplay', () => {
    it('should include index and total', () => {
      expect(DateFormatterUtil.formatAnimDisplay('20260615143045', 2, 8)).toBe('15/06/2026 14:30:45 [3/8]');
    });
  });
});
