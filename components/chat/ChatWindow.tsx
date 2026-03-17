'use client';
import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: number;
  role: 'user' | 'bot';
  content: string;
  metadata: string | null;
  created_at: string;
}

interface Props {
  messages: Message[];
  onDeleteTransaction?: (transactionId: number) => void;
}

export default function ChatWindow({ messages, onDeleteTransaction }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 bg-black" style={{ paddingBottom: '8rem' }}>
      {messages.length === 0 && (
        <div className="text-center mt-16">
          <p className="text-[#333] text-sm">No transactions yet.</p>
          <p className="text-[#2a2a2a] text-xs mt-2 font-mono">Food 200 coffee · Parents 3000 · Cash 500 to GCash</p>
        </div>
      )}
      {messages.map(m => (
        <MessageBubble key={m.id} message={m} onDeleteTransaction={onDeleteTransaction} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
