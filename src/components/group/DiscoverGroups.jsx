// src/components/group/DiscoverGroups.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { getGeolocation, haversineDistance } from '../../utils/geolocation';
import JoinGroupModal from './JoinGroupModal';
import SearchBar from '../ui/SearchBar';

const RADIUS_KM = 5;

export default function DiscoverGroups({ onGroupJoined, onLocationReady }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('loading');
  const [userLoc, setUserLoc] = useState(null);
  const [joinTarget, setJoinTarget] = useState(null);
  const [joinedIds, setJoinedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    initLocation();
  }, []);

  const initLocation = async () => {
    setLocationStatus('loading');
    const loc = await getGeolocation();
    setUserLoc(loc);
    onLocationReady?.(loc);
    setLocationStatus(loc.isFallback && loc.latitude === 0 ? 'error' : 'success');
    await loadGroups(loc);
  };

  const loadGroups = async (loc) => {
    setLoading(true);
    try {
      const joinedSnap = await getDocs(collection(db, 'users', user.uid, 'joinedGroups'));
      const joined = new Set(joinedSnap.docs.map((d) => d.id));
      setJoinedIds(joined);

      const snap = await getDocs(collection(db, 'groups'));
      const all = snap.docs.map((d) => {
        const data = d.data();

        // Safely parse lat/lng — skip group if either is missing/invalid
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        if (isNaN(lat) || isNaN(lng) || data.latitude === null || data.longitude === null) return null;

        let distance = null;
        if (loc && loc.latitude !== 0 && loc.longitude !== 0) {
          distance = haversineDistance(loc.latitude, loc.longitude, lat, lng);
        }

        return {
          id: d.id,
          name: data.name || 'Unnamed Group',
          avatar: data.avatar || '',
          latitude: lat,
          longitude: lng,
          memberCount: data.memberCount || 0,
          distance,
        };
      }).filter(Boolean);

      const nearby = all
        .filter((g) => {
          if (!loc || loc.latitude === 0) return true;
          if (g.distance === null) return false;
          return g.distance <= RADIUS_KM;
        })
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

      setGroups(nearby);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = searchQuery.trim()
    ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : groups;

  const handleJoinSuccess = (group, nickname) => {
    setJoinTarget(null);
    onGroupJoined({ ...group, nickname });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white sticky top-0 z-10 space-y-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Discover Groups</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {locationStatus === 'success' && userLoc
              ? `Within ${RADIUS_KM}km${userLoc.isIPBased ? ' (approx)' : ''}`
              : locationStatus === 'loading'
              ? 'Getting location...'
              : 'Location unavailable'}
          </p>
        </div>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search groups by name..."
        />
      </div>

      {locationStatus === 'error' && (
        <div className="mx-4 mt-3 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-xl p-3 flex items-center justify-between">
          <span>📍 Location access denied</span>
          <button onClick={initLocation} className="text-blue-600 font-semibold ml-2 underline text-xs">Retry</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center text-gray-400 mt-20 px-6">
            <div className="text-4xl mb-3">{searchQuery ? '🔍' : '🏙️'}</div>
            <p className="font-medium text-gray-600">
              {searchQuery ? `No groups matching "${searchQuery}"` : 'No groups nearby'}
            </p>
            <p className="text-sm mt-1">
              {searchQuery ? 'Try a different search term' : 'Be the first to create one!'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredGroups.map((group) => {
              const isJoined = joinedIds.has(group.id);
              return (
                <div key={group.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition">
                  <img
                    src={group.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${group.id}`}
                    alt=""
                    className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-800 truncate">
                        {searchQuery ? highlightMatch(group.name, searchQuery) : group.name}
                      </p>
                      {group.distance !== null && group.distance !== undefined && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{group.distance.toFixed(1)} km</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => !isJoined && setJoinTarget(group)}
                    disabled={isJoined}
                    className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-xl transition ${
                      isJoined ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isJoined ? 'Joined' : 'Join'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {joinTarget && (
        <JoinGroupModal group={joinTarget} onSuccess={handleJoinSuccess} onClose={() => setJoinTarget(null)} />
      )}
    </div>
  );
}

function highlightMatch(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-gray-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}