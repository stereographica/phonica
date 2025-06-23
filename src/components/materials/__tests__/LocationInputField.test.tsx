import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationInputField from '../LocationInputField';
import { config } from '@/lib/config';

// Mock the child components
jest.mock('../PhotoLocationExtractor', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onClose,
    onLocationExtracted,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onLocationExtracted: (lat: number, lng: number) => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="photo-location-extractor">
        <button
          onClick={() => {
            onLocationExtracted(35.681236, 139.767125);
          }}
        >
          Extract Location
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

jest.mock('../LocationPicker', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onClose,
    onLocationSelected,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onLocationSelected: (lat: number, lng: number) => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="location-picker">
        <button
          onClick={() => {
            onLocationSelected(35.681236, 139.767125);
          }}
        >
          Select Location
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

jest.mock('../CurrentLocationButton', () => ({
  __esModule: true,
  default: ({
    onLocationReceived,
    onLoadingChange,
    disabled,
  }: {
    onLocationReceived: (lat: number, lng: number) => void;
    onLoadingChange?: (loading: boolean) => void;
    disabled: boolean;
  }) => (
    <button
      data-testid="current-location-button"
      onClick={() => {
        onLoadingChange?.(true);
        setTimeout(() => {
          onLocationReceived(35.681236, 139.767125);
          onLoadingChange?.(false);
        }, 100);
      }}
      disabled={disabled}
    >
      Use Current Location
    </button>
  ),
}));

jest.mock('@/components/maps/MaterialLocationMap', () => ({
  __esModule: true,
  default: ({
    latitude,
    longitude,
    popupText,
  }: {
    latitude: number;
    longitude: number;
    popupText: string;
  }) => (
    <div data-testid="material-location-map">
      Map: {latitude}, {longitude} - {popupText}
    </div>
  ),
}));

// Mock the config
jest.mock('@/lib/config', () => ({
  config: {
    features: {
      geolocation: false,
    },
  },
}));

describe('LocationInputField', () => {
  const mockProps = {
    latitude: '',
    longitude: '',
    locationName: '',
    onLatitudeChange: jest.fn(),
    onLongitudeChange: jest.fn(),
    onLocationNameChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all basic input fields', () => {
    render(<LocationInputField {...mockProps} />);

    expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
    expect(screen.getByLabelText('Longitude')).toBeInTheDocument();
    expect(screen.getByLabelText('Location Name (Optional)')).toBeInTheDocument();
  });

  it('renders action buttons correctly', () => {
    render(<LocationInputField {...mockProps} />);

    expect(screen.getByText('Extract from Photo')).toBeInTheDocument();
    expect(screen.getByText('Select on Map')).toBeInTheDocument();

    // Current location button should not be shown when geolocation is disabled
    expect(screen.queryByText('Use Current Location')).not.toBeInTheDocument();
  });

  it('shows current location button when geolocation is enabled', () => {
    // Mock config with geolocation enabled
    (config.features as { geolocation: boolean }).geolocation = true;

    render(<LocationInputField {...mockProps} />);

    expect(screen.getByTestId('current-location-button')).toBeInTheDocument();

    // Reset config
    (config.features as { geolocation: boolean }).geolocation = false;
  });

  it('updates latitude and longitude when values change', async () => {
    const user = userEvent.setup();
    render(<LocationInputField {...mockProps} />);

    const latitudeInput = screen.getByLabelText('Latitude') as HTMLInputElement;
    const longitudeInput = screen.getByLabelText('Longitude') as HTMLInputElement;

    // Reset mock to count only new calls
    mockProps.onLatitudeChange.mockClear();
    mockProps.onLongitudeChange.mockClear();

    // Use paste instead of type to avoid character-by-character updates
    await user.click(latitudeInput);
    await user.paste('35.681236');

    expect(mockProps.onLatitudeChange).toHaveBeenCalledWith('35.681236');

    await user.click(longitudeInput);
    await user.paste('139.767125');

    expect(mockProps.onLongitudeChange).toHaveBeenCalledWith('139.767125');
  });

  it('updates location name when value changes', async () => {
    const user = userEvent.setup();
    render(<LocationInputField {...mockProps} />);

    const locationNameInput = screen.getByLabelText('Location Name (Optional)') as HTMLInputElement;

    // Reset mock to count only new calls
    mockProps.onLocationNameChange.mockClear();

    await user.click(locationNameInput);
    await user.paste('Yoyogi Park');

    expect(mockProps.onLocationNameChange).toHaveBeenCalledWith('Yoyogi Park');
  });

  it('shows map preview when valid coordinates are provided', async () => {
    const propsWithCoordinates = {
      ...mockProps,
      latitude: 35.681236,
      longitude: 139.767125,
      locationName: 'Test Location',
    };

    render(<LocationInputField {...propsWithCoordinates} />);

    // Wait for the dynamically imported map component to load
    await waitFor(() => {
      expect(screen.getByTestId('material-location-map')).toBeInTheDocument();
    });

    expect(screen.getByText('Map: 35.681236, 139.767125 - Test Location')).toBeInTheDocument();
  });

  it('does not show map preview for invalid coordinates', () => {
    const propsWithInvalidCoordinates = {
      ...mockProps,
      latitude: 'invalid',
      longitude: 'invalid',
    };

    render(<LocationInputField {...propsWithInvalidCoordinates} />);

    expect(screen.queryByTestId('material-location-map')).not.toBeInTheDocument();
  });

  it('opens photo extractor when Extract from Photo is clicked', async () => {
    const user = userEvent.setup();
    render(<LocationInputField {...mockProps} />);

    const extractButton = screen.getByText('Extract from Photo');
    await user.click(extractButton);

    expect(screen.getByTestId('photo-location-extractor')).toBeInTheDocument();
  });

  it('updates coordinates when location is extracted from photo', async () => {
    const user = userEvent.setup();
    render(<LocationInputField {...mockProps} />);

    // Open photo extractor
    await user.click(screen.getByText('Extract from Photo'));

    // Extract location
    await user.click(screen.getByText('Extract Location'));

    expect(mockProps.onLatitudeChange).toHaveBeenCalledWith(35.681236);
    expect(mockProps.onLongitudeChange).toHaveBeenCalledWith(139.767125);

    // Photo extractor should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('photo-location-extractor')).not.toBeInTheDocument();
    });
  });

  it('opens location picker when Select on Map is clicked', async () => {
    const user = userEvent.setup();
    render(<LocationInputField {...mockProps} />);

    const selectButton = screen.getByText('Select on Map');
    await user.click(selectButton);

    expect(screen.getByTestId('location-picker')).toBeInTheDocument();
  });

  it('updates coordinates when location is selected on map', async () => {
    const user = userEvent.setup();
    render(<LocationInputField {...mockProps} />);

    // Open location picker
    await user.click(screen.getByText('Select on Map'));

    // Select location
    await user.click(screen.getByText('Select Location'));

    expect(mockProps.onLatitudeChange).toHaveBeenCalledWith(35.681236);
    expect(mockProps.onLongitudeChange).toHaveBeenCalledWith(139.767125);

    // Location picker should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('location-picker')).not.toBeInTheDocument();
    });
  });

  it('disables inputs when loading current location', async () => {
    (config.features as { geolocation: boolean }).geolocation = true;
    const user = userEvent.setup();

    render(<LocationInputField {...mockProps} />);

    const currentLocationButton = screen.getByTestId('current-location-button');
    await user.click(currentLocationButton);

    // Inputs should be disabled while loading
    expect(screen.getByLabelText('Latitude')).toBeDisabled();
    expect(screen.getByLabelText('Longitude')).toBeDisabled();
    expect(screen.getByLabelText('Location Name (Optional)')).toBeDisabled();

    // Wait for location to be received
    await waitFor(() => {
      expect(mockProps.onLatitudeChange).toHaveBeenCalledWith(35.681236);
      expect(mockProps.onLongitudeChange).toHaveBeenCalledWith(139.767125);
    });

    // Inputs should be enabled again
    await waitFor(() => {
      expect(screen.getByLabelText('Latitude')).not.toBeDisabled();
      expect(screen.getByLabelText('Longitude')).not.toBeDisabled();
      expect(screen.getByLabelText('Location Name (Optional)')).not.toBeDisabled();
    });

    // Reset config
    (config.features as { geolocation: boolean }).geolocation = false;
  });

  it('validates coordinate ranges', () => {
    const propsWithOutOfRangeCoordinates = {
      ...mockProps,
      latitude: 91, // Out of range (should be -90 to 90)
      longitude: 181, // Out of range (should be -180 to 180)
    };

    render(<LocationInputField {...propsWithOutOfRangeCoordinates} />);

    // Map should not be shown for invalid coordinates
    expect(screen.queryByTestId('material-location-map')).not.toBeInTheDocument();
  });
});
