import type { Metadata } from 'next';
import Navbar from '../components/Navbar';
import EducationHub from './EducationHub';

export const metadata: Metadata = {
  title: 'Education | BaselineKits',
  description: 'The reasoning behind how BaselineKits builds its kits, plus practical preparedness guidance.',
};

export default function EducationPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-20">
        <p className="label-tactical text-orange-500 mb-4 tracking-[0.2em]">// Education</p>
        <h1 className="text-5xl font-extrabold uppercase tracking-wide leading-tight mb-6">Know why it&apos;s in your kit</h1>
        <p className="text-stone-400 text-lg leading-relaxed max-w-2xl mb-12">
          Preparedness works best when you understand the reasoning behind it. Here is how and why we make the choices we do.
        </p>
        <EducationHub />
      </div>
    </main>
  );
}
