// src/components/group/JoinGroupModal.jsx
import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

export default function JoinGroupModal({ group, onSuccess, onClose }) {
  const { user } = useAuth();
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!nickname.trim()) return setError('Please enter a nickname.');

    setLoading(true);
    setError('');

    try {
      const memberRef = doc(db, 'groups', group.id, 'members', user.uid);
      const existing = await getDoc(memberRef);

      if (!existing.exists()) {
        // Add member
        await setDoc(memberRef, {
          nickname: nickname.trim(),
          joinedAt: serverTimestamp(),
        });

        // Increment member count atomically
        await updateDoc(doc(db, 'groups', group.id), {
          memberCount: increment(1),
        });
      }

      // Save to user's joinedGroups
      await setDoc(doc(db, 'users', user.uid, 'joinedGroups', group.id), {
        groupId: group.id,
        name: group.name,
        avatar: group.avatar || '',
        joinedAt: serverTimestamp(),
      });

      onSuccess(group, nickname.trim());
    } catch (e) {
      console.error(e);
      setError('Failed to join group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <img
            src={group.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${group.id}`}
            alt=""
            className="w-12 h-12 rounded-full bg-gray-100"
          />
          <div>
            <h3 className="font-bold text-gray-800">{group.name}</h3>
            <p className="text-xs text-gray-500">{group.memberCount} members</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Your Nickname *</label>
          <input
            type="text"
            placeholder="How should others see you?"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            maxLength={30}
            autoFocus
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Chat'}
          </button>
        </div>
      </div>
    </div>
  );
}
