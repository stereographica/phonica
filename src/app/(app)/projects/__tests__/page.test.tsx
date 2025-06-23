import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import ProjectsPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '5分前'),
}));
jest.mock('date-fns/locale/ja', () => ({
  ja: {},
}));

// Mock data
const mockProjects = [
  {
    id: '1',
    slug: 'nature-sounds',
    name: 'Nature Sounds Collection',
    description: 'A collection of natural ambient sounds',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
    _count: { materials: 5 },
  },
  {
    id: '2',
    slug: 'urban-soundscape',
    name: 'Urban Soundscape',
    description: 'City and urban environment recordings',
    createdAt: '2024-01-14T15:30:00Z',
    updatedAt: '2024-01-19T15:30:00Z',
    _count: { materials: 8 },
  },
  {
    id: '3',
    slug: 'weather-recordings',
    name: 'Weather Recordings',
    description: null,
    createdAt: '2024-01-13T08:00:00Z',
    updatedAt: '2024-01-18T08:00:00Z',
    _count: { materials: 3 },
  },
];

describe('ProjectsPage', () => {
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

    (usePathname as jest.Mock).mockReturnValue('/projects');

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
      render(<ProjectsPage />);

      // Assert
      expect(screen.getByText('Loading projects...')).toBeInTheDocument();
    });

    it('should display projects after successful fetch', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockProjects,
          pagination: {
            page: 1,
            limit: 12,
            totalPages: 1,
            totalItems: 3,
          },
        }),
      });

      // Act
      render(<ProjectsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      expect(screen.getByText('Urban Soundscape')).toBeInTheDocument();
      expect(screen.getByText('Weather Recordings')).toBeInTheDocument();

      // Check descriptions
      expect(screen.getByText('A collection of natural ambient sounds')).toBeInTheDocument();
      expect(screen.getByText('City and urban environment recordings')).toBeInTheDocument();

      // Check material counts
      expect(screen.getByText('5 materials')).toBeInTheDocument();
      expect(screen.getByText('8 materials')).toBeInTheDocument();
      expect(screen.getByText('3 materials')).toBeInTheDocument();
    });

    it('should display error message when fetch fails', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Act
      render(<ProjectsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });

      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    it('should display empty state when no projects exist', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          pagination: {
            page: 1,
            limit: 12,
            totalPages: 0,
            totalItems: 0,
          },
        }),
      });

      // Act
      render(<ProjectsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('No projects found')).toBeInTheDocument();
    });

    it('should include correct query parameters in initial fetch', async () => {
      // Arrange
      const searchParams = new URLSearchParams({
        page: '2',
        limit: '20',
        sortBy: 'name',
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
      render(<ProjectsPage />);

      // Assert
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2&limit=20&sortBy=name&sortOrder=asc'),
        );
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockProjects,
          pagination: {
            page: 1,
            limit: 12,
            totalPages: 1,
            totalItems: 3,
          },
        }),
      });
    });

    it('should show new project button', async () => {
      // Act
      render(<ProjectsPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      const newProjectButton = screen.getByTestId('new-project-button');

      // Assert
      expect(newProjectButton).toBeInTheDocument();
      expect(newProjectButton).toHaveTextContent('New Project');
    });

    it('should navigate to project detail when project card is clicked', async () => {
      // Act
      render(<ProjectsPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      const projectCard = screen.getByTestId('project-card-nature-sounds');
      await user.click(projectCard);

      // Assert
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/projects/nature-sounds');
      });
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockProjects,
          pagination: { page: 1, limit: 12, totalPages: 1, totalItems: 3 },
        }),
      });
    });

    it('should update URL when changing sort order', async () => {
      // Act
      render(<ProjectsPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      // Find and click sort button
      const sortButton = screen.getByRole('button', { name: /sort by/i });
      await user.click(sortButton);

      // Select "Name (A-Z)" option
      const nameAscOption = screen.getByRole('menuitem', { name: /name \(a-z\)/i });
      await user.click(nameAscOption);

      // Assert - verify URL update was requested
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('sortBy=name'));
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('sortOrder=asc'));
      });
    });

    it('should display projects with initial sort params from URL', async () => {
      // Arrange - start with sort params in URL
      const searchParams = new URLSearchParams({
        sortBy: 'name',
        sortOrder: 'asc',
      });
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      // Override the mock for this test
      (global.fetch as jest.Mock).mockReset();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockProjects,
          pagination: { page: 1, limit: 12, totalPages: 1, totalItems: 3 },
        }),
      });

      // Act
      render(<ProjectsPage />);

      // Assert - verify sorted fetch was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=name&sortOrder=asc'),
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
          data: mockProjects,
          pagination: {
            page: 1,
            limit: 12,
            totalPages: 3,
            totalItems: 30,
          },
        }),
      });

      // Act
      render(<ProjectsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
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
          data: mockProjects,
          pagination: {
            page: 1,
            limit: 12,
            totalPages: 3,
            totalItems: 30,
          },
        }),
      });

      // Act
      render(<ProjectsPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Assert
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      });
    });
  });

  describe('Filtering', () => {
    it('should update URL when applying name filter', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockProjects,
          pagination: { page: 1, limit: 12, totalPages: 1, totalItems: 3 },
        }),
      });

      // Act
      render(<ProjectsPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      // Apply name filter
      const nameInput = screen.getByPlaceholderText('Search by project name...');
      await user.type(nameInput, 'Nature');

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      // Assert - verify URL update was requested
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('name=Nature'));
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('page=1'));
      });
    });

    it('should reset to page 1 when applying filters', async () => {
      // Arrange - start on page 2
      const searchParams = new URLSearchParams({ page: '2' });
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockProjects,
          pagination: { page: 2, limit: 12, totalPages: 2, totalItems: 24 },
        }),
      });

      // Act
      render(<ProjectsPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText('Search by project name...');
      await user.type(nameInput, 'Nature');

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      // Assert - should reset to page 1
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('page=1'));
      });
    });

    it('should apply filters when Enter key is pressed in name filter', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockProjects,
          pagination: { page: 1, limit: 12, totalPages: 1, totalItems: 3 },
        }),
      });

      // Act
      render(<ProjectsPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      // Type in name filter and press Enter
      const nameInput = screen.getByPlaceholderText('Search by project name...');
      await user.type(nameInput, 'Nature');
      await user.keyboard('{Enter}');

      // Assert - verify URL update was requested without clicking button
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('name=Nature'));
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('page=1'));
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle projects without descriptions', async () => {
      // Arrange
      const projectsWithoutDescription = [
        {
          id: '4',
          slug: 'no-description',
          name: 'No Description Project',
          description: null,
          createdAt: '2024-01-16T12:00:00Z',
          updatedAt: '2024-01-16T12:00:00Z',
          _count: { materials: 0 },
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: projectsWithoutDescription,
          pagination: { page: 1, limit: 12, totalPages: 1, totalItems: 1 },
        }),
      });

      // Act
      render(<ProjectsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No Description Project')).toBeInTheDocument();
        expect(screen.getByText('0 materials')).toBeInTheDocument();
      });
    });

    it('should handle rapid pagination clicks', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockProjects,
          pagination: { page: 1, limit: 12, totalPages: 3, totalItems: 30 },
        }),
      });

      // Act
      render(<ProjectsPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
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
});
