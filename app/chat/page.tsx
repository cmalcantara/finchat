'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import ChatWindow from '@/components/chat/ChatWindow';

interface Message {
  id: number;
  role: 'user' | 'bot';
  content: string;
  metadata: string | null;
  created_at: string;
}


export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/init').catch(console.error);
    fetch('/api/messages').then(r => r.json()).then(setMessages).catch(console.error);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sending) return;
    setSending(true);

    try {
      let receiptFilename: string | null = null;

      // Upload file first if attached
      if (attachedFile) {
        const form = new FormData();
        form.append('file', attachedFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          receiptFilename = uploadData.filename;
        }
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, receiptFilename }),
      });
      const data = await res.json();
      if (data.userMessage && data.botMessage) {
        setMessages(prev => [...prev, data.userMessage, data.botMessage]);
      }
      setInputValue('');
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }, [inputValue, sending, attachedFile]);

  const handleDeleteTransaction = useCallback(async (transactionId: number) => {
    if (!confirm('Delete this transaction?')) return;
    const res = await fetch(`/api/transactions/${transactionId}`, { method: 'DELETE' });
    if (res.ok) {
      const msgs = await fetch('/api/messages').then(r => r.json());
      setMessages(msgs);
    }
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="px-4 py-3 border-b border-[#1E1E1E] bg-black flex-shrink-0">
        <h1 className="text-base font-semibold tracking-wide text-white">FinChat</h1>
      </header>

      <ChatWindow messages={messages} onDeleteTransaction={handleDeleteTransaction} />

      {/* Input bar */}
      <div className="fixed left-0 right-0 bg-black border-t border-[#1E1E1E] z-40" style={{ bottom: '4rem' }}>
        <div className="max-w-lg mx-auto px-3 py-2">
          {/* Attachment preview */}
          {attachedFile && (
            <div className="flex items-center gap-2 mb-2 bg-[#141414] border border-[#1E1E1E] rounded-lg px-3 py-1.5">
              <span className="text-xs text-[#00C853] flex-1 truncate">{attachedFile.name}</span>
              <button
                onClick={() => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="text-[#555] hover:text-[#888] text-xs"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            {/* Attachment button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-[#1E1E1E] text-[#555] hover:text-[#00C853] hover:border-[#00C853] transition-colors"
              title="Attach receipt"
            >
              +
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={e => setAttachedFile(e.target.files?.[0] || null)}
            />
            <textarea
              className="flex-1 resize-none rounded-xl bg-[#141414] border border-[#1E1E1E] text-white placeholder:text-[#444] px-3 py-2 text-sm focus:outline-none focus:border-[#00C853] focus:ring-0 max-h-32"
              rows={1}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder=""
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={sending || !inputValue.trim()}
              className="flex-shrink-0 bg-[#00C853] text-black font-semibold rounded-xl px-4 py-2 text-sm hover:bg-[#00E676] disabled:opacity-30 transition-colors"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
