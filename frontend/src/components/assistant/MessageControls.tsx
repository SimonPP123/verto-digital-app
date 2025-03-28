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
        className={`w-full p-4 focus:outline-none text-black resize-none bg-white rounded-md ${
          message.trim() ? 'border-blue-300' : 'border-gray-300'
        } border text-base min-h-[50px]`}
        rows={2}
        disabled={isSending}
      />
      <button
        type="submit"
        className={`absolute right-4 bottom-4 p-2 rounded-full ${
          message.trim() && !isSending 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
        disabled={!message.trim() || isSending}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </form>
  );
} 