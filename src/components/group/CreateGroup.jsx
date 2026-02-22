// src/components/group/CreateGroup.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection, addDoc, doc, setDoc, serverTimestamp, increment, updateDoc,
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { getGeolocation } from '../../utils/geolocation';
import { getRandomAvatarOptions, getAvatarUrl } from '../../utils/avatar';

export default function CreateGroup({ onGroupCreated, onCancel }) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('bottts');
  const [avatarOptions, setAvatarOptions] = useState([]);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | loading | success | error
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (groupName) {
      setAvatarOptions(getRandomAvatarOptions(groupName));
    }
  }, [groupName]);

  const fetchLocation = async () => {
    setLocationStatus('loading');
    setError('');
    const loc = await getGeolocation();
    setLocation(loc);
    if (loc.isFallback) {
      setLocationStatus('error');
      setError('Could not determine your location. You can still create the group with approximate location.');
    } else {
      setLocationStatus('success');
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return setError('Please enter a group name.');
    if (!nickname.trim()) return setError('Please enter a nickname.');

    let loc = location;
    if (!loc) {
      setLoading(true);
      loc = await getGeolocation();
      setLocation(loc);
      setLoading(false);
    }

    if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
      return setError('Location is required. Please retry or allow location access.');
    }

    setLoading(true);
    setError('');

    try {
      const avatarUrl = getAvatarUrl(groupName, selectedAvatar);

      // Create group document
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: groupName.trim(),
        avatar: avatarUrl,
        latitude: loc.latitude,
        longitude: loc.longitude,
        createdBy: user.uid,
        memberCount: 1,
        lastMessage: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Add creator as member
      await setDoc(doc(db, 'groups', groupRef.id, 'members', user.uid), {
        nickname: nickname.trim(),
        joinedAt: serverTimestamp(),
      });

      // Save to user's joinedGroups
      await setDoc(doc(db, 'users', user.uid, 'joinedGroups', groupRef.id), {
        groupId: groupRef.id,
        name: groupName.trim(),
        avatar: avatarUrl,
        joinedAt: serverTimestamp(),
      });

      onGroupCreated({ id: groupRef.id, name: groupName.trim(), avatar: avatarUrl, memberCount: 1, lastMessage: '', nickname: nickname.trim() });
    } catch (e) {
      console.error(e);
      setError('Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-gray-800">Create Group</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>
        )}

        {/* Group Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Group Name *</label>
          <input
            type="text"
            placeholder="e.g. Coffee Lovers Near Park"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            maxLength={60}
          />
        </div>

        {/* Nickname */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Your Nickname *</label>
          <input
            type="text"
            placeholder="Anonymous name to show in chat"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            maxLength={30}
          />
        </div>

        {/* Avatar Picker */}
        {avatarOptions.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Group Avatar</label>
            <div className="grid grid-cols-4 gap-2">
              {avatarOptions.map((opt) => (
                <button
                  key={opt.style}
                  onClick={() => setSelectedAvatar(opt.style)}
                  className={`rounded-xl p-2 border-2 transition ${
                    selectedAvatar === opt.style ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={opt.url} alt={opt.style} className="w-full h-12 object-contain" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
          {locationStatus === 'success' && location && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl p-3">
              <span>✅</span>
              <span>Location captured{location.isIPBased ? ' (approximate via IP)' : ''}</span>
            </div>
          )}
          {locationStatus === 'loading' && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl p-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Getting your location...</span>
            </div>
          )}
          {(locationStatus === 'idle' || locationStatus === 'error') && (
            <button
              onClick={fetchLocation}
              className="w-full bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-sm rounded-xl p-3 transition"
            >
              📍 {locationStatus === 'error' ? 'Retry Location' : 'Get My Location'}
            </button>
          )}
          <p className="text-xs text-gray-400 mt-1">Location helps others nearby discover your group.</p>
        </div>
      </div>

      {/* Create Button */}
      <div className="p-4 bg-white border-t sticky bottom-0">
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </div>
  );
}
