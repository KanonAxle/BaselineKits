import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import ArticleView from './ArticleView';

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: 'Education | BaselineKits',
  description: 'The reasoning behind how BaselineKits builds its kits, plus practical preparedness guidance.',
};

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <ArticleView slug={slug} />
    </main>
  );
}
