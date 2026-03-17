'use client';

interface Message {
  id: number;
  role: 'user' | 'bot';
  content: string;
  metadata: string | null;
  created_at: string;
}

interface Props {
  message: Message;
  onDeleteTransaction?: (transactionId: number) => void;
}

export default function MessageBubble({ message, onDeleteTransaction }: Props) {
  const isUser = message.role === 'user';
  const metadata = message.metadata ? JSON.parse(message.metadata) : null;
  const transactionId = metadata?.transactionId;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 ${
        isUser
          ? 'bg-[#00C853] text-black rounded-br-sm font-medium text-sm'
          : 'bg-[#0D0D0D] text-white border border-[#1E1E1E] rounded-bl-sm'
      }`}>
        <pre className={`whitespace-pre-wrap font-mono leading-relaxed ${isUser ? 'text-sm' : 'text-xs text-[#ccc]'}`}>
          {message.content}
        </pre>
        {!isUser && transactionId && onDeleteTransaction && (
          <button
            onClick={() => onDeleteTransaction(transactionId)}
            className="mt-2 text-xs text-[#FF5252] hover:text-[#FF7070] transition-colors"
          >
            delete
          </button>
        )}
      </div>
    </div>
  );
}
