export default function TasksPage() {
    const tasks = {
        pending: [
            { id: 1, title: '清理光復路積水', priority: 5, assignee: '待分派' },
            { id: 2, title: '運送沙包至社區', priority: 3, assignee: '待分派' },
        ],
        inProgress: [
            { id: 3, title: '移除大進路倒木', priority: 4, assignee: '王志工' },
            { id: 4, title: '巡視災區評估損失', priority: 3, assignee: '李隊長' },
        ],
        completed: [
            { id: 5, title: '協助居民撤離', priority: 5, assignee: '張志工' },
        ],
    }

    return (
        <div className="page tasks-page">
            <div className="page-header">
                <h2>任務管理</h2>
                <button className="btn-primary">+ 新增任務</button>
            </div>

            <div className="task-board">
                <div className="task-column">
                    <div className="column-header pending">
                        <span>待處理</span>
                        <span className="count">{tasks.pending.length}</span>
                    </div>
                    <div className="task-list">
                        {tasks.pending.map((task) => (
                            <div key={task.id} className="task-card">
                                <div className="task-priority">P{task.priority}</div>
                                <div className="task-title">{task.title}</div>
                                <div className="task-assignee">{task.assignee}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="task-column">
                    <div className="column-header in-progress">
                        <span>進行中</span>
                        <span className="count">{tasks.inProgress.length}</span>
                    </div>
                    <div className="task-list">
                        {tasks.inProgress.map((task) => (
                            <div key={task.id} className="task-card">
                                <div className="task-priority">P{task.priority}</div>
                                <div className="task-title">{task.title}</div>
                                <div className="task-assignee">{task.assignee}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="task-column">
                    <div className="column-header completed">
                        <span>已完成</span>
                        <span className="count">{tasks.completed.length}</span>
                    </div>
                    <div className="task-list">
                        {tasks.completed.map((task) => (
                            <div key={task.id} className="task-card completed">
                                <div className="task-priority">P{task.priority}</div>
                                <div className="task-title">{task.title}</div>
                                <div className="task-assignee">{task.assignee}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
