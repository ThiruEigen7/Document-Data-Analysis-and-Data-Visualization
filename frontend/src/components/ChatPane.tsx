import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPaneProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export default function ChatPane({ messages, onSendMessage, isLoading }: ChatPaneProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E] border-l border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bot className="text-[#1ABC9C]" size={20} />
          DataViz Assistant
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Ask questions about your data or request visualizations
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <Bot size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-lg font-medium mb-2">Welcome to DataViz Agent!</p>
            <p className="text-sm">
              Upload your dataset and start asking questions about your data.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}
          >
            <div
              className={`
                max-w-[80%] p-3 rounded-lg flex items-start gap-2
                ${message.type === 'user'
                  ? 'bg-[#1ABC9C] text-white'
                  : 'bg-[#2A2A2A] text-gray-200'
                }
              `}
            >
              {message.type === 'agent' && (
                <Bot size={16} className="text-[#1ABC9C] mt-0.5 flex-shrink-0" />
              )}
              {message.type === 'user' && (
                <User size={16} className="text-white mt-0.5 flex-shrink-0" />
              )}
              <div className="text-sm">{message.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#2A2A2A] text-gray-200 p-3 rounded-lg flex items-center gap-2">
              <Bot size={16} className="text-[#1ABC9C]" />
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#1ABC9C] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#1ABC9C] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-[#1ABC9C] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about your data..."
            className="flex-1 px-3 py-2 bg-[#2A2A2A] border border-gray-700 rounded-lg 
                     text-white placeholder-gray-400 focus:outline-none focus:border-[#1ABC9C]
                     transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-[#1ABC9C] text-white rounded-lg hover:bg-[#1ABC9C]/90 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                     flex items-center gap-2"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}