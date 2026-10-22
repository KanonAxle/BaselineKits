'use client';
import { useEffect, useState } from 'react';
import { getEducation } from './api';
import { ARTICLES, CATEGORIES, type EducationArticle, type EducationCategory } from './education';

type EducationState = {
  loading: boolean;
  categories: EducationCategory[];
  articles: EducationArticle[];
};

// Loads admin-managed content; falls back to the bundled starter content if the API is unreachable.
export function useEducation(): EducationState {
  const [state, setState] = useState<EducationState>({ loading: true, categories: [], articles: [] });

  useEffect(() => {
    let active = true;
    getEducation()
      .then(data => {
        if (active) setState({ loading: false, categories: data.categories || [], articles: data.articles || [] });
      })
      .catch(() => {
        if (active) setState({ loading: false, categories: CATEGORIES, articles: ARTICLES });
      });
    return () => { active = false; };
  }, []);

  return state;
}
