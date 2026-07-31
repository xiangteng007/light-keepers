/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
/**
 * Voice Call Page
 * WebRTC voice communication interface with LINE integration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import './VoiceCallPage.css';

interface OnlineUser {
    id: string;
    name: string;
    status: 'available' | 'busy' | 'offline';
}

interface CallState {
    callId: string | null;
    status: 'idle' | 'ringing' | 'connecting' | 'active' | 'ended';
    participants: string[];
    isMuted: boolean;
    isDeafened: boolean;
}

const VoiceCallPage: React.FC = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [callState, setCallState] = useState<CallState>({
        callId: null,
        status: 'idle',
        participants: [],
        isMuted: false,
        isDeafened: false,
    });
    const [incomingCall, setIncomingCall] = useState<{
        callId: string;
        callerName: string;
    } | null>(null);

    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    // ICE servers configuration
    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ],
    };

    // ==================== Socket Connection ====================

    useEffect(() => {
        const newSocket = io('/voice', {
            transports: ['websocket'],
        });

        newSocket.on('connect', () => {
            setConnected(true);
            // Register with current user info
            const userId = localStorage.getItem('userId') || `user-${Date.now()}`;
            const userName = localStorage.getItem('userName') || '匿名使用者';
            newSocket.emit('register', { userId, name: userName });
        });

        newSocket.on('disconnect', () => {
            setConnected(false);
        });

        newSocket.on('user-online', (data: { userId: string; name: string }) => {
            setOnlineUsers(prev => {
                const existing = prev.find(u => u.id === data.userId);
                if (existing) return prev;
                return [...prev, { id: data.userId, name: data.name, status: 'available' }];
            });
        });

        newSocket.on('user-offline', (data: { userId: string }) => {
            setOnlineUsers(prev => prev.filter(u => u.id !== data.userId));
        });

        // Call events
        newSocket.on('incoming-call', (data) => {
            setIncomingCall({
                callId: data.callId,
                callerName: data.callerName,
            });
        });

        newSocket.on('call-ringing', (data) => {
            setCallState(prev => ({ ...prev, callId: data.callId, status: 'ringing' }));
        });

        newSocket.on('call-connected', (data) => {
            setCallState(prev => ({
                ...prev,
                status: 'active',
                participants: data.participants
            }));
            setIncomingCall(null);
        });

        newSocket.on('call-ended', () => {
            endCall(false);
        });

        newSocket.on('call-failed', (data) => {
            alert(`通話失敗: ${data.reason}`);
            setCallState(prev => ({ ...prev, status: 'idle', callId: null }));
        });

        // WebRTC signaling
        newSocket.on('offer', handleOffer);
        newSocket.on('answer', handleAnswer);
        newSocket.on('ice-candidate', handleIceCandidate);

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // ==================== WebRTC Handling ====================

    const setupPeerConnection = useCallback(async () => {
        const pc = new RTCPeerConnection(iceServers);
        peerConnectionRef.current = pc;

        // Get local audio stream
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
        } catch (error) {
            console.error('Failed to get audio stream:', error);
            alert('無法存取麥克風');
            return null;
        }

        // Handle remote stream
        pc.ontrack = (event) => {
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = event.streams[0];
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socket && callState.callId) {
                socket.emit('ice-candidate', {
                    callId: callState.callId,
                    targetUserId: callState.participants.find(p => p !== localStorage.getItem('userId')),
                    candidate: event.candidate,
                });
            }
        };

        return pc;
    }, [socket, callState]);

    const handleOffer = useCallback(async (data: { callId: string; offer: RTCSessionDescriptionInit; fromUserId: string }) => {
        const pc = await setupPeerConnection();
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket?.emit('answer', {
            callId: data.callId,
            targetUserId: data.fromUserId,
            answer,
        });
    }, [socket, setupPeerConnection]);

    const handleAnswer = useCallback(async (data: { answer: RTCSessionDescriptionInit }) => {
        if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(data.answer)
            );
        }
    }, []);

    const handleIceCandidate = useCallback(async (data: { candidate: RTCIceCandidateInit }) => {
        if (peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(data.candidate)
            );
        }
    }, []);

    // ==================== Call Actions ====================

    const initiateCall = async (targetUserId: string) => {
        if (!socket) return;

        socket.emit('call-initiate', {
            targetUserId,
            type: 'individual',
        });

        const pc = await setupPeerConnection();
        if (!pc) return;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for call to be accepted before sending offer
        setCallState(prev => ({ ...prev, status: 'connecting' }));
    };

    const acceptCall = async () => {
        if (!socket || !incomingCall) return;

        socket.emit('call-accept', { callId: incomingCall.callId });
        setCallState(prev => ({
            ...prev,
            callId: incomingCall.callId,
            status: 'connecting'
        }));
    };

    const rejectCall = () => {
        if (!socket || !incomingCall) return;

        socket.emit('call-reject', { callId: incomingCall.callId });
        setIncomingCall(null);
    };

    const endCall = (notify = true) => {
        if (notify && socket && callState.callId) {
            socket.emit('call-end', { callId: callState.callId });
        }

        // Cleanup
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }

        setCallState({
            callId: null,
            status: 'idle',
            participants: [],
            isMuted: false,
            isDeafened: false,
        });
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
            }
        }
    };

    const initiateLineCall = async (userId: string) => {
        try {
            const response = await fetch('/api/voice/call/line', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lineUserId: userId,
                    callerId: localStorage.getItem('userId'),
                }),
            });
            const data = await response.json();
            if (data.success) {
                alert('通話邀請已發送至 LINE');
            }
        } catch (error) {
            console.error('Failed to initiate LINE call:', error);
        }
    };

    // ==================== Render ====================

    return (
        <div className="voice-call-page">
            <header className="voice-header">
                <h1>📞 語音通話</h1>
                <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
                    {connected ? '🟢 已連線' : '🔴 未連線'}
                </span>
            </header>

            {/* Incoming Call Modal */}
            {incomingCall && (
                <div className="incoming-call-modal">
                    <div className="modal-content">
                        <div className="caller-avatar">📞</div>
                        <h2>來電</h2>
                        <p>{incomingCall.callerName}</p>
                        <div className="call-actions">
                            <button className="accept-btn" onClick={acceptCall}>
                                ✅ 接聽
                            </button>
                            <button className="reject-btn" onClick={rejectCall}>
                                ❌ 拒絕
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Call UI */}
            {callState.status === 'active' && (
                <div className="active-call">
                    <div className="call-info">
                        <span className="call-status">🔊 通話中</span>
                        <span className="participant-count">
                            {callState.participants.length} 位參與者
                        </span>
                    </div>
                    <div className="call-controls">
                        <button
                            className={`control-btn ${callState.isMuted ? 'active' : ''}`}
                            onClick={toggleMute}
                        >
                            {callState.isMuted ? '🔇' : '🔊'}
                            {callState.isMuted ? '取消靜音' : '靜音'}
                        </button>
                        <button className="control-btn end" onClick={() => endCall()}>
                            📴 結束通話
                        </button>
                    </div>
                </div>
            )}

            {/* Online Users */}
            <section className="users-section">
                <h2>線上使用者</h2>
                {onlineUsers.length === 0 ? (
                    <p className="no-users">目前沒有其他線上使用者</p>
                ) : (
                    <ul className="users-list">
                        {onlineUsers.map(user => (
                            <li key={user.id} className="user-item">
                                <span className={`status-dot ${user.status}`} />
                                <span className="user-name">{user.name}</span>
                                <div className="user-actions">
                                    <button
                                        className="call-btn"
                                        onClick={() => initiateCall(user.id)}
                                        disabled={user.status !== 'available' || callState.status !== 'idle'}
                                    >
                                        📞 通話
                                    </button>
                                    <button
                                        className="line-btn"
                                        onClick={() => initiateLineCall(user.id)}
                                    >
                                        💚 LINE
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Hidden audio element for remote stream */}
            <audio ref={remoteAudioRef} autoPlay />
        </div>
    );
};

export default VoiceCallPage;
