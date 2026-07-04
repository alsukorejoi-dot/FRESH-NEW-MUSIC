import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, RefreshCw, Trophy, AlertCircle, Clock, CalendarCheck, LogOut, User as UserIcon, X, Music, ExternalLink, Settings, Edit2, Save, Key, Lock, Link as LinkIcon, Headphones, Mic2, Eye, MessageCircle, Star, Trash2 } from 'lucide-react';
import { TargetTrack, User, WeeklySchedule } from '../types';
import { fetchRecentTracks } from '../services/lastFmService';
import { storageService } from '../services/storage';
import { DEFAULT_SPOTIFY_ID, getPossibleDateStrings } from '../constants';

interface MemberViewProps {
  weeklySchedule: WeeklySchedule;
  currentUser: User;
  onCheckIn: (dateStr: string, usedLastFmUsername: string | string[]) => Promise<void> | void;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
}

export const MemberView: React.FC<MemberViewProps> = ({ weeklySchedule, currentUser, onCheckIn, onUpdateUser, onLogout }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [synced, setSynced] = useState(false);
  
  const [matchedStatus, setMatchedStatus] = useState<Record<string, string>>({});
  const [syncPlayCount, setSyncPlayCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [accountUsedError, setAccountUsedError] = useState<string | null>(null);
  const [winningAccount, setWinningAccount] = useState<string | string[]>('');
  const [showReward, setShowReward] = useState(false);
  const [checkedInUsersText, setCheckedInUsersText] = useState<string>('Memuat data member check-in...');

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Edit Form State
  const [editAppUsername, setEditAppUsername] = useState('');
  const [editLastFmUser, setEditLastFmUser] = useState('');
  const [editLastFmKey, setEditLastFmKey] = useState('');
  const [editLastFmAccounts, setEditLastFmAccounts] = useState<{username: string; apiKey: string; isPrimary?: boolean; connectedAt?: string}[]>([]);
  const [editPassword, setEditPassword] = useState('');
  
  // Personal Music State
  const [editPlaylistUrl, setEditPlaylistUrl] = useState('');
  const [editPersonalArtist, setEditPersonalArtist] = useState('');
  const [editPersonalTrack, setEditPersonalTrack] = useState('');
  const [editPlaylistUrl2, setEditPlaylistUrl2] = useState('');
  const [editPersonalArtist2, setEditPersonalArtist2] = useState('');
  const [editPersonalTrack2, setEditPersonalTrack2] = useState('');
  const [editPlaylistUrl3, setEditPlaylistUrl3] = useState('');
  const [editPersonalArtist3, setEditPersonalArtist3] = useState('');
  const [editPersonalTrack3, setEditPersonalTrack3] = useState('');
  const [editWhatsappName, setEditWhatsappName] = useState('');
  const [editWhatsappNumber, setEditWhatsappNumber] = useState('');

  // Day Selection State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Derive tracks and spotifyId from weeklySchedule and selectedDate
  const dayIndex = selectedDate.getDay();
  const dayConfig = weeklySchedule[dayIndex] || { tracks: [], spotifyId: '' };
  const tracks = dayConfig.tracks || [];
  const spotifyId = dayConfig.spotifyId || DEFAULT_SPOTIFY_ID;

  // Calculate Check-in status dynamically
  const selectedDateStr = selectedDate.toLocaleDateString();
  const possibleDates = getPossibleDateStrings(selectedDate);
  const hasCheckedInSelectedDate = currentUser.checkInHistory?.some(d => possibleDates.includes(d)) || false;

  useEffect(() => {
    const fetchCheckedInUsers = async () => {
      try {
        const allUsers = await storageService.getUsers();
        
        // Find users who checked in on the selected date
        const checkedInUsernames = allUsers.filter(u => {
          const history = u.checkInHistory || [];
          return possibleDates.some(d => history.includes(d)) || possibleDates.includes(u.lastCheckInDate || '');
        }).map(u => u.appUsername);
        
        if (checkedInUsernames.length > 0) {
          setCheckedInUsersText(`👥 Member yang sudah check-in hari ini: ${checkedInUsernames.join(' • ')}`);
        } else {
          setCheckedInUsersText(`Belum ada member yang check-in hari ini.`);
        }
      } catch (err) {
        console.error("Failed to load checked in users", err);
      }
    };
    fetchCheckedInUsers();
  }, [selectedDateStr, hasCheckedInSelectedDate, showReward]);

  const realToday = new Date();
  realToday.setHours(0,0,0,0);
  const compareDateVal = new Date(selectedDate);
  compareDateVal.setHours(0,0,0,0);
  
  const isPastDate = compareDateVal.getTime() < realToday.getTime();
  const currentDayOfWeekVal = new Date().getDay();
  const isWeekendVal = currentDayOfWeekVal === 0 || currentDayOfWeekVal === 6;
  const isHutangDay = isPastDate && tracks.length > 0 && !hasCheckedInSelectedDate;
  const isLockedHutang = isHutangDay && !isWeekendVal;

  const SPOTIFY_CLIENT_ID = (import.meta as any).env?.VITE_SPOTIFY_CLIENT_ID || '19558308ed174b63a90ce64d9221036d'; // Client ID Utama

  const handleConnectSpotify = async () => {
    const clientId = SPOTIFY_CLIENT_ID;

    const redirectUri = `${window.location.origin}/auth-callback.html`;
    const scopes = 'user-read-private user-read-email';
    
    const generateRandomString = (length: number) => {
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const values = crypto.getRandomValues(new Uint8Array(length));
      return values.reduce((acc, x) => acc + possible[x % possible.length], "");
    };
    
    const sha256 = async (plain: string) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      return window.crypto.subtle.digest('SHA-256', data);
    };
    
    const base64urlencode = (a: ArrayBuffer) => {
      return btoa(String.fromCharCode.apply(null, new Uint8Array(a) as any))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };
    
    const codeVerifier = generateRandomString(64);
    window.localStorage.setItem('spotify_code_verifier', codeVerifier);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64urlencode(hashed);

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&code_challenge_method=S256&code_challenge=${codeChallenge}&show_dialog=true`;

    window.open(authUrl, 'spotify_popup', 'width=600,height=700');
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent | MessageEvent<any>) => {
      console.log('Received message:', event);
      if (event.type === 'message' && !event.origin.includes('localhost') && !event.origin.endsWith('.run.app') && !event.origin.endsWith('.vercel.app')) {
        console.warn('Ignoring message from unauthorized origin:', event.origin);
        return;
      }
      
      const payload = event.data;
      if (payload?.type === 'SPOTIFY_AUTH_CODE') {
        const code = payload.code;
        console.log('Spotify Auth Code received:', code);
        const codeVerifier = localStorage.getItem('spotify_code_verifier');
        const clientId = SPOTIFY_CLIENT_ID;
        const redirectUri = `${window.location.origin}/auth-callback.html`;

        try {
          const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: clientId || '',
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: redirectUri,
              code_verifier: codeVerifier || '',
            }),
          });
          
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;
            console.log('Got access token');
            
            const res = await fetch('https://api.spotify.com/v1/me', {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.ok) {
              const data = await res.json();
              const isPremium = data.product === 'premium';
              console.log('User profile:', data);
              
              if (!isPremium) {
                alert('Gagal! Akun ini bukan Spotify Premium. Harap gunakan langganan Premium untuk memverifikasi akun.');
                return;
              }

              const currentVerified = currentUser.verifiedSpotifyAccounts || [];
              const alreadyVerified = currentVerified.find(acc => acc.id === data.id);
              
              let newAccounts = [...currentVerified];
              if (!alreadyVerified) {
                newAccounts.push({
                   id: data.id,
                   email: data.email,
                   plan: data.product,
                   addedAt: new Date().toISOString()
                });
              }

              const updatedUser = await storageService.updateUserProfile(currentUser.id, {
                spotifyAccessToken: accessToken,
                spotifyPremiumMode: true,
                verifiedSpotifyAccounts: newAccounts
              });
              onUpdateUser(updatedUser);
              
              if (alreadyVerified) {
                alert(`Token Spotify diperbarui! Akun ${data.email || data.id} sudah pernah diverifikasi sebelumnya.`);
              } else {
                alert(`Berhasil! Akun Premium ditambahkan. Total akun Spotify terverifikasi: ${newAccounts.length}`);
              }
            } else {
               const pErr = await res.text();
               console.error('Failed to get user profile:', pErr, tokenData);
               alert('Gagal mengambil profil Spotify. Error: ' + pErr + '\\nToken: ' + (accessToken ? 'Ada' : 'Kosong'));
            }
          } else {
             const err = await tokenResponse.json();
             console.error('Failed to get token:', err);
             alert('Gagal mendapatkan Token dari Spotify: ' + JSON.stringify(err));
          }
        } catch (e: any) {
          console.error('Exception during Spotify verification:', e);
          alert('Error: Gagal memverifikasi akun Spotify. ' + e.message);
        }
      } else if (payload?.type === 'SPOTIFY_AUTH_ERROR') {
        console.error('Spotify Auth error:', payload.error);
        alert('Spotify Auth error: ' + payload.error);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Broadcast channel fallback
    const bc = new BroadcastChannel('spotify_auth');
    bc.onmessage = handleMessage;

    return () => {
      window.removeEventListener('message', handleMessage);
      bc.close();
    };
  }, [currentUser.id, onUpdateUser]);

  const calculateProgress = () => {
    if (tracks.length === 0) return 0;
    const matchedCount = tracks.filter(t => matchedStatus[t.id]).length;
    return Math.round((matchedCount / tracks.length) * 100);
  };

  const handleSync = async () => {
    if (!currentUser.lastFmUsername) {
      setError('No Last.fm username found in profile.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAccountUsedError(null);

    try {
      // Calculate timestamps for the selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const from = Math.floor(startOfDay.getTime() / 1000);
      
      let to: number | undefined = undefined; // We no longer restrict 'to' end of day so users can pay debt (bayar hutang) by listening now
      const isToday = selectedDate.toDateString() === new Date().toDateString();

      // Use credentials from all linked Last.fm accounts for auto-detection
      const accountsToSync = currentUser.lastFmAccounts?.length 
        ? currentUser.lastFmAccounts 
        : [{ username: currentUser.lastFmUsername, apiKey: currentUser.lastFmApiKey }];

      let allRecentTracks: any[] = [];
      
      try {
        const fetchPromises = accountsToSync.map(account => {
          if (!account.username) return Promise.resolve([]);
          return fetchRecentTracks(
            account.username,
            account.apiKey || currentUser.lastFmApiKey,
            from,
            to
          ).then(tracks => tracks.map(t => ({...t, listenedBy: account.username})));
        });
        const results = await Promise.all(fetchPromises);
        allRecentTracks = results.flat();
      } catch (e: any) {
        throw new Error('Gagal sinkronisasi salah satu akun Last.fm. Pastikan username dan API Key benar.');
      }
      
      const recentTracks = allRecentTracks;
      
      let totalMinPlayCount = Infinity;
      let combinedMatches: Record<string, string> = {};
      const contributingAccounts = new Set<string>();

      // Filter available accounts (prevent using accounts checked in by others)
      const accountsToUse: string[] = [];
      const errorMessages: string[] = [];
      
      for (const acc of accountsToSync) {
          if (!acc.username) continue;
          if (!hasCheckedInSelectedDate) {
              const isUsed = await storageService.isLastFmAccountUsed(selectedDateStr, acc.username);
              if (isUsed) {
                  errorMessages.push(`Akun '${acc.username}' sudah digunakan.`);
              } else {
                  accountsToUse.push(acc.username);
              }
          } else {
              accountsToUse.push(acc.username);
          }
      }

      if (errorMessages.length > 0) {
          setAccountUsedError(`Batas Keamanan: ${errorMessages.join(" ")} Hubungi Admin.`);
      }

      tracks.forEach(target => {
          const tArtist = target.artist.toLowerCase();
          const tTitle = target.title.toLowerCase();

          const foundTracks = recentTracks.filter(recent => {
             // Only count if from an available account
             if (!accountsToUse.includes(recent.listenedBy)) return false;

             const rArtist = recent.artist['#text'].toLowerCase().trim();
             const rTitle = recent.name.toLowerCase().trim();
             
             // 1. Title matching
             const titleMatch = rTitle === tTitle || rTitle.includes(tTitle) || tTitle.includes(rTitle);
             if (!titleMatch) return false;

             // 2. Artist matching
             const artistMatch = 
                 rArtist === tArtist || 
                 rArtist.includes(tArtist) || 
                 tArtist.includes(rArtist) ||
                 rArtist.split(',')[0].trim() === tArtist.split(',')[0].trim();

             if (!artistMatch) return false;

             // 3. Date check
             if (recent.date && recent.date.uts) {
                 const trackTime = parseInt(recent.date.uts);
                 if (trackTime < from) return false;
                 if (to && trackTime > to) return false;
             }
             // For 'nowplaying', we always accept it because 'bayar hutang' means they might be playing it right now

             return true;
          });

          const foundTracksOnDate = foundTracks.filter(recent => {
             if (recent['@attr']?.nowplaying === 'true') {
                 return isToday;
             }
             if (recent.date && recent.date.uts) {
                 const trackTime = parseInt(recent.date.uts);
                 const endOfDay = new Date(selectedDate);
                 endOfDay.setHours(23, 59, 59, 999);
                 const toTime = Math.floor(endOfDay.getTime() / 1000);
                 return trackTime <= toTime;
             }
             return false;
          });

          const effectivePlays = Math.max(foundTracksOnDate.length, foundTracks.length > 0 ? 1 : 0);

          if (effectivePlays < totalMinPlayCount) {
             totalMinPlayCount = effectivePlays;
          }

          foundTracks.forEach(ft => contributingAccounts.add(ft.listenedBy));
          const foundTrack = foundTracks[0];

          if (foundTrack) {
             let timeDisplay = 'Just now';
             if (foundTrack.date && foundTrack.date.uts) {
                 const dateObj = new Date(parseInt(foundTrack.date.uts) * 1000);
                 timeDisplay = dateObj.toLocaleString('id-ID', {
                   timeZone: 'Asia/Jakarta',
                   day: 'numeric',
                   month: 'short',
                   hour: '2-digit',
                   minute: '2-digit'
                 });
             } else if (foundTrack.date) {
                 timeDisplay = foundTrack.date['#text'];
             } else if (foundTrack['@attr']?.nowplaying === 'true') {
                 timeDisplay = 'Listening Now...';
             }
             combinedMatches[target.id] = `${timeDisplay} (${foundTrack.listenedBy})`;
          }
      });

      if (tracks.length === 0) totalMinPlayCount = 0;
      if (totalMinPlayCount === Infinity) totalMinPlayCount = 0;
      
      const winningUsernames = Array.from(contributingAccounts);
      setWinningAccount(winningUsernames);
      
      setSyncPlayCount(totalMinPlayCount);
      setMatchedStatus(combinedMatches);
      setSynced(true);
    } catch (err: any) {
      setError(err.message || 'Failed to sync. Please check API Key in your profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const pointsAvailable = Math.max(0, syncPlayCount - 1);
  const claimedBefore = currentUser.extraPointsClaimedDates?.[selectedDateStr] || 0;
  const pointsToClaim = Math.max(0, pointsAvailable - claimedBefore);

  const handleClaim = async () => {
    // If there is an account error, prevent claim completely
    if (accountUsedError) {
        setError(accountUsedError);
        return;
    }

    let extraBonusFromWeekly = 0;

    // Regular check-in
    if (!hasCheckedInSelectedDate) {
      try {
        await onCheckIn(selectedDateStr, winningAccount); 
      } catch (e: any) {
        setError(e.message || "Gagal menyimpan absensi ke server. Periksa koneksi internet Anda.");
        return;
      }
      
      // If the checked-in day is Saturday (6) or Sunday (0), they get an extra bonus point.
      const checkDate = new Date(selectedDate);
      const day = checkDate.getDay();
      if (day === 0 || day === 6) {
         extraBonusFromWeekly = 1;
      }
    }
    
    // Extra points
    if (pointsToClaim > 0 || extraBonusFromWeekly > 0) {
      try {
        const newBalance = (currentUser.extraPointsBalance || 0) + pointsToClaim + extraBonusFromWeekly;
        const newClaimedDates = { ...(currentUser.extraPointsClaimedDates || {}) };
        if (pointsToClaim > 0) {
            newClaimedDates[selectedDateStr] = pointsAvailable;
        }

        const updatedUser = await storageService.updateUserProfile(currentUser.id, {
          extraPointsBalance: newBalance,
          extraPointsClaimedDates: newClaimedDates
        });
        onUpdateUser(updatedUser);
      } catch (e) {
        console.error('Failed to claim points:', e);
      }
    }
    
    setShowReward(true);
  };

  const handlePatchAbsence = async () => {
    if (!currentUser.extraPointsBalance || currentUser.extraPointsBalance <= 0) return;
    try {
      const newBalance = currentUser.extraPointsBalance - 1;
      const newPatchedDates = [...(currentUser.patchedDates || []), selectedDateStr];
      const history = [...(currentUser.checkInHistory || [])];
      if (!history.includes(selectedDateStr)) history.push(selectedDateStr);

      const updatedUser = await storageService.updateUserProfile(currentUser.id, {
        extraPointsBalance: newBalance,
        patchedDates: newPatchedDates,
        checkInHistory: history
      });
      onUpdateUser(updatedUser);
      setShowReward(true);
    } catch (e) {
      console.error('Failed to patch absence:', e);
    }
  };

  // Profile Handlers
  const openProfile = () => {
    setEditAppUsername(currentUser.appUsername);
    setEditLastFmUser(currentUser.lastFmUsername);
    setEditLastFmKey(currentUser.lastFmApiKey);
    const defaultAccounts = currentUser.lastFmAccounts?.length 
      ? currentUser.lastFmAccounts 
      : [{ username: currentUser.lastFmUsername, apiKey: currentUser.lastFmApiKey }];
    setEditLastFmAccounts(defaultAccounts);
    setEditPassword(currentUser.password);
    setEditPlaylistUrl(currentUser.personalPlaylistUrl || '');
    setEditPersonalArtist(currentUser.personalArtist || '');
    setEditPersonalTrack(currentUser.personalTrack || '');
    setEditPlaylistUrl2(currentUser.personalPlaylistUrl2 || '');
    setEditPersonalArtist2(currentUser.personalArtist2 || '');
    setEditPersonalTrack2(currentUser.personalTrack2 || '');
    setEditPlaylistUrl3(currentUser.personalPlaylistUrl3 || '');
    setEditPersonalArtist3(currentUser.personalArtist3 || '');
    setEditPersonalTrack3(currentUser.personalTrack3 || '');
    setEditWhatsappName(currentUser.whatsappName || '');
    setEditWhatsappNumber(currentUser.whatsappNumber || '');
    setIsEditingProfile(false);
    setIsProfileOpen(true);
  };

  const openSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditAppUsername(currentUser.appUsername);
    setEditLastFmUser(currentUser.lastFmUsername);
    setEditLastFmKey(currentUser.lastFmApiKey);
    const defaultAccounts = currentUser.lastFmAccounts?.length 
      ? currentUser.lastFmAccounts 
      : [{ username: currentUser.lastFmUsername, apiKey: currentUser.lastFmApiKey }];
    setEditLastFmAccounts(defaultAccounts);
    setEditPassword(currentUser.password);
    setEditPlaylistUrl(currentUser.personalPlaylistUrl || '');
    setEditPersonalArtist(currentUser.personalArtist || '');
    setEditPersonalTrack(currentUser.personalTrack || '');
    setEditPlaylistUrl2(currentUser.personalPlaylistUrl2 || '');
    setEditPersonalArtist2(currentUser.personalArtist2 || '');
    setEditPersonalTrack2(currentUser.personalTrack2 || '');
    setEditPlaylistUrl3(currentUser.personalPlaylistUrl3 || '');
    setEditPersonalArtist3(currentUser.personalArtist3 || '');
    setEditPersonalTrack3(currentUser.personalTrack3 || '');
    setEditWhatsappName(currentUser.whatsappName || '');
    setEditWhatsappNumber(currentUser.whatsappNumber || '');
    setIsEditingProfile(true);
    setIsProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editAppUsername.trim()) {
      alert("Username aplikasi tidak boleh kosong!");
      return;
    }

    setIsSavingProfile(true);
    try {
      const primaryAccount = editLastFmAccounts.find(a => a.isPrimary) || editLastFmAccounts[0] || { username: '', apiKey: '' };
      const updates = {
        appUsername: editAppUsername,
        lastFmAccounts: editLastFmAccounts,
        lastFmUsername: primaryAccount.username,
        lastFmApiKey: primaryAccount.apiKey,
        password: editPassword,
        personalPlaylistUrl: editPlaylistUrl,
        personalArtist: editPersonalArtist,
        personalTrack: editPersonalTrack,
        personalPlaylistUrl2: editPlaylistUrl2,
        personalArtist2: editPersonalArtist2,
        personalTrack2: editPersonalTrack2,
        personalPlaylistUrl3: editPlaylistUrl3,
        personalArtist3: editPersonalArtist3,
        personalTrack3: editPersonalTrack3,
        whatsappName: editWhatsappName,
        whatsappNumber: editWhatsappNumber
      };
      
      const updatedUser = await storageService.updateUserProfile(currentUser.id, updates);
      onUpdateUser(updatedUser); // Update parent state
      setIsEditingProfile(false);
      // Optional: Re-sync if credentials changed
      setSynced(false); 
      setMatchedStatus({});
    } catch (e: any) {
      alert('Failed to save profile: ' + e.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const progress = calculateProgress();
  const isComplete = progress === 100 && tracks.length > 0;
  const isWeekendDay = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
  const canClaimFreeWeekend = isWeekendDay && !hasCheckedInSelectedDate && tracks.length === 0;

  const renderButton = () => {
    if (hasCheckedInSelectedDate && pointsToClaim <= 0) {
      return (
        <button 
          disabled
          className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 bg-transparent text-green-500 border border-green-500/30 cursor-not-allowed"
        >
          <CalendarCheck size={22} />
          Checked In for {selectedDate.toDateString() === new Date().toDateString() ? 'Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}
        </button>
      );
    }

    if (isComplete || pointsToClaim > 0 || canClaimFreeWeekend) {
      return (
        <button 
          onClick={handleClaim}
          className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-500 bg-gradient-to-r from-neon-purple to-pink-600 text-white shadow-[0_0_30px_rgba(176,38,255,0.6)] scale-100 hover:scale-[1.02] cursor-pointer"
        >
          <Trophy size={24} className="text-yellow-300" />
          {pointsToClaim > 0 && hasCheckedInSelectedDate ? `CLAIM ${pointsToClaim} EXTRA SAVINGS POINTS` : (isWeekendDay ? 'CLAIM POINT SAVINGS' : 'CLAIM CHECK-IN')}
        </button>
      );
    }

    return (
      <button 
        disabled
        className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 bg-white/5 text-gray-500 cursor-not-allowed border border-white/5"
      >
        <Trophy size={24} />
        {isWeekendDay ? 'Complete 100% to Claim Point Savings' : 'Complete 100% to Check-In'}
      </button>
    );
  };

  const getDatesForLast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date);
    }
    return dates;
  };

  const renderWeeklyCheckIn = () => {
    const current = new Date(selectedDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    monday.setHours(0,0,0,0);

    const checkInHistory = currentUser.checkInHistory || [];
    const weekDays = [];

    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      
      const possibleDates = getPossibleDateStrings(d);
      const hasCheckedIn = checkInHistory.some((historyD: string) => possibleDates.includes(historyD));

      weekDays.push({
        date: d,
        hasCheckedIn
      });
    }

    return (
      <div className="w-full glass p-6 rounded-2xl mb-6 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
        <h4 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
          <CalendarCheck size={18} className="text-purple-400" />
          WEEKLY CHECK-IN (MON-FRI)
        </h4>
        
        <div className="flex justify-between items-center bg-black/30 rounded-xl p-4 border border-white/5 md:px-8">
          {weekDays.map((day, idx) => {
            const isPast = day.date < realToday;
            return (
            <div key={idx} className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-gray-400 mb-3 tracking-wider">
                {day.date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </span>
              
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                  day.hasCheckedIn 
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' 
                    : isPast 
                    ? 'border-red-500/60 bg-red-500/20 text-red-400'
                    : 'border-white/5 bg-transparent text-white/10'
                }`}
              >
                {day.hasCheckedIn ? (
                  <CheckCircle2 size={16} />
                ) : isPast ? (
                  <X size={16} />
                ) : (
                  <Circle size={16} />
                )}
              </div>
              
              <span className="text-[10px] sm:text-xs font-bold text-gray-400 mt-1">{day.date.getDate()}</span>
            </div>
          )})}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col items-center">
      
      {/* Running Text */}
      <div className="w-full mb-4 overflow-hidden rounded-full bg-white/5 border border-white/10 py-1.5 shadow-lg backdrop-blur-sm flex items-center">
        <div className="whitespace-nowrap animate-[marquee_15s_linear_infinite] flex gap-4 text-xs font-bold text-gray-300">
          <span className="text-neon-green">✦</span> {checkedInUsersText} <span className="text-neon-green">✦</span>
        </div>
      </div>

      {/* User Header */}
      <div className="w-full flex justify-between items-center mb-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" onClick={openProfile}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center font-bold text-xl uppercase shadow-lg shadow-purple-500/20 shrink-0">
            {currentUser.appUsername.charAt(0)}
          </div>
          <div className="flex flex-col">
            <div className="text-xs text-gray-400">FRESH NEW MUSIC</div>
            <div className="font-bold text-white text-lg leading-tight">{currentUser.appUsername}</div>
            <div className="text-[10px] text-neon-green mt-0.5 flex items-center gap-1 opacity-80">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Trophy size={12} /> Savings: {currentUser.extraPointsBalance || 0}
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="View Profile"
            >
              <Eye size={16} />
            </div>
            <div 
              className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Settings"
              onClick={openSettings}
            >
              <Settings size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mb-6 glass p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10">
        <div>
           <h3 className="text-white font-bold mb-1">Select Date</h3>
           <p className="text-xs text-gray-400">Select a date to view targets or clear absences.</p>
        </div>
        <div className="relative w-full md:w-auto">
          <input 
            type="date"
            max={new Date().toISOString().split('T')[0]} // Cannot select future dates natively via max attribute (using UTC as approx is close enough, or precise local below)
            value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m, dNum] = e.target.value.split('-');
              const d = new Date(parseInt(y), parseInt(m) - 1, parseInt(dNum));
              // Avoid invalid dates
              if (!isNaN(d.getTime())) {
                const today = new Date();
                today.setHours(0,0,0,0);
                d.setHours(0,0,0,0);
                if (d <= today) {
                  setSelectedDate(d);
                  setMatchedStatus({});
                  setSynced(false);
                }
              }
            }}
            className="w-full md:w-auto bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 font-bold"
          />
        </div>
      </div>

      {renderWeeklyCheckIn()}

      {/* Sync Button Only (No Inputs) */}
      <div className="w-full glass p-6 rounded-2xl mb-6 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
        {isLockedHutang ? (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-center mb-3">
                <p className="text-red-400 font-bold mb-1">Fitur Pelunasan (Sync) Terkunci</p>
                <p className="text-red-300 text-sm">Pending Check-in (Hutang) via Last.fm hanya dapat diselesaikan pada hari Sabtu dan Minggu.</p>
            </div>
        ) : (
            <div className="flex flex-col gap-3 mb-3">
              <button 
                onClick={handleSync}
                disabled={isLoading}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  isLoading 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                }`}
              >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                {isLoading ? 'Syncing...' : 'Check Streams'}
              </button>
            </div>
        )}

        {!hasCheckedInSelectedDate && 
         selectedDate.toDateString() !== new Date().toDateString() && 
         isWeekendVal &&
         (currentUser.extraPointsBalance || 0) > 0 && (
          <button 
            onClick={handlePatchAbsence}
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-yellow-600 hover:bg-yellow-500 text-white shadow-[0_0_15px_rgba(202,138,4,0.3)] border border-yellow-500/50"
            title="Gunakan 1 tabungan untuk menambal absen hari ini tanpa limit validasi."
          >
            <Trophy size={18} />
            Tambal Absen (Gunakan 1 Tabungan)
          </button>
        )}
        
        {error && !isLockedHutang && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-2 rounded-lg border border-red-500/20">
                <AlertCircle size={16} />
                {error}
                <button 
                  onClick={openProfile}
                  className="ml-auto text-xs underline text-red-300 hover:text-white"
                >
                  Edit Profile
                </button>
            </div>
        )}
        
        {/* Spotify Link Button */}
        <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-xs text-gray-400 font-bold uppercase mb-3 flex items-center gap-2">
                <Music size={12} className="text-green-500" /> Target Playlist
            </h4>

            <a 
                href={`https://open.spotify.com/playlist/${spotifyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(29,185,84,0.4)] hover:scale-[1.02]"
            >
                <Music size={20} fill="currentColor" />
                Open in Spotify App
                <ExternalLink size={16} className="opacity-60 ml-1" />
            </a>
        </div>
      </div>

      {synced && (
        <div className="w-full animate-fade-in-up">
          {/* Progress Bar */}
          <div className="glass p-6 rounded-2xl mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-gray-400 font-medium">Daily Goal</span>
              <span className={`text-2xl font-bold ${isComplete ? 'text-neon-green' : 'text-white'}`}>
                {progress}%
              </span>
            </div>
            <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-neon-green to-emerald-600 transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {accountUsedError && (
             <div className="mb-4 bg-red-900/40 p-4 rounded-xl border border-red-500/50 flex items-center gap-3">
               <AlertCircle size={20} className="text-red-500 shrink-0" />
               <p className="text-sm font-bold text-white">{accountUsedError}</p>
             </div>
          )}
          
          <div className="mb-6">
            {renderButton()}
          </div>

          {/* Track List */}
          <div className="space-y-3 mb-8">
            {tracks.length === 0 ? (
                <div className="text-center text-gray-500 py-4">Admin hasn't set any tracks yet.</div>
            ) : (
                tracks.map((track) => {
                const matchTime = matchedStatus[track.id];
                const isListened = !!matchTime;
                
                return (
                    <div 
                    key={track.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                        isListened 
                        ? 'bg-green-900/10 border-green-500/30 shadow-[0_0_10px_rgba(0,255,65,0.1)]' 
                        : 'bg-white/5 border-white/5 opacity-80'
                    }`}
                    >
                    <div className="flex-1 pr-4">
                        <div className={`font-bold flex flex-wrap items-center gap-2 ${isListened ? 'text-green-300' : 'text-white'}`}>
                        <span>{track.title}</span>
                        {isListened && (
                             <span className="text-[10px] font-normal text-neon-green bg-green-900/40 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-500/20">
                                <Clock size={10} /> {matchTime}
                             </span>
                        )}
                        </div>
                        <div className="text-sm text-gray-400">{track.artist}</div>
                    </div>
                    <div className="flex-shrink-0">
                        {isListened ? (
                        <CheckCircle2 className="text-neon-green drop-shadow-[0_0_8px_rgba(0,255,65,0.8)]" size={28} />
                        ) : (
                        <Circle className="text-gray-600" size={28} />
                        )}
                    </div>
                    </div>
                );
                })
            )}
          </div>

        </div>
      )}

      {/* Reward Modal */}
      {showReward && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="glass max-w-sm w-full p-8 rounded-3xl text-center relative border border-neon-purple/50 shadow-[0_0_50px_rgba(176,38,255,0.3)]">
                <button 
                    onClick={() => setShowReward(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <X size={24} />
                </button>
                
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(234,179,8,0.5)] animate-bounce">
                    <Trophy size={48} className="text-white drop-shadow-md" />
                </div>
                
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-pink-500 mb-2 uppercase italic">
                    Check-In Complete!
                </h2>
                <p className="text-gray-300 mb-8 font-medium">
                    See you tomorrow, {currentUser.appUsername}!
                </p>
                
                <button
                    onClick={() => setShowReward(false)}
                    className="w-full py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
                >
                    Awesome!
                </button>
            </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass max-w-sm w-full rounded-3xl relative border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
             {/* Modal Header */}
             <div className="h-28 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 relative shrink-0">
                <button 
                  onClick={() => setIsProfileOpen(false)}
                  className="absolute top-4 right-4 bg-black/30 p-2 rounded-full text-white hover:bg-black/50 transition-colors z-10"
                >
                  <X size={20} />
                </button>
             </div>
             
             {/* Avatar (Moved OUTSIDE scrollable area to prevent clipping) */}
             <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full bg-[#16133a] border-4 border-[#0f0c29] flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] z-30">
                <div className="text-3xl font-bold text-white uppercase">{currentUser.appUsername.charAt(0)}</div>
                {!isEditingProfile && (
                    <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full border-2 border-[#0f0c29] hover:bg-blue-500 transition-colors shadow-lg"
                    title="Edit Profile"
                    >
                    <Edit2 size={12} />
                    </button>
                )}
             </div>
             
             {/* Scrollable Content */}
             <div className="px-6 pb-6 flex-1 overflow-y-auto custom-scrollbar pt-14">
                
                {/* Profile Info (Centered) */}
                <div className="mt-2 text-center">
                   <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                       {currentUser.appUsername}
                   </h2>
                   <div className="text-gray-400 text-xs mt-2 font-mono bg-white/5 px-3 py-1 rounded-full inline-block border border-white/5">
                       ID: {currentUser.id.slice(-6)}
                   </div>
                </div>

                {isEditingProfile ? (
                  /* EDIT MODE */
                  <div className="mt-8 space-y-4 animate-fade-in">
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">App Username</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-2.5 text-gray-500" size={16} />
                            <input 
                                type="text"
                                value={editAppUsername}
                                onChange={(e) => setEditAppUsername(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:border-blue-500 focus:outline-none placeholder-gray-600 text-sm font-bold"
                                placeholder="Username Applikasi"
                            />
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nama WA</label>
                            <input 
                                type="text"
                                value={editWhatsappName}
                                onChange={(e) => setEditWhatsappName(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-green-500 focus:outline-none placeholder-gray-600 text-sm"
                                placeholder="Nama WA"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nomor WA</label>
                            <input 
                                type="text"
                                value={editWhatsappNumber}
                                onChange={(e) => setEditWhatsappNumber(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-green-500 focus:outline-none placeholder-gray-600 text-sm"
                                placeholder="Nomor WA (contoh: 0812...)"
                            />
                        </div>
                     </div>
                     <div className="border-t border-white/10 my-4"></div>

                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">My Music 1</label>
                        <div className="space-y-2">
                            {/* Artist Input */}
                            <div className="relative">
                                <Mic2 className="absolute left-3 top-3 text-gray-500" size={16} />
                                <input 
                                    type="text"
                                    value={editPersonalArtist}
                                    onChange={(e) => setEditPersonalArtist(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:border-green-500 focus:outline-none placeholder-gray-600 text-sm"
                                    placeholder="Artist Name 1"
                                />
                            </div>
                            {/* Track Input */}
                            <div className="relative">
                                <Music className="absolute left-3 top-3 text-gray-500" size={16} />
                                <input 
                                    type="text"
                                    value={editPersonalTrack}
                                    onChange={(e) => setEditPersonalTrack(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:border-green-500 focus:outline-none placeholder-gray-600 text-sm"
                                    placeholder="Track Title 1"
                                />
                            </div>
                            {/* Link Input */}
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-3 text-gray-500" size={16} />
                                <input 
                                    type="text"
                                    value={editPlaylistUrl}
                                    onChange={(e) => setEditPlaylistUrl(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:border-green-500 focus:outline-none placeholder-gray-600 text-sm"
                                    placeholder="Spotify Link 1 (https://...)"
                                />
                            </div>
                        </div>
                     </div>

                     <div className="border-t border-white/10 my-4"></div>

                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">My Music 2</label>
                        <div className="space-y-2">
                            {/* Artist Input */}
                            <div className="relative">
                                <Mic2 className="absolute left-3 top-3 text-gray-500" size={16} />
                                <input 
                                    type="text"
                                    value={editPersonalArtist2}
                                    onChange={(e) => setEditPersonalArtist2(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:border-green-500 focus:outline-none placeholder-gray-600 text-sm"
                                    placeholder="Artist Name 2"
                                />
                            </div>
                            {/* Track Input */}
                            <div className="relative">
                                <Music className="absolute left-3 top-3 text-gray-500" size={16} />
                                <input 
                                    type="text"
                                    value={editPersonalTrack2}
                                    onChange={(e) => setEditPersonalTrack2(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:border-green-500 focus:outline-none placeholder-gray-600 text-sm"
                                    placeholder="Track Title 2"
                                />
                            </div>
                            {/* Link Input */}
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-3 text-gray-500" size={16} />
                                <input 
                                    type="text"
                                    value={editPlaylistUrl2}
                                    onChange={(e) => setEditPlaylistUrl2(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:border-green-500 focus:outline-none placeholder-gray-600 text-sm"
                                    placeholder="Spotify Link 2 (https://...)"
                                />
                            </div>
                        </div>
                     </div>

                     <div className="border-t border-white/10 my-4"></div>

                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">My Music 3</label>
                        <div className="space-y-2">
                            {/* Artist Input */}
                            <div className="relative">
                                <Mic2 className="absolute left-3 top-3 text-gray-500" size={16} />
                                <input 
                                    type="text"
                                    value={editPersonalArtist3}
                                    onChange={(e) => setEditPersonalArtist3(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:border-green-500 focus:outline-none placeholder-gray-600 text-sm"
                                    placeholder="Artist Name 3"
                                />
                            </div>
                            {/* Track Input */}
                            <div className="relative">
                                <Music className="absolute left-3 top-3 text-gray-500" size={16} />
                                <input 
                                    type="text"
                                    value={editPersonalTrack3}
                                    onChange={(e) => setEditPersonalTrack3(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:border-green-500 focus:outline-none placeholder-gray-600 text-sm"
                                    placeholder="Track Title 3"
                                />
                            </div>
                            {/* Link Input */}
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-3 text-gray-500" size={16} />
                                <input 
                                    type="text"
                                    value={editPlaylistUrl3}
                                    onChange={(e) => setEditPlaylistUrl3(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:border-green-500 focus:outline-none placeholder-gray-600 text-sm"
                                    placeholder="Spotify Link 3 (https://...)"
                                />
                            </div>
                        </div>
                     </div>
                     
                     <div className="border-t border-white/10 my-4"></div>
                     <div className="flex justify-between items-center mb-2">
                         <div>
                             <label className="text-xs font-bold text-gray-500 uppercase block">Connected Accounts</label>
                             <span className="text-[10px] text-gray-400">{editLastFmAccounts.length}/5 Accounts</span>
                         </div>
                       {editLastFmAccounts.length < 5 && (
                         <button 
                           onClick={() => setEditLastFmAccounts([...editLastFmAccounts, { username: '', apiKey: '', isPrimary: editLastFmAccounts.length === 0, connectedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }])}
                           className="text-xs text-green-400 hover:text-green-300 font-bold"
                         >
                           + Add Account
                         </button>
                       )}
                     </div>

                     <div className="p-3 mb-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                         <p className="text-[10px] text-blue-300 mb-1 font-bold flex items-center gap-1">
                             <AlertCircle size={10} /> Multi-account Support
                         </p>
                         <p className="text-[10px] text-gray-400 leading-relaxed">
                             You can link multiple Last.fm accounts and easily switch between them. 
                             The primary account will be used for all tracking and stats.
                         </p>
                     </div>

                     {editLastFmAccounts.map((account, index) => {
                         const isPrimary = account.isPrimary || (index === 0 && !editLastFmAccounts.some(a => a.isPrimary));
                         
                         return (
                             <div key={index} className={`p-4 rounded-xl border transition-all mb-3 relative overflow-hidden ${isPrimary ? 'bg-red-900/10 border-red-500/30' : 'bg-black/20 border-white/5'}`}>
                                 {isPrimary && (
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                                 )}
                                 
                                 <div className="flex items-start justify-between gap-3 relative z-10">
                                     <div className="relative shrink-0 mt-1">
                                         <div className="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center font-bold text-lg text-white">
                                             {account.username ? account.username.charAt(0).toUpperCase() : '?'}
                                         </div>
                                         {isPrimary && (
                                             <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-black">
                                                 <Star size={8} className="text-white fill-current" />
                                             </div>
                                         )}
                                     </div>
                                     
                                     <div className="flex-1 min-w-0">
                                         <div className="flex items-center gap-2 mb-1">
                                             <div className="font-bold text-white text-sm truncate">{account.username || 'New Account'}</div>
                                             {isPrimary && (
                                                 <span className="text-[8px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Primary</span>
                                             )}
                                         </div>
                                         <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mb-3">
                                             <span className={`w-1.5 h-1.5 rounded-full ${account.username && account.apiKey ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                             Connected {account.connectedAt || 'Just now'}
                                         </div>

                                         <div className="space-y-2 mt-2">
                                             <input 
                                                 type="text"
                                                 placeholder="Last.fm Username"
                                                 value={account.username}
                                                 onChange={(e) => {
                                                     const newAccounts = [...editLastFmAccounts];
                                                     newAccounts[index].username = e.target.value;
                                                     setEditLastFmAccounts(newAccounts);
                                                 }}
                                                 className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:border-red-500 focus:outline-none text-xs"
                                             />
                                             <input 
                                                 type="text"
                                                 placeholder="Last.fm API Key"
                                                 value={account.apiKey}
                                                 onChange={(e) => {
                                                     const newAccounts = [...editLastFmAccounts];
                                                     newAccounts[index].apiKey = e.target.value;
                                                     setEditLastFmAccounts(newAccounts);
                                                 }}
                                                 className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:border-red-500 focus:outline-none font-mono text-xs placeholder-gray-600"
                                             />
                                         </div>
                                     </div>

                                     <div className="flex flex-col items-end gap-3 shrink-0 h-full">
                                         {editLastFmAccounts.length > 1 && (
                                             <button 
                                                 onClick={() => setEditLastFmAccounts(editLastFmAccounts.filter((_, i) => i !== index))}
                                                 className="text-gray-500 hover:text-red-400 transition-colors"
                                             >
                                                 <Trash2 size={16} />
                                             </button>
                                         )}
                                         
                                         {!isPrimary && account.username && account.apiKey && (
                                             <button 
                                                 onClick={() => {
                                                     const newAccounts = editLastFmAccounts.map((a, i) => ({
                                                         ...a,
                                                         isPrimary: i === index
                                                     }));
                                                     setEditLastFmAccounts(newAccounts);
                                                 }}
                                                 className="text-[10px] font-bold text-gray-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors mt-4"
                                             >
                                                 Set Primary
                                             </button>
                                         )}
                                     </div>
                                 </div>
                             </div>
                         );
                     })}

                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">App Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 text-gray-500" size={16} />
                          <input 
                            type="text"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:border-neon-purple focus:outline-none"
                          />
                        </div>
                     </div>

                     <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => setIsEditingProfile(false)}
                          className="flex-1 py-2 rounded-xl bg-gray-700 text-gray-300 font-bold text-sm"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSaveProfile}
                          disabled={isSavingProfile}
                          className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2"
                        >
                          {isSavingProfile ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                          Save Changes
                        </button>
                     </div>
                  </div>
                ) : (
                  /* VIEW MODE */
                  <div className="mt-8 space-y-4">
                     
                     {/* WhatsApp Details */}
                     {(currentUser.whatsappName || currentUser.whatsappNumber) && (
                         <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="w-10 h-10 rounded-full bg-green-900/20 text-green-400 flex items-center justify-center border border-green-500/20 shrink-0">
                               <MessageCircle size={20} />
                            </div>
                            <div className="overflow-hidden">
                               <div className="text-xs text-gray-500 font-bold uppercase truncate">WhatsApp</div>
                               <div className="font-bold text-white truncate">{currentUser.whatsappName || 'No Name'}</div>
                               <div className="text-sm text-gray-400 font-mono truncate">{currentUser.whatsappNumber || '-'}</div>
                            </div>
                         </div>
                     )}

                     {/* Personal Music Link */}
                     <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-blue-900/20 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                           <Headphones size={20} />
                        </div>
                        <div className="overflow-hidden w-full">
                           <div className="text-xs text-gray-500 font-bold uppercase truncate mb-0.5">My Music 1</div>
                           {currentUser.personalPlaylistUrl ? (
                               <a 
                                 href={currentUser.personalPlaylistUrl}
                                 target="_blank"
                                 rel="noopener noreferrer" 
                                 className="group block"
                               >
                                   <div className="font-bold text-blue-400 group-hover:text-blue-300 group-hover:underline truncate text-lg leading-tight">
                                       {currentUser.personalTrack || 'My Playlist'}
                                   </div>
                                   {currentUser.personalArtist && (
                                       <div className="text-sm text-gray-400 truncate">
                                           {currentUser.personalArtist}
                                       </div>
                                   )}
                                   {/* Fallback if no artist/track but url exists */}
                                   {!currentUser.personalTrack && !currentUser.personalArtist && (
                                       <div className="text-xs text-blue-500 flex items-center gap-1 mt-1">
                                           Open Link <ExternalLink size={10} />
                                       </div>
                                   )}
                               </a>
                           ) : (
                               <button 
                                onClick={() => setIsEditingProfile(true)}
                                className="text-sm text-gray-500 italic hover:text-white transition-colors text-left"
                               >
                                   Tap to set your music...
                               </button>
                           )}
                        </div>
                     </div>

                     {/* Personal Music Link 2 */}
                     <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-purple-900/20 text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                           <Headphones size={20} />
                        </div>
                        <div className="overflow-hidden w-full">
                           <div className="text-xs text-gray-500 font-bold uppercase truncate mb-0.5">My Music 2</div>
                           {currentUser.personalPlaylistUrl2 ? (
                               <a 
                                 href={currentUser.personalPlaylistUrl2}
                                 target="_blank"
                                 rel="noopener noreferrer" 
                                 className="group block"
                               >
                                   <div className="font-bold text-purple-400 group-hover:text-purple-300 group-hover:underline truncate text-lg leading-tight">
                                       {currentUser.personalTrack2 || 'My Playlist'}
                                   </div>
                                   {currentUser.personalArtist2 && (
                                       <div className="text-sm text-gray-400 truncate">
                                           {currentUser.personalArtist2}
                                       </div>
                                   )}
                                   {!currentUser.personalTrack2 && !currentUser.personalArtist2 && (
                                       <div className="text-xs text-purple-500 flex items-center gap-1 mt-1">
                                           Open Link <ExternalLink size={10} />
                                       </div>
                                   )}
                               </a>
                           ) : (
                               <button 
                                onClick={() => setIsEditingProfile(true)}
                                className="text-sm text-gray-500 italic hover:text-white transition-colors text-left"
                               >
                                   Tap to set your music...
                               </button>
                           )}
                        </div>
                     </div>

                     {/* Personal Music Link 3 */}
                     <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-orange-900/20 text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                           <Headphones size={20} />
                        </div>
                        <div className="overflow-hidden w-full">
                           <div className="text-xs text-gray-500 font-bold uppercase truncate mb-0.5">My Music 3</div>
                           {currentUser.personalPlaylistUrl3 ? (
                               <a 
                                 href={currentUser.personalPlaylistUrl3}
                                 target="_blank"
                                 rel="noopener noreferrer" 
                                 className="group block"
                               >
                                   <div className="font-bold text-orange-400 group-hover:text-orange-300 group-hover:underline truncate text-lg leading-tight">
                                       {currentUser.personalTrack3 || 'My Playlist'}
                                   </div>
                                   {currentUser.personalArtist3 && (
                                       <div className="text-sm text-gray-400 truncate">
                                           {currentUser.personalArtist3}
                                       </div>
                                   )}
                                   {!currentUser.personalTrack3 && !currentUser.personalArtist3 && (
                                       <div className="text-xs text-orange-500 flex items-center gap-1 mt-1">
                                           Open Link <ExternalLink size={10} />
                                       </div>
                                   )}
                               </a>
                           ) : (
                               <button 
                                onClick={() => setIsEditingProfile(true)}
                                className="text-sm text-gray-500 italic hover:text-white transition-colors text-left"
                               >
                                   Tap to set your music...
                               </button>
                           )}
                        </div>
                     </div>

                     <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center border border-red-500/20 shrink-0">
                           <Music size={20} />
                        </div>
                        <div className="overflow-hidden w-full flex justify-between items-center">
                           <div>
                               <div className="text-xs text-gray-500 font-bold uppercase truncate">Primary Last.fm</div>
                               <div className="font-bold text-white truncate">
                                   {currentUser.lastFmAccounts?.find(a => a.isPrimary)?.username || currentUser.lastFmUsername}
                               </div>
                           </div>
                           {currentUser.lastFmAccounts && currentUser.lastFmAccounts.length > 1 && (
                               <div className="text-[10px] text-gray-400 font-bold bg-white/5 px-2 py-1 rounded-full shrink-0">
                                   +{currentUser.lastFmAccounts.length - 1} More
                               </div>
                           )}
                        </div>
                     </div>

                     <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-green-900/20 text-green-500 flex items-center justify-center border border-green-500/20 shrink-0">
                           <CalendarCheck size={20} />
                        </div>
                        <div>
                           <div className="text-xs text-gray-500 font-bold uppercase">Last Check-in</div>
                           <div className="font-bold text-white">{currentUser.lastCheckInDate || 'Not checked in yet'}</div>
                        </div>
                     </div>
                  </div>
                )}
             </div>

             {/* Footer Actions */}
             <div className="p-6 pt-0 mt-auto shrink-0">
                <button 
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-900/10 transition-colors flex items-center justify-center gap-2 font-bold text-sm"
                >
                   <LogOut size={18} /> Logout
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};