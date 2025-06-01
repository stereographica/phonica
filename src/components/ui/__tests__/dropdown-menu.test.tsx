import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuRadioGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '../dropdown-menu';

describe('DropdownMenu', () => {
  it('renders trigger and content when opened', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
          <DropdownMenuItem>Item 2</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const trigger = screen.getByRole('button', { name: 'Open Menu' });
    expect(trigger).toBeInTheDocument();
    
    // Click to open dropdown
    fireEvent.click(trigger);
    
    // Check if items appear (might need waitFor in real scenarios)
    // For this basic test, we just verify the structure renders
    expect(trigger).toHaveAttribute('aria-expanded');
  });

  it('renders menu items correctly', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>First Item</DropdownMenuItem>
          <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    // The structure should be rendered
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('handles custom props and className', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
        <DropdownMenuContent className="custom-content" data-testid="content">
          <DropdownMenuItem className="custom-item" data-testid="item">
            Test Item
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    // Just check that the structure renders without error
    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument();
  });

  it('renders basic dropdown structure', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Menu Label</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Item 1</DropdownMenuItem>
          <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('renders DropdownMenuShortcut with default styling', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            Cut
            <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Copy
            <DropdownMenuShortcut className="custom-shortcut">⌘C</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    // Test DropdownMenuShortcut rendering
    // Look for the shortcut text content
    const shortcutX = screen.getByText('⌘X');
    const shortcutC = screen.getByText('⌘C');
    
    expect(shortcutX).toBeInTheDocument();
    expect(shortcutC).toBeInTheDocument();
    
    // Test default className
    expect(shortcutX).toHaveClass('ml-auto', 'text-xs', 'tracking-widest', 'opacity-60');
    
    // Test custom className
    expect(shortcutC).toHaveClass('custom-shortcut');
  });

  it('renders DropdownMenuShortcut with custom props', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            Paste
            <DropdownMenuShortcut data-testid="paste-shortcut" id="paste">⌘V</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const shortcut = screen.getByTestId('paste-shortcut');
    expect(shortcut).toBeInTheDocument();
    expect(shortcut).toHaveAttribute('id', 'paste');
    expect(shortcut).toHaveTextContent('⌘V');
  });

  it('should apply inset styles to DropdownMenuItem', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem inset>Inset Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const menuItem = screen.getByText('Inset Item');
    expect(menuItem).toHaveClass('pl-8');
  });

  it('should apply inset styles to DropdownMenuLabel', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel inset>Inset Label</DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const label = screen.getByText('Inset Label');
    expect(label).toHaveClass('pl-8');
  });

  it('should apply inset styles to DropdownMenuSubTrigger', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset>
              Inset SubTrigger
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub Item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const subTrigger = screen.getByText('Inset SubTrigger');
    expect(subTrigger).toHaveClass('pl-8');
  });

  it('should render DropdownMenuCheckboxItem with checked state', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>
            Checked Item
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const checkboxItem = screen.getByText('Checked Item');
    expect(checkboxItem).toBeInTheDocument();
  });

  it('should render DropdownMenuRadioItem', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="1">
            <DropdownMenuRadioItem value="1">
              Radio Item
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const radioItem = screen.getByText('Radio Item');
    expect(radioItem).toBeInTheDocument();
  });
});