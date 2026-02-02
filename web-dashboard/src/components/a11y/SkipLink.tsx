/**
 * SkipLink.tsx
 * 
 * Accessibility Skip Link Component
 * Per Expert Council Navigation Design §6.1
 * 
 * Allows keyboard users to skip directly to main content
 */
import './SkipLink.css';

interface SkipLinkProps {
    targetId?: string;
    label?: string;
}

export default function SkipLink({ 
    targetId = 'main-content',
    label = '跳至主要內容'
}: SkipLinkProps) {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
            target.focus();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <a 
            href={`#${targetId}`}
            className="skip-link"
            onClick={handleClick}
        >
            {label}
        </a>
    );
}
