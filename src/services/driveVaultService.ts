/**
 * Google Drive Cloud Vault Service
 * Uses a serverless Google Apps Script Web App deployed on the app owner's Google Drive.
 * End users DO NOT need to sign in, complete OAuth, or grant permissions.
 * Each user is assigned (or creates) a lightweight 6-character Sync Code.
 * Data is stored as 'routine_<CODE>.json' inside the owner's 'RoutineTrackerBackups' Google Drive folder.
 */

import { SystemSnapshot } from '../data/backupStore';

const STORAGE_VAULT_URL_KEY = 'routine_drive_vault_script_url_v1';
const STORAGE_SYNC_CODE_KEY = 'routine_tracker_sync_code_v1';
const STORAGE_LAST_SYNC_KEY = 'routine_drive_vault_last_sync_v1';

// Default / fallback Webhook URL if pre-configured
const DEFAULT_VAULT_URL = '';

/**
 * Returns the currently active Google Apps Script Webhook URL
 */
export function getVaultScriptUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_VAULT_URL_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore
  }
  return DEFAULT_VAULT_URL;
}

/**
 * Saves or updates the Google Apps Script Webhook URL
 */
export function setVaultScriptUrl(url: string): void {
  try {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_VAULT_URL_KEY, url.trim());
    } else {
      localStorage.removeItem(STORAGE_VAULT_URL_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Returns the user's stored Sync Code (e.g. 'ROUT-7X9K')
 */
export function getStoredSyncCode(): string {
  try {
    const code = localStorage.getItem(STORAGE_SYNC_CODE_KEY);
    if (code && code.trim()) return code.trim().toUpperCase();
  } catch {
    // ignore
  }
  return '';
}

/**
 * Stores a sync code in local storage
 */
export function setStoredSyncCode(code: string): void {
  try {
    if (code && code.trim()) {
      localStorage.setItem(STORAGE_SYNC_CODE_KEY, code.trim().toUpperCase());
    } else {
      localStorage.removeItem(STORAGE_SYNC_CODE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Generates a clean, readable sync code (e.g. 'ROUT-8B2F')
 */
export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ROUT-${rand}`;
}

/**
 * Get or automatically create a persistent Sync Code for this browser
 */
export function getOrCreateSyncCode(): string {
  let code = getStoredSyncCode();
  if (!code) {
    code = generateSyncCode();
    setStoredSyncCode(code);
  }
  return code;
}

/**
 * Last sync timestamp
 */
export function getVaultLastSync(): string | null {
  try {
    return localStorage.getItem(STORAGE_LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

export function setVaultLastSync(isoStr: string): void {
  try {
    localStorage.setItem(STORAGE_LAST_SYNC_KEY, isoStr);
  } catch {
    // ignore
  }
}

/**
 * Save routine state to the Google Drive Cloud Vault
 */
export async function saveToDriveVault(
  snapshot: SystemSnapshot,
  customCode?: string
): Promise<{ success: boolean; code: string; updatedAt: string }> {
  const scriptUrl = getVaultScriptUrl();
  if (!scriptUrl) {
    throw new Error('Drive Vault Webhook URL is not configured yet. Open [DRIVE VAULT SETUP] to paste your Google Apps Script Web App URL.');
  }

  const code = (customCode || getOrCreateSyncCode()).trim().toUpperCase();
  setStoredSyncCode(code);

  const payload = {
    action: 'save',
    code,
    data: snapshot,
    timestamp: new Date().toISOString(),
  };

  try {
    // Use text/plain POST to avoid CORS preflight blocking in browsers
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Cloud server responded with status ${response.status}`);
    }

    const resData = await response.json();
    if (!resData.success) {
      throw new Error(resData.error || 'Failed to save to Drive Vault');
    }

    const nowIso = new Date().toISOString();
    setVaultLastSync(nowIso);

    return {
      success: true,
      code,
      updatedAt: resData.updatedAt || nowIso,
    };
  } catch (err: unknown) {
    console.error('Drive Vault Save Error:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Network error while connecting to Google Drive Vault.');
  }
}

/**
 * Fetch and restore routine state from the Google Drive Cloud Vault using a Sync Code
 */
export async function loadFromDriveVault(code: string): Promise<SystemSnapshot> {
  const scriptUrl = getVaultScriptUrl();
  if (!scriptUrl) {
    throw new Error('Drive Vault Webhook URL is not configured yet. Open [DRIVE VAULT SETUP] to paste your Google Apps Script Web App URL.');
  }

  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('Please enter a valid Sync Code to restore.');
  }

  try {
    const fetchUrl = `${scriptUrl}?action=load&code=${encodeURIComponent(cleanCode)}&t=${Date.now()}`;
    const response = await fetch(fetchUrl);

    if (!response.ok) {
      throw new Error(`Cloud server responded with status ${response.status}`);
    }

    const resData = await response.json();
    if (!resData.success) {
      throw new Error(resData.error || `No backup found for sync code: ${cleanCode}`);
    }

    setStoredSyncCode(cleanCode);
    const nowIso = new Date().toISOString();
    setVaultLastSync(nowIso);

    return resData.data as SystemSnapshot;
  } catch (err: unknown) {
    console.error('Drive Vault Load Error:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to retrieve backup from Google Drive Vault.');
  }
}

/**
 * Copyable Google Apps Script code for the app owner
 */
export const APPS_SCRIPT_SOURCE_CODE = `/**
 * ROUTINE TRACKER - GOOGLE DRIVE VAULT WEB APP SCRIPT
 * Place this in your Google Drive (script.new) to allow users to sync
 * routines directly into your Google Drive without logging in!
 */

function doGet(e) {
  var params = e ? e.parameter : {};
  return handleRequest(params);
}

function doPost(e) {
  var params = {};
  if (e && e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch(err) {
      params = e.parameter || {};
    }
  } else if (e) {
    params = e.parameter || {};
  }
  return handleRequest(params);
}

function handleRequest(params) {
  var action = (params.action || "").toString().toLowerCase();
  var code = (params.code || "").toString().trim().toUpperCase();
  
  if (!code) {
    return jsonOutput({ success: false, error: "Sync code is required." });
  }

  // Get or create 'RoutineTrackerBackups' folder in your personal Drive
  var folderName = "RoutineTrackerBackups";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  var fileName = "routine_" + code + ".json";

  // SAVE ACTION
  if (action === "save") {
    var data = params.data;
    if (!data) {
      return jsonOutput({ success: false, error: "No data payload provided." });
    }
    var contentStr = typeof data === "string" ? data : JSON.stringify(data);
    var files = folder.getFilesByName(fileName);
    var file;
    if (files.hasNext()) {
      file = files.next();
      file.setContent(contentStr);
    } else {
      file = folder.createFile(fileName, contentStr, MimeType.PLAIN_TEXT);
    }
    return jsonOutput({ 
      success: true, 
      code: code, 
      fileId: file.getId(), 
      updatedAt: new Date().toISOString() 
    });
  }

  // LOAD / RESTORE ACTION
  if (action === "load") {
    var files = folder.getFilesByName(fileName);
    if (!files.hasNext()) {
      return jsonOutput({ 
        success: false, 
        error: "Vault backup not found for code: " + code + ". Check spelling or make sure you have saved to the vault first." 
      });
    }
    var file = files.next();
    var content = file.getBlob().getDataAsString();
    return jsonOutput({ 
      success: true, 
      code: code, 
      data: JSON.parse(content),
      updatedAt: file.getLastUpdated().toISOString() 
    });
  }

  return jsonOutput({ success: false, error: "Invalid action. Supported: 'save', 'load'." });
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
