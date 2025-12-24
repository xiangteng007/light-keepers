import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';

describe('Layout Component', () => {
    it('renders the sidebar with navigation items', () => {
        render(
            <BrowserRouter>
                <Layout />
            </BrowserRouter>
        );

        // Check for main navigation items
        expect(screen.getByText('儀表板')).toBeInTheDocument();
        expect(screen.getByText('數據分析')).toBeInTheDocument();
        expect(screen.getByText('回報系統')).toBeInTheDocument();
        expect(screen.getByText('志工管理')).toBeInTheDocument();
        expect(screen.getByText('物資管理')).toBeInTheDocument();
    });

    it('renders the Light Keepers logo', () => {
        render(
            <BrowserRouter>
                <Layout />
            </BrowserRouter>
        );

        // Multiple occurrences: sidebar logo + mobile header
        expect(screen.getAllByText('Light Keepers').length).toBeGreaterThan(0);
        expect(screen.getByText('曦望燈塔')).toBeInTheDocument();
    });
});
