// The A4 letter as a react-pdf document. Imported only by pdf.tsx (lazy-loaded).
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { tIn } from '../i18n';
import type { Letter } from './buildLetter';
import { fontFamilyFor } from './pdfFonts';
import type { Block } from './template';

const GREEN = '#166534';
const GREY = '#44403c';

const s = StyleSheet.create({
  page: {
    fontSize: 10.5,
    lineHeight: 1.45,
    color: '#1c1917',
    paddingTop: 40,
    paddingHorizontal: 56,
    paddingBottom: 76, // room for the disclaimer footer
  },
  letterhead: {
    borderBottomWidth: 1.5,
    borderBottomColor: GREEN,
    paddingBottom: 10,
    marginBottom: 16,
  },
  supplierName: { fontSize: 18, fontWeight: 'bold', color: GREEN, lineHeight: 1.25 },
  letterheadLine: { fontSize: 9.5, color: GREY },
  block: { marginBottom: 9 },
  bold: { fontWeight: 'bold' },
  listItem: { flexDirection: 'row', marginBottom: 3 },
  marker: { width: 16 },
  listText: { flex: 1 },
  table: { borderWidth: 0.75, borderColor: '#d6d3d1', marginBottom: 10 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: '#d6d3d1' },
  tableRowLast: { flexDirection: 'row' },
  tableKey: { width: '45%', paddingVertical: 3, paddingHorizontal: 5, color: GREY },
  tableValue: { width: '55%', paddingVertical: 3, paddingHorizontal: 5, fontWeight: 'bold' },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 56,
    right: 56,
    borderTopWidth: 0.75,
    borderTopColor: '#d6d3d1',
    paddingTop: 6,
    fontSize: 7.5,
    lineHeight: 1.4,
    color: '#57534e',
  },
});

function BlockView({ block, subjectPrefix }: { block: Block; subjectPrefix: string }) {
  switch (block.type) {
    case 'paragraph': {
      const subject = block.lines[0]?.startsWith(subjectPrefix) ?? false;
      return (
        <View style={s.block} wrap={false}>
          {block.lines.map((line, i) => (
            <Text key={i} style={subject ? s.bold : {}}>
              {line}
            </Text>
          ))}
        </View>
      );
    }
    case 'bullets':
    case 'numbered':
      return (
        <View style={s.block}>
          {block.items.map((item, i) => (
            <View key={i} style={s.listItem} wrap={false}>
              <Text style={s.marker}>{block.type === 'bullets' ? '•' : `${i + 1}.`}</Text>
              <Text style={s.listText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'table':
      return (
        <View style={s.table} wrap={false}>
          {block.rows.map(([k, v], i) => (
            <View key={i} style={i === block.rows.length - 1 ? s.tableRowLast : s.tableRow}>
              <Text style={s.tableKey}>{k}</Text>
              <Text style={s.tableValue}>{v}</Text>
            </View>
          ))}
        </View>
      );
  }
}

export function LetterDocument({ letter, title }: { letter: Letter; title: string }) {
  const [name, ...rest] = letter.letterhead;
  const subjectPrefix = tIn(letter.locale, 'letter.subjectPrefix');
  return (
    <Document
      title={title}
      author={name ?? ''}
      creator=""
      producer=""
      language={letter.locale === 'hi' ? 'hi-IN' : 'en-IN'}
    >
      <Page size="A4" style={[s.page, { fontFamily: fontFamilyFor(letter.locale) }]}>
        <View style={s.letterhead}>
          <Text style={s.supplierName}>{name}</Text>
          {rest.map((line, i) => (
            <Text key={i} style={s.letterheadLine}>
              {line}
            </Text>
          ))}
        </View>
        {letter.body.map((block, i) => (
          <BlockView key={i} block={block} subjectPrefix={subjectPrefix} />
        ))}
        <Text style={s.footer} fixed>
          {letter.disclaimer}
        </Text>
      </Page>
    </Document>
  );
}
