'use client';

import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

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
    underConstruction: false
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
  },
  {
    title: 'AI Assistant',
    description: 'Interactive AI assistant with template system',
    href: '/service-ai-assistant',
    icon: '🤖',
    underConstruction: false
  }
];

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-verto-gray-light">
        <Image 
          src="/VertoDigital-symbol-color.png" 
          alt="VertoDigital Logo" 
          width={80} 
          height={80} 
          className="mb-6"
        />
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-verto-blue-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-verto-blue-primary to-blue-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-white">
                  AI-Powered Digital Marketing Tools
                </h1>
                <p className="text-xl mb-8 text-white opacity-90">
                  VertoDigital provides cutting-edge AI tools to enhance your digital marketing strategy and drive results.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-verto-blue-primary bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors"
                >
                  Sign In to Get Started
                </Link>
              </div>
              <div className="flex justify-center">
                <Image 
                  src="/VertoDigital-symbol-color.png" 
                  alt="VertoDigital Logo" 
                  width={250} 
                  height={250} 
                  className="drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Features Section */}
        <div className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Transform Your Digital Marketing</h2>
              <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
                Our AI-powered tools help you streamline workflows and drive better results
              </p>
            </div>
            
            <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
              <div className="bg-verto-gray-light p-6 rounded-lg">
                <div className="text-verto-blue-primary text-4xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Data-Driven Insights</h3>
                <p className="text-gray-700">Leverage AI to extract actionable insights from your marketing data</p>
              </div>
              
              <div className="bg-verto-gray-light p-6 rounded-lg">
                <div className="text-verto-blue-primary text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Efficiency & Speed</h3>
                <p className="text-gray-700">Automate routine tasks and generate content in minutes, not hours</p>
              </div>
              
              <div className="bg-verto-gray-light p-6 rounded-lg">
                <div className="text-verto-blue-primary text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Precision Targeting</h3>
                <p className="text-gray-700">Create highly targeted campaigns that reach the right audience</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-verto-blue-primary to-blue-700 rounded-xl text-white p-8 md:p-12 mb-12">
          <div className="md:flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-4 text-white">Welcome to VertoDigital</h1>
              <p className="text-lg text-white opacity-90 mb-0 md:mb-0">
                Select one of our AI-powered tools to enhance your digital marketing strategy
              </p>
            </div>
            <Image 
              src="/VertoDigital-symbol-color.png" 
              alt="VertoDigital Logo" 
              width={100} 
              height={100} 
              className="hidden md:block bg-white rounded-full p-2"
            />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-8">Our Services</h2>

        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="block group"
            >
              <div className="relative bg-white p-6 rounded-xl shadow-md hover:shadow-lg border border-gray-100 transition-all duration-300 h-full">
                {service.underConstruction && (
                  <div className="absolute top-3 right-3 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                    Under Construction
                  </div>
                )}
                <div className="flex items-center mb-4">
                  <div className="text-3xl bg-verto-gray-light rounded-full w-12 h-12 flex items-center justify-center mr-3">
                    {service.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-verto-blue-primary">
                    {service.title}
                  </h3>
                </div>
                <p className="text-gray-700">
                  {service.description}
                </p>
                <div className="mt-4 text-verto-blue-primary font-medium group-hover:underline flex items-center">
                  Get Started
                  <svg 
                    className="w-4 h-4 ml-1 group-hover:ml-2 transition-all" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
