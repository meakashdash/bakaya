// /terms: information only, not legal advice.
import { WithEmail } from '../components/Contact';
import { ContentPage, Section } from '../components/content';
import { Disclaimer } from '../components/result/cards';
import { t, tSections } from '../i18n';

export default function Terms() {
  return (
    <ContentPage title={t('terms.title')} intro={t('terms.intro')}>
      {tSections('terms.sections').map((s) => (
        <Section key={s.heading} heading={s.heading}>
          <p>{s.body}</p>
        </Section>
      ))}
      <Section heading={t('terms.contact.heading')}>
        <p>
          <WithEmail k="terms.contact.body" />
        </p>
      </Section>
      <Disclaimer />
    </ContentPage>
  );
}
