import { useState, useEffect } from 'react';

interface OrgNode {
    id: string;
    name: string;
    title: string;
    department: string;
    children?: OrgNode[];
}

export default function OrgChartPage() {
    const [orgData, setOrgData] = useState<OrgNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    useEffect(() => {
        const mockOrg: OrgNode = {
            id: '1', name: 'Director Chen', title: 'Chief Coordinator', department: 'Leadership',
            children: [
                {
                    id: '2', name: 'Manager Wang', title: 'Operations Manager', department: 'Operations', children: [
                        { id: '5', name: 'Team Lead Lin', title: 'Field Team Lead', department: 'Field Ops' },
                        { id: '6', name: 'Team Lead Zhang', title: 'Logistics Lead', department: 'Logistics' },
                    ]
                },
                {
                    id: '3', name: 'Manager Liu', title: 'Training Manager', department: 'Training', children: [
                        { id: '7', name: 'Instructor Huang', title: 'Senior Trainer', department: 'Training' },
                    ]
                },
                { id: '4', name: 'Manager Zhao', title: 'Communications Manager', department: 'Communications' },
            ],
        };
        setOrgData(mockOrg);
        setExpandedNodes(new Set(['1', '2', '3']));
        setLoading(false);
    }, []);

    const toggleNode = (id: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const renderNode = (node: OrgNode, level: number = 0) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        return (
            <div key={node.id} className="flex flex-col items-center">
                <div className={`bg-slate-800/80 rounded-lg p-4 border border-slate-700 min-w-48 text-center cursor-pointer hover:border-amber-500 transition-colors ${level === 0 ? 'border-amber-500 bg-amber-500/10' : ''}`} onClick={() => hasChildren && toggleNode(node.id)}>
                    <div className="w-12 h-12 rounded-full bg-amber-500 mx-auto mb-2 flex items-center justify-center text-black font-bold">{node.name.charAt(0)}</div>
                    <h4 className="text-white font-medium">{node.name}</h4>
                    <p className="text-amber-400 text-sm">{node.title}</p>
                    <p className="text-gray-400 text-xs">{node.department}</p>
                    {hasChildren && <span className="text-gray-400 text-xs mt-1 block">{isExpanded ? '▼' : '▶'} {node.children?.length} reports</span>}
                </div>
                {hasChildren && isExpanded && (
                    <div className="mt-4">
                        <div className="w-px h-4 bg-slate-600 mx-auto"></div>
                        <div className="flex gap-8">
                            {node.children?.map((child) => <div key={child.id}><div className="w-px h-4 bg-slate-600 mx-auto"></div>{renderNode(child, level + 1)}</div>)}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">Organization Chart</h1><p className="text-gray-400">Volunteer team structure</p></div>
                <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">Edit Structure</button>
            </div>
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8 overflow-x-auto">
                <div className="flex justify-center min-w-max">{orgData && renderNode(orgData)}</div>
            </div>
            <div className="text-center text-gray-400 text-sm">Click on a node to expand or collapse</div>
        </div>
    );
}
