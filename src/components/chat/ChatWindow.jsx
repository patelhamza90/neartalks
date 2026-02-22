// src/components/chat/ChatWindow.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import {
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, getDoc,
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

export default function ChatWindow({ group, onBack }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [nickname, setNickname] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const searchRef = useRef(null);
  const matchRefs = useRef([]);

  useEffect(() => {
    if (!group?.id) return;
    getDoc(doc(db, 'groups', group.id, 'members', user.uid)).then((snap) => {
      if (snap.exists()) setNickname(snap.data().nickname || 'Anonymous');
    });
  }, [group?.id, user.uid]);

  useEffect(() => {
    if (!group?.id) return;
    const q = query(collection(db, 'groups', group.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [group?.id]);

  useEffect(() => {
    if (!searchQuery) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, searchQuery]);

  // Scroll to current match
  useEffect(() => {
    if (searchQuery && matchRefs.current[matchIndex]) {
      matchRefs.current[matchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [matchIndex, searchQuery]);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50);
    else { setSearchQuery(''); setMatchIndex(0); }
  }, [showSearch]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      await addDoc(collection(db, 'groups', group.id, 'messages'), {
        text: trimmed,
        senderId: user.uid,
        senderName: nickname || 'Anonymous',
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'groups', group.id), {
        lastMessage: trimmed.length > 60 ? trimmed.slice(0, 60) + '…' : trimmed,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      setText(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (ts) => {
    if (!ts?.seconds) return '';
    return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Build matched message indices
  const q = searchQuery.trim().toLowerCase();
  const matchedIds = q
    ? messages.reduce((acc, msg, i) => { if (msg.text?.toLowerCase().includes(q)) acc.push(i); return acc; }, [])
    : [];

  const navigateSearch = (dir) => {
    if (matchedIds.length === 0) return;
    setMatchIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return matchedIds.length - 1;
      if (next >= matchedIds.length) return 0;
      return next;
    });
  };

  function highlightText(text, query) {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-yellow-300 text-gray-900 rounded">{part}</mark>
        : part
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 select-none px-6">
        {/* Lock ring + icon */}
        <div className="w-24 h-24 rounded-full border-2 border-gray-200 flex items-center justify-center mb-8">
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 0 1 8 0v3m-9 0h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" />
          </svg>
        </div>

        {/* Headline */}
        <h2 className="text-[22px] font-semibold text-gray-700 tracking-tight mb-2">
          NearTalk Web
        </h2>

        {/* Subtitle block */}
        <p className="text-sm text-gray-400 text-center leading-relaxed max-w-xs">
          Select a group from the sidebar to start chatting.<br />
          Messages are end-to-end encrypted within each group.
        </p>

        {/* Divider */}
        <div className="flex items-center gap-2 mt-10">
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <div className="w-1 h-1 rounded-full bg-gray-300" />
        </div>

        <p className="text-[11px] text-gray-300 mt-4 tracking-wide uppercase">
          Location-based group chat
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10 shadow-sm">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition md:hidden">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <img
          src={group.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${group.id}`}
          alt="" className="w-10 h-10 rounded-full bg-gray-100"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 truncate">{group.name}</p>
          <p className="text-xs text-gray-500">
            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''} · as <span className="font-medium text-blue-600">{nickname}</span>
          </p>
        </div>
        {/* Search toggle button */}
        <button
          onClick={() => setShowSearch((s) => !s)}
          className={`p-2 rounded-xl transition ${showSearch ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
          title="Search messages (Ctrl+F)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </button>
      </div>

      {/* In-Chat Search Bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border-b border-yellow-200">
          <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setMatchIndex(0); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigateSearch(e.shiftKey ? -1 : 1);
              if (e.key === 'Escape') setShowSearch(false);
            }}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-yellow-500 outline-none"
          />
          {searchQuery && (
            <span className="text-xs text-gray-500 flex-shrink-0">
              {matchedIds.length > 0 ? `${matchIndex + 1}/${matchedIds.length}` : 'No results'}
            </span>
          )}
          <div className="flex gap-1">
            <button onClick={() => navigateSearch(-1)} disabled={matchedIds.length === 0} className="p-1 rounded hover:bg-yellow-200 disabled:opacity-30 transition">
              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button onClick={() => navigateSearch(1)} disabled={matchedIds.length === 0} className="p-1 rounded hover:bg-yellow-200 disabled:opacity-30 transition">
              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <button onClick={() => setShowSearch(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderId === user.uid;
          const isMatch = q && msg.text?.toLowerCase().includes(q);
          const matchPos = matchedIds.indexOf(i);
          const isCurrentMatch = isMatch && matchedIds[matchIndex] === i;

          return (
            <div
              key={msg.id}
              ref={(el) => { if (isMatch && matchPos !== -1) matchRefs.current[matchPos] = el; }}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              {!isMe && (
                <span className="text-xs font-semibold text-gray-500 mb-1 ml-1">{msg.senderName}</span>
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm transition-all ${
                  isCurrentMatch
                    ? 'ring-2 ring-yellow-400 ring-offset-1'
                    : isMatch
                    ? 'ring-1 ring-yellow-200'
                    : ''
                } ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                }`}
              >
                <p className="break-words">
                  {q ? highlightText(msg.text || '', q) : msg.text}
                </p>
              </div>
              <span className="text-xs text-gray-400 mt-1 mx-1">{formatTime(msg.createdAt)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t sticky bottom-0">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
            maxLength={1000}
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}