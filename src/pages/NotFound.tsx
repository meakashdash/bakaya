import { Link } from '../components/Link';
import { ContentPage } from '../components/content';
import { t } from '../i18n';

export default function NotFound() {
  return (
    <ContentPage title={t('notFound.title')} intro={t('notFound.body')}>
      <p>
        <Link to="/" className="btn-primary sm:w-auto">
          {t('notFound.link')}
        </Link>
      </p>
    </ContentPage>
  );
}
