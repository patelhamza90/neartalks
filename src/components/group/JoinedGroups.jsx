// src/components/group/JoinedGroups.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, getDoc, query, orderBy, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import SearchBar from '../ui/SearchBar';

export default function JoinedGroups({ onSelectGroup, activeGroupId }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});

  // Main groups listener
  useEffect(() => {
    const q = collection(db, 'users', user.uid, 'joinedGroups');
    const unsub = onSnapshot(q, async (snap) => {
      const joinedDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const fetched = await Promise.all(
        joinedDocs.map(async (jd) => {
          try {
            const groupDoc = await getDoc(doc(db, 'groups', jd.id));
            if (!groupDoc.exists()) return null;
            const data = groupDoc.data();
            return {
              id: jd.id,
              name: data.name || 'Unknown Group',
              avatar: data.avatar || '',
              memberCount: data.memberCount || 0,
              lastMessage: data.lastMessage || '',
              updatedAt: data.updatedAt,
              lastSeen: jd.lastSeen || null,
            };
          } catch { return null; }
        })
      );

      const valid = fetched
        .filter(Boolean)
        .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

      setGroups(valid);
      setLoading(false);

      // Calculate unread counts
      const counts = {};
      await Promise.all(
        valid.map(async (g) => {
          try {
            if (!g.lastSeen) {
              // Never opened — count all messages
              const msgsSnap = await getDocs(collection(db, 'groups', g.id, 'messages'));
              counts[g.id] = msgsSnap.size;
            } else {
              const msgsQuery = query(
                collection(db, 'groups', g.id, 'messages'),
                where('createdAt', '>', g.lastSeen)
              );
              const msgsSnap = await getDocs(msgsQuery);
              // Exclude own messages from unread
              counts[g.id] = msgsSnap.docs.filter((d) => d.data().senderId !== user.uid).length;
            }
          } catch { counts[g.id] = 0; }
        })
      );
      setUnreadCounts(counts);
    });
    return unsub;
  }, [user.uid]);

  // Real-time group updates (lastMessage, memberCount)
  useEffect(() => {
    if (groups.length === 0) return;
    const unsubscribers = groups.map((g) =>
      onSnapshot(doc(db, 'groups', g.id), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setGroups((prev) =>
          prev.map((gr) =>
            gr.id === g.id
              ? { ...gr, lastMessage: data.lastMessage || '', memberCount: data.memberCount || 0, updatedAt: data.updatedAt }
              : gr
          )
        );
      })
    );
    return () => unsubscribers.forEach((u) => u());
  }, [groups.map((g) => g.id).join(',')]);

  const handleSelect = (group) => {
    // Clear unread badge immediately on click
    setUnreadCounts((prev) => ({ ...prev, [group.id]: 0 }));
    onSelectGroup(group);
  };

  const filteredGroups = searchQuery.trim()
    ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : groups;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center text-gray-400 mt-20 px-6">
        <div className="text-4xl mb-3">🗺️</div>
        <p className="font-medium text-gray-600">No groups yet</p>
        <p className="text-sm mt-1">Discover or create a group to start chatting!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {groups.length > 2 && (
        <div className="p-3 border-b bg-white sticky top-0 z-10">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search your groups..." />
        </div>
      )}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {filteredGroups.length === 0 && (
          <div className="text-center text-gray-400 mt-16 px-6">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm font-medium text-gray-600">No matches for "{searchQuery}"</p>
          </div>
        )}
        {filteredGroups.map((group) => {
          const unread = unreadCounts[group.id] || 0;
          return (
            <button
              key={group.id}
              onClick={() => handleSelect(group)}
              className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left ${
                activeGroupId === group.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={group.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${group.id}`}
                  alt="" className="w-12 h-12 rounded-full bg-gray-100"
                />
                {unread > 0 && activeGroupId !== group.id && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${unread > 0 && activeGroupId !== group.id ? 'text-gray-900' : 'text-gray-700'}`}>
                  {group.name}
                </p>
                <p className="text-xs text-gray-500">{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</p>
                {group.lastMessage && (
                  <p className={`text-xs truncate mt-0.5 ${unread > 0 && activeGroupId !== group.id ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                    {group.lastMessage}
                  </p>
                )}
              </div>
              {activeGroupId === group.id && <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
