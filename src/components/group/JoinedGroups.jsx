// src/components/group/JoinedGroups.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import SearchBar from '../ui/SearchBar';

export default function JoinedGroups({ onSelectGroup, activeGroupId }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = collection(db, 'users', user.uid, 'joinedGroups');
    const unsub = onSnapshot(q, async (snap) => {
      const groupIds = snap.docs.map((d) => d.id);
      const fetched = await Promise.all(
        groupIds.map(async (id) => {
          try {
            const groupDoc = await getDoc(doc(db, 'groups', id));
            if (!groupDoc.exists()) return null;
            const data = groupDoc.data();
            return {
              id,
              name: data.name || 'Unknown Group',
              avatar: data.avatar || '',
              memberCount: data.memberCount || 0,
              lastMessage: data.lastMessage || '',
              updatedAt: data.updatedAt,
            };
          } catch { return null; }
        })
      );
      const valid = fetched
        .filter(Boolean)
        .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setGroups(valid);
      setLoading(false);
    });
    return unsub;
  }, [user.uid]);

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
        {filteredGroups.map((group) => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group)}
            className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left ${activeGroupId === group.id ? 'bg-blue-50' : ''}`}
          >
            <img
              src={group.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${group.id}`}
              alt="" className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{group.name}</p>
              <p className="text-xs text-gray-500">{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</p>
              {group.lastMessage && <p className="text-xs text-gray-400 truncate mt-0.5">{group.lastMessage}</p>}
            </div>
            {activeGroupId === group.id && <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}
