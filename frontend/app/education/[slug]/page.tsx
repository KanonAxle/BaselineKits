import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import SiteFooter from '../../components/SiteFooter';
import ArticleView from './ArticleView';
import { ARTICLES } from '../../../lib/education';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) {
    return {
      title: 'Education',
      description: 'The reasoning behind how BaselineKits builds its kits, plus practical preparedness guidance.',
    };
  }
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/education/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.summary,
      type: 'article',
      url: `/education/${article.slug}`,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <ArticleView slug={slug} />
      <SiteFooter />
    </main>
  );
}
