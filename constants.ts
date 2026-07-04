import { TargetTrack, CloudConfig } from './types';

export const LAST_FM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

export const ADMIN_PIN = '1234';

// --- KONFIGURASI DEFAULT (HARDCODED) ---
// DATA INI SUDAH DIISI AGAR OTOMATIS TERKONEKSI DI INCOGNITO / HP LAIN

export const DEFAULT_CLOUD_CONFIG: CloudConfig = {
  enabled: true, 
  binId: '697f91db43b1c97be95dac80', // Bin ID sudah dimasukkan
  apiKey: '$2a$10$iKUJm6gbggRWTuoxqK61Ie2g8JfOSKgKQusqyRbI5LUzdMSgDvfum' // API Key sudah dimasukkan
};

export const DEFAULT_TRACKS: TargetTrack[] = [
  { id: '1', artist: 'NewJeans', title: 'Super Shy' },
  { id: '2', artist: 'The Weeknd', title: 'Blinding Lights' },
  { id: '3', artist: 'Arctic Monkeys', title: 'Do I Wanna Know?' },
];

// Default playlist (Global Top 50 or similar) if none set
export const DEFAULT_SPOTIFY_ID = '37i9dQZF1DXcBWIGoYBM5M'; 

export const STORAGE_KEY = 'streamguard_playlist';
export const STORAGE_KEY_USERS = 'streamguard_users_db'; 
export const STORAGE_KEY_CLOUD = 'streamguard_cloud_config';
export const STORAGE_KEY_SPOTIFY = 'streamguard_spotify_id';

export const getPossibleDateStrings = (d: Date): string[] => {
  const yStr = String(d.getFullYear());
  const mStr = String(d.getMonth() + 1);
  const dStr = String(d.getDate());
  
  const mPad = mStr.padStart(2, '0');
  const dPad = dStr.padStart(2, '0');

  return [
    d.toLocaleDateString(),
    d.toLocaleDateString('en-US'),
    d.toLocaleDateString('en-GB'),
    d.toLocaleDateString('id-ID'),
    `${mStr}/${dStr}/${yStr}`,
    `${mPad}/${dPad}/${yStr}`,
    `${dStr}/${mStr}/${yStr}`,
    `${dPad}/${mPad}/${yStr}`,
    `${yStr}-${mPad}-${dPad}`,
    `${yStr}/${mPad}/${dPad}`
  ];
};