import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../form';

const TestForm = () => {
  const form = useForm({
    defaultValues: {
      testField: '',
    },
  });

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="testField"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Test Label</FormLabel>
              <FormControl>
                <input {...field} placeholder="Test input" />
              </FormControl>
              <FormDescription>This is a test description</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

describe('Form Components', () => {
  it('renders form with all components', () => {
    render(<TestForm />);
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('renders FormItem with custom className', () => {
    const TestComponent = () => {
      const form = useForm();
      return (
        <Form {...form}>
          <FormItem className="custom-form-item" data-testid="form-item">
            <FormLabel>Label</FormLabel>
          </FormItem>
        </Form>
      );
    };
    
    render(<TestComponent />);
    expect(screen.getByTestId('form-item')).toHaveClass('custom-form-item');
  });

  it('renders FormLabel with custom className', () => {
    const TestComponent = () => {
      const form = useForm();
      return (
        <Form {...form}>
          <FormLabel className="custom-label" data-testid="form-label">
            Custom Label
          </FormLabel>
        </Form>
      );
    };
    
    render(<TestComponent />);
    expect(screen.getByTestId('form-label')).toHaveClass('custom-label');
  });

  it('renders FormDescription with custom className', () => {
    const TestComponent = () => {
      const form = useForm();
      return (
        <Form {...form}>
          <FormDescription className="custom-desc" data-testid="form-desc">
            Custom Description
          </FormDescription>
        </Form>
      );
    };
    
    render(<TestComponent />);
    expect(screen.getByTestId('form-desc')).toHaveClass('custom-desc');
  });

  it('renders FormMessage with custom className', () => {
    const TestComponent = () => {
      const form = useForm();
      return (
        <Form {...form}>
          <FormMessage className="custom-message" data-testid="form-message">
            Error message
          </FormMessage>
        </Form>
      );
    };
    
    render(<TestComponent />);
    expect(screen.getByTestId('form-message')).toHaveClass('custom-message');
  });
});