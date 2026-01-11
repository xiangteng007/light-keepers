/**
 * PageTemplate.tsx
 * 
 * P9: Reusable Page Template for Placeholder Pages
 * Uses consistent styling with the tactical UI theme
 */
import React from 'react';
import { LucideIcon, Construction } from 'lucide-react';
import './PageTemplate.css';

interface PageTemplateProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    domain?: string;
    children?: React.ReactNode;
}

export function PageTemplate({
    title,
    subtitle,
    icon: Icon = Construction,
    domain,
    children
}: PageTemplateProps) {
    return (
        <div className="page-template">
            <div className="page-template__header">
                <div className="page-template__icon">
                    <Icon size={32} />
                </div>
                <div className="page-template__title-group">
                    {domain && (
                        <span className="page-template__domain">{domain}</span>
                    )}
                    <h1 className="page-template__title">{title}</h1>
                    {subtitle && (
                        <p className="page-template__subtitle">{subtitle}</p>
                    )}
                </div>
            </div>

            <div className="page-template__content">
                {children || (
                    <div className="page-template__placeholder">
                        <Construction size={48} />
                        <h2>頁面建置中</h2>
                        <p>此功能模組正在開發中，敬請期待</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PageTemplate;
