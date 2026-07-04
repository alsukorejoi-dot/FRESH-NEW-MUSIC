import React, { useState, useEffect } from 'react';
import { Lock, Unlock, X } from 'lucide-react';
import { ViewMode, TargetTrack, User, WeeklySchedule } from './types';
import { ADMIN_PIN, DEFAULT_SPOTIFY_ID } from './constants';
import { AdminPanel } from './components/AdminPanel';
import { MemberView } from './components/MemberView';
import { AuthView } from './components/AuthView';
import { storageService } from './services/storage';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.AUTH);
  const [targetTracks, setTargetTracks] = useState<TargetTrack[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [spotifyId, setSpotifyId] = useState(DEFAULT_SPOTIFY_ID);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});

  // Pin Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [currentAdminPin, setCurrentAdminPin] = useState(ADMIN_PIN);

  // Initialize Data
  useEffect(() => {
    loadData();
    
    // Reload data when window gains focus to keep it fresh
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadData = async () => {
    try {
      // getTodayData automatically handles determining the day of the week
      const { tracks, spotifyId: sId } = await storageService.getTodayData();
      setTargetTracks(tracks);
      setSpotifyId(sId);

      const schedule = await storageService.getWeeklySchedule();
      setWeeklySchedule(schedule);

      // Load Custom Admin PIN
      const pin = await storageService.getAdminPin();
      setCurrentAdminPin(pin);
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  // Callback to reload data after Admin saves changes
  const handleAdminExit = async () => {
    await loadData(); // Refresh to see changes immediately (schedule & PIN)
    setViewMode(currentUser ? ViewMode.MEMBER : ViewMode.AUTH);
  };

  // Auth Handlers
  const handleRegister = (newUser: User) => {
    // AuthView already handles the storageService.registerUser call
    setCurrentUser(newUser);
    setViewMode(ViewMode.MEMBER);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setViewMode(ViewMode.MEMBER);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setViewMode(ViewMode.AUTH);
  };

  // Check-In Logic
  const handleUserCheckIn = async (dateStr: string, usedLastFmUsername: string | string[]) => {
    if (!currentUser) return;
    
    try {
      const updatedUser = await storageService.updateUserCheckIn(currentUser.id, dateStr, usedLastFmUsername);
      setCurrentUser(updatedUser);
    } catch (e) {
      console.error("Check-in failed", e);
    }
  };

  // Handle Profile Update
  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  // Handle Admin Access
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === currentAdminPin) {
      setViewMode(ViewMode.ADMIN);
      setIsPinModalOpen(false);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col">
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/30 blur-[120px] pointer-events-none" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start pt-10 px-4 pb-20 z-10">
        
        {viewMode === ViewMode.AUTH && (
          <AuthView 
            onLogin={handleLogin} 
            onRegister={handleRegister} 
            onOpenAdmin={() => setIsPinModalOpen(true)}
          />
        )}

        {viewMode === ViewMode.ADMIN && (
          <AdminPanel 
            onExit={handleAdminExit} 
          />
        )}

        {viewMode === ViewMode.MEMBER && currentUser && (
          <MemberView 
            weeklySchedule={weeklySchedule}
            currentUser={currentUser}
            onCheckIn={handleUserCheckIn}
            onUpdateUser={handleUserUpdate}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Admin Trigger (Bottom Left) - Only visible on Auth screen */}
      {viewMode === ViewMode.AUTH && (
        <button
          onClick={() => setIsPinModalOpen(true)}
          className="fixed bottom-6 left-6 p-3 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all z-50 group"
          aria-label="Admin Access"
        >
          <Lock size={16} className="group-hover:opacity-100 opacity-50" />
        </button>
      )}

      {/* PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-sm p-6 rounded-2xl relative animate-bounce-in">
            <button 
              onClick={() => setIsPinModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold mb-4 text-center">Admin Access</h3>
            <p className="text-gray-400 text-sm text-center mb-6">Enter PIN to configure playlist.</p>
            
            <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
              <input 
                type="password" 
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                className="bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-purple-500 transition-colors"
                autoFocus
              />
              
              {pinError && (
                <p className="text-red-500 text-xs text-center">Incorrect PIN.</p>
              )}

              <button 
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-3 font-bold mt-2 shadow-[0_0_10px_rgba(168,85,247,0.4)] transition-all flex justify-center items-center gap-2"
              >
                <Unlock size={18} />
                Unlock
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;