import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, X, CheckCheck, RefreshCw } from 'lucide-react';
import { FriendDirectMessage } from '../../types/dnd';
import { AuthSessionUser } from '../auth/RoleSelectionModal';

export const FRIEND_CHAT_BROADCAST_CHANNEL = 'dnd_5e_friend_chat_channel';

interface FriendDirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthSessionUser;
  friend: {
    id: string;
    displayName: string;
    userTagId: string;
    fullTag: string;
    avatarUrl?: string;
    role?: string;
    status?: string;
  } | null;
  onMessagesUpdated?: () => void;
}

export const FriendDirectChatModal: React.FC<FriendDirectChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  friend,
  onMessagesUpdated,
}) => {
  const [messages, setMessages] = useState<FriendDirectMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastMsgIdRef = useRef<string>('');
  const loadedFriendIdRef = useRef<string>('');
  const onMessagesUpdatedRef = useRef<(() => void) | undefined>(onMessagesUpdated);

  useEffect(() => {
    onMessagesUpdatedRef.current = onMessagesUpdated;
  }, [onMessagesUpdated]);

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!currentUser?.id || !friend?.id) return;
      const isFirstLoadForFriend = loadedFriendIdRef.current !== friend.id;
      if (!silent && isFirstLoadForFriend) {
        setIsLoading(true);
      }
      try {
        const res = await fetch(
          `/api/friends/messages?userId=${encodeURIComponent(currentUser.id)}&friendId=${encodeURIComponent(friend.id)}&_t=${Date.now()}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (res.ok && Array.isArray(data.messages)) {
          loadedFriendIdRef.current = friend.id;
          let listChanged = false;
          setMessages((prev) => {
            const prevLast = prev[prev.length - 1]?.id || '';
            const nextLast = data.messages[data.messages.length - 1]?.id || '';
            if (prev.length === data.messages.length && prevLast === nextLast) {
              return prev;
            }
            listChanged = true;
            return data.messages;
          });
          if ((listChanged || data.markedRead) && onMessagesUpdatedRef.current) {
            onMessagesUpdatedRef.current();
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser?.id, friend?.id]
  );

  useEffect(() => {
    if (!isOpen || !friend?.id || !currentUser?.id) return;
    if (loadedFriendIdRef.current !== friend.id) {
      lastMsgIdRef.current = '';
      fetchMessages(false);
    } else {
      fetchMessages(true);
    }

    // Event-driven signal check: only fetch full messages when the sender triggers a new message signal
    const checkNewMessageSignal = async () => {
      try {
        const res = await fetch(
          `/api/friends/messages/signal?userId=${encodeURIComponent(currentUser.id)}&friendId=${encodeURIComponent(friend.id)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const sig = await res.json();
        if (sig && sig.lastMessageId && sig.lastMessageId !== lastMsgIdRef.current) {
          fetchMessages(true);
        }
      } catch {}
    };

    const signalTimer = setInterval(checkNewMessageSignal, 2500);

    // Listen to BroadcastChannel for instant push activation when a message is sent
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(FRIEND_CHAT_BROADCAST_CHANNEL);
        channel.onmessage = (evt) => {
          const payload = evt.data;
          if (
            payload &&
            ((payload.fromUserId === friend.id && payload.toUserId === currentUser.id) ||
              (payload.fromUserId === currentUser.id && payload.toUserId === friend.id))
          ) {
            fetchMessages(true);
          }
        };
      }
    } catch {}

    return () => {
      clearInterval(signalTimer);
      if (channel) {
        try {
          channel.close();
        } catch {}
      }
    };
  }, [isOpen, friend?.id, currentUser?.id, fetchMessages]);

  useEffect(() => {
    const newestId = messages[messages.length - 1]?.id || '';
    if (newestId !== lastMsgIdRef.current) {
      lastMsgIdRef.current = newestId;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isOpen || !friend) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/friends/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserId: friend.id,
          content: text,
        }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        lastMsgIdRef.current = data.message.id;
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const ch = new BroadcastChannel(FRIEND_CHAT_BROADCAST_CHANNEL);
            ch.postMessage({
              type: 'NEW_FRIEND_MESSAGE',
              fromUserId: currentUser.id,
              toUserId: friend.id,
              messageId: data.message.id,
              timestamp: Date.now(),
            });
            ch.close();
          }
        } catch {}
        if (onMessagesUpdatedRef.current) {
          onMessagesUpdatedRef.current();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#14151b] border border-amber-800/80 rounded-2xl w-full max-w-lg h-[560px] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
        {/* Header */}
        <div className="bg-[#181920] border-b border-stone-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-700/60 flex items-center justify-center text-amber-300 font-bold font-cinzel overflow-hidden shrink-0">
              {friend.avatarUrl ? (
                <img
                  src={friend.avatarUrl}
                  alt={friend.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                friend.displayName.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-cinzel font-bold text-sm text-stone-100">
                  {friend.displayName}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-800 text-amber-300 font-bold border border-stone-700">
                  @{friend.userTagId}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-cinzel text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En vivo
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Mensaje privado directo entre amigos (actualización en tiempo real)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#101115]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-500 mb-2" />
              <span>Cargando mensajes...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 text-center px-6">
              <MessageSquare className="w-10 h-10 text-stone-600 mb-2" />
              <p className="font-cinzel font-bold text-xs text-stone-300 mb-1">
                Comienza la conversación con {friend.displayName}
              </p>
              <p className="text-[11px] text-stone-500 max-w-xs">
                Mándale un mensaje para coordinar la próxima sesión de D&D o compartir notas secretas.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.fromUserId === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      isMine
                        ? 'bg-amber-700 text-stone-950 font-medium rounded-tr-none shadow-md'
                        : 'bg-[#1e2029] text-stone-200 border border-stone-800 rounded-tl-none shadow'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                    <div
                      className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${
                        isMine ? 'text-stone-900/80' : 'text-stone-500'
                      }`}
                    >
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMine && <CheckCheck className="w-3 h-3 text-stone-950" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSendMessage} className="bg-[#181920] border-t border-stone-800 p-3 flex gap-2">
          <input
            type="text"
            data-testid="input-friend-chat-message"
            placeholder={`Escribe un mensaje para ${friend.displayName}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-[#121318] border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-600"
          />
          <button
            type="submit"
            data-testid="btn-send-friend-chat-message"
            disabled={!inputText.trim() || isSending}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-stone-950 font-cinzel font-bold text-xs transition flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
};

