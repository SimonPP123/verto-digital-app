'use client';

import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';

const services = [
  {
    title: 'SEO Content Brief',
    description: 'Generate comprehensive SEO content briefs with AI assistance',
    href: '/service-seo',
    icon: '📝',
    underConstruction: false
  },
  {
    title: 'Chat with Files',
    description: 'Interactive chat interface for document analysis and insights',
    href: '/service-chat',
    icon: '💬',
    underConstruction: false
  },
  {
    title: 'LinkedIn AI Audience',
    description: 'AI-powered LinkedIn audience targeting and analysis',
    href: '/service-linkedin',
    icon: '👥',
    underConstruction: true
  },
  {
    title: 'AI Ad Copy',
    description: 'Generate compelling ad copy using advanced AI',
    href: '/service-aiadcopy',
    icon: '✍️',
    underConstruction: false
  },
  {
    title: 'GA4 Weekly Report',
    description: 'Automated GA4 analytics reports with AI insights',
    href: '/service-ga4report',
    icon: '📊',
    underConstruction: true
  }
];

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Verto Digital
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Please sign in to access our AI-powered tools
        </p>
        <Link
          href="/login"
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            AI-Powered Digital Marketing Tools
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Select a service to get started
          </p>
        </div>

        <div className="mt-12 grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="block group"
            >
              <div className="relative bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                {service.underConstruction && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                    Under Construction
                  </div>
                )}
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {service.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
