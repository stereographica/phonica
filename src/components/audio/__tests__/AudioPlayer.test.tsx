import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock WaveSurfer instance
const mockWaveSurferInstance = {
  load: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  playPause: jest.fn(),
  stop: jest.fn(),
  destroy: jest.fn(),
  setVolume: jest.fn(),
  getCurrentTime: jest.fn(() => 0),
  getDuration: jest.fn(() => 100),
  isPlaying: jest.fn(() => false),
  seekTo: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

// Mock WaveSurfer completely
jest.mock('wavesurfer.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockWaveSurferInstance),
  },
}));

// Import after mocking
import AudioPlayer from '../AudioPlayer';
import WaveSurfer from 'wavesurfer.js';

describe('AudioPlayer', () => {
  let mockEventHandlers: { [key: string]: (...args: unknown[]) => void } = {};
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventHandlers = {};
    mockConsoleError.mockClear();

    // Setup event handler capture
    mockWaveSurferInstance.on.mockImplementation((event, handler) => {
      mockEventHandlers[event] = handler;
    });
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('renders with audio URL', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Check for loading state initially
    expect(screen.getByText(/loading audio waveform/i)).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    expect(() => render(<AudioPlayer audioUrl="/test-audio.mp3" />)).not.toThrow();
  });

  it('renders with different audio URL', () => {
    render(<AudioPlayer audioUrl="/different-audio.wav" />);

    expect(screen.getByText(/loading audio waveform/i)).toBeInTheDocument();
  });

  it('has proper styling', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    const container = screen.getByText(/loading audio waveform/i).closest('div');
    expect(container).toHaveClass('bg-card');
  });

  it('renders without audio URL', () => {
    render(<AudioPlayer audioUrl="" />);

    expect(screen.getByText(/No audio URL provided/i)).toBeInTheDocument();
  });

  it('handles ready event', async () => {
    mockWaveSurferInstance.getDuration.mockReturnValue(120);

    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready event
    act(() => {
      mockEventHandlers['ready']?.();
    });

    await waitFor(() => {
      expect(screen.queryByText(/loading audio waveform/i)).not.toBeInTheDocument();
    });
  });

  it('handles play event', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // First trigger ready
    act(() => {
      mockEventHandlers['ready']?.();
    });

    // Then trigger play
    act(() => {
      mockEventHandlers['play']?.();
    });

    // Check that play/pause button exists
    const buttons = screen.getAllByRole('button');
    // Find the play/pause button (it's the larger one with outline variant)
    const playPauseButton = buttons.find((button) => {
      return button.classList.contains('w-12');
    });
    expect(playPauseButton).toBeInTheDocument();
  });

  it('handles pause event', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready and play first
    act(() => {
      mockEventHandlers['ready']?.();
      mockEventHandlers['play']?.();
    });

    // Then trigger pause
    act(() => {
      mockEventHandlers['pause']?.();
    });

    const buttons = screen.getAllByRole('button');
    const playPauseButton = buttons.find((button) => {
      return button.classList.contains('w-12');
    });
    expect(playPauseButton).toBeInTheDocument();
  });

  it('handles finish event', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready and play
    act(() => {
      mockEventHandlers['ready']?.();
      mockEventHandlers['play']?.();
    });

    // Then trigger finish
    act(() => {
      mockEventHandlers['finish']?.();
    });

    expect(mockWaveSurferInstance.seekTo).toHaveBeenCalledWith(0);
  });

  it('handles error event', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger error
    act(() => {
      mockEventHandlers['error']?.(new Error('Failed to load audio'));
    });

    expect(screen.getByText(/failed to load audio/i)).toBeInTheDocument();
  });

  it('handles abort error specifically', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';

    act(() => {
      mockEventHandlers['error']?.(abortError);
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Audio loading aborted, possibly due to component lifecycle.',
    );
    consoleWarnSpy.mockRestore();
  });

  it('handles error as string', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    act(() => {
      mockEventHandlers['error']?.('Network error');
    });

    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it('handles audioprocess event', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready first
    act(() => {
      mockEventHandlers['ready']?.();
    });

    // Trigger audioprocess
    act(() => {
      mockEventHandlers['audioprocess']?.(30);
    });

    expect(screen.getByText('0:30')).toBeInTheDocument();
  });

  it('toggles play/pause when button clicked', async () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready
    act(() => {
      mockEventHandlers['ready']?.();
    });

    const buttons = await screen.findAllByRole('button');
    const playPauseButton = buttons.find((button) => {
      return button.classList.contains('w-12');
    });
    expect(playPauseButton).toBeInTheDocument();

    fireEvent.click(playPauseButton!);
    expect(mockWaveSurferInstance.playPause).toHaveBeenCalled();
  });

  it('handles volume change', async () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready
    act(() => {
      mockEventHandlers['ready']?.();
    });

    await waitFor(() => {
      expect(mockWaveSurferInstance.setVolume).toHaveBeenCalledWith(0.5);
    });
  });

  it('toggles mute', async () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready
    act(() => {
      mockEventHandlers['ready']?.();
    });

    const muteButton = await screen.findByTitle(/mute/i);

    fireEvent.click(muteButton);

    await waitFor(() => {
      expect(mockWaveSurferInstance.setVolume).toHaveBeenCalledWith(0);
    });
  });

  it('seeks forward', async () => {
    mockWaveSurferInstance.getCurrentTime.mockReturnValue(30);
    mockWaveSurferInstance.getDuration.mockReturnValue(100);

    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready
    act(() => {
      mockEventHandlers['ready']?.();
    });

    const forwardButton = await screen.findByTitle(/forward 5s/i);

    fireEvent.click(forwardButton);
    expect(mockWaveSurferInstance.seekTo).toHaveBeenCalledWith(0.35); // (30 + 5) / 100
  });

  it('seeks backward', async () => {
    mockWaveSurferInstance.getCurrentTime.mockReturnValue(30);
    mockWaveSurferInstance.getDuration.mockReturnValue(100);

    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready
    act(() => {
      mockEventHandlers['ready']?.();
    });

    const rewindButton = await screen.findByTitle(/rewind 5s/i);

    fireEvent.click(rewindButton);
    expect(mockWaveSurferInstance.seekTo).toHaveBeenCalledWith(0.25); // (30 - 5) / 100
  });

  it('restarts playback', async () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready
    act(() => {
      mockEventHandlers['ready']?.();
    });

    const restartButton = await screen.findByTitle(/restart/i);

    fireEvent.click(restartButton);
    expect(mockWaveSurferInstance.seekTo).toHaveBeenCalledWith(0);
    expect(mockWaveSurferInstance.play).toHaveBeenCalled();
  });

  it('formats time correctly', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready with duration
    mockWaveSurferInstance.getDuration.mockReturnValue(125); // 2:05
    act(() => {
      mockEventHandlers['ready']?.();
    });

    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    unmount();

    expect(mockWaveSurferInstance.destroy).toHaveBeenCalled();
  });

  it('handles URL change', () => {
    const { rerender } = render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Clear mock to track new calls
    mockWaveSurferInstance.destroy.mockClear();
    (WaveSurfer.create as jest.Mock).mockClear();

    rerender(<AudioPlayer audioUrl="/new-audio.mp3" />);

    expect(mockWaveSurferInstance.destroy).toHaveBeenCalled();
    expect(WaveSurfer.create).toHaveBeenCalled();
  });

  it('hides controls when loading', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Controls should not be visible during loading
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/loading audio waveform/i)).toBeInTheDocument();
  });

  it('hides controls when error occurs', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger error
    act(() => {
      mockEventHandlers['error']?.('Failed to load');
    });

    // Controls should not be visible when error occurs
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('shows error message when loading fails', () => {
    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    act(() => {
      mockEventHandlers['error']?.('Network error occurred');
    });

    expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
  });

  it.skip('handles seek when duration is 0', async () => {
    mockWaveSurferInstance.getDuration.mockReturnValue(0);

    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready
    act(() => {
      mockEventHandlers['ready']?.();
    });

    const forwardButton = await screen.findByTitle(/forward 5s/i);

    fireEvent.click(forwardButton);
    // seekTo should not be called when duration is 0
    expect(mockWaveSurferInstance.seekTo).not.toHaveBeenCalled();
  });

  it('prevents seeking beyond duration', async () => {
    mockWaveSurferInstance.getCurrentTime.mockReturnValue(98);
    mockWaveSurferInstance.getDuration.mockReturnValue(100);

    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready
    act(() => {
      mockEventHandlers['ready']?.();
    });

    const forwardButton = await screen.findByTitle(/forward 5s/i);

    fireEvent.click(forwardButton);
    expect(mockWaveSurferInstance.seekTo).toHaveBeenCalledWith(1); // 100 / 100
  });

  it('prevents seeking before 0', async () => {
    mockWaveSurferInstance.getCurrentTime.mockReturnValue(2);
    mockWaveSurferInstance.getDuration.mockReturnValue(100);

    render(<AudioPlayer audioUrl="/test-audio.mp3" />);

    // Trigger ready
    act(() => {
      mockEventHandlers['ready']?.();
    });

    const rewindButton = await screen.findByTitle(/rewind 5s/i);

    fireEvent.click(rewindButton);
    expect(mockWaveSurferInstance.seekTo).toHaveBeenCalledWith(0); // 0 / 100
  });
});
