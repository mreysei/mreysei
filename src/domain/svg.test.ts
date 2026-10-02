import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { escapeXml, fit, iconElement, svgDocument, textElement, widthOf, wrap } from './svg.ts';

describe('widthOf', () => {
  it('gives six tenths of the size to a character and all of it to a full-width one', () => {
    assert.equal(widthOf('abcde', 10), 30);
    assert.equal(widthOf('日本語', 10), 30);
    assert.equal(widthOf('', 10), 0);
  });

  it('counts an emoji as one character', () => {
    assert.equal(widthOf('🙂', 10), 6);
  });
});

describe('fit', () => {
  it('keeps a text that has room', () => {
    assert.equal(fit('short', 100, 10), 'short');
  });

  it('cuts a text that has none, with an ellipsis, within the room', () => {
    const cut = fit('a text that is far too long', 60, 10);

    assert.equal(cut, 'a text th…');
    assert.ok(widthOf(cut, 10) <= 60);
  });

  it('leaves no space before the ellipsis', () => {
    assert.equal(fit('word another', 36, 10), 'word…');
  });
});

describe('wrap', () => {
  it('keeps on one line what fits on one', () => {
    assert.deepEqual(wrap('a short text', 200, 10, 2), ['a short text']);
  });

  it('breaks between words when a line is full', () => {
    assert.deepEqual(wrap('one two three four', 60, 10, 3), ['one two', 'three four']);
  });

  it('cuts with an ellipsis what does not fit in the lines allowed', () => {
    const lines = wrap('one two three four five six seven', 60, 10, 2);

    assert.deepEqual(lines, ['one two', 'three fou…']);
    assert.ok(lines.every((line) => widthOf(line, 10) <= 60));
  });

  it('cuts a word wider than a line, and gives no line to an empty text', () => {
    assert.deepEqual(wrap('incomprehensibilities', 60, 10, 2), ['incompreh…']);
    assert.deepEqual(wrap('   ', 60, 10, 2), []);
  });
});

describe('escapeXml', () => {
  it('writes the five characters of markup as text', () => {
    assert.equal(
      escapeXml(`<a href="x" title='y'>&</a>`),
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
});

describe('textElement', () => {
  it('pins the width of the text, so any monospace font fits', () => {
    const element = textElement('abc', { x: 10, y: 20, fontSize: 10, fill: '#fff' });

    assert.equal(
      element,
      '<text x="10" y="20" dominant-baseline="central" font-size="10" textLength="18" lengthAdjust="spacingAndGlyphs" fill="#fff">abc</text>',
    );
  });

  it('escapes what it writes', () => {
    assert.match(
      textElement('<b>', { x: 0, y: 0, fontSize: 10, fill: '#fff', bold: true, anchor: 'middle' }),
      /font-weight="700" text-anchor="middle">&lt;b&gt;<\/text>$/,
    );
  });
});

describe('iconElement', () => {
  it('scales a 24 x 24 icon to its size', () => {
    assert.equal(
      iconElement('M0 0h24', { x: 4, y: 8, size: 12 }, '#fff'),
      '<path transform="translate(4 8) scale(0.5)" fill="#fff" d="M0 0h24"/>',
    );
  });
});

describe('svgDocument', () => {
  it('describes itself for whoever cannot see it, as text', () => {
    const svg = svgDocument({ width: 10, height: 20, description: 'A "card" <b>' }, '<g/>');

    assert.match(
      svg,
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="10" height="20" viewBox="0 0 10 20" role="img" aria-label="A &quot;card&quot; &lt;b&gt;"/,
    );
    assert.match(svg, /<title>A &quot;card&quot; &lt;b&gt;<\/title><g\/><\/svg>\n$/);
    assert.doesNotMatch(svg, /<style/);
  });
});
