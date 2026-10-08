import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Contact from '@features/pages/Contact';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.contact');
  return {
    title: t('title'),
    description: t('metaDescription'),
  };
}

const ContactPage = () => (
  <>
    <Contact />
  </>
);

export default ContactPage;
