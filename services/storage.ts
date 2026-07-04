import { User, TargetTrack, CloudConfig, AppData, WeeklySchedule, DayConfig } from '../types';
import { STORAGE_KEY, STORAGE_KEY_USERS, STORAGE_KEY_CLOUD, STORAGE_KEY_SPOTIFY, DEFAULT_TRACKS, DEFAULT_CLOUD_CONFIG, DEFAULT_SPOTIFY_ID, ADMIN_PIN } from '../constants';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- CLOUD STORAGE SERVICE (Firebase Firestore Adapter) ---

export const storageService = {
  
  // --- CONFIGURATION ---
  
  getCloudConfig(): CloudConfig | null {
    // Keep this for backwards compatibility, but it's no longer used for fetching
    return DEFAULT_CLOUD_CONFIG;
  },

  saveCloudConfig(config: CloudConfig) {
    localStorage.setItem(STORAGE_KEY_CLOUD, JSON.stringify(config));
  },

  disconnectCloud() {
    localStorage.removeItem(STORAGE_KEY_CLOUD);
  },

  // Verify connection validity before saving (now just returns true for Firebase)
  async verifyConnection(binId: string, apiKey: string): Promise<{valid: boolean; message?: string}> {
      return { valid: true };
  },

  // --- INTERNAL HELPERS ---

  async _fetchFullData(): Promise<AppData> {
    
    // 1. CLOUD MODE (FIREBASE)
    try {
      const docRef = doc(db, 'appData', 'main');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const record = docSnap.data();
        return {
            users: Array.isArray(record.users) ? record.users : [],
            tracks: Array.isArray(record.tracks) ? record.tracks : (record.tracks || DEFAULT_TRACKS),
            spotifyPlaylistId: record.spotifyPlaylistId || DEFAULT_SPOTIFY_ID,
            weeklySchedule: record.weeklySchedule || {},
            adminPin: record.adminPin || ADMIN_PIN,
            dailyUsedLastFmAccounts: record.dailyUsedLastFmAccounts || {}
        };
      } else {
         console.warn("No data in Firebase yet, will try to fall back to local");
      }
    } catch (e: any) {
      console.error("Firebase Fetch Error, falling back to local:", e);
    }
    
    // 2. LOCAL MODE (FALLBACK)
    const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
    const tracksStr = localStorage.getItem(STORAGE_KEY);
    const spotifyIdStr = localStorage.getItem(STORAGE_KEY_SPOTIFY);
    const scheduleStr = localStorage.getItem('streamguard_schedule');
    const pinStr = localStorage.getItem('streamguard_admin_pin');
    const usedAccStr = localStorage.getItem('streamguard_used_accounts');
    
    let users = [];
    let tracks = DEFAULT_TRACKS;
    let weeklySchedule = {};
    let dailyUsedLastFmAccounts = {};

    try {
        if (usersStr) users = JSON.parse(usersStr) || [];
        if (tracksStr) tracks = JSON.parse(tracksStr) || DEFAULT_TRACKS;
        if (scheduleStr) weeklySchedule = JSON.parse(scheduleStr) || {};
        if (usedAccStr) dailyUsedLastFmAccounts = JSON.parse(usedAccStr) || {};
    } catch (e) { console.error("Error parsing local data", e); }
    
    const localData = {
      users,
      tracks,
      spotifyPlaylistId: spotifyIdStr || DEFAULT_SPOTIFY_ID,
      weeklySchedule,
      adminPin: pinStr || ADMIN_PIN,
      dailyUsedLastFmAccounts
    };

    return localData;
  },

  async _saveFullData(data: AppData): Promise<void> {

    // 1. CLOUD MODE (FIREBASE)
    try {
        const docRef = doc(db, 'appData', 'main');
        await setDoc(docRef, data);
        
        // Update local cache
        this._updateLocalCache(data);
        return; // End early if save succeeded
    } catch (e: any) {
        console.error("Firebase Save Error, saving locally only:", e);
    }
    
    // 2. LOCAL MODE
    this._updateLocalCache(data);
  },

  _updateLocalCache(data: AppData) {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(data.users));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.tracks));
    if (data.spotifyPlaylistId) localStorage.setItem(STORAGE_KEY_SPOTIFY, data.spotifyPlaylistId);
    if (data.weeklySchedule) localStorage.setItem('streamguard_schedule', JSON.stringify(data.weeklySchedule));
    if (data.adminPin) localStorage.setItem('streamguard_admin_pin', data.adminPin);
    if (data.dailyUsedLastFmAccounts) localStorage.setItem('streamguard_used_accounts', JSON.stringify(data.dailyUsedLastFmAccounts));
  },

  // --- PUBLIC METHODS ---

  async getUsers(): Promise<User[]> {
    const data = await this._fetchFullData();
    return Array.isArray(data.users) ? data.users : [];
  },


  async registerUser(newUser: User): Promise<User> {
    const data = await this._fetchFullData();
    const users = Array.isArray(data.users) ? data.users : [];
    
    if (users.some(u => u.appUsername.toLowerCase() === newUser.appUsername.toLowerCase())) {
      throw new Error('Username already taken');
    }
    
    const updatedUsers = [...users, newUser];
    const newData = { ...data, users: updatedUsers };
    
    await this._saveFullData(newData);
    return newUser;
  },

  async loginUser(username: string, password: string): Promise<User> {
    const data = await this._fetchFullData();
    const users = Array.isArray(data.users) ? data.users : [];
    
    const user = users.find(u => 
      u.appUsername.toLowerCase() === username.toLowerCase() && 
      u.password === password
    );
    if (!user) throw new Error('Invalid credentials');
    return user;
  },

  async updateUserCheckIn(userId: string, dateString: string, usedLastFmUsername: string | string[]): Promise<User> {
    const data = await this._fetchFullData();
    const users = Array.isArray(data.users) ? data.users : [];
    let updatedUser: User | null = null;
    
    // Track Last Fm Account usage to prevent 1 account being used multiple times a day
    const dailyUsedMap = data.dailyUsedLastFmAccounts || {};
    const usedToday = dailyUsedMap[dateString] || [];
    
    if (usedLastFmUsername) {
        const usernames = Array.isArray(usedLastFmUsername) ? usedLastFmUsername : [usedLastFmUsername];
        usernames.forEach(username => {
            if (!usedToday.includes(username)) {
                usedToday.push(username);
            }
        });
        dailyUsedMap[dateString] = usedToday;
    }

    const newUsers = users.map(u => {
      if (u.id === userId) {
        const history = u.checkInHistory || [];
        if (!history.includes(dateString)) {
          history.push(dateString);
        }
        // If checking in for today, update lastCheckInDate as well for backward compatibility
        const todayStr = new Date().toLocaleDateString();
        const newLastCheckIn = dateString === todayStr ? dateString : u.lastCheckInDate;
        
        updatedUser = { ...u, lastCheckInDate: newLastCheckIn, checkInHistory: history };
        return updatedUser;
      }
      return u;
    });

    if (!updatedUser) throw new Error('User not found');
    
    await this._saveFullData({ ...data, users: newUsers, dailyUsedLastFmAccounts: dailyUsedMap });
    return updatedUser!;
  },

  async isLastFmAccountUsed(dateString: string, username: string): Promise<boolean> {
      if (!username) return false;
      const data = await this._fetchFullData();
      const usedToday = data.dailyUsedLastFmAccounts?.[dateString] || [];
      return usedToday.includes(username);
  },

  // NEW: Method to update user profile (Last.fm, Password, etc.)
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const data = await this._fetchFullData();
    const users = Array.isArray(data.users) ? data.users : [];
    let updatedUser: User | null = null;
    
    const newUsers = users.map(u => {
      if (u.id === userId) {
        updatedUser = { ...u, ...updates };
        return updatedUser;
      }
      return u;
    });

    if (!updatedUser) throw new Error('User not found');
    
    await this._saveFullData({ ...data, users: newUsers });
    return updatedUser!;
  },

  async deleteUser(userId: string): Promise<void> {
    const data = await this._fetchFullData();
    const users = Array.isArray(data.users) ? data.users : [];
    const newUsers = users.filter(u => u.id !== userId);
    await this._saveFullData({ ...data, users: newUsers });
  },

  // --- SMART GETTERS FOR MEMBER VIEW ---
  // Automatically returns TODAY's playlist if schedule exists

  async getTodayData(): Promise<{ tracks: TargetTrack[], spotifyId: string }> {
    const data = await this._fetchFullData();
    const todayIndex = new Date().getDay(); // 0 (Sun) to 6 (Sat)
    
    // Check if there is a schedule for today
    if (data.weeklySchedule && data.weeklySchedule[todayIndex]) {
        const todayConfig = data.weeklySchedule[todayIndex];
        // If today has tracks, use them. Otherwise fallback to global default.
        if (todayConfig.tracks && todayConfig.tracks.length > 0) {
            return {
                tracks: todayConfig.tracks,
                spotifyId: todayConfig.spotifyId || data.spotifyPlaylistId || DEFAULT_SPOTIFY_ID
            };
        }
    }

    // Fallback to legacy single playlist
    return {
        tracks: Array.isArray(data.tracks) ? data.tracks : DEFAULT_TRACKS,
        spotifyId: data.spotifyPlaylistId || DEFAULT_SPOTIFY_ID
    };
  },

  // --- ADMIN METHODS ---

  async getWeeklySchedule(): Promise<WeeklySchedule> {
    const data = await this._fetchFullData();
    return data.weeklySchedule || {};
  },

  async saveWeeklySchedule(schedule: WeeklySchedule): Promise<void> {
    const data = await this._fetchFullData();
    await this._saveFullData({ ...data, weeklySchedule: schedule });
  },

  async getAdminPin(): Promise<string> {
      const data = await this._fetchFullData();
      return data.adminPin || ADMIN_PIN;
  },

  async saveAdminPin(newPin: string): Promise<void> {
      const data = await this._fetchFullData();
      await this._saveFullData({ ...data, adminPin: newPin });
  },

  // --- BACKUP UTILS ---
  
  exportData() {
    return {
      users: localStorage.getItem(STORAGE_KEY_USERS),
      tracks: localStorage.getItem(STORAGE_KEY),
      spotify: localStorage.getItem(STORAGE_KEY_SPOTIFY),
      schedule: localStorage.getItem('streamguard_schedule'),
      adminPin: localStorage.getItem('streamguard_admin_pin')
    };
  },

  async importData(usersJson: string | null, tracksJson: string | null, scheduleJson: string | null, pinJson: string | null) {
    const data: AppData = {
      users: usersJson ? JSON.parse(usersJson) : [],
      tracks: tracksJson ? JSON.parse(tracksJson) : DEFAULT_TRACKS,
      spotifyPlaylistId: DEFAULT_SPOTIFY_ID,
      weeklySchedule: scheduleJson ? JSON.parse(scheduleJson) : {},
      adminPin: pinJson || ADMIN_PIN
    };

    await this._saveFullData(data);
  }
};