import React, { useRef, useState, useEffect } from 'react';
import { ThemeToggle } from './components/ThemeToggle';
import { NixlabsAccountWidget } from './components/NixlabsAccountWidget';
import { VisualisrCanvas } from './components/VisualisrCanvas';
import type { TelemetryManifest, Verse } from './types/visualiser';

export const App: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [manifest, setManifest] = useState<TelemetryManifest | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const isRenderMode =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('render') === '1' ||
      Boolean((window as any).__DETERMINISTIC_MODE__));

  // Load telemetry manifest when available
  useEffect(() => {
    fetch('/telemetry.json')
      .then(r => r.json())
      .then((data: TelemetryManifest) => setManifest(data))
      .catch(() => {
        // Telemetry not yet generated — visualiser runs in silent/offline mode.
        console.info('[visualiser] No telemetry.json found — running in preview mode.');
      });
  }, []);

  // Load lyrics when available
  useEffect(() => {
    fetch('/lyrics.json')
      .then(r => r.json())
      .then((data: { lyricsData: Verse[] }) => setVerses(data.lyricsData ?? []))
      .catch(() => {
        console.info('[visualiser] No lyrics.json found.');
      });
  }, []);

  // Signal ready for headless capture once telemetry and lyrics are loaded
  useEffect(() => {
    if (manifest && verses.length > 0) {
      (window as any).__APP_READY__ = true;
    }
  }, [manifest, verses]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      {/* Hidden audio element — playback is controlled by the HUD button (disabled in render mode) */}
      {!isRenderMode && (
        <audio
          ref={audioRef}
          src="/audio/abracadabra-mix.mp3"
          preload="auto"
          crossOrigin="anonymous"
        />
      )}

      {/* Full-viewport 3D canvas */}
      <VisualisrCanvas
        audioRef={audioRef}
        manifest={manifest}
        verses={verses}
        isRenderMode={isRenderMode}
      />

      {/* Minimal HUD — brand badge + play button (hidden in render mode for clean capture) */}
      {!isRenderMode && (
        <>
          <div style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            zIndex: 100,
          }}>
            <button
              onClick={handlePlayPause}
              style={{
                background: 'rgba(0,0,0,0.65)',
                border: '1px solid #38bdf8',
                color: '#e5e5e5',
                fontFamily: 'Ubuntu Mono, monospace',
                fontSize: 13,
                padding: '8px 24px',
                borderRadius: 2,
                cursor: 'pointer',
                letterSpacing: '0.08em',
              }}
            >
              {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
            </button>
          </div>

          {/* Brand badge top-left */}
          <div style={{
            position: 'fixed',
            top: 16,
            left: 20,
            fontFamily: 'Ubuntu Mono, monospace',
            fontSize: 12,
            color: '#888',
            zIndex: 100,
          }}>
            <span style={{ color: '#38bdf8' }}>visualiser</span>
            <span style={{ color: '#444' }}>.nixlabs.tech</span>
          </div>

          <NixlabsAccountWidget />
          <ThemeToggle />
        </>
      )}
    </div>
  );
};
