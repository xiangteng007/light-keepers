import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AppShellLayout from '../components/layout/AppShellLayout';
import { AuthProvider } from '../context/AuthContext';
import { PermissionLevel } from '../components/layout/widget.types';

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
    const mod = await importOriginal<typeof import('lucide-react')>()
    return {
        ...mod,
    }
})

describe('AppShellLayout Component', () => {
    it('renders the header with LIGHTKEEPERS branding', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <AppShellLayout userLevel={PermissionLevel.SystemOwner} pageId="test">
                        <div>Test Content</div>
                    </AppShellLayout>
                </AuthProvider>
            </BrowserRouter>
        );

        // Check for the header branding
        expect(screen.getByText('LIGHTKEEPERS')).toBeInTheDocument();
    });

    it('renders the sidebar navigation', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <AppShellLayout userLevel={PermissionLevel.SystemOwner} pageId="test">
                        <div>Test Content</div>
                    </AppShellLayout>
                </AuthProvider>
            </BrowserRouter>
        );

        // Check that sidebar exists by looking for the navigation structure
        // The sidebar should have navigation items
        const sidebar = document.querySelector('.sidebar');
        expect(sidebar).toBeInTheDocument();
    });

    it('renders child content correctly', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <AppShellLayout userLevel={PermissionLevel.SystemOwner} pageId="test">
                        <div data-testid="test-content">Hello World</div>
                    </AppShellLayout>
                </AuthProvider>
            </BrowserRouter>
        );

        expect(screen.getByTestId('test-content')).toBeInTheDocument();
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
});
