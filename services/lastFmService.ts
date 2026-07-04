import { LastFmTrack } from '../types';
import { LAST_FM_API_URL } from '../constants';

interface LastFmResponse {
  recenttracks?: {
    track: LastFmTrack[] | LastFmTrack; // Could be array or single object
    '@attr'?: {
      page: string;
      perPage: string;
      user: string;
      total: string;
      totalPages: string;
    };
  };
  error?: number;
  message?: string;
}

/**
 * Fetches recent tracks from Last.fm.
 * Uses the provided apiKey. Falls back to mock data if apiKey is empty.
 */
export const fetchRecentTracks = async (
  username: string, 
  apiKey: string, 
  from?: number, 
  to?: number,
  limit: number = 200
): Promise<LastFmTrack[]> => {
  if (!username) return [];

  // If no API key is provided, use mock data for demonstration
  if (!apiKey) {
    console.warn('No API Key provided, using Mock Data.');
    return new Promise((resolve) => {
      setTimeout(() => {
        // Only return mock data if 'from' is not set (legacy) or if 'from' is in the past
        // For testing "today" vs "past", we'll return empty if 'from' is today
        const now = Math.floor(Date.now() / 1000);
        const todayStart = Math.floor(new Date().setHours(0,0,0,0) / 1000);
        
        if (from && from >= todayStart) {
            // If checking for today, return empty to simulate "not played yet"
            resolve([]);
        } else {
            resolve(mockData.slice(0, limit));
        }
      }, 1000);
    });
  }

  try {
    const encodedUser = encodeURIComponent(username.trim());
    const cleanKey = apiKey.trim();
    let url = `${LAST_FM_API_URL}?method=user.getrecenttracks&user=${encodedUser}&api_key=${cleanKey}&format=json&limit=${limit}`;
    
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;
    
    const response = await fetch(url);
    const data: LastFmResponse = await response.json();
    
    if (!response.ok) {
        // Last.fm typically returns { error: number, message: string } on failure
        if (data.message) {
            throw new Error(data.message);
        }
        throw new Error(`Last.fm API Error: ${response.status}`);
    }

    // Explicit check for API error codes even if HTTP 200 (legacy behavior safeguard)
    if (data.error) {
         throw new Error(data.message || 'Last.fm API returned an error');
    }

    if (!data.recenttracks || !data.recenttracks.track) {
        return [];
    }
    
    // Fix: Last.fm returns a single object if only 1 track exists, instead of an array.
    // We must normalize this to always be an array.
    let tracks = data.recenttracks.track;
    tracks = Array.isArray(tracks) ? tracks : [tracks];
    
    let allTracks = [...tracks];

    // Check if we need to paginate (fetch up to 10 pages / 2000 tracks)
    const totalPages = data.recenttracks['@attr']?.totalPages;
    if (totalPages && parseInt(totalPages) > 1) {
        const maxPages = Math.min(parseInt(totalPages), 10);
        // Last.fm pages are 1-indexed. We already fetched page 1.
        // Fetch pages sequentially to avoid HTTP 429 Too Many Requests (Last.fm allows max 5 req/s)
        for (let i = 2; i <= maxPages; i++) {
            try {
                const pageUrl = `${url}&page=${i}`;
                const res = await fetch(pageUrl);
                if (!res.ok) {
                    console.error(`Failed to fetch page ${i}: HTTP ${res.status}`);
                    continue; // Skip failed page
                }
                const pageData = await res.json();
                if (pageData && pageData.recenttracks && pageData.recenttracks.track) {
                    let pagedTracks = pageData.recenttracks.track;
                    pagedTracks = Array.isArray(pagedTracks) ? pagedTracks : [pagedTracks];
                    allTracks = allTracks.concat(pagedTracks);
                }
                
                // Small delay to respect rate limit
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (err) {
                console.error(`Failed to fetch page ${i}:`, err);
            }
        }
    }
    
    // Inject the username that listened to these tracks
    return allTracks.map((t: any) => ({ ...t, listenedBy: username }));

  } catch (error: any) {
    console.error('API Error:', error);
    // Propagate the specific error message to the UI
    throw new Error(error.message || 'Failed to connect to Last.fm');
  }
};

// Mock data to simulate a user who has listened to some of the default tracks
const mockData: LastFmTrack[] = [
  {
    name: 'Super Shy',
    artist: { '#text': 'NewJeans' },
    album: { '#text': 'Get Up' }
  },
  {
    name: 'Blinding Lights',
    artist: { '#text': 'The Weeknd' },
    album: { '#text': 'After Hours' }
  },
  {
    name: 'Do I Wanna Know?',
    artist: { '#text': 'Arctic Monkeys' },
    album: { '#text': 'AM' }
  }
];