import { maskMoney } from '../currency';

describe('maskMoney', () => {
  it('keeps a suffix currency after the dots', () => {
    expect(maskMoney('IRT')).toBe('••••• IRT');
  });

  it('keeps a glued prefix symbol before the dots', () => {
    expect(maskMoney('USD')).toBe('⁦$•••••⁩');
  });

  it('keeps the space after a spaced prefix code', () => {
    expect(maskMoney('AED')).toBe('⁦AED •••••⁩');
  });

  // Bullets are neutral characters, so unlike the digits they stand in for they
  // give a prefix symbol nothing to anchor against: inside an RTL line the run
  // inherits the paragraph direction and `$•••••` renders as `•••••$`. The
  // isolate does what the digits used to do implicitly, and belongs in the
  // string so that call sites which only ever get text are covered too.
  it('wraps a prefix symbol in a bidi isolate so RTL cannot reorder it', () => {
    const masked = maskMoney('USD', { locale: 'fa' });
    expect(masked.startsWith('⁦')).toBe(true);
    expect(masked.endsWith('⁩')).toBe(true);
    expect(masked.indexOf('$')).toBeLessThan(masked.indexOf('•'));
  });

  it('leaves a suffix currency unisolated — the currency word anchors it', () => {
    expect(maskMoney('IRT', { locale: 'fa' })).not.toContain('⁦');
  });

  it('uses the Farsi symbol in the fa locale', () => {
    expect(maskMoney('IRT', { locale: 'fa' })).toBe('••••• تومان');
  });

  it('is width-stable across currencies of wildly different magnitude', () => {
    const dots = (s: string) => (s.match(/•/g) ?? []).length;
    expect(dots(maskMoney('IRT'))).toBe(dots(maskMoney('USD')));
  });

  it('honors a custom dot count for the secondary line', () => {
    expect(maskMoney('USD', { dots: 4 })).toBe('⁦$••••⁩');
  });
});
