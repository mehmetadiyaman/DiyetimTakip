import React from "react";
import { BlogArticle } from "@shared/schema";

interface BlogArticlesProps {
  articles: BlogArticle[];
  loading: boolean;
}

export function BlogArticles({ articles, loading }: BlogArticlesProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg animate-pulse">
            <div className="h-48 w-full bg-gray-200 dark:bg-gray-700"></div>
            <div className="p-5">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-full mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-2/3"></div>
              <div className="mt-4 flex items-center">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <div className="ml-3">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 w-24 mb-1"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 w-32"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <i className="far fa-newspaper text-3xl mb-2"></i>
        <p>Henüz blog makalesi bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <div key={article.id} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg flex flex-col">
          {article.imageUrl && (
            <img 
              className="h-48 w-full object-cover" 
              src={article.imageUrl} 
              alt={article.title} 
            />
          )}
          <div className="p-5 flex-1 flex flex-col">
            <h4 className="text-base font-medium text-gray-900 dark:text-white">
              {article.title}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex-1">
              {article.summary}
            </p>
            <div className="mt-4 flex items-center">
              <div className="ml-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {article.author}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(article.publishedAt).toLocaleDateString('tr-TR')} · {article.readTime} dk okuma
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
