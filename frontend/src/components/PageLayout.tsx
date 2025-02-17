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
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      {/* Left Sidebar */}
      {leftSidebar && (
        <div className="w-full lg:w-1/5 min-w-[250px] max-w-full lg:max-w-[400px] border-b lg:border-b-0 lg:border-r bg-gray-50">
          {leftSidebar}
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 w-full min-w-0 py-6 lg:py-8 px-4 lg:px-8 ${!leftSidebar && !rightSidebar ? 'max-w-7xl mx-auto' : ''}`}>
        <div className="max-w-full mx-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6 lg:mb-8">{title}</h1>
          {children}
        </div>
      </div>

      {/* Right Sidebar */}
      {rightSidebar && (
        <div className="w-full lg:w-1/5 min-w-[250px] max-w-full lg:max-w-[400px] border-t lg:border-t-0 lg:border-l bg-gray-50">
          {rightSidebar}
        </div>
      )}
    </div>
  );
};

export default PageLayout; 