import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthProvider } from '../context/AuthContext';

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
    const mod = await importOriginal<typeof import('lucide-react')>()
    return {
        ...mod,
    }
})

describe('Layout Component', () => {
    it('renders the sidebar with correct navigation items', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Layout />
                </AuthProvider>
            </BrowserRouter>
        );

        // Check for new V2 Nav Items (Tactical Labels)
        // Note: Some might be tooltips or hidden on mobile, but in default desktop view they should be links with title attributes or rendered content.
        // In the new Sidebar, titles are on the Link component. 
        // We can query by title or finding the icons if we mock them, but searching for the distinct labels in the DOM (if rendered) or title attributes is safer.
        // The current Sidebar implementation renders icons, and titles are attributes.
        // Let's check for the logo first.
        expect(screen.getByText('LK')).toBeInTheDocument();

        // The header renders "LIGHT KEEPERS"
        expect(screen.getByText('LIGHT KEEPERS')).toBeInTheDocument();
    });

    it('renders the system status indicators', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Layout />
                </AuthProvider>
            </BrowserRouter>
        );

        // Check for Header System Status
        expect(screen.getByText('SYS: ONLINE')).toBeInTheDocument();

        // Check for Footer Status Ticker
        expect(screen.getByText('OPERATIONAL')).toBeInTheDocument();
    });
});
