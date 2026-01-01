import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthProvider } from '../context/AuthContext';

describe('Layout Component', () => {
    it('renders the sidebar with navigation groups', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Layout />
                </AuthProvider>
            </BrowserRouter>
        );

        // Check for navigation group labels visible at default role level (0 = not logged in)
        // Groups with minLevel <= 0 are visible to non-authenticated users
        expect(screen.getByText('總覽')).toBeInTheDocument(); // minLevel: 0
        expect(screen.getByText('災情中心')).toBeInTheDocument(); // minLevel: 0
        expect(screen.getByText('知識庫')).toBeInTheDocument(); // minLevel: 0
    });

    it('renders the Light Keepers logo', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Layout />
                </AuthProvider>
            </BrowserRouter>
        );

        // Multiple occurrences: sidebar logo + mobile header
        expect(screen.getAllByText('Light Keepers').length).toBeGreaterThan(0);
        expect(screen.getByText('曦望燈塔')).toBeInTheDocument();
    });
});

