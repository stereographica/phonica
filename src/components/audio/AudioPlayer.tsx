'use client';

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer, { WaveSurferOptions } from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Rewind, FastForward, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface AudioPlayerProps {
  audioUrl: string;
  // WaveSurfer customization options
  waveColor?: string;
  progressColor?: string;
  cursorColor?: string;
  barWidth?: number;
  barRadius?: number;
  height?: number;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  waveColor = '#A8A8A8',
  progressColor = '#3B82F6',
  cursorColor = '#1E40AF',
  barWidth = 2,
  barRadius = 3,
  height = 100,
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5); // 初期音量 50%
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!waveformRef.current || !audioUrl) {
      return;
    }

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    // Reset state when initializing new audio - legitimate use case
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    const wsOptions: Omit<WaveSurferOptions, 'container'> = {
      waveColor,
      progressColor,
      cursorColor,
      barWidth,
      barRadius,
      height,
      normalize: true,
      // MediaElementバックエンドを使用（WebAudioよりも互換性が高い）
      backend: 'MediaElement',
      // MediaElementのためのオプション
      mediaControls: false,
      interact: true,
    };

    const ws = WaveSurfer.create({
      ...wsOptions,
      container: waveformRef.current,
      url: audioUrl,
    });
    wavesurferRef.current = ws;

    const handleReady = () => {
      if (!isMounted.current || wavesurferRef.current !== ws) return;
      setIsLoading(false);
      setDuration(ws.getDuration() || 0);
    };

    const handleAudioprocess = (time: number) => {
      if (!isMounted.current || wavesurferRef.current !== ws) return;
      setCurrentTime(time);
    };

    const handlePlay = () => {
      if (!isMounted.current || wavesurferRef.current !== ws) return;
      setIsPlaying(true);
    };
    const handlePause = () => {
      if (!isMounted.current || wavesurferRef.current !== ws) return;
      setIsPlaying(false);
    };
    const handleFinish = () => {
      if (!isMounted.current || wavesurferRef.current !== ws) return;
      setIsPlaying(false);
      ws.seekTo(0);
      setCurrentTime(0);
    };

    const handleSeeking = () => {
      if (!isMounted.current || wavesurferRef.current !== ws) return;
      // Update current time when seeking
      setCurrentTime(ws.getCurrentTime());
    };

    const handleError = (err: Error | string) => {
      if (!isMounted.current || wavesurferRef.current !== ws) return;
      console.error('WaveSurfer error:', err);
      const message = typeof err === 'string' ? err : err.message;
      if (err instanceof Error && err.name === 'AbortError') {
        setError(null);
        console.warn('Audio loading aborted, possibly due to component lifecycle.');
      } else if (message?.includes('MEDIA_ELEMENT_ERROR')) {
        // メディア要素エラーの場合、より具体的なメッセージを表示
        setError('音声ファイルの読み込みに失敗しました。');
      } else {
        setError(message || 'Failed to load audio file.');
      }
      setIsLoading(false);
    };

    ws.on('ready', handleReady);
    ws.on('audioprocess', handleAudioprocess);
    ws.on('play', handlePlay);
    ws.on('pause', handlePause);
    ws.on('finish', handleFinish);
    ws.on('seeking', handleSeeking);
    ws.on('error', handleError);

    return () => {
      ws.destroy();
      if (wavesurferRef.current === ws) {
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl, waveColor, progressColor, cursorColor, barWidth, barRadius, height]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    if (wavesurferRef.current && !isLoading && !error) {
      wavesurferRef.current.playPause();
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume[0]);
  };

  const toggleMute = () => {
    setIsMuted((prevMuted) => !prevMuted);
  };

  const seek = (amount: number) => {
    if (wavesurferRef.current && !isLoading && !error && duration > 0) {
      const currentProgress = wavesurferRef.current.getCurrentTime() / duration;
      const seekAmount = amount / duration;
      const newProgress = Math.max(0, Math.min(1, currentProgress + seekAmount));
      wavesurferRef.current.seekTo(newProgress);
      // シーク後の時間を即座に更新
      const newTime = newProgress * duration;
      setCurrentTime(newTime);
    }
  };

  const restart = () => {
    if (wavesurferRef.current && !isLoading && !error) {
      wavesurferRef.current.seekTo(0);
      wavesurferRef.current.play();
    }
  };

  const formatTime = (timeInSeconds: number): string => {
    const time = Math.max(0, timeInSeconds);
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (error) {
    return (
      <div className="p-4 border rounded-md bg-destructive/10 text-destructive">Error: {error}</div>
    );
  }
  if (!audioUrl) {
    return (
      <div className="p-4 border rounded-md bg-muted/50 text-muted-foreground">
        No audio to play.
      </div>
    );
  }

  return (
    <div
      className="p-2 border rounded-md bg-card"
      data-testid="audio-player"
      data-playing={isPlaying}
    >
      <div
        ref={waveformRef}
        className={`w-full h-[100px] transition-opacity duration-300 ${isLoading ? 'opacity-50 animate-pulse bg-muted' : 'opacity-100'}`}
      />

      {isLoading && !error && (
        <p className="text-sm text-center text-muted-foreground py-2">Loading audio waveform...</p>
      )}

      {error && <div className="p-2 text-sm text-center text-destructive py-2">Error: {error}</div>}

      {!isLoading && !error && (
        <>
          <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground px-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="flex items-center justify-center gap-1 sm:gap-2 mt-2 flex-wrap">
            <Button
              variant="ghost"
              size="icon"
              onClick={restart}
              title="Restart"
              disabled={isLoading || !!error || duration === 0}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => seek(-5)}
              title="Rewind 5s"
              disabled={isLoading || !!error || duration === 0}
            >
              <Rewind className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
              className="w-12 h-12 rounded-full"
              disabled={isLoading || !!error || duration === 0}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => seek(5)}
              title="Forward 5s"
              disabled={isLoading || !!error || duration === 0}
            >
              <FastForward className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                disabled={isLoading || !!error || duration === 0}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <Slider
                value={[volume]}
                max={1}
                step={0.05}
                onValueChange={handleVolumeChange}
                className="w-[70px] sm:w-[80px]"
                aria-label="Volume"
                disabled={isLoading || !!error || duration === 0}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export { AudioPlayer };
export default AudioPlayer;
