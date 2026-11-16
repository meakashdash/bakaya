import { Link } from '../components/Link';
import { ContentPage } from '../components/content';
import { t } from '../i18n';

export default function NotFound() {
  return (
    <ContentPage title={t('notFound.title')} intro={t('notFound.body')}>
      <p>
        <Link to="/" className="text-lg font-semibold text-green-800 underline underline-offset-2">
          {t('notFound.link')}
        </Link>
      </p>
    </ContentPage>
  );
}
