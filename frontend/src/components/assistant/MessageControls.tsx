'use client';

import React, { useState, useRef, useEffect } from 'react';

type MessageControlsProps = {
  onSendMessage: (message: string) => void;
  isSending: boolean;
};

export default function MessageControls({ onSendMessage, isSending }: MessageControlsProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSending) return;
    
    onSendMessage(message);
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message here..."
        className={`w-full py-3 px-3 sm:p-4 focus:outline-none text-gray-900 resize-none bg-white rounded-md ${
          message.trim() ? 'border-blue-300' : 'border-gray-300'
        } border text-sm sm:text-base min-h-[44px] sm:min-h-[50px] pr-10 sm:pr-12`}
        rows={2}
        disabled={isSending}
      />
      <button
        type="submit"
        className={`absolute right-2 sm:right-4 bottom-2 sm:bottom-4 p-1.5 sm:p-2 rounded-full ${
          message.trim() && !isSending 
            ? 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700' 
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        } transition-colors`}
        disabled={!message.trim() || isSending}
        aria-label="Send message"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </form>
  );
} 