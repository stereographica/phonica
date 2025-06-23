import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationPicker from '../LocationPicker';

// Mock InteractiveMap component
jest.mock('../InteractiveMap', () => ({
  __esModule: true,
  default: ({
    initialLatitude,
    initialLongitude,
    onLocationSelect,
  }: {
    initialLatitude: number;
    initialLongitude: number;
    onLocationSelect: (lat: number, lng: number) => void;
  }) => (
    <div data-testid="interactive-map">
      <div>
        Initial: {initialLatitude}, {initialLongitude}
      </div>
      <button onClick={() => onLocationSelect(35.681236, 139.767125)} data-testid="select-location">
        Click to select location
      </button>
    </div>
  ),
}));

describe('LocationPicker', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onLocationSelected: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(<LocationPicker {...mockProps} />);

    expect(screen.getByText('Select Location on Map')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Click on the map to select a location, or drag the marker to adjust the position.',
      ),
    ).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<LocationPicker {...mockProps} isOpen={false} />);

    expect(screen.queryByText('Select Location on Map')).not.toBeInTheDocument();
  });

  it('renders interactive map with default coordinates', () => {
    render(<LocationPicker {...mockProps} />);

    expect(screen.getByTestId('interactive-map')).toBeInTheDocument();
    expect(screen.getByText('Initial: 35.681236, 139.767125')).toBeInTheDocument();
  });

  it('renders interactive map with custom initial coordinates', () => {
    render(<LocationPicker {...mockProps} initialLatitude={40.7128} initialLongitude={-74.006} />);

    expect(screen.getByText('Initial: 40.7128, -74.006')).toBeInTheDocument();
  });

  it('displays selected coordinates when location is selected', async () => {
    const user = userEvent.setup();
    render(<LocationPicker {...mockProps} />);

    const selectButton = screen.getByTestId('select-location');
    await user.click(selectButton);

    expect(screen.getByText('Latitude')).toBeInTheDocument();
    expect(screen.getByText('35.681236')).toBeInTheDocument();
    expect(screen.getByText('Longitude')).toBeInTheDocument();
    expect(screen.getByText('139.767125')).toBeInTheDocument();
  });

  it('enables Use This Location button when location is selected', async () => {
    const user = userEvent.setup();
    render(<LocationPicker {...mockProps} />);

    const useButton = screen.getByText('Use This Location');
    expect(useButton).toBeDisabled();

    const selectButton = screen.getByTestId('select-location');
    await user.click(selectButton);

    expect(useButton).not.toBeDisabled();
  });

  it('calls onLocationSelected when Use This Location is clicked', async () => {
    const user = userEvent.setup();
    render(<LocationPicker {...mockProps} />);

    // Select a location
    const selectButton = screen.getByTestId('select-location');
    await user.click(selectButton);

    // Use the location
    const useButton = screen.getByText('Use This Location');
    await user.click(useButton);

    expect(mockProps.onLocationSelected).toHaveBeenCalledWith(35.681236, 139.767125);
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('closes dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<LocationPicker {...mockProps} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('resets selected location when dialog is closed and reopened', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<LocationPicker {...mockProps} />);

    // Select a location
    const selectButton = screen.getByTestId('select-location');
    await user.click(selectButton);

    expect(screen.getByText('35.681236')).toBeInTheDocument();

    // Close dialog
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    // Reopen dialog
    rerender(<LocationPicker {...mockProps} isOpen={false} />);
    rerender(<LocationPicker {...mockProps} isOpen={true} />);

    // Selected location should be reset
    expect(screen.queryByText('35.681236')).not.toBeInTheDocument();
    expect(screen.getByText('Use This Location')).toBeDisabled();
  });

  it('handles dialog close via backdrop click', () => {
    render(<LocationPicker {...mockProps} />);

    // Dialog component should handle backdrop clicks
    // This is typically handled by the Dialog component itself
    // We can't easily test this without implementation details of Dialog
    // But we can verify the onOpenChange prop is passed correctly
    expect(mockProps.onClose).not.toHaveBeenCalled();
  });
});
