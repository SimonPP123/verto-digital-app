'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

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
    <div className="min-h-screen bg-verto-gray-light">
      <nav className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center">
                  <Image 
                    src="/VertoDigital-symbol-color.png" 
                    alt="VertoDigital Logo" 
                    width={40} 
                    height={40} 
                    className="mr-2"
                  />
                  <span className="text-xl font-bold text-verto-blue-primary hover:text-verto-blue-dark transition-colors">
                    VertoDigital
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

      <footer className="bg-white shadow-md mt-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="text-center">
              <Link href="/" className="flex items-center justify-center mb-4">
                <Image 
                  src="/VertoDigital-symbol-color.png" 
                  alt="VertoDigital Logo" 
                  width={32} 
                  height={32} 
                  className="mr-2"
                />
                <span className="text-lg font-bold text-verto-blue-primary">
                  VertoDigital
                </span>
              </Link>
              <p className="text-sm text-gray-600">
                AI-powered tools for digital marketing
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-center text-sm text-gray-500">
              © {new Date().getFullYear()} VertoDigital. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );

  // Only render the full layout with navigation when mounted
  if (!mounted) {
    return baseLayout;
  }

  return (
    <div className="min-h-screen bg-verto-gray-light">
      <nav className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center">
                  <Image 
                    src="/VertoDigital-symbol-color.png" 
                    alt="VertoDigital Logo" 
                    width={40} 
                    height={40} 
                    className="mr-2"
                  />
                  <span className="text-xl font-bold text-verto-blue-primary hover:text-verto-blue-dark transition-colors">
                    VertoDigital
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
                          ? 'text-verto-blue-primary bg-blue-50' 
                          : 'text-gray-700 hover:text-verto-blue-primary hover:bg-blue-50'
                      } transition-all inline-flex items-center`}
                    >
                      <span>SEO</span>
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
                            className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-verto-blue-primary"
                          >
                            <span className="mr-3">📝</span>
                            <div className="flex-1">
                              <span>SEO Content Brief</span>
                            </div>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Advertising Section */}
                  <div className="relative group">
                    <button
                      onClick={() => toggleDropdown('advertising')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        activeDropdown === 'advertising' 
                          ? 'text-verto-blue-primary bg-blue-50' 
                          : 'text-gray-700 hover:text-verto-blue-primary hover:bg-blue-50'
                      } transition-all inline-flex items-center`}
                    >
                      <span>Advertising</span>
                      <svg 
                        className={`ml-2 h-4 w-4 transition-transform ${activeDropdown === 'advertising' ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeDropdown === 'advertising' && (
                      <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          <Link 
                            href="/service-linkedin" 
                            className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-verto-blue-primary"
                          >
                            <span className="mr-3">👥</span>
                            <div className="flex-1 flex items-center justify-between">
                              <span>LinkedIn AI Audience</span>
                            </div>
                          </Link>
                          <Link 
                            href="/service-aiadcopy" 
                            className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-verto-blue-primary"
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
                          ? 'text-verto-blue-primary bg-blue-50' 
                          : 'text-gray-700 hover:text-verto-blue-primary hover:bg-blue-50'
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
                            className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-verto-blue-primary"
                          >
                            <span className="mr-3">📊</span>
                            <div className="flex-1 flex items-center justify-between">
                              <span>GA4 Weekly Report</span>
                              <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">Under Construction</span>
                            </div>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* General Section */}
                  <div className="relative group">
                    <button
                      onClick={() => toggleDropdown('general')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        activeDropdown === 'general' 
                          ? 'text-verto-blue-primary bg-blue-50' 
                          : 'text-gray-700 hover:text-verto-blue-primary hover:bg-blue-50'
                      } transition-all inline-flex items-center`}
                    >
                      <span>General</span>
                      <svg 
                        className={`ml-2 h-4 w-4 transition-transform ${activeDropdown === 'general' ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeDropdown === 'general' && (
                      <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          <Link 
                            href="/service-chat" 
                            className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-verto-blue-primary"
                          >
                            <span className="mr-3">💬</span>
                            <div className="flex-1">
                              <span>Chat with Files</span>
                            </div>
                          </Link>
                          <Link 
                            href="/service-ai-assistant" 
                            className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-verto-blue-primary"
                          >
                            <span className="mr-3">🤖</span>
                            <div className="flex-1">
                              <span>AI Assistant</span>
                            </div>
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
                      <Image
                        src={user.picture}
                        alt={user.name}
                        width={32}
                        height={32}
                        className="rounded-full border-2 border-gray-200"
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
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-verto-blue-primary hover:bg-verto-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-verto-blue-primary transition-colors"
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

      <footer className="bg-white shadow-md mt-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="text-center">
              <Link href="/" className="flex items-center justify-center mb-4">
                <Image 
                  src="/VertoDigital-symbol-color.png" 
                  alt="VertoDigital Logo" 
                  width={32} 
                  height={32} 
                  className="mr-2"
                />
                <span className="text-lg font-bold text-verto-blue-primary">
                  VertoDigital
                </span>
              </Link>
              <p className="text-sm text-gray-600">
                AI-powered tools for digital marketing
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-center text-sm text-gray-500">
              © {new Date().getFullYear()} VertoDigital. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 