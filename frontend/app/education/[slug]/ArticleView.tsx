'use client';
import Link from 'next/link';
import { useEducation } from '../../../lib/useEducation';

function sectionId(heading: string) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function ArticleView({ slug }: { slug: string }) {
  const { loading, categories, articles } = useEducation();

  if (loading) {
    return <div className="max-w-6xl mx-auto px-6 py-16 text-stone-400">Loading...</div>;
  }

  const article = articles.find(item => item.slug === slug);
  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24">
        <h1 className="text-3xl font-extrabold mb-4">Article not found</h1>
        <Link href="/education" className="text-orange-400 hover:text-orange-300">&larr; Back to education</Link>
      </div>
    );
  }

  const category = categories.find(item => item.id === article.category);
  const related = (article.related || [])
    .map(relatedSlug => articles.find(item => item.slug === relatedSlug))
    .filter(item => !!item);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 grid gap-12 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <nav aria-label="On this page" className="sticky top-24">
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-3">On this page</p>
          <ul className="flex flex-col gap-2 text-sm">
            {article.ourApproach && <li><a href="#our-approach" className="text-stone-400 hover:text-white">Our approach</a></li>}
            {article.sections.map((section, index) => (
              <li key={index}>
                <a href={`#${sectionId(section.heading)}`} className="text-stone-400 hover:text-white">{section.heading}</a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <article className="max-w-3xl">
        <Link href="/education" className="text-xs uppercase tracking-widest text-stone-500 hover:text-orange-400">&larr; All education</Link>
        <p className="text-xs uppercase tracking-widest text-orange-500 mt-6 mb-3">{category?.label} · {article.readMinutes} min read</p>
        <h1 className="text-4xl font-extrabold leading-tight mb-8">{article.title}</h1>

        {article.ourApproach && (
          <div id="our-approach" className="border-l-2 border-orange-500 bg-orange-500/10 rounded-r px-5 py-4 mb-10 scroll-mt-24">
            <p className="text-xs uppercase tracking-widest text-orange-400 mb-1">Our approach</p>
            <p className="text-stone-200 leading-relaxed">{article.ourApproach}</p>
          </div>
        )}

        {article.sections.map((section, index) => (
          <section key={index} id={sectionId(section.heading)} className="mb-10 scroll-mt-24">
            {section.heading && <h2 className="text-2xl font-bold mb-4">{section.heading}</h2>}
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="text-stone-300 leading-relaxed mb-4">{paragraph}</p>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <ul className="list-disc pl-5 text-stone-300 leading-relaxed flex flex-col gap-1">
                {section.bullets.map((bullet, i) => <li key={i}>{bullet}</li>)}
              </ul>
            )}
          </section>
        ))}

        {related.length > 0 && (
          <section className="border-t border-stone-800 pt-8">
            <h2 className="text-sm uppercase tracking-widest text-stone-500 mb-4">Keep reading</h2>
            <div className="flex flex-col gap-3">
              {related.map(item => (
                <Link key={item!.slug} href={`/education/${item!.slug}`} className="text-orange-400 hover:text-orange-300">
                  {item!.title}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
