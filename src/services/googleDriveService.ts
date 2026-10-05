/**
 * Client-Side Google Drive Synchronization Service
 * Uses Google Identity Services (GSI) initTokenClient with OAuth scope https://www.googleapis.com/auth/drive.file
 * Stores routine backup in Google Drive as 'routine_tracker_sync.json'
 */

export interface GoogleDriveFileMeta {
  id: string;
  name: string;
  modifiedTime: string;
}

export interface GoogleDriveSyncState {
  isSignedIn: boolean;
  userEmail: string | null;
  lastSyncedAt: string | null;
  fileId: string | null;
  isSyncing: boolean;
  error: string | null;
}

const DRIVE_FILE_NAME = 'routine_tracker_sync.json';
const LOCAL_TOKEN_KEY = 'google_drive_access_token_v1';
const LOCAL_TOKEN_EXPIRY_KEY = 'google_drive_token_expiry_v1';
const LOCAL_LAST_SYNC_KEY = 'google_drive_last_sync_time';
const LOCAL_CUSTOM_CLIENT_ID_KEY = 'google_drive_custom_client_id';

// Default project OAuth Client ID configured for GitHub Pages and web deployments
const DEFAULT_PROJECT_OAUTH_CLIENT_ID = '744036293318-9e34h7vvgelak91v84lp2khbe7acd6v0.apps.googleusercontent.com';

// Read OAuth Client ID from local storage, firebase config, or project default
let cachedClientId: string | null = null;
export async function getOAuthClientId(): Promise<string> {
  if (cachedClientId) return cachedClientId;

  // 1. Check custom user override if provided in settings
  try {
    const customId = localStorage.getItem(LOCAL_CUSTOM_CLIENT_ID_KEY);
    if (customId && customId.trim()) {
      cachedClientId = customId.trim();
      return cachedClientId;
    }
  } catch {
    // ignore
  }

  // 2. Try fetching config from static assets
  try {
    const res = await fetch('./firebase-applet-config.json');
    if (res.ok) {
      const config = await res.json();
      if (config.oAuthClientId) {
        cachedClientId = config.oAuthClientId;
        return config.oAuthClientId;
      }
    }
  } catch {
    // fallback
  }

  cachedClientId = DEFAULT_PROJECT_OAUTH_CLIENT_ID;
  return cachedClientId;
}

export function setCustomOAuthClientId(clientId: string): void {
  try {
    if (clientId.trim()) {
      localStorage.setItem(LOCAL_CUSTOM_CLIENT_ID_KEY, clientId.trim());
      cachedClientId = clientId.trim();
    } else {
      localStorage.removeItem(LOCAL_CUSTOM_CLIENT_ID_KEY);
      cachedClientId = null;
    }
  } catch {
    // ignore
  }
}

export function getCustomOAuthClientId(): string {
  try {
    return localStorage.getItem(LOCAL_CUSTOM_CLIENT_ID_KEY) || '';
  } catch {
    return '';
  }
}


// Get valid stored token if available
export function getStoredAccessToken(): string | null {
  try {
    const token = localStorage.getItem(LOCAL_TOKEN_KEY);
    const expiryStr = localStorage.getItem(LOCAL_TOKEN_EXPIRY_KEY);
    if (!token || !expiryStr) return null;
    const expiry = Number(expiryStr);
    if (Date.now() > expiry - 60000) {
      // Expired or expiring within a minute
      localStorage.removeItem(LOCAL_TOKEN_KEY);
      localStorage.removeItem(LOCAL_TOKEN_EXPIRY_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function saveAccessToken(token: string, expiresInSeconds: number): void {
  try {
    localStorage.setItem(LOCAL_TOKEN_KEY, token);
    const expiry = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(LOCAL_TOKEN_EXPIRY_KEY, String(expiry));
  } catch {
    // ignore
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(LOCAL_TOKEN_KEY);
    localStorage.removeItem(LOCAL_TOKEN_EXPIRY_KEY);
  } catch {
    // ignore
  }
}

export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(LOCAL_LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

export function setLastSyncTime(isoStr: string): void {
  try {
    localStorage.setItem(LOCAL_LAST_SYNC_KEY, isoStr);
  } catch {
    // ignore
  }
}

/**
 * Request Access Token from Google Identity Services Token Client
 */
export async function requestGoogleDriveAccessToken(): Promise<string> {
  const existingToken = getStoredAccessToken();
  if (existingToken) return existingToken;

  const clientId = await getOAuthClientId();

  return new Promise((resolve, reject) => {
    const google = (window as unknown as { google?: { accounts?: { oauth2?: { initTokenClient: (cfg: { client_id: string; scope: string; callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void }) => { requestAccessToken: (opts?: { prompt?: string }) => void } } } } }).google;

    if (!google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services SDK is still loading. Please check your connection and try again in a few seconds.'));
      return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          reject(new Error(tokenResponse.error));
          return;
        }
        if (tokenResponse.access_token) {
          const expiresIn = tokenResponse.expires_in || 3500;
          saveAccessToken(tokenResponse.access_token, expiresIn);
          resolve(tokenResponse.access_token);
        } else {
          reject(new Error('No access token returned from Google.'));
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: '' });
  });
}

/**
 * Locate existing 'routine_tracker_sync.json' in Google Drive
 */
export async function findDriveSyncFile(token: string): Promise<GoogleDriveFileMeta | null> {
  const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&spaces=drive`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredAuth();
      throw new Error('Google Drive session expired. Please connect again.');
    }
    throw new Error(`Google Drive search failed (${res.status})`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0] as GoogleDriveFileMeta;
  }
  return null;
}

/**
 * Upload or update 'routine_tracker_sync.json' on Google Drive
 */
export async function uploadToGoogleDrive(token: string, payload: unknown): Promise<{ fileId: string; modifiedTime: string }> {
  const existing = await findDriveSyncFile(token);
  const fileContent = JSON.stringify(payload, null, 2);

  if (existing) {
    // Update existing file content
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });

    if (!res.ok) {
      throw new Error(`Failed to update Drive file (${res.status})`);
    }

    const updated = await res.json();
    return { fileId: existing.id, modifiedTime: updated.modifiedTime || new Date().toISOString() };
  } else {
    // Create new file via multipart upload
    const metadata = {
      name: DRIVE_FILE_NAME,
      mimeType: 'application/json',
      description: 'Routine Tracker Backup Snapshot',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      throw new Error(`Failed to create file on Google Drive (${res.status})`);
    }

    const created = await res.json();
    return { fileId: created.id, modifiedTime: created.modifiedTime || new Date().toISOString() };
  }
}

/**
 * Download content of 'routine_tracker_sync.json' from Google Drive
 */
export async function downloadFromGoogleDrive(token: string, fileId: string): Promise<unknown> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download routine file from Google Drive (${res.status})`);
  }

  return await res.json();
}
