import React from 'react';

interface PageLayoutProps {
  leftSidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  leftSidebar,
  rightSidebar,
  children,
  title
}) => {
  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-8rem)] w-full">
      {/* Left Sidebar - Collapsible on mobile */}
      {leftSidebar && (
        <div className="w-full lg:w-1/4 xl:w-1/5 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 overflow-auto">
          <div className="p-3 sm:p-4 lg:p-5">
            {leftSidebar}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 w-full min-w-0 ${!leftSidebar && !rightSidebar ? 'max-w-5xl mx-auto' : ''}`}>
        <div className="p-3 sm:p-5 lg:p-6 max-w-full mx-auto">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8">{title}</h1>
          {children}
        </div>
      </div>

      {/* Right Sidebar - Collapsible on mobile */}
      {rightSidebar && (
        <div className="w-full lg:w-1/4 xl:w-1/5 border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50 overflow-auto">
          <div className="p-3 sm:p-4 lg:p-5">
            {rightSidebar}
          </div>
        </div>
      )}
    </div>
  );
};

export default PageLayout; 