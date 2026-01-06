import React from 'react';
import type { PresenceUser } from '../../hooks/useOverlayCollaboration';
import './OnlineUsersIndicator.css';

interface OnlineUsersIndicatorProps {
    users: PresenceUser[];
    isConnected: boolean;
    maxVisible?: number;
}

export const OnlineUsersIndicator: React.FC<OnlineUsersIndicatorProps> = ({
    users,
    isConnected,
    maxVisible = 5,
}) => {
    const visibleUsers = users.slice(0, maxVisible);
    const overflowCount = Math.max(0, users.length - maxVisible);

    return (
        <div className="oui-container">
            <div className={`oui-status ${isConnected ? 'connected' : 'disconnected'}`}>
                <span className="oui-status-dot" />
                <span className="oui-status-text">
                    {isConnected ? '即時連線' : '離線'}
                </span>
            </div>

            {users.length > 0 && (
                <div className="oui-users">
                    <div className="oui-avatars">
                        {visibleUsers.map((user, index) => (
                            <div
                                key={user.oderId}
                                className="oui-avatar"
                                style={{
                                    backgroundColor: user.color,
                                    zIndex: visibleUsers.length - index,
                                }}
                                title={user.userName}
                            >
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.userName} />
                                ) : (
                                    <span>{user.userName.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                        ))}
                        {overflowCount > 0 && (
                            <div className="oui-avatar oui-avatar--overflow">
                                +{overflowCount}
                            </div>
                        )}
                    </div>
                    <span className="oui-count">
                        {users.length} 人在線
                    </span>
                </div>
            )}
        </div>
    );
};

export default OnlineUsersIndicator;
