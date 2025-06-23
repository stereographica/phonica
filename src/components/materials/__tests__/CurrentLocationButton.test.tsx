import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CurrentLocationButton from '../CurrentLocationButton';

// Mock navigator.geolocation
const mockGetCurrentPosition = jest.fn();
const mockGeolocation = {
  getCurrentPosition: mockGetCurrentPosition,
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

describe('CurrentLocationButton', () => {
  const mockProps = {
    onLocationReceived: jest.fn(),
    onLoadingChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentPosition.mockReset();
  });

  it('renders button with correct text', () => {
    render(<CurrentLocationButton {...mockProps} />);

    expect(screen.getByText('Use Current Location')).toBeInTheDocument();
  });

  it('successfully gets current location', async () => {
    const user = userEvent.setup();
    const mockPosition = {
      coords: {
        latitude: 35.681236,
        longitude: 139.767125,
        accuracy: 10,
      },
    };

    mockGetCurrentPosition.mockImplementation((success) => {
      success(mockPosition);
    });

    render(<CurrentLocationButton {...mockProps} />);

    const button = screen.getByText('Use Current Location');
    await user.click(button);

    expect(mockProps.onLoadingChange).toHaveBeenCalledWith(true);
    expect(mockGetCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );

    await waitFor(() => {
      expect(mockProps.onLocationReceived).toHaveBeenCalledWith(35.681236, 139.767125);
      expect(mockProps.onLoadingChange).toHaveBeenCalledWith(false);
    });
  });

  it('handles permission denied error', async () => {
    const user = userEvent.setup();
    const mockError = {
      code: 1, // PERMISSION_DENIED
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGetCurrentPosition.mockImplementation((success, error) => {
      error(mockError);
    });

    render(<CurrentLocationButton {...mockProps} />);

    const button = screen.getByText('Use Current Location');
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Location permission was denied. Please enable location services and try again.',
        ),
      ).toBeInTheDocument();
      expect(mockProps.onLoadingChange).toHaveBeenCalledWith(false);
    });
  });

  it('handles position unavailable error', async () => {
    const user = userEvent.setup();
    const mockError = {
      code: 2, // POSITION_UNAVAILABLE
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGetCurrentPosition.mockImplementation((success, error) => {
      error(mockError);
    });

    render(<CurrentLocationButton {...mockProps} />);

    const button = screen.getByText('Use Current Location');
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText('Location information is unavailable. Please try again later.'),
      ).toBeInTheDocument();
    });
  });

  it('handles timeout error', async () => {
    const user = userEvent.setup();
    const mockError = {
      code: 3, // TIMEOUT
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGetCurrentPosition.mockImplementation((success, error) => {
      error(mockError);
    });

    render(<CurrentLocationButton {...mockProps} />);

    const button = screen.getByText('Use Current Location');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Location request timed out. Please try again.')).toBeInTheDocument();
    });
  });

  it('handles unknown error', async () => {
    const user = userEvent.setup();
    const mockError = {
      code: 999, // Unknown error code
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGetCurrentPosition.mockImplementation((success, error) => {
      error(mockError);
    });

    render(<CurrentLocationButton {...mockProps} />);

    const button = screen.getByText('Use Current Location');
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText('An unknown error occurred while getting your location.'),
      ).toBeInTheDocument();
    });
  });

  it('shows loading state while getting location', async () => {
    const user = userEvent.setup();
    let resolveGetLocation: ((value: unknown) => void) | undefined;

    mockGetCurrentPosition.mockImplementation((success) => {
      // Delay to simulate async operation
      new Promise((resolve) => {
        resolveGetLocation = resolve;
      }).then(() => {
        success({
          coords: {
            latitude: 35.681236,
            longitude: 139.767125,
          },
        });
      });
    });

    render(<CurrentLocationButton {...mockProps} />);

    const button = screen.getByText('Use Current Location');
    await user.click(button);

    // Should show loading state
    expect(screen.getByText('Getting Location...')).toBeInTheDocument();
    expect(button).toBeDisabled();

    // Resolve the location
    resolveGetLocation?.(undefined);

    await waitFor(() => {
      expect(screen.getByText('Use Current Location')).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });
  });

  it('disables button when disabled prop is true', () => {
    render(<CurrentLocationButton {...mockProps} disabled={true} />);

    const button = screen.getByText('Use Current Location');
    expect(button).toBeDisabled();
  });

  it('handles missing geolocation API', async () => {
    const user = userEvent.setup();

    // Temporarily remove geolocation
    const originalGeolocation = navigator.geolocation;
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      writable: true,
    });

    render(<CurrentLocationButton {...mockProps} />);

    const button = screen.getByText('Use Current Location');
    await user.click(button);

    expect(screen.getByText('Geolocation is not supported by your browser.')).toBeInTheDocument();

    // Restore geolocation
    Object.defineProperty(global.navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
    });
  });

  it('does not call onLoadingChange if not provided', async () => {
    const user = userEvent.setup();
    const mockPosition = {
      coords: {
        latitude: 35.681236,
        longitude: 139.767125,
      },
    };

    mockGetCurrentPosition.mockImplementation((success) => {
      success(mockPosition);
    });

    // Render without onLoadingChange
    render(<CurrentLocationButton onLocationReceived={mockProps.onLocationReceived} />);

    const button = screen.getByText('Use Current Location');
    await user.click(button);

    await waitFor(() => {
      expect(mockProps.onLocationReceived).toHaveBeenCalledWith(35.681236, 139.767125);
    });

    // Should not throw error even without onLoadingChange
  });
});
