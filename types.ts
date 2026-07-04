export interface TargetTrack {
  id: string;
  artist: string;
  title: string;
}

export interface LastFmTrack {
  name: string;
  artist: {
    '#text': string;
  };
  album: {
    '#text': string;
  };
  date?: {
    uts: string;
    '#text': string;
  };
  '@attr'?: {
    nowplaying: string;
  };
  listenedBy?: string;
}

export enum ViewMode {
  AUTH = 'AUTH',
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN'
}

export interface CheckStatus {
  trackId: string;
  isListened: boolean;
}

export interface User {
  id: string;
  appUsername: string; // Username for login
  password: string;    // Password for login (simple storage)
  lastFmUsername: string;
  lastFmApiKey: string;
  lastFmAccounts?: { username: string; apiKey: string; connectedAt?: string; isPrimary?: boolean; }[]; // Multi-account support (Max 5)
  lastCheckInDate: string | null; // Stores the date string (e.g. "20/02/2024")
  checkInHistory?: string[]; // Array of date strings for completed days
  personalPlaylistUrl?: string; // Optional: User's personal Spotify link
  personalArtist?: string; // Optional: Artist name for display
  personalTrack?: string; // Optional: Track title for display
  personalPlaylistUrl2?: string;
  personalArtist2?: string;
  personalTrack2?: string;
  personalPlaylistUrl3?: string;
  personalArtist3?: string;
  personalTrack3?: string;
  whatsappName?: string;
  whatsappNumber?: string;
  extraPointsBalance?: number; // Current balance of extra points
  extraPointsClaimedDates?: Record<string, number>; // Maps date string to number of extra points extracted from it
  patchedDates?: string[]; // Dates that were patched using extra points
  spotifyAccessToken?: string;
  spotifyPremiumMode?: boolean;
  verifiedSpotifyAccounts?: { id: string; email?: string; plan: string; addedAt: string }[];
}

export interface CloudConfig {
  enabled: boolean;
  binId: string;
  apiKey: string;
}

export interface DayConfig {
  tracks: TargetTrack[];
  spotifyId: string;
}

// Key 0 = Sunday, 1 = Monday, ..., 6 = Saturday
export type WeeklySchedule = Record<number, DayConfig>;

export interface AppData {
  users: User[];
  tracks: TargetTrack[]; // Legacy fallback
  spotifyPlaylistId?: string; // Legacy fallback
  weeklySchedule?: WeeklySchedule; // New Weekly System
  adminPin?: string; // Custom Admin PIN
  dailyUsedLastFmAccounts?: Record<string, string[]>; // Map of dateString -> array of used lastFm usernames
}