// src/components/ui/GlobalSearch.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { haversineDistance } from '../../utils/geolocation';

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-gray-900 rounded">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function GlobalSearch({ userLocation, onSelectGroup, onGroupJoin, onClose }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [allGroups, setAllGroups] = useState([]);
  const [joinedIds, setJoinedIds] = useState(new Set());
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Load all groups + joined status once
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [groupsSnap, joinedSnap] = await Promise.all([
          getDocs(collection(db, 'groups')),
          getDocs(collection(db, 'users', user.uid, 'joinedGroups')),
        ]);

        const joined = new Set(joinedSnap.docs.map((d) => d.id));
        setJoinedIds(joined);

        const groups = groupsSnap.docs.map((d) => {
          const data = d.data();
          const lat = typeof data.latitude === 'number' ? data.latitude : parseFloat(data.latitude) || 0;
          const lng = typeof data.longitude === 'number' ? data.longitude : parseFloat(data.longitude) || 0;
          let distance = null;
          if (userLocation && userLocation.latitude !== 0) {
            distance = haversineDistance(userLocation.latitude, userLocation.longitude, lat, lng);
          }
          return {
            id: d.id,
            name: data.name || 'Unnamed Group',
            avatar: data.avatar || '',
            memberCount: data.memberCount || 0,
            lastMessage: data.lastMessage || '',
            latitude: lat,
            longitude: lng,
            distance,
            isJoined: joined.has(d.id),
          };
        });

        setAllGroups(groups);
        setResults(groups.slice(0, 20)); // Show top 20 by default
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
    inputRef.current?.focus();
  }, [user.uid]);

  // Filter results whenever query changes
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setResults(allGroups.slice(0, 20));
      setActiveIndex(0);
      return;
    }
    const filtered = allGroups
      .filter((g) => g.name.toLowerCase().includes(q))
      .sort((a, b) => {
        // Exact matches first
        const aStarts = a.name.toLowerCase().startsWith(q);
        const bStarts = b.name.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        // Then by distance
        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      });
    setResults(filtered);
    setActiveIndex(0);
  }, [query, allGroups]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleSelect = (group) => {
    if (group.isJoined) {
      onSelectGroup(group);
      onClose();
    } else {
      onGroupJoin(group);
      onClose();
    }
  };

  // Split results into sections
  const joinedResults = results.filter((g) => g.isJoined);
  const discoverResults = results.filter((g) => !g.isJoined);

  const renderGroup = (group, i, globalIndex) => {
    const isActive = globalIndex === activeIndex;
    return (
      <button
        key={group.id}
        onClick={() => handleSelect(group)}
        onMouseEnter={() => setActiveIndex(globalIndex)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
          isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}
      >
        <img
          src={group.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${group.id}`}
          alt=""
          className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">
            {highlight(group.name, query.trim())}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
            {group.distance !== null && group.distance !== undefined
              ? ` · ${group.distance.toFixed(1)} km away`
              : ''}
          </p>
          {group.lastMessage && (
            <p className="text-xs text-gray-400 truncate">{group.lastMessage}</p>
          )}
        </div>
        <span
          className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg ${
            group.isJoined
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {group.isJoined ? 'Open' : 'Join'}
        </span>
      </button>
    );
  };

  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Search Panel */}
      <div className="relative mx-auto mt-16 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100vh - 8rem)' }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search groups by name..."
            className="flex-1 text-base text-gray-800 placeholder-gray-400 outline-none bg-transparent"
            autoComplete="off"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium transition ml-1"
          >
            Cancel
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto" ref={listRef}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-14 px-6">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-medium text-gray-700">No groups found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
            </div>
          ) : (
            <>
              {/* Your Groups Section */}
              {joinedResults.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Groups</p>
                  </div>
                  {joinedResults.map((g) => {
                    const el = renderGroup(g, globalIdx, globalIdx);
                    globalIdx++;
                    return el;
                  })}
                </>
              )}

              {/* Discover Section */}
              {discoverResults.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Discover</p>
                  </div>
                  {discoverResults.map((g) => {
                    const el = renderGroup(g, globalIdx, globalIdx);
                    globalIdx++;
                    return el;
                  })}
                </>
              )}

              {/* Result count footer */}
              <div className="px-4 py-2 border-t bg-gray-50">
                <p className="text-xs text-gray-400 text-center">
                  {results.length} group{results.length !== 1 ? 's' : ''} found
                  {query && ` for "${query}"`}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Keyboard hint */}
        {!loading && results.length > 0 && (
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gray-50 border-t text-xs text-gray-400">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>Esc close</span>
          </div>
        )}
      </div>
    </div>
  );
}
