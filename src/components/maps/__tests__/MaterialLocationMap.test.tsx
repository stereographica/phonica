import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MaterialLocationMap from '../MaterialLocationMap';

// Mock leaflet CSS import
jest.mock('leaflet/dist/leaflet.css', () => ({}));

// Mock Leaflet and react-leaflet
jest.mock('leaflet', () => ({
  Icon: {
    Default: {
      prototype: {
        _getIconUrl: undefined,
      },
      mergeOptions: jest.fn(),
    },
  },
}));

jest.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    center,
    zoom,
    scrollWheelZoom,
    style,
    whenReady,
  }: {
    children?: React.ReactNode;
    center?: number[];
    zoom?: number;
    scrollWheelZoom?: boolean;
    style?: React.CSSProperties;
    whenReady?: (map: { invalidateSize: jest.Mock }) => void;
  }) => {
    // Simulate map ready callback for testing
    React.useEffect(() => {
      if (whenReady) {
        const mockMap = { invalidateSize: jest.fn() };
        whenReady(mockMap);
      }
    }, [whenReady]);

    return (
      <div
        data-testid="map-container"
        data-center={JSON.stringify(center)}
        data-zoom={zoom}
        data-scroll-wheel-zoom={scrollWheelZoom}
        style={style}
      >
        {children}
      </div>
    );
  },
  TileLayer: ({ attribution, url }: { attribution?: string; url?: string }) => (
    <div data-testid="tile-layer" data-attribution={attribution} data-url={url} />
  ),
  Marker: ({ children, position }: { children?: React.ReactNode; position?: number[] }) => (
    <div data-testid="marker" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) =>
    children ? <div data-testid="popup">{children}</div> : null,
}));

describe('MaterialLocationMap', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it.skip('renders placeholder during server-side rendering', () => {
    // Mock window to be undefined to simulate server-side rendering
    Object.defineProperty(window, 'window', {
      value: undefined,
      configurable: true,
    });

    render(<MaterialLocationMap latitude={35.681236} longitude={139.767125} />);

    const placeholder = screen.getByLabelText('Map loading...');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveStyle({ height: '300px', background: '#e0e0e0' });
  });

  it('renders map with default props', async () => {
    await act(async () => {
      render(<MaterialLocationMap latitude={35.681236} longitude={139.767125} />);
    });

    await act(async () => {
      // Allow time for component to settle
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toBeInTheDocument();
    expect(mapContainer).toHaveAttribute('data-zoom', '13');
    expect(mapContainer).toHaveAttribute('data-scroll-wheel-zoom', 'false');
  });

  it('renders map with custom zoom', async () => {
    await act(async () => {
      render(<MaterialLocationMap latitude={35.681236} longitude={139.767125} zoom={15} />);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toHaveAttribute('data-zoom', '15');
  });

  it('renders tile layer with correct attribution', async () => {
    await act(async () => {
      render(<MaterialLocationMap latitude={35.681236} longitude={139.767125} />);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer).toBeInTheDocument();
    expect(tileLayer).toHaveAttribute(
      'data-attribution',
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    );
    expect(tileLayer).toHaveAttribute(
      'data-url',
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    );
  });

  it('renders marker at correct position', async () => {
    const latitude = 35.681236;
    const longitude = 139.767125;

    await act(async () => {
      render(<MaterialLocationMap latitude={latitude} longitude={longitude} />);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const marker = screen.getByTestId('marker');
    expect(marker).toBeInTheDocument();
    expect(marker).toHaveAttribute('data-position', JSON.stringify([latitude, longitude]));
  });

  it('renders popup with default text', async () => {
    await act(async () => {
      render(<MaterialLocationMap latitude={35.681236} longitude={139.767125} />);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const popup = screen.getByTestId('popup');
    expect(popup).toBeInTheDocument();
    expect(popup).toHaveTextContent('Recorded Location');
  });

  it('renders popup with custom text', async () => {
    await act(async () => {
      render(
        <MaterialLocationMap
          latitude={35.681236}
          longitude={139.767125}
          popupText="Tokyo Station Recording"
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const popup = screen.getByTestId('popup');
    expect(popup).toHaveTextContent('Tokyo Station Recording');
  });

  it('does not render popup when popupText is empty', async () => {
    await act(async () => {
      render(<MaterialLocationMap latitude={35.681236} longitude={139.767125} popupText="" />);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
  });

  it('handles negative coordinates', async () => {
    const latitude = -33.8688;
    const longitude = -151.2093;

    await act(async () => {
      render(
        <MaterialLocationMap
          latitude={latitude}
          longitude={longitude}
          popupText="Sydney Opera House"
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const marker = screen.getByTestId('marker');
    expect(marker).toHaveAttribute('data-position', JSON.stringify([latitude, longitude]));
  });

  it('handles extreme zoom levels', async () => {
    await act(async () => {
      render(<MaterialLocationMap latitude={0} longitude={0} zoom={1} />);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toHaveAttribute('data-zoom', '1');
  });

  it('renders with equator coordinates', async () => {
    await act(async () => {
      render(<MaterialLocationMap latitude={0} longitude={0} popupText="Equator" />);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const marker = screen.getByTestId('marker');
    expect(marker).toHaveAttribute('data-position', JSON.stringify([0, 0]));

    const popup = screen.getByTestId('popup');
    expect(popup).toHaveTextContent('Equator');
  });
});
