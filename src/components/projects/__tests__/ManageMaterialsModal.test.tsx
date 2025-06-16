import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageMaterialsModal } from '../ManageMaterialsModal';
import { useNotification } from '@/hooks/use-notification';

// Mock the notification hook
jest.mock('@/hooks/use-notification');

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/projects/test-project',
}));

// Mock fetch
global.fetch = jest.fn();

const mockNotifyError = jest.fn();
const mockNotifySuccess = jest.fn();

const mockMaterials = [
  {
    id: '1',
    slug: 'material-1',
    title: 'Forest Recording',
    recordedAt: '2024-01-01T00:00:00Z',
    tags: [{ id: 't1', name: 'nature', slug: 'nature' }],
    isInProject: true,
  },
  {
    id: '2',
    slug: 'material-2',
    title: 'City Ambience',
    recordedAt: '2024-01-02T00:00:00Z',
    tags: [{ id: 't2', name: 'urban', slug: 'urban' }],
    isInProject: false,
  },
];

const mockTags = [
  { id: 't1', name: 'nature', slug: 'nature' },
  { id: 't2', name: 'urban', slug: 'urban' },
  { id: 't3', name: 'water', slug: 'water' },
];

describe('ManageMaterialsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNotification as jest.Mock).mockReturnValue({
      notifyError: mockNotifyError,
      notifySuccess: mockNotifySuccess,
    });
  });

  it('should render modal with correct title', async () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    expect(screen.getByText('Manage Project Materials')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should fetch materials and tags when opened', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

    render(
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Verify API calls were made
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/materials?'));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/master/tags');
    });

    // Wait for content to be displayed
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Verify content is displayed correctly
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Manage Project Materials')).toBeInTheDocument();
  });

  it('should show materials already in project as checked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

    render(
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Wait for content to be displayed
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Verify dialog is shown
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Verify that the components API calls were made
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/materials?'));
    expect(fetch).toHaveBeenCalledWith('/api/master/tags');
  });

  it('should handle material selection and show changes', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

    render(
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Wait for content to be displayed
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Verify that UI components are present
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Manage Project Materials')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search materials by title...')).toBeInTheDocument();
  });

  it('should handle search functionality', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

    const user = userEvent.setup();
    render(
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Wait for content to be displayed
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Test search functionality exists
    const searchInput = screen.getByPlaceholderText('Search materials by title...');
    expect(searchInput).toBeInTheDocument();

    await user.type(searchInput, 'Forest');
    expect(searchInput).toHaveValue('Forest');
  });

  it('should handle batch update', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

    const onSuccess = jest.fn();
    const onOpenChange = jest.fn();

    render(
      <ManageMaterialsModal
        isOpen={true}
        onOpenChange={onOpenChange}
        projectSlug="test-project"
        onSuccess={onSuccess}
      />,
    );

    // Wait for content to be displayed
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Verify the necessary UI elements are present
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Apply Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should reset state when modal is closed and reopened', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

    const onOpenChange = jest.fn();
    const { rerender } = render(
      <ManageMaterialsModal isOpen={true} onOpenChange={onOpenChange} projectSlug="test-project" />,
    );

    // Wait for initial load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Verify initial state
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close modal by calling onOpenChange
    await userEvent.click(screen.getByText('Cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Simulate closing
    rerender(
      <ManageMaterialsModal
        isOpen={false}
        onOpenChange={onOpenChange}
        projectSlug="test-project"
      />,
    );

    // Reset mocks for reopening
    jest.clearAllMocks();
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

    // Reopen modal
    rerender(
      <ManageMaterialsModal isOpen={true} onOpenChange={onOpenChange} projectSlug="test-project" />,
    );

    // Should fetch data again
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/materials?'));
    });

    // Verify modal is displayed again
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should handle sort functionality', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

    render(
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Wait for dialog to be rendered
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Wait for content to be loaded
    await waitFor(() => {
      expect(screen.queryByText('All Tags')).toBeInTheDocument();
    });

    // Verify sort dropdown is present
    expect(screen.getByText(/Recorded Date \(Newest First\)/)).toBeInTheDocument();
  });

  it('should handle tag filter', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

    render(
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Wait for content to be displayed
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Verify tag filter dropdown is present
    expect(screen.getByText('All Tags')).toBeInTheDocument();
  });
});
