import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-5 bg-gradient-to-r from-indigo-50 to-white rounded-lg shadow-md border border-indigo-200 hover:bg-indigo-50 transition-colors"
      >
        <h2 className="text-xl font-bold text-indigo-900">{title}</h2>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {isOpen && (
        <div className="mt-6 bg-white rounded-lg p-1">
          {children}
        </div>
      )}
    </div>
  );
} 