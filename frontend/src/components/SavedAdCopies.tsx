import { useState, useEffect } from 'react';
import { format, isValid, parseISO } from 'date-fns';

interface SavedAdCopy {
  id: number;
  campaignName: string;
  inputChannels: string;
  inputContentTypes: string;
  createdAt: string;
}

interface SavedAdCopiesProps {
  onSelect: (id: number) => void;
  selectedId?: number;
}

export default function SavedAdCopies({ onSelect, selectedId }: SavedAdCopiesProps) {
  const [savedCopies, setSavedCopies] = useState<SavedAdCopy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Helper function to safely format dates
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) {
      return 'No date available';
    }
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) {
        return 'Invalid date';
      }
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Helper function to safely split channels
  const getChannels = (channelsString: string | null | undefined): string[] => {
    if (!channelsString) {
      return [];
    }
    try {
      return channelsString.split(',').filter(Boolean);
    } catch (error) {
      console.error('Error splitting channels:', error);
      return [];
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent button click
    
    if (!confirm('Are you sure you want to delete this ad copy?')) {
      return;
    }

    setIsDeleting(id);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/adcopy/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete ad copy');
      }

      // Remove the deleted ad copy from the state
      setSavedCopies(prev => prev.filter(copy => copy.id !== id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete ad copy');
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    const fetchSavedCopies = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/adcopy/saved`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch saved ad copies');
        }

        const data = await response.json();
        setSavedCopies(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load saved ad copies');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedCopies();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!savedCopies || savedCopies.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900">No saved ad copies</h3>
          <p className="mt-1 text-sm text-gray-500">
            Generate new ad copies using the form on the right
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto max-h-screen">
      <div className="space-y-4 p-4">
        {savedCopies.map((copy) => (
          <div
            key={copy.id}
            className={`relative group rounded-lg border transition-all ${
              selectedId === copy.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <button
              onClick={() => onSelect(copy.id)}
              className="w-full text-left p-4"
            >
              <h3 className="font-medium text-gray-900 truncate pr-8">
                {copy.campaignName || 'Untitled Campaign'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(copy.createdAt)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {getChannels(copy.inputChannels).map((channel) => (
                  <span
                    key={channel}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {channel}
                  </span>
                ))}
              </div>
            </button>
            <button
              onClick={(e) => handleDelete(copy.id, e)}
              disabled={isDeleting === copy.id}
              className={`absolute top-4 right-4 p-1.5 rounded-full 
                ${isDeleting === copy.id ? 'bg-gray-100 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100 hover:bg-red-100'}
                transition-all duration-200`}
            >
              {isDeleting === copy.id ? (
                <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 