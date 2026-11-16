// A tiny template engine for templates/*.md, and a parser for the small Markdown subset they use.
// Supported: {{name}} variables and {{#name}}...{{/name}} sections (rendered when the value is truthy).
// The rendered letter is parsed into blocks so the on-screen preview, the PDF and "Copy text"
// all come from the same structure.

export type TemplateValues = Record<string, string | boolean>;

const SECTION = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const VARIABLE = /\{\{(\w+)\}\}/g;

function renderSections(template: string, values: TemplateValues): string {
  return template.replace(SECTION, (_, name: string, inner: string) => {
    if (!(name in values)) throw new Error(`Template section has no value: ${name}`);
    return values[name] ? renderSections(inner, values) : '';
  });
}

/** Render a template. Throws if it uses a name with no value, so a template/data mismatch can't ship. */
export function renderTemplate(template: string, values: TemplateValues): string {
  const withSections = renderSections(template.replace(/\r\n?/g, '\n'), values);
  // One pass, so text typed by the user is never re-read as template syntax.
  const filled = withSections.replace(VARIABLE, (_, name: string) => {
    const v = values[name];
    if (typeof v !== 'string') throw new Error(`Template variable has no text value: ${name}`);
    return v;
  });
  return filled.replace(/\n{3,}/g, '\n\n').trim();
}

export type Block =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'table'; rows: [string, string][] };

const BULLET = /^- (.*)$/;
const NUMBERED = /^\d+\. (.*)$/;
const TABLE_ROW = /^\|.*\|$/;
const TABLE_SEPARATOR = /^\|(\s*:?-+:?\s*\|)+$/;

/**
 * Split rendered text into blocks at blank lines. A block is a list or a table only when
 * EVERY line matches, so an address line like "1. Main Road" inside a paragraph stays text.
 */
export function parseBlocks(text: string): Block[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.split('\n').map((l) => l.trimEnd()))
    .filter((lines) => lines.some((l) => l.trim() !== ''))
    .map((lines): Block => {
      if (lines.every((l) => BULLET.test(l))) {
        return { type: 'bullets', items: lines.map((l) => l.replace(BULLET, '$1')) };
      }
      if (lines.every((l) => NUMBERED.test(l))) {
        return { type: 'numbered', items: lines.map((l) => l.replace(NUMBERED, '$1')) };
      }
      if (lines.every((l) => TABLE_ROW.test(l))) {
        const rows = lines
          .filter((l) => !TABLE_SEPARATOR.test(l))
          .map((l) => {
            const [a = '', b = ''] = l
              .slice(1, -1)
              .split('|')
              .map((c) => c.trim());
            return [a, b] as [string, string];
          })
          .filter(([a, b]) => a !== '' || b !== '');
        return { type: 'table', rows };
      }
      return { type: 'paragraph', lines };
    });
}

/** Plain text for "Copy text": lists keep their markers, table rows become "Label: value". */
export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'paragraph':
          return b.lines.join('\n');
        case 'bullets':
          return b.items.map((i) => `- ${i}`).join('\n');
        case 'numbered':
          return b.items.map((item, n) => `${n + 1}. ${item}`).join('\n');
        case 'table':
          return b.rows.map(([k, v]) => `${k}: ${v}`).join('\n');
      }
    })
    .join('\n\n');
}
