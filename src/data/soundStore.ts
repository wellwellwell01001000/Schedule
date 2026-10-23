// Custom Sounds Config Store & Web Audio / MP3 player
import {
  playWorkEndBreakStartSound,
  playBreakEndWorkStartSound,
  playTargetDurationMetSound,
} from '../utils/audioChimes';

export interface CustomSoundsConfig {
  taskCompleteAudioUrl?: string; // base64 data URL or mp3 link
  pomodoroCompleteAudioUrl?: string;
  breakCompleteAudioUrl?: string;
}

const SOUNDS_STORAGE_KEY = 'routine_tracker_custom_sounds_v1';

export function getCustomSoundsConfig(): CustomSoundsConfig {
  try {
    const raw = localStorage.getItem(SOUNDS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CustomSoundsConfig;
  } catch {
    return {};
  }
}

export function saveCustomSoundsConfig(config: CustomSoundsConfig): void {
  try {
    localStorage.setItem(SOUNDS_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // quota error fallback
  }
}

/**
 * Plays either user-configured custom audio (Base64/MP3 URL) or falls back to Web Audio API chimes
 */
export function playCustomOrFallbackSound(
  type: 'pomodoro_complete' | 'break_complete' | 'task_complete'
) {
  const config = getCustomSoundsConfig();
  let customUrl: string | undefined;
  let fallbackFn: () => void = () => {};

  if (type === 'pomodoro_complete') {
    customUrl = config.pomodoroCompleteAudioUrl;
    fallbackFn = playWorkEndBreakStartSound;
  } else if (type === 'break_complete') {
    customUrl = config.breakCompleteAudioUrl;
    fallbackFn = playBreakEndWorkStartSound;
  } else if (type === 'task_complete') {
    customUrl = config.taskCompleteAudioUrl;
    fallbackFn = playTargetDurationMetSound;
  }

  if (customUrl && customUrl.trim().length > 0) {
    try {
      const audio = new Audio(customUrl);
      audio.volume = 0.85;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch(() => {
          fallbackFn();
        });
      }
    } catch {
      fallbackFn();
    }
  } else {
    fallbackFn();
  }
}

/**
 * Test play a specific audio URL or fallback
 */
export function testCustomSound(
  type: 'pomodoro_complete' | 'break_complete' | 'task_complete',
  overrideUrl?: string
) {
  const urlToPlay =
    overrideUrl !== undefined
      ? overrideUrl
      : type === 'pomodoro_complete'
      ? getCustomSoundsConfig().pomodoroCompleteAudioUrl
      : type === 'break_complete'
      ? getCustomSoundsConfig().breakCompleteAudioUrl
      : getCustomSoundsConfig().taskCompleteAudioUrl;

  let fallbackFn: () => void = () => {};
  if (type === 'pomodoro_complete') fallbackFn = playWorkEndBreakStartSound;
  if (type === 'break_complete') fallbackFn = playBreakEndWorkStartSound;
  if (type === 'task_complete') fallbackFn = playTargetDurationMetSound;

  if (urlToPlay && urlToPlay.trim().length > 0) {
    try {
      const audio = new Audio(urlToPlay);
      audio.volume = 0.85;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch(() => {
          fallbackFn();
        });
      }
    } catch {
      fallbackFn();
    }
  } else {
    fallbackFn();
  }
}
