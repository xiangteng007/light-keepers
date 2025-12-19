export default function EventsPage() {
    const events = [
        { id: 1, title: '光復路積水達50公分', category: '淹水', severity: 4, status: 'active', time: '10分鐘前' },
        { id: 2, title: '大進路樹木倒塌', category: '道路中斷', severity: 3, status: 'active', time: '25分鐘前' },
        { id: 3, title: '社區需要沙包支援', category: '物資需求', severity: 2, status: 'resolved', time: '1小時前' },
        { id: 4, title: '民宅屋頂受損', category: '建物損壞', severity: 4, status: 'active', time: '2小時前' },
    ]

    return (
        <div className="page events-page">
            <div className="page-header">
                <h2>災情事件</h2>
                <button className="btn-primary">+ 新增事件</button>
            </div>

            <div className="filter-bar">
                <select className="filter-select">
                    <option value="">所有狀態</option>
                    <option value="active">進行中</option>
                    <option value="resolved">已解決</option>
                </select>
                <select className="filter-select">
                    <option value="">所有類別</option>
                    <option value="flood">淹水</option>
                    <option value="road">道路中斷</option>
                    <option value="building">建物損壞</option>
                    <option value="supplies">物資需求</option>
                </select>
                <input type="text" className="filter-search" placeholder="搜尋事件..." />
            </div>

            <div className="events-table">
                <table>
                    <thead>
                        <tr>
                            <th>嚴重度</th>
                            <th>事件標題</th>
                            <th>類別</th>
                            <th>狀態</th>
                            <th>時間</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map((event) => (
                            <tr key={event.id}>
                                <td>
                                    <span className={`severity severity-${event.severity}`}>
                                        {'★'.repeat(event.severity)}
                                    </span>
                                </td>
                                <td>{event.title}</td>
                                <td><span className="category-tag">{event.category}</span></td>
                                <td>
                                    <span className={`status status-${event.status}`}>
                                        {event.status === 'active' ? '進行中' : '已解決'}
                                    </span>
                                </td>
                                <td>{event.time}</td>
                                <td>
                                    <button className="btn-small">查看</button>
                                    <button className="btn-small">分派任務</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
