// src/App.jsx
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import JoinedGroups from './components/group/JoinedGroups';
import DiscoverGroups from './components/group/DiscoverGroups';
import CreateGroup from './components/group/CreateGroup';
import ChatWindow from './components/chat/ChatWindow';
import GlobalSearch from './components/ui/GlobalSearch';
import JoinGroupModal from './components/group/JoinGroupModal';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState('chats');
  const [activeGroup, setActiveGroup] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [joinFromSearch, setJoinFromSearch] = useState(null);

  // Keyboard shortcut: Cmd/Ctrl+K — must be before any conditional returns
  React.useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

  const handleGroupCreated = (group) => {
    setActiveGroup(group);
    setTab('chats');
    setShowChat(true);
  };

  const handleGroupJoined = (group) => {
    setActiveGroup(group);
    setTab('chats');
    setShowChat(true);
  };

  const handleSelectGroup = (group) => {
    setActiveGroup(group);
    setShowChat(true);
  };

  const handleBack = () => setShowChat(false);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top App Bar */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0 shadow-sm">
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Logo mark: layered chat bubbles */}
          <div className="relative w-8 h-8 flex-shrink-0">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
              {/* Background bubble */}
              <rect x="2" y="2" width="22" height="16" rx="5" fill="#2563EB"/>
              {/* Tail of background bubble */}
              <path d="M8 18 L5 24 L14 18" fill="#2563EB"/>
              {/* Foreground bubble */}
              <rect x="8" y="10" width="22" height="16" rx="5" fill="#1D4ED8"/>
              {/* Tail of foreground bubble */}
              <path d="M22 26 L30 30 L26 22" fill="#1D4ED8"/>
              {/* Dots in foreground bubble */}
              <circle cx="15" cy="18" r="1.5" fill="white" fillOpacity="0.9"/>
              <circle cx="19" cy="18" r="1.5" fill="white" fillOpacity="0.9"/>
              <circle cx="23" cy="18" r="1.5" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          {/* Wordmark */}
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-[17px] font-bold tracking-tight text-gray-900">NearTalk</span>
            <span className="text-[9px] font-medium tracking-widest text-blue-600 uppercase mt-0.5">Local Groups</span>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <button
          onClick={() => setShowGlobalSearch(true)}
          className="flex-1 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-400 text-left transition mx-2 max-w-md"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <span className="flex-1">Search groups...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </button>

        {/* Right: Avatar + Logout */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          <img
            src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
            alt=""
            className="w-8 h-8 rounded-full bg-gray-100"
          />
          <button
            onClick={logout}
            className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 font-semibold text-sm px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar / Left Panel */}
        <div
          className={`flex flex-col bg-white border-r flex-shrink-0
            ${showChat ? 'hidden md:flex' : 'flex'}
            w-full md:w-80 lg:w-96`}
        >
          {/* Tab Bar */}
          <div className="flex items-center gap-1 px-3 py-2.5 bg-white border-b border-gray-100">
            {[
              { key: 'chats',    label: 'Chats',    icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10z"/></svg>
              )},
              { key: 'discover', label: 'Discover', icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
              )},
              { key: 'create',   label: 'Create',   icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              )},
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  tab === t.key
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <span className={`transition-transform duration-200 ${tab === t.key ? 'scale-110' : ''}`}>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {tab === 'chats' && (
              <JoinedGroups
                onSelectGroup={handleSelectGroup}
                activeGroupId={activeGroup?.id}
              />
            )}
            {tab === 'discover' && (
              <DiscoverGroups
                onGroupJoined={handleGroupJoined}
                onLocationReady={setUserLocation}
              />
            )}
            {tab === 'create' && (
              <CreateGroup
                onGroupCreated={handleGroupCreated}
                onCancel={() => setTab('chats')}
              />
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div
          className={`flex-1 flex flex-col min-h-0 bg-gray-50
            ${!showChat ? 'hidden md:flex' : 'flex'}`}
        >
          <ChatWindow group={activeGroup} onBack={handleBack} />
        </div>
      </div>

      {/* Global Search Overlay */}
      {showGlobalSearch && (
        <GlobalSearch
          userLocation={userLocation}
          onSelectGroup={(group) => {
            handleSelectGroup(group);
            setTab('chats');
          }}
          onGroupJoin={(group) => setJoinFromSearch(group)}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}

      {/* Join modal triggered from global search */}
      {joinFromSearch && (
        <JoinGroupModal
          group={joinFromSearch}
          onSuccess={(group, nickname) => {
            setJoinFromSearch(null);
            handleGroupJoined({ ...group, nickname });
          }}
          onClose={() => setJoinFromSearch(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}