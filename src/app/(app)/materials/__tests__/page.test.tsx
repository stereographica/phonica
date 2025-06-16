import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import MaterialsPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock components
jest.mock('@/components/materials/MaterialDetailModal', () => ({
  MaterialDetailModal: jest.fn(() => null),
}));

jest.mock('@/components/materials/DeleteConfirmationModal', () => ({
  DeleteConfirmationModal: jest.fn(() => null),
}));

// Mock StarRating component
jest.mock('@/components/ui/star-rating', () => ({
  StarRating: jest.fn(({ value, readOnly }) => (
    <div data-testid="star-rating" data-value={value} data-readonly={readOnly}>
      {value} / 5 stars
    </div>
  )),
}));

// Mock data
const mockMaterials = [
  {
    id: '1',
    slug: 'material-1',
    title: 'Forest Recording',
    recordedAt: '2024-01-15T10:00:00Z',
    filePath: '/uploads/forest.wav',
    tags: [{ id: 't1', name: 'Nature', slug: 'nature' }],
    rating: 4, // 4つ星評価
  },
  {
    id: '2',
    slug: 'material-2',
    title: 'City Ambience',
    recordedAt: '2024-01-14T15:30:00Z',
    filePath: '/uploads/city.wav',
    tags: [{ id: 't2', name: 'Urban', slug: 'urban' }],
    rating: null, // 評価なし
  },
  {
    id: '3',
    slug: 'material-3',
    title: 'Rain Sound',
    recordedAt: '2024-01-13T08:00:00Z',
    filePath: '/uploads/rain.wav',
    tags: [
      { id: 't1', name: 'Nature', slug: 'nature' },
      { id: 't3', name: 'Weather', slug: 'weather' },
    ],
    rating: 5, // 5つ星評価
  },
];

describe('MaterialsPage - Improved Tests', () => {
  let mockPush: jest.Mock;
  let mockReplace: jest.Mock;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockPush = jest.fn();
    mockReplace = jest.fn();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    (usePathname as jest.Mock).mockReturnValue('/materials');

    // Default search params
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    // Reset fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Display', () => {
    it('should display loading state initially', () => {
      // Arrange - fetch will not resolve immediately
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      // Act
      render(<MaterialsPage />);

      // Assert
      expect(screen.getByText('Loading materials...')).toBeInTheDocument();
    });

    it('should display materials after successful fetch', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 1,
            totalItems: 3,
          },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      expect(screen.getByText('City Ambience')).toBeInTheDocument();
      expect(screen.getByText('Rain Sound')).toBeInTheDocument();

      // Check tags are displayed - multiple elements with same tag name are OK
      const natureTags = screen.getAllByText('Nature');
      expect(natureTags).toHaveLength(2); // Forest Recording and Rain Sound
      expect(screen.getByText('Urban')).toBeInTheDocument();
      expect(screen.getByText('Weather')).toBeInTheDocument();
    });

    it('should display error message when fetch fails', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });

      expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
    });

    it('should display empty state when no materials exist', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 0,
            totalItems: 0,
          },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('No materials found')).toBeInTheDocument();
    });

    it('should include correct query parameters in initial fetch', async () => {
      // Arrange
      const searchParams = new URLSearchParams({
        page: '2',
        limit: '20',
        sortBy: 'title',
        sortOrder: 'asc',
      });
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { page: 2, limit: 20, totalPages: 0, totalItems: 0 },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2&limit=20&sortBy=title&sortOrder=asc'),
        );
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 1,
            totalItems: 3,
          },
        }),
      });
    });

    it('should navigate to material creation page when "New Material" is clicked', async () => {
      // Act
      render(<MaterialsPage />);

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      const newMaterialLink = screen.getByRole('link', { name: /new material/i });

      // Assert
      expect(newMaterialLink).toHaveAttribute('href', '/materials/new');
    });

    it('should open detail modal when material title is clicked', async () => {
      // Arrange
      const MaterialDetailModal = (await import('@/components/materials/MaterialDetailModal'))
        .MaterialDetailModal as jest.Mock;

      // Act
      render(<MaterialsPage />);

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      // Clear previous calls (initial render)
      (MaterialDetailModal as jest.Mock).mockClear();

      await user.click(screen.getByText('Forest Recording'));

      // Assert - check the modal was called with correct props
      await waitFor(() => {
        const lastCall = (MaterialDetailModal as jest.Mock).mock.calls[0];
        expect(lastCall[0]).toMatchObject({
          isOpen: true,
          materialSlug: 'material-1',
        });
      });
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 3 },
        }),
      });
    });

    it('should update URL when changing sort order', async () => {
      // Act
      render(<MaterialsPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      // Find and click sort button
      const sortButton = screen.getByRole('button', { name: /sort by/i });
      await user.click(sortButton);

      // Select "Title (A-Z)" option
      const titleAscOption = screen.getByRole('menuitem', { name: /title \(a-z\)/i });
      await user.click(titleAscOption);

      // Assert - verify URL update was requested
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('sortBy=title'));
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('sortOrder=asc'));
      });
    });

    it('should display materials with initial sort params from URL', async () => {
      // Arrange - start with sort params in URL
      const searchParams = new URLSearchParams({
        sortBy: 'title',
        sortOrder: 'asc',
      });
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      // Override the mock for this test
      (global.fetch as jest.Mock).mockReset();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 3 },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert - verify sorted fetch was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=title&sortOrder=asc'),
        );
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls when there are multiple pages', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 3,
            totalItems: 25,
          },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      // Check pagination controls
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    it('should update URL when navigating to next page', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 3,
            totalItems: 25,
          },
        }),
      });

      // Act
      render(<MaterialsPage />);

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Assert
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      });
    });

    it('should disable previous button on first page', async () => {
      // Arrange
      const searchParams = new URLSearchParams({ page: '1' });
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 3,
            totalItems: 25,
          },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
      });
    });

    it('should disable next button on last page', async () => {
      // Arrange
      const searchParams = new URLSearchParams({ page: '3' });
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: {
            page: 3,
            limit: 10,
            totalPages: 3,
            totalItems: 25,
          },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
      });
    });
  });

  describe('Filtering', () => {
    it('should update URL when applying title filter', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 3 },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      // Apply title filter
      const titleInput = screen.getByPlaceholderText('Search by title...');
      await user.type(titleInput, 'Forest');

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      // Assert - verify URL update was requested
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('title=Forest'));
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('page=1'));
      });
    });

    it('should update URL when applying tag filter', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 3 },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('City Ambience')).toBeInTheDocument();
      });

      // Apply tag filter
      const tagInput = screen.getByPlaceholderText('Search by tag...');
      await user.type(tagInput, 'Urban');

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      // Assert
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('tag=Urban'));
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('page=1'));
      });
    });

    it('should reset to page 1 when applying filters', async () => {
      // Arrange - start on page 2
      const searchParams = new URLSearchParams({ page: '2' });
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: { page: 2, limit: 10, totalPages: 2, totalItems: 20 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [mockMaterials[0]],
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 1 },
          }),
        });

      // Act
      render(<MaterialsPage />);

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      const titleInput = screen.getByPlaceholderText('Search by title...');
      await user.type(titleInput, 'Forest');

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      // Assert - should reset to page 1
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('page=1'));
      });
    });

    it('should display filtered results when URL has filter params', async () => {
      // Arrange - start with filter in URL
      const searchParams = new URLSearchParams({ title: 'Forest' });
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      // Mock filtered response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockMaterials[0]], // Only Forest Recording
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 1 },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert - verify filtered fetch was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('title=Forest'));
      });

      // Verify only filtered material is displayed
      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
        expect(screen.queryByText('City Ambience')).not.toBeInTheDocument();
        expect(screen.queryByText('Rain Sound')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results gracefully', async () => {
      // Arrange - start with filters that return no results
      const searchParams = new URLSearchParams({ title: 'NonExistentMaterial' });
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { page: 1, limit: 10, totalPages: 0, totalItems: 0 },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No materials found')).toBeInTheDocument();
        expect(screen.getByText('0 materials found')).toBeInTheDocument();
      });

      // Pagination should not be shown
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });

      // No pagination or sort controls should be shown
      expect(screen.queryByRole('button', { name: /sort by/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    });

    it('should handle materials without tags', async () => {
      // Arrange
      const materialsWithoutTags = [
        {
          id: '4',
          slug: 'material-4',
          title: 'No Tags Material',
          recordedAt: '2024-01-16T12:00:00Z',
          filePath: '/uploads/notags.wav',
          tags: [], // Empty tags array
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: materialsWithoutTags,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 1 },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No Tags Material')).toBeInTheDocument();
      });

      // Tag cell should be empty but not break the layout
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(2); // Header + 1 data row
    });

    it('should handle invalid page numbers in URL', async () => {
      // Arrange - page number exceeds total pages
      const searchParams = new URLSearchParams({ page: '999' });
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [], // API returns empty array for out-of-range page
          pagination: { page: 999, limit: 10, totalPages: 3, totalItems: 25 },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No materials found')).toBeInTheDocument();
      });

      // Should still show pagination with current page info
      expect(screen.getByText('Page 999 of 3')).toBeInTheDocument();
    });

    it('should handle concurrent filter and sort changes', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 3 },
        }),
      });

      // Act
      render(<MaterialsPage />);

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      // Apply filter
      const titleInput = screen.getByPlaceholderText('Search by title...');
      await user.type(titleInput, 'Forest');

      // Before clicking apply, also change sort
      const sortButton = screen.getByRole('button', { name: /sort by/i });
      await user.click(sortButton);
      const titleAscOption = screen.getByRole('menuitem', { name: /title \(a-z\)/i });
      await user.click(titleAscOption);

      // Now apply filter
      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      // Assert - both should be in URL
      await waitFor(() => {
        const lastCall = mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0];
        expect(lastCall).toContain('title=Forest');
        expect(lastCall).toContain('page=1'); // Should reset to page 1
      });
    });

    it('should handle rapid pagination clicks', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 3, totalItems: 25 },
        }),
      });

      // Act
      render(<MaterialsPage />);

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });

      // Rapid clicks - only the first should trigger navigation
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      // Assert - should only update to page 2 once
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      });

      // Should only have one call to replace
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rating Display', () => {
    it('should display Rating column header in the table', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 3 },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      // Check that Rating column header exists
      expect(screen.getByRole('columnheader', { name: /rating/i })).toBeInTheDocument();
    });

    it('should display StarRating components for materials with ratings', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 3 },
        }),
      });

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      // Check StarRating components are displayed
      const starRatings = screen.getAllByTestId('star-rating');
      expect(starRatings).toHaveLength(3); // 3つの素材分

      // Forest Recording: rating = 4
      expect(starRatings[0]).toHaveAttribute('data-value', '4');
      expect(starRatings[0]).toHaveAttribute('data-readonly', 'true');
      expect(starRatings[0]).toHaveTextContent('4 / 5 stars');

      // City Ambience: rating = null
      expect(starRatings[1]).toHaveAttribute('data-value', '0'); // null -> 0
      expect(starRatings[1]).toHaveAttribute('data-readonly', 'true');
      expect(starRatings[1]).toHaveTextContent('0 / 5 stars');

      // Rain Sound: rating = 5
      expect(starRatings[2]).toHaveAttribute('data-value', '5');
      expect(starRatings[2]).toHaveAttribute('data-readonly', 'true');
      expect(starRatings[2]).toHaveTextContent('5 / 5 stars');
    });

    it('should display StarRating in small size for list view', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 3 },
        }),
      });

      // StarRating component mock should verify size prop
      const { StarRating: mockStarRating } = jest.requireMock('@/components/ui/star-rating') as {
        StarRating: jest.Mock;
      };

      // Act
      render(<MaterialsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      // Verify StarRating components were called with correct props
      expect(mockStarRating).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 'sm',
          readOnly: true,
          value: 4, // Forest Recording's rating
        }),
        undefined,
      );

      expect(mockStarRating).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 'sm',
          readOnly: true,
          value: 0, // City Ambience's rating (null -> 0)
        }),
        undefined,
      );

      expect(mockStarRating).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 'sm',
          readOnly: true,
          value: 5, // Rain Sound's rating
        }),
        undefined,
      );
    });
  });
});
