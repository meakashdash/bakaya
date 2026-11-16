import { tIn } from '../i18n';
import type { Letter } from './buildLetter';
import type { Block } from './template';

function BlockView({ block, subjectPrefix }: { block: Block; subjectPrefix: string }) {
  switch (block.type) {
    case 'paragraph': {
      const subject = block.lines[0]?.startsWith(subjectPrefix) ?? false;
      return (
        <p className={subject ? 'font-semibold' : undefined}>
          {block.lines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </p>
      );
    }
    case 'bullets':
      return (
        <ul className="list-disc space-y-1 pl-5">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'numbered':
      return (
        <ol className="list-decimal space-y-1 pl-5">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case 'table':
      return (
        <table className="w-full border border-stone-300 text-left">
          <tbody>
            {block.rows.map(([k, v], i) => (
              <tr key={i} className="border-b border-stone-300 last:border-b-0">
                <th scope="row" className="w-2/5 p-2 align-top font-normal text-stone-700">
                  {k}
                </th>
                <td className="p-2 font-semibold">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
  }
}

/** On-screen version of the letter, from the same blocks as the PDF. */
export function LetterPreview({ letter }: { letter: Letter }) {
  const [name, ...rest] = letter.letterhead;
  const subjectPrefix = tIn(letter.locale, 'letter.subjectPrefix');
  return (
    <article className="rounded-sm bg-white p-6 text-[15px] leading-relaxed text-stone-900 break-words shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_-12px_rgb(0_0_0/0.25)] ring-1 ring-stone-200 sm:p-10">
      <header className="mb-5 border-b-2 border-green-800 pb-3">
        <p className="text-xl font-bold text-green-800">{name}</p>
        {rest.map((line, i) => (
          <p key={i} className="text-sm text-stone-700">
            {line}
          </p>
        ))}
      </header>
      <div className="space-y-4">
        {letter.body.map((block, i) => (
          <BlockView key={i} block={block} subjectPrefix={subjectPrefix} />
        ))}
      </div>
      <footer className="mt-6 border-t border-stone-300 pt-3 text-xs text-stone-600">
        {letter.disclaimer}
      </footer>
    </article>
  );
}
