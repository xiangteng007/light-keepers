import type { CSSProperties } from 'react';
import {
    TaskStatus,
    TaskPriority,
    TaskCategory,
} from '../../services/taskDispatchApi';
import type { DispatchTask } from '../../services/taskDispatchApi';
import {
    SirenIcon,
    AedIcon,
    InventoryIcon,
    RadioIcon,
    ShelterIcon,
    AuditIcon,
    DocEmptyIcon,
    LocationIcon,
    TeamsIcon,
    ClockIcon,
    CheckIcon,
    CloseIcon,
    UserIcon,
    type LkIcon,
} from '../../design-system/icons';
import './TaskCard.css';

interface TaskCardProps {
    task: DispatchTask;
    isMyTask?: boolean;
    onAccept?: (taskId: string) => void;
    onDecline?: (taskId: string) => void;
    onStart?: (taskId: string) => void;
    onComplete?: (taskId: string) => void;
    onCancel?: (taskId: string) => void;
    onAssign?: (taskId: string) => void;
    onClick?: (task: DispatchTask) => void;
}

const PRIORITY_COLORS: Record<number, string> = {
    [TaskPriority.LOW]: '#4ade80',
    [TaskPriority.MEDIUM]: '#facc15',
    [TaskPriority.HIGH]: '#fb923c',
    [TaskPriority.CRITICAL]: '#ef4444',
    [TaskPriority.EMERGENCY]: '#dc2626',
};

const PRIORITY_LABELS: Record<number, string> = {
    [TaskPriority.LOW]: '低',
    [TaskPriority.MEDIUM]: '中',
    [TaskPriority.HIGH]: '高',
    [TaskPriority.CRITICAL]: '危急',
    [TaskPriority.EMERGENCY]: '緊急',
};

const STATUS_LABELS: Record<string, string> = {
    [TaskStatus.DRAFT]: '草稿',
    [TaskStatus.PENDING]: '待指派',
    [TaskStatus.ASSIGNED]: '已指派',
    [TaskStatus.ACCEPTED]: '已接受',
    [TaskStatus.IN_PROGRESS]: '進行中',
    [TaskStatus.COMPLETED]: '已完成',
    [TaskStatus.CANCELLED]: '已取消',
};

const CATEGORY_LABELS: Record<string, string> = {
    [TaskCategory.RESCUE]: '救援',
    [TaskCategory.MEDICAL]: '醫療',
    [TaskCategory.LOGISTICS]: '後勤',
    [TaskCategory.COMMUNICATION]: '通訊',
    [TaskCategory.EVACUATION]: '疏散',
    [TaskCategory.ASSESSMENT]: '評估',
    [TaskCategory.OTHER]: '其他',
};

/** 任務類別 → B3c 教範圖例（R5/T5c） */
const CATEGORY_ICONS: Record<string, LkIcon> = {
    [TaskCategory.RESCUE]: SirenIcon,
    [TaskCategory.MEDICAL]: AedIcon,
    [TaskCategory.LOGISTICS]: InventoryIcon,
    [TaskCategory.COMMUNICATION]: RadioIcon,
    [TaskCategory.EVACUATION]: ShelterIcon,
    [TaskCategory.ASSESSMENT]: AuditIcon,
    [TaskCategory.OTHER]: DocEmptyIcon,
};

/** 行內 icon 統一對齊字級的內距（14px 對應 13px 上下的行內文字） */
const inlineIconStyle: CSSProperties = { verticalAlign: 'text-bottom', marginRight: 4 };

/**
 * Task Card Component for displaying dispatch tasks
 */
export function TaskCard({
    task,
    isMyTask = false,
    onAccept,
    onDecline,
    onStart,
    onComplete,
    onCancel,
    onAssign,
    onClick,
}: TaskCardProps) {
    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return '剛剛';
        if (diffMins < 60) return `${diffMins}分鐘前`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小時前`;
        return date.toLocaleDateString('zh-TW');
    };

    const CategoryIcon = CATEGORY_ICONS[task.category];
    const myAssignment = task.assignments?.find((a) => a.status !== 'cancelled');
    const isPending = myAssignment?.status === 'pending';
    const isAccepted = task.status === TaskStatus.ACCEPTED;
    const isInProgress = task.status === TaskStatus.IN_PROGRESS;

    return (
        <div
            className={`task-card priority-${task.priority} status-${task.status}`}
            onClick={() => onClick?.(task)}
        >
            {/* Header */}
            <div className="task-header">
                <span
                    className="priority-badge"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] || '#888' }}
                >
                    {PRIORITY_LABELS[task.priority] || '未知'}
                </span>
                <span className="task-category">
                    {CategoryIcon && <CategoryIcon size={14} aria-hidden="true" style={inlineIconStyle} />}
                    {CATEGORY_LABELS[task.category] || task.category}
                </span>
                <span className="task-time">{formatTime(task.createdAt)}</span>
            </div>

            {/* Title & Description */}
            <div className="task-content">
                <h4 className="task-title">{task.title}</h4>
                {task.description && (
                    <p className="task-description">{task.description}</p>
                )}
            </div>

            {/* Location */}
            {task.locationDescription && (
                <div className="task-location">
                    <LocationIcon size={14} aria-hidden="true" style={inlineIconStyle} />
                    {task.locationDescription}
                </div>
            )}

            {/* Requirements */}
            {(task.requiredSkills.length > 0 || task.requiredResources.length > 0) && (
                <div className="task-requirements">
                    {task.requiredSkills.length > 0 && (
                        <div className="requirement-tags">
                            {task.requiredSkills.map((skill) => (
                                <span key={skill} className="skill-tag">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Status & Assignments */}
            <div className="task-footer">
                <span className={`status-badge status-${task.status}`}>
                    {STATUS_LABELS[task.status] || task.status}
                </span>
                {task.assignments?.length > 0 && (
                    <span className="assignment-count">
                        <TeamsIcon size={14} aria-hidden="true" style={inlineIconStyle} />
                        {task.assignments.length}人
                    </span>
                )}
                {task.estimatedDurationMin && (
                    <span className="duration">
                        <ClockIcon size={14} aria-hidden="true" style={inlineIconStyle} />
                        {task.estimatedDurationMin}分鐘
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="task-actions">
                {/* My task actions */}
                {isMyTask && isPending && (
                    <>
                        <button
                            className="btn-accept"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAccept?.(task.id);
                            }}
                        >
                            <CheckIcon size={14} aria-hidden="true" style={inlineIconStyle} />
                            接受
                        </button>
                        <button
                            className="btn-decline"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDecline?.(task.id);
                            }}
                        >
                            <CloseIcon size={14} aria-hidden="true" style={inlineIconStyle} />
                            拒絕
                        </button>
                    </>
                )}
                {isMyTask && isAccepted && (
                    <button
                        className="btn-start"
                        onClick={(e) => {
                            e.stopPropagation();
                            onStart?.(task.id);
                        }}
                    >
                        開始執行
                    </button>
                )}
                {isMyTask && isInProgress && (
                    <button
                        className="btn-complete"
                        onClick={(e) => {
                            e.stopPropagation();
                            onComplete?.(task.id);
                        }}
                    >
                        <CheckIcon size={14} aria-hidden="true" style={inlineIconStyle} />
                        完成
                    </button>
                )}

                {/* Officer actions */}
                {!isMyTask && task.status === TaskStatus.DRAFT && onAssign && (
                    <button
                        className="btn-assign"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAssign(task.id);
                        }}
                    >
                        <UserIcon size={14} aria-hidden="true" style={inlineIconStyle} />
                        指派
                    </button>
                )}
                {!isMyTask && task.status !== TaskStatus.COMPLETED &&
                    task.status !== TaskStatus.CANCELLED && onCancel && (
                        <button
                            className="btn-cancel"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCancel(task.id);
                            }}
                        >
                            取消
                        </button>
                    )}
            </div>
        </div>
    );
}

export default TaskCard;
