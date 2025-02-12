'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (menu: string) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  // Base layout that's always rendered
  const baseLayout = (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center">
                  <span className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                    Verto Digital
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="bg-white shadow-lg mt-8">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">
            © {new Date().getFullYear()} Verto Digital. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );

  // Only render the full layout with navigation when mounted
  if (!mounted) {
    return baseLayout;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center">
                  <span className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                    Verto Digital
                  </span>
                </Link>
              </div>
              
              {isAuthenticated && (
                <div className="hidden md:flex md:ml-10 md:space-x-6" ref={dropdownRef}>
                  {/* SEO Section */}
                  <div className="relative group">
                    <button
                      onClick={() => toggleDropdown('seo')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        activeDropdown === 'seo' 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                      } transition-all inline-flex items-center`}
                    >
                      <span>SEO Tools</span>
                      <svg 
                        className={`ml-2 h-4 w-4 transition-transform ${activeDropdown === 'seo' ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeDropdown === 'seo' && (
                      <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          <Link 
                            href="/service-seo" 
                            className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <span className="mr-3">📝</span>
                            SEO Content Brief
                          </Link>
                          <Link 
                            href="/service-chat" 
                            className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <span className="mr-3">💬</span>
                            Chat with Files
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ads Section */}
                  <div className="relative group">
                    <button
                      onClick={() => toggleDropdown('ads')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        activeDropdown === 'ads' 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                      } transition-all inline-flex items-center`}
                    >
                      <span>Ad Tools</span>
                      <svg 
                        className={`ml-2 h-4 w-4 transition-transform ${activeDropdown === 'ads' ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeDropdown === 'ads' && (
                      <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          <Link 
                            href="/service-linkedin" 
                            className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <span className="mr-3">👥</span>
                            LinkedIn AI Audience
                          </Link>
                          <Link 
                            href="/service-aiadcopy" 
                            className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <span className="mr-3">✍️</span>
                            AI Ad Copy
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Analytics Section */}
                  <div className="relative group">
                    <button
                      onClick={() => toggleDropdown('analytics')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        activeDropdown === 'analytics' 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                      } transition-all inline-flex items-center`}
                    >
                      <span>Analytics</span>
                      <svg 
                        className={`ml-2 h-4 w-4 transition-transform ${activeDropdown === 'analytics' ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeDropdown === 'analytics' && (
                      <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          <Link 
                            href="/service-ga4report" 
                            className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <span className="mr-3">📊</span>
                            GA4 Weekly Report
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                    {user?.picture && (
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="h-8 w-8 rounded-full border-2 border-gray-200"
                      />
                    )}
                  </div>
                  <button
                    onClick={logout}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="bg-white shadow-lg mt-8">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">
            © {new Date().getFullYear()} Verto Digital. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 