// src/components/chat/ChatWindow.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../firebase';
import {
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp,
  doc, updateDoc, getDoc, deleteDoc, increment, getDocs, setDoc,
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

// ── Group Info Modal ──────────────────────────────────────────────────────────
function GroupInfoModal({ group, onClose, onLeave }) {
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    if (!group?.id) return;
    getDocs(collection(db, 'groups', group.id, 'members')).then((snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingMembers(false);
    });
  }, [group?.id]);

  const createdAt = group?.createdAt?.seconds
    ? new Date(group.createdAt.seconds * 1000).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-base font-bold text-gray-800">Group Info</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-3">
            <img
              src={group.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${group.id}`}
              alt="" className="w-14 h-14 rounded-full bg-gray-100 flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="font-bold text-gray-800 text-lg leading-tight truncate">{group.name}</p>
              <p className="text-sm text-gray-500">{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</p>
              {createdAt && <p className="text-xs text-gray-400 mt-0.5">Created {createdAt}</p>}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Members</p>
            {loadingMembers ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-gray-50">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-600">{(m.nickname || 'A')[0].toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 truncate">{m.nickname || 'Anonymous'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-4 border-t">
          <button
            onClick={onLeave}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-500 font-semibold text-sm py-2.5 rounded-xl transition border border-red-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Leave Group
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ChatWindow ───────────────────────────────────────────────────────────
export default function ChatWindow({ group, onBack, onLeaveGroup }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [nickname, setNickname] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);

  const bottomRef = useRef(null);
  const msgAreaRef = useRef(null);
  const inputRef = useRef(null);
  const searchRef = useRef(null);
  const matchRefs = useRef([]);
  const typingTimerRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const prevMsgCountRef = useRef(0);

  // Fetch nickname
  useEffect(() => {
    if (!group?.id) return;
    getDoc(doc(db, 'groups', group.id, 'members', user.uid)).then((snap) => {
      if (snap.exists()) setNickname(snap.data().nickname || 'Anonymous');
    });
  }, [group?.id, user.uid]);

  // Messages listener
  useEffect(() => {
    if (!group?.id) return;
    const q = query(collection(db, 'groups', group.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [group?.id]);

  // Smart auto-scroll: only scroll if user is near bottom or new message is own
  useEffect(() => {
    if (searchQuery) return;
    const area = msgAreaRef.current;
    if (!area) return;

    const newCount = messages.length;
    const added = newCount > prevMsgCountRef.current;
    prevMsgCountRef.current = newCount;

    if (!added) return;

    const lastMsg = messages[messages.length - 1];
    const isOwnMessage = lastMsg?.senderId === user.uid;
    const distFromBottom = area.scrollHeight - area.scrollTop - area.clientHeight;
    const nearBottom = distFromBottom < 120;

    if (isOwnMessage || nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, searchQuery]);

  // Update lastSeen when opening group
  useEffect(() => {
    if (!group?.id || !user?.uid) return;
    setDoc(
      doc(db, 'users', user.uid, 'joinedGroups', group.id),
      { lastSeen: serverTimestamp() },
      { merge: true }
    ).catch(() => {});
  }, [group?.id, user?.uid]);

  // Typing indicator listener
  useEffect(() => {
    if (!group?.id) return;
    const unsub = onSnapshot(collection(db, 'groups', group.id, 'typing'), (snap) => {
      const typers = snap.docs
        .filter((d) => d.id !== user.uid && d.data().typing === true)
        .map((d) => d.data().nickname || 'Someone');
      setTypingUsers(typers);
    });
    return unsub;
  }, [group?.id, user.uid]);

  // Search scroll to match
  useEffect(() => {
    if (searchQuery && matchRefs.current[matchIndex]) {
      matchRefs.current[matchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [matchIndex, searchQuery]);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50);
    else { setSearchQuery(''); setMatchIndex(0); }
  }, [showSearch]);

  // Typing indicator logic
  const setTyping = useCallback(async (isTyping) => {
    if (!group?.id) return;
    try {
      await setDoc(doc(db, 'groups', group.id, 'typing', user.uid), {
        typing: isTyping,
        nickname: nickname || 'Someone',
      });
    } catch {}
  }, [group?.id, user.uid, nickname]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (e.target.value.trim()) {
      setTyping(true);
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setTyping(false), 2000);
    } else {
      clearTimeout(typingTimerRef.current);
      setTyping(false);
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(typingTimerRef.current);
      if (group?.id) {
        setDoc(doc(db, 'groups', group.id, 'typing', user.uid), { typing: false, nickname: '' }).catch(() => {});
      }
    };
  }, [group?.id]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    clearTimeout(typingTimerRef.current);
    setTyping(false);
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
      setText(trimmed);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleLeaveGroup = async () => {
    if (!group?.id || leaving) return;
    setLeaving(true);
    try {
      const groupRef = doc(db, 'groups', group.id);
      const groupSnap = await getDoc(groupRef);
      const currentCount = groupSnap.exists() ? (groupSnap.data().memberCount || 0) : 0;
      await Promise.all([
        deleteDoc(doc(db, 'groups', group.id, 'members', user.uid)),
        deleteDoc(doc(db, 'users', user.uid, 'joinedGroups', group.id)),
        ...(currentCount > 0 ? [updateDoc(groupRef, { memberCount: increment(-1) })] : []),
      ]);
      setShowLeaveModal(false);
      setShowGroupInfo(false);
      onLeaveGroup?.();
    } catch (e) {
      console.error(e);
    } finally {
      setLeaving(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await deleteDoc(doc(db, 'groups', group.id, 'messages', msgId));
    } catch (e) { console.error(e); }
    setDeleteTarget(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (ts) => {
    if (!ts?.seconds) return '';
    return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  function highlightText(str, query) {
    if (!query) return str;
    const parts = str.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-yellow-300 text-gray-900 rounded">{part}</mark>
        : part
    );
  }

  // ── Empty State ──
  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full overflow-hidden bg-gray-50 select-none px-6">
        <div className="w-24 h-24 rounded-full border-2 border-gray-200 flex items-center justify-center mb-8">
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 0 1 8 0v3m-9 0h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" />
          </svg>
        </div>
        <h2 className="text-[22px] font-semibold text-gray-700 tracking-tight mb-2">NearTalk Web</h2>
        <p className="text-sm text-gray-400 text-center leading-relaxed max-w-xs">
          Select a group from the sidebar to start chatting.<br />
          Messages are end-to-end encrypted within each group.
        </p>
        <div className="flex items-center gap-2 mt-10">
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <div className="w-1 h-1 rounded-full bg-gray-300" />
        </div>
        <p className="text-[11px] text-gray-300 mt-4 tracking-wide uppercase">Location-based group chat</p>
      </div>
    );
  }

  // ── Chat Layout ──
  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden bg-gray-50">

      {/* Sticky Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b sticky top-0 z-10 shadow-sm flex-shrink-0 w-full">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition md:hidden flex-shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <button onClick={() => setShowGroupInfo(true)} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition">
          <img
            src={group.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${group.id}`}
            alt="" className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-gray-800 truncate">{group.name}</p>
            <p className="text-xs text-gray-500">
              {group.memberCount} member{group.memberCount !== 1 ? 's' : ''} · as <span className="font-medium text-blue-500">{nickname}</span>
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowSearch((s) => !s)}
            className={`p-2 rounded-xl transition ${showSearch ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl text-red-500 hover:bg-red-50 transition"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline text-sm font-semibold">Leave</span>
          </button>
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex-shrink-0 w-full">
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
            className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 placeholder-yellow-500 outline-none"
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

      {/* ── Scrollable Messages Area ── */}
      <div
        ref={msgAreaRef}
        className="flex-1 overflow-y-auto overflow-x-hidden w-full"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="px-4 py-4 space-y-1.5 w-full max-w-full">
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
                className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}
                onMouseEnter={() => setHoveredMsg(msg.id)}
                onMouseLeave={() => setHoveredMsg(null)}
              >
                {!isMe && (
                  <span className="text-xs font-semibold text-gray-500 mb-1 ml-1">{msg.senderName}</span>
                )}
                <div className="flex items-end gap-1.5 max-w-[90%] sm:max-w-[75%]">
                  {/* Delete button — own messages only */}
                  {isMe && (
                    <div className={`transition-opacity duration-150 flex-shrink-0 ${hoveredMsg === msg.id ? 'opacity-100' : 'opacity-0'}`}>
                      <button
                        onClick={() => setDeleteTarget(msg)}
                        className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 transition"
                        title="Delete message"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <circle cx="10" cy="4" r="1.5" />
                          <circle cx="10" cy="10" r="1.5" />
                          <circle cx="10" cy="16" r="1.5" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`min-w-0 px-3.5 py-2 rounded-2xl text-sm transition-all ${
                      isCurrentMatch ? 'ring-2 ring-yellow-400 ring-offset-1' : isMatch ? 'ring-1 ring-yellow-200' : ''
                    } ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap" style={{ overflowWrap: 'anywhere' }}>
                      {q ? highlightText(msg.text || '', q) : msg.text}
                    </p>
                    {/* Time inside bubble aligned right */}
                    <p className={`text-[10px] mt-0.5 text-right leading-none select-none ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-5 py-1 flex items-center gap-2 bg-gray-50 flex-shrink-0">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-gray-400 italic">
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.slice(0, 2).join(', ')} are typing...`}
          </span>
        </div>
      )}

      {/* ── Input Area ── */}
      <div className="flex-shrink-0 w-full px-4 py-3 bg-white border-t">
        <div className="flex items-center gap-2 w-full bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
            maxLength={1000}
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-full transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 text-center mb-1">Leave Group</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to leave <span className="font-semibold text-gray-700">"{group.name}"</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowLeaveModal(false)} disabled={leaving}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleLeaveGroup} disabled={leaving}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
                {leaving ? 'Leaving...' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-2">Delete Message</h3>
            <p className="text-sm text-gray-500 mb-2">Are you sure you want to delete this message?</p>
            <div className="bg-gray-50 rounded-xl px-3 py-2 mb-5 overflow-hidden">
              <p className="text-sm text-gray-700 truncate">{deleteTarget.text}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition">
                Cancel
              </button>
              <button onClick={() => handleDeleteMessage(deleteTarget.id)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Info Modal */}
      {showGroupInfo && (
        <GroupInfoModal
          group={group}
          onClose={() => setShowGroupInfo(false)}
          onLeave={() => { setShowGroupInfo(false); setShowLeaveModal(true); }}
        />
      )}
    </div>
  );
}
