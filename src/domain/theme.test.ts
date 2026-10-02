import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BRAND, contrastRatio, PALETTES, readableColor, THEMES } from './theme.ts';

/** WCAG AA for text, and what a shape without text needs. */
const TEXT = 4.5;
const GRAPHIC = 3;

describe('contrastRatio', () => {
  it('goes from 1 for a colour on itself to 21 for black on white', () => {
    assert.equal(contrastRatio('#6342f6', '#6342f6'), 1);
    assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21);
    assert.equal(contrastRatio('#ffffff', '#000000'), contrastRatio('#000000', '#ffffff'));
  });
});

describe('the palettes', () => {
  it('keep every text readable on the surfaces it is written on', () => {
    for (const theme of THEMES) {
      const palette = PALETTES[theme];
      for (const color of [
        palette.text,
        palette.textMuted,
        palette.keyword,
        palette.string,
        palette.property,
      ]) {
        assert.ok(
          contrastRatio(color, palette.surface) >= TEXT,
          `${theme} ${color} on the surface`,
        );
      }
      assert.ok(contrastRatio(palette.textMuted, palette.surfaceRaised) >= TEXT, `${theme} title`);
    }
  });

  it('keep the chart colours, the cursor and the rest apart from the surface', () => {
    for (const theme of THEMES) {
      const palette = PALETTES[theme];
      for (const color of [...palette.chart, palette.accent, palette.border]) {
        assert.ok(contrastRatio(color, palette.surface) >= GRAPHIC, `${theme} ${color}`);
      }
    }
  });

  it('keep the texts of the brand readable', () => {
    assert.ok(contrastRatio(BRAND.onViolet, BRAND.violet) >= TEXT);
    assert.ok(contrastRatio(BRAND.onInk, BRAND.ink) >= TEXT);
    assert.ok(contrastRatio(PALETTES.dark.border, BRAND.ink) >= GRAPHIC);
  });
});

describe('readableColor', () => {
  it('keeps a brand colour that stands out', () => {
    assert.equal(readableColor('#3178c6', '#17122a', '#f1ecf7'), '#3178c6');
  });

  it('falls back for one that would not be seen, and for none', () => {
    assert.equal(readableColor('#0a0a0a', '#17122a', '#f1ecf7'), '#f1ecf7');
    assert.equal(readableColor('#f7df1e', '#ffffff', '#1d1a23'), '#1d1a23');
    assert.equal(readableColor(null, '#ffffff', '#1d1a23'), '#1d1a23');
  });
});
