// /privacy: nothing leaves the device; cookieless analytics only.
import { ContentPage, Section } from '../components/content';
import { t, tSections } from '../i18n';

export default function Privacy() {
  return (
    <ContentPage title={t('privacy.title')} intro={t('privacy.intro')}>
      {tSections('privacy.sections').map((s) => (
        <Section key={s.heading} heading={s.heading}>
          <p>{s.body}</p>
        </Section>
      ))}
    </ContentPage>
  );
}
