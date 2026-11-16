import { blocksToPlainText, parseBlocks, renderTemplate } from '../../src/letters/template';

describe('renderTemplate', () => {
  it('fills variables and keeps text typed by the user literally', () => {
    expect(renderTemplate('Hi {{name}}.', { name: 'Asha {{x}}' })).toBe('Hi Asha {{x}}.');
  });

  it('renders sections only when the value is truthy, including nested ones', () => {
    const tpl = 'A{{#on}} B{{#inner}} C{{/inner}}{{/on}}{{#off}} D{{/off}}';
    expect(renderTemplate(tpl, { on: true, inner: true, off: false })).toBe('A B C');
    expect(renderTemplate(tpl, { on: true, inner: '', off: 'x' })).toBe('A B D');
  });

  it('collapses the blank lines left by removed sections, and normalises CRLF', () => {
    expect(renderTemplate('a\r\n\r\n{{#x}}b\r\n{{/x}}\r\n\r\nc\r\n', { x: false })).toBe('a\n\nc');
  });

  it('fails loudly when the template and the values do not match', () => {
    expect(() => renderTemplate('{{missing}}', {})).toThrow(/missing/);
    expect(() => renderTemplate('{{#missing}}x{{/missing}}', {})).toThrow(/missing/);
    expect(() => renderTemplate('{{flag}}', { flag: true })).toThrow(/flag/);
  });
});

describe('parseBlocks', () => {
  it('recognises paragraphs, bullets, numbered lists and tables', () => {
    const text = [
      'Line one',
      'Line two',
      '',
      '- a',
      '- b',
      '',
      '1. x',
      '2. y',
      '',
      '| | |',
      '| --- | --- |',
      '| Invoice | INV-1 |',
      '| Amount | ₹5,00,000 |',
    ].join('\n');
    expect(parseBlocks(text)).toEqual([
      { type: 'paragraph', lines: ['Line one', 'Line two'] },
      { type: 'bullets', items: ['a', 'b'] },
      { type: 'numbered', items: ['x', 'y'] },
      {
        type: 'table',
        rows: [
          ['Invoice', 'INV-1'],
          ['Amount', '₹5,00,000'],
        ],
      },
    ]);
  });

  it('keeps an address line like "1. Main Road" as text inside a paragraph', () => {
    expect(parseBlocks('To,\n1. Main Road\nPune')).toEqual([
      { type: 'paragraph', lines: ['To,', '1. Main Road', 'Pune'] },
    ]);
  });

  it('turns blocks into plain text for copying', () => {
    const blocks = parseBlocks('Hi\n\n- a\n\n1. x\n2. y\n\n| K | V |');
    expect(blocksToPlainText(blocks)).toBe('Hi\n\n- a\n\n1. x\n2. y\n\nK: V');
  });
});
