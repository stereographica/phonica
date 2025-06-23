import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '../alert';

describe('Alert', () => {
  it('renders with default variant', () => {
    render(
      <Alert>
        <AlertDescription>Default alert message</AlertDescription>
      </Alert>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('bg-background', 'text-foreground');
    expect(screen.getByText('Default alert message')).toBeInTheDocument();
  });

  it('renders with destructive variant', () => {
    render(
      <Alert variant="destructive">
        <AlertDescription>Error message</AlertDescription>
      </Alert>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('border-destructive/50', 'text-destructive');
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(
      <Alert className="custom-class">
        <AlertDescription>Alert with custom class</AlertDescription>
      </Alert>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-class');
  });

  it('renders with all components', () => {
    render(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>Alert description text</AlertDescription>
      </Alert>,
    );

    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('Alert description text')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(
      <Alert>
        <svg data-testid="alert-icon">Icon</svg>
        <AlertDescription>Alert with icon</AlertDescription>
      </Alert>,
    );

    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    expect(screen.getByText('Alert with icon')).toBeInTheDocument();
  });

  it('forwards props to Alert component', () => {
    render(
      <Alert data-testid="custom-alert" id="test-alert">
        <AlertDescription>Alert with props</AlertDescription>
      </Alert>,
    );

    const alert = screen.getByTestId('custom-alert');
    expect(alert).toHaveAttribute('id', 'test-alert');
  });
});

describe('AlertTitle', () => {
  it('renders title text', () => {
    render(<AlertTitle>Important Notice</AlertTitle>);

    const title = screen.getByText('Important Notice');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H5');
  });

  it('applies correct styles', () => {
    render(<AlertTitle>Styled Title</AlertTitle>);

    const title = screen.getByText('Styled Title');
    expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight');
  });

  it('accepts custom className', () => {
    render(<AlertTitle className="custom-title">Custom Title</AlertTitle>);

    const title = screen.getByText('Custom Title');
    expect(title).toHaveClass('custom-title');
  });
});

describe('AlertDescription', () => {
  it('renders description text', () => {
    render(<AlertDescription>This is a description</AlertDescription>);

    const description = screen.getByText('This is a description');
    expect(description).toBeInTheDocument();
  });

  it('applies correct styles', () => {
    render(<AlertDescription>Styled Description</AlertDescription>);

    const description = screen.getByText('Styled Description');
    expect(description).toHaveClass('text-sm');
  });

  it('accepts custom className', () => {
    render(<AlertDescription className="custom-description">Custom Description</AlertDescription>);

    const description = screen.getByText('Custom Description');
    expect(description).toHaveClass('custom-description');
  });

  it('renders with nested elements', () => {
    render(
      <AlertDescription>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
      </AlertDescription>,
    );

    expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
  });
});
