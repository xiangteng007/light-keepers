import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthProvider } from '../context/AuthContext';

describe('Layout Component', () => {
    it('renders the sidebar with navigation items', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Layout />
                </AuthProvider>
            </BrowserRouter>
        );

        // Check for navigation items visible at default role level (0 = not logged in)
        // Only items with requiredLevel <= 0 are visible to non-authenticated users
        expect(screen.getByText('儀表板')).toBeInTheDocument(); // requiredLevel: 0
        expect(screen.getByText('災害示警')).toBeInTheDocument(); // requiredLevel: 0
        expect(screen.getByText('地圖總覽')).toBeInTheDocument(); // requiredLevel: 0
        expect(screen.getByText('實務手冊')).toBeInTheDocument(); // requiredLevel: 0
        expect(screen.getByText('氣象預報')).toBeInTheDocument(); // requiredLevel: 0
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

