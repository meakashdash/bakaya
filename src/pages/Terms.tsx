// /terms: information only, not legal advice.
import { ContentPage, Section } from '../components/content';
import { Disclaimer } from '../components/result/cards';
import { legalConfig } from '../data';
import { t, tSections } from '../i18n';

export default function Terms() {
  return (
    <ContentPage title={t('terms.title')} intro={t('terms.intro')}>
      {tSections('terms.sections').map((s) => (
        <Section key={s.heading} heading={s.heading}>
          <p>{s.body}</p>
        </Section>
      ))}
      <Disclaimer text={legalConfig.disclaimer} />
    </ContentPage>
  );
}
