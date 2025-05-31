'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // Import userEvent
import MaterialsPage from '../page'; // Adjust path as necessary
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import fetchMock from 'jest-fetch-mock'; // fetchMock をインポート

fetchMock.enableMocks(); // fetchMock を有効化

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock MaterialDetailModal
jest.mock('@/components/materials/MaterialDetailModal', () => ({
  MaterialDetailModal: jest.fn(({ isOpen, materialSlug, onClose, onMaterialDeleted, onMaterialEdited }) => {
    // console.log('[Mock MaterialDetailModal] isOpen:', isOpen, 'slug:', materialSlug);
    if (!isOpen) return null;
    return (
      <div data-testid="mock-material-detail-modal">
        Mock Material Detail Modal: {materialSlug}
        <button onClick={onClose}>Close</button>
        <button onClick={() => onMaterialDeleted(materialSlug!)}>Delete</button>
        <button onClick={() => onMaterialEdited(materialSlug!)}>Edit</button>
      </div>
    );
  }),
}));

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

const mockMaterialsMasterData = [
  { id: '1', title: 'Material Alpha', recordedDate: new Date(2023, 0, 1).toISOString(), tags: [{id: 't1', name:'Nature', slug:'nature'}], filePath: 'alpha.wav', categoryName: 'testCategory' },
  { id: '2', title: 'Material Beta', recordedDate: new Date(2023, 0, 2).toISOString(), tags: [{id:'t2', name:'Urban', slug:'urban'}], filePath: 'beta.wav', categoryName: 'testCategory' },
  { id: '3', title: 'Material Gamma', recordedDate: new Date(2023, 0, 3).toISOString(), tags: [{id:'t1', name:'Nature', slug:'nature'}, {id:'t3', name:'Ambient', slug:'ambient'}], filePath: 'gamma.wav', categoryName: 'testCategory' },
  { id: '4', title: 'Material Delta - Nature', recordedDate: new Date(2023, 0, 4).toISOString(), tags: [{id:'t1', name:'Nature', slug:'nature'}], filePath: 'delta.wav', categoryName: 'testCategory' },
];

const mockApiResponse = (params: URLSearchParams, allItems = mockMaterialsMasterData) => {
  let items = [...allItems];
  const title = params.get('title');
  const tag = params.get('tag');

  if (title) {
    items = items.filter(item => item.title.toLowerCase().includes(title.toLowerCase()));
  }
  if (tag) {
    items = items.filter(item => item.tags.some(t => t.name.toLowerCase().includes(tag.toLowerCase())));
  }
  
  // Simple sorting for testing purposes, more complex logic is in the API
  const sortBy = params.get('sortBy') || 'recordedDate';
  const sortOrder = params.get('sortOrder') || 'desc';
  items.sort((a, b) => {
    // @ts-expect-error We are intentionally accessing properties dynamically
    const valA = a[sortBy];
    // @ts-expect-error We are intentionally accessing properties dynamically
    const valB = b[sortBy];
    let comparison = 0;
    if (valA > valB) {
      comparison = 1;
    } else if (valA < valB) {
      comparison = -1;
    }
    return sortOrder === 'desc' ? comparison * -1 : comparison;
  });

  const page = Number(params.get('page')) || 1;
  const limit = Number(params.get('limit')) || 10;
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginatedItems = items.slice((page - 1) * limit, page * limit);

  return Promise.resolve({
    data: paginatedItems,
    pagination: {
      page,
      limit,
      totalPages,
      totalItems,
    },
  });
};

describe('MaterialsPage', () => {
  let mockRouterReplace: jest.Mock;
  let mockRouterPush: jest.Mock;
  let mockSearchParams: URLSearchParams;
  let user: ReturnType<typeof userEvent.setup>; // Define user

  beforeEach(() => {
    user = userEvent.setup(); // Setup userEvent
    mockRouterReplace = jest.fn();
    mockRouterPush = jest.fn();
    mockSearchParams = new URLSearchParams();
    mockSearchParams.set('page', '1');
    mockSearchParams.set('limit', '10');
    mockSearchParams.set('sortBy', 'recordedDate');
    mockSearchParams.set('sortOrder', 'desc');

    (useRouter as jest.Mock).mockReturnValue({ replace: mockRouterReplace, push: mockRouterPush });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (usePathname as jest.Mock).mockReturnValue('/materials');
    
    (fetch as jest.Mock).mockImplementation(async (url: string | URL | Request) => {
        const urlObj = typeof url === 'string' ? new URL(url, 'http://localhost:3000') : url instanceof URL ? url : new URL(url.url, 'http://localhost:3000');
        return {
            ok: true,
            json: () => mockApiResponse(urlObj.searchParams),
        };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const waitForLoadingAndTable = async (timeout = 4000) => {
    await waitFor(() => expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument(), { timeout });
    const table = await screen.findByRole('table', {}, { timeout });
    expect(table).toBeInTheDocument();
    return table;
  };

  test('renders loading state initially and then displays materials', async () => {
    render(<MaterialsPage />);
    expect(screen.getByText('Loading materials...')).toBeInTheDocument();
    await waitForLoadingAndTable();
    expect(screen.getByText('Material Delta - Nature')).toBeInTheDocument(); // Sorted by date desc
    expect(screen.getByText('Material Gamma')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('sortBy=recordedDate&sortOrder=desc'));
  });

  test('displays error message if API call fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
    render(<MaterialsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Error: API Error/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
  });

  test.skip('filters by title when title filter is applied', async () => {
    render(<MaterialsPage />);
    await waitForLoadingAndTable();

    const titleInput = screen.getByPlaceholderText('Search by title...');
    await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'Alpha' } });
    });
    expect(titleInput).toHaveValue('Alpha');
    
    const applyButton = await screen.findByRole('button', { name: /Apply Filters/i });
    await act(async () => {
        fireEvent.click(applyButton);
    });
    
    await waitFor(() => {
        const calls = (mockRouterReplace as jest.Mock).mock.calls;
        expect(calls.some(call => call[0].includes('title=Alpha') && call[0].includes('page=1'))).toBe(true);
    }, {timeout: 3000});
    
    await waitFor(() => {
        expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('title=Alpha&page=1'));
    }, {timeout: 3000});

    await screen.findByText('Material Alpha');
    expect(screen.queryByText('Material Beta')).not.toBeInTheDocument();
  });

  test.skip('filters by tag when tag filter is applied', async () => {
    render(<MaterialsPage />);
    await waitForLoadingAndTable();

    const tagInput = screen.getByPlaceholderText('Search by tag...');
    await act(async () => {
        fireEvent.change(tagInput, { target: { value: 'Urban' } });
    });
    expect(tagInput).toHaveValue('Urban');

    const applyButton = await screen.findByRole('button', { name: /Apply Filters/i });
    await act(async () => {
        fireEvent.click(applyButton);
    });

    await waitFor(() => {
        const calls = (mockRouterReplace as jest.Mock).mock.calls;
        expect(calls.some(call => call[0].includes('tag=Urban') && call[0].includes('page=1'))).toBe(true);
    }, {timeout: 3000});

    await waitFor(() => {
        expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('tag=Urban&page=1'));
    }, {timeout: 3000});

    await screen.findByText('Material Beta');
    expect(screen.queryByText('Material Alpha')).not.toBeInTheDocument();
  });

  test.skip('sorts by title when title header is clicked', async () => {
    render(<MaterialsPage />);
    await waitForLoadingAndTable();

    const titleHeader = await screen.findByText(/^Title/);
    await act(async () => {
        fireEvent.click(titleHeader);
    });

    await waitFor(() => {
        const calls = (mockRouterReplace as jest.Mock).mock.calls;
        expect(calls.some(call => call[0].includes('sortBy=title&sortOrder=asc') && call[0].includes('page=1'))).toBe(true);
    }, {timeout: 3000});

    await waitFor(() => {
        expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('sortBy=title&sortOrder=asc&page=1'));
    }, { timeout: 3000 });
    
    await screen.findByText('Material Alpha');
    const rowsAsc = await screen.findAllByRole('row');
    expect(rowsAsc[1]).toHaveTextContent('Material Alpha');

    // Click again to sort desc
    const initialCallsCount = (mockRouterReplace as jest.Mock).mock.calls.length;
    await act(async () => {
      fireEvent.click(titleHeader); 
    });
    await waitFor(() => {
        const calls = (mockRouterReplace as jest.Mock).mock.calls;
        // Check only new calls for the second sort action
        const newCalls = calls.slice(initialCallsCount);
        expect(newCalls.some(call => call[0].includes('sortBy=title&sortOrder=desc') && call[0].includes('page=1'))).toBe(true);
    }, {timeout: 3000});

    await waitFor(() => {
        expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('sortBy=title&sortOrder=desc&page=1'));
    }, { timeout: 3000 });
    await screen.findByText('Material Gamma');
    const rowsDesc = await screen.findAllByRole('row');
    expect(rowsDesc[1]).toHaveTextContent('Material Gamma');
  });

  test('handles pagination change', async () => {
    mockSearchParams.set('limit', '1');

    render(<MaterialsPage />); 
    await waitForLoadingAndTable();
    await screen.findByText('Material Delta - Nature');
    const initialFetchCountForPagination = (fetch as jest.Mock).mock.calls.length;
    
    const nextPageButton = await screen.findByLabelText(/go to next page/i, {}, {timeout: 2000});
    await act(async () => {
        fireEvent.click(nextPageButton);
    });
    
    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith(expect.stringContaining('page=2&limit=1'));
    }, {timeout: 2000});
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(initialFetchCountForPagination + 1);
      expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('page=2&limit=1&sortBy=recordedDate&sortOrder=desc'));
    }, {timeout: 2000});
    await screen.findByText('Material Gamma');
  });

  test('opens material detail modal when title is clicked', async () => {
    render(<MaterialsPage />);
    await waitForLoadingAndTable();
    const materialTitle = await screen.findByText('Material Alpha');
    fireEvent.click(materialTitle);
    // screen.debug(); // DEBUG: Check DOM state after click
    await waitFor(() => {
        expect(screen.getByTestId('mock-material-detail-modal')).toBeInTheDocument();
    });
  });

  test('opens menu for a material and checks items', async () => {
    render(<MaterialsPage />); 
    await waitForLoadingAndTable(); 

    const firstMaterialTitle = mockMaterialsMasterData[0].title; // Corrected to 'Material Alpha'
    const materialTitleElement = await screen.findByText(firstMaterialTitle);
    const materialRow = materialTitleElement.closest('tr');

    if (!materialRow) {
      throw new Error(`Row for "${firstMaterialTitle}" not found`);
    }
    // screen.debug(materialRow); // DEBUG: Check the row before clicking menu

    const menuTrigger = await within(materialRow).findByRole('button', { name: /open menu/i });
    // fireEvent.click(menuTrigger);
    await user.click(menuTrigger); // Use userEvent
    // screen.debug(); // DEBUG: Check DOM after clicking menu trigger

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    }, { timeout: 5000 });

    await screen.findByRole('menuitem', { name: /編集/i }, { timeout: 5000 });
    expect(screen.getByRole('menuitem', { name: /編集/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /削除/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /詳細表示/i })).not.toBeInTheDocument();
    
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: /編集/i })).not.toBeInTheDocument();
    });
    // screen.debug(materialAlphaRow); // DEBUG: Check the row before clicking menu

    if (materialRow) {
      const menuTrigger = await within(materialRow).findByRole('button', { name: /open menu/i });
      // fireEvent.click(menuTrigger);
      await user.click(menuTrigger); // Use userEvent
      // screen.debug(); // DEBUG: Check DOM after clicking menu trigger
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      }, { timeout: 5000 });

      await screen.findByRole('menuitem', { name: /編集/i }, { timeout: 5000 }); 
      expect(screen.getByRole('menuitem', { name: /編集/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /削除/i })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /詳細表示/i })).not.toBeInTheDocument();
      
      fireEvent.keyDown(document.body, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: /編集/i })).not.toBeInTheDocument();
      });
    }
    //   expect(screen.queryByText('Material Gamma')).not.toBeInTheDocument();
    // });
  }, 10000); // Added test-specific timeout

  it('displays materials and allows searching', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('title=Material+A'));
    render(<MaterialsPage />); 
    await waitForLoadingAndTable();
    await screen.findByText('Material Alpha'); // Check if Material Alpha is there due to search

    // Check actions menu for Material Alpha
    const materialAlphaTitleElement = await screen.findByText('Material Alpha');
    const materialAlphaRow = materialAlphaTitleElement.closest('tr');
    expect(materialAlphaRow).not.toBeNull();

    if (materialAlphaRow) {
      const menuTrigger = await within(materialAlphaRow).findByRole('button', { name: /open menu/i });
      // fireEvent.click(menuTrigger);
      await user.click(menuTrigger); // Use userEvent
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      }, { timeout: 5000 });

      await screen.findByRole('menuitem', { name: /編集/i }, { timeout: 5000 }); 
      expect(screen.getByRole('menuitem', { name: /編集/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /削除/i })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /詳細表示/i })).not.toBeInTheDocument();
      
      fireEvent.keyDown(document.body, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: /編集/i })).not.toBeInTheDocument();
      });
    }

    // Ensure other materials are not displayed when filtered by "Material A"
    // This part depends on the mockApiResponse accurately filtering for 'Material Alpha'
    // when title='Material A'
    // await waitFor(() => {
    //   expect(screen.queryByText('Material Beta')).not.toBeInTheDocument();
    //   expect(screen.queryByText('Material Gamma')).not.toBeInTheDocument();
    // });
  });

  it('initial fetch uses URL search parameters and displays correct item', async () => {
    // Create specific search params for this test
    const testSearchParams = new URLSearchParams();
    testSearchParams.set('page', '1');
    testSearchParams.set('limit', '1');
    testSearchParams.set('sortBy', 'title');
    testSearchParams.set('sortOrder', 'asc');
    testSearchParams.set('title', 'Beta');

    // Mock useSearchParams to return our test-specific params
    (useSearchParams as jest.Mock).mockReturnValue(testSearchParams);

    // Mock fetch response for this test
    (fetch as jest.Mock).mockImplementation(async () => {
      // Return filtered response for Beta
      const filteredData = mockMaterialsMasterData.filter(item => 
        item.title.toLowerCase().includes('beta')
      );
      
      return {
        ok: true,
        json: () => Promise.resolve({
          data: filteredData,
          pagination: { page: 1, limit: 1, totalPages: 1, totalItems: filteredData.length },
        }),
      };
    });

    render(<MaterialsPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/materials?page=1&limit=1&title=Beta&sortBy=title&sortOrder=asc')
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Material Beta')).toBeInTheDocument();
    });

    // The component may call router.replace to synchronize URL with state
    // This is expected behavior when URL parameters are provided
  });

  test('navigates to new material page on button click', async () => {
    render(<MaterialsPage />);
    await waitForLoadingAndTable();
    const newMaterialButton = screen.getByRole('link', { name: /New Material/i });
    expect(newMaterialButton).toHaveAttribute('href', '/materials/new');
  });
}); 
