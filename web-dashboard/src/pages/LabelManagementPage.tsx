import { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Badge, Modal } from 'react-bootstrap';
import { QrIcon, PlusIcon, FilesIcon, ClockIcon, InfoIcon, InventoryIcon } from '../design-system/icons';
import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';

interface LabelTemplate {
    id: string;
    name: string;
    description: string;
    targetTypes: string[];
    controlLevels: string[];
    width: number;
    height: number;
    isActive: boolean;
    createdAt: string;
}

/**
 * 貼紙管理中心（幹部專用）
 * 功能：模板管理、手動產碼、查看列印歷史
 */
export default function LabelManagementPage() {
    const [activeTab, setActiveTab] = useState<'templates' | 'generate' | 'history'>('templates');
    const [templates, setTemplates] = useState<LabelTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 模板表單
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateDesc, setTemplateDesc] = useState('');
    const [templateWidth, setTemplateWidth] = useState(40);
    const [templateHeight, setTemplateHeight] = useState(30);
    const [selectedControlLevels, setSelectedControlLevels] = useState<string[]>(['controlled']);
    const [selectedTargetTypes, setSelectedTargetTypes] = useState<string[]>(['lot']);

    useEffect(() => {
        if (activeTab === 'templates') {
            fetchTemplates();
        }
    }, [activeTab]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/label-templates');
            setTemplates(response.data || []);
        } catch (err: any) {
            setError(getApiErrorMessage(err, '載入失敗'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTemplate = async () => {
        if (!templateName || templateName.length < 3) {
            alert('模板名稱至少 3 個字');
            return;
        }

        try {
            setLoading(true);
            await api.post('/label-templates', {
                name: templateName,
                description: templateDesc,
                targetTypes: selectedTargetTypes,
                controlLevels: selectedControlLevels,
                width: templateWidth,
                height: templateHeight,
                layoutConfig: {
                    // 簡化的版面配置
                    fields: [
                        { name: 'qrCode', position: { x: 5, y: 5 }, size: 20 },
                        { name: 'itemName', position: { x: 5, y: 26 }, fontSize: 8 },
                    ],
                },
            });
            alert('模板創建成功！');
            setShowTemplateModal(false);
            fetchTemplates();
            resetTemplateForm();
        } catch (err: any) {
            alert(`創建失敗：${getApiErrorMessage(err, '未知錯誤')}`);
        } finally {
            setLoading(false);
        }
    };

    const resetTemplateForm = () => {
        setTemplateName('');
        setTemplateDesc('');
        setTemplateWidth(40);
        setTemplateHeight(30);
        setSelectedControlLevels(['controlled']);
        setSelectedTargetTypes(['lot']);
    };

    const handleToggleTemplate = async (templateId: string, isActive: boolean) => {
        try {
            await api.patch(`/label-templates/${templateId}`, {
                isActive: !isActive,
            });
            alert(`模板已${!isActive ? '啟用' : '停用'}`);
            fetchTemplates();
        } catch (err: any) {
            alert(`更新失敗：${getApiErrorMessage(err, '未知錯誤')}`);
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2><QrIcon size={24} style={{ verticalAlign: '-4px' }} /> 貼紙管理中心</h2>
                    <p className="text-muted mb-0">模板管理、產碼、列印歷史（幹部專用）</p>
                </div>
                {activeTab === 'templates' && (
                    <Button
                        variant="success"
                        onClick={() => setShowTemplateModal(true)}
                    >
                        <PlusIcon size={16} style={{ verticalAlign: '-3px' }} /> 新增模板
                    </Button>
                )}
            </div>

            {/* Tab 切換 */}
            <div className="btn-group mb-3" role="group" aria-label="貼紙管理功能切換">
                <Button
                    variant={activeTab === 'templates' ? 'primary' : 'outline-primary'}
                    onClick={() => setActiveTab('templates')}
                    aria-pressed={activeTab === 'templates'}
                >
                    <FilesIcon size={16} style={{ verticalAlign: '-3px' }} /> 模板管理
                </Button>
                <Button
                    variant={activeTab === 'generate' ? 'primary' : 'outline-primary'}
                    onClick={() => setActiveTab('generate')}
                    aria-pressed={activeTab === 'generate'}
                >
                    <QrIcon size={16} style={{ verticalAlign: '-3px' }} /> 手動產碼
                </Button>
                <Button
                    variant={activeTab === 'history' ? 'primary' : 'outline-primary'}
                    onClick={() => setActiveTab('history')}
                    aria-pressed={activeTab === 'history'}
                >
                    <ClockIcon size={16} style={{ verticalAlign: '-3px' }} /> 列印歷史
                </Button>
            </div>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">載入中...</span>
                    </div>
                </div>
            ) : (
                <>
                    {activeTab === 'templates' && (
                        // 模板管理
                        templates.length === 0 ? (
                            <Alert variant="info">
                                目前沒有貼紙模板，請點擊「新增模板」創建
                            </Alert>
                        ) : (
                            <div className="row g-3">
                                {templates.map((template) => (
                                    <div key={template.id} className="col-md-6 col-lg-4">
                                        <Card className={!template.isActive ? 'border-secondary' : ''}>
                                            <Card.Header className="d-flex justify-content-between align-items-center">
                                                <span className="fw-bold">{template.name}</span>
                                                <Badge bg={template.isActive ? 'success' : 'secondary'}>
                                                    {template.isActive ? '啟用' : '停用'}
                                                </Badge>
                                            </Card.Header>
                                            <Card.Body>
                                                <p className="text-muted small">{template.description}</p>
                                                <div className="mb-2">
                                                    <small className="text-muted">尺寸</small>
                                                    <div>{template.width}mm × {template.height}mm</div>
                                                </div>
                                                <div className="mb-2">
                                                    <small className="text-muted">適用類型</small>
                                                    <div>
                                                        {template.targetTypes.map((type) => (
                                                            <Badge key={type} bg="info" className="me-1">
                                                                {type}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="mb-3">
                                                    <small className="text-muted">管控等級</small>
                                                    <div>
                                                        {template.controlLevels.map((level) => (
                                                            <Badge
                                                                key={level}
                                                                bg={
                                                                    level === 'controlled'
                                                                        ? 'warning'
                                                                        : level === 'medical'
                                                                            ? 'danger'
                                                                            : 'primary'
                                                                }
                                                                className="me-1"
                                                            >
                                                                {level}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="d-grid gap-2">
                                                    <Button
                                                        variant={template.isActive ? 'outline-secondary' : 'outline-success'}
                                                        size="sm"
                                                        onClick={() => handleToggleTemplate(template.id, template.isActive)}
                                                    >
                                                        {template.isActive ? '停用' : '啟用'}
                                                    </Button>
                                                </div>
                                            </Card.Body>
                                            <Card.Footer className="text-muted small">
                                                創建於 {new Date(template.createdAt).toLocaleDateString('zh-TW')}
                                            </Card.Footer>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {activeTab === 'generate' && (
                        <Card>
                            <Card.Body>
                                <Alert variant="info">
                                    <strong><InfoIcon size={16} style={{ verticalAlign: '-3px' }} /> 手動產碼功能</strong>
                                    <div className="mt-2">
                                        此功能通常整合在入庫流程中。若需手動產碼，請前往物資管理頁面的入庫功能。
                                    </div>
                                </Alert>
                                <div className="p-4 bg-light rounded">
                                    <h5 className="text-muted mb-3">獨立產碼功能籌備中</h5>
                                    <p className="text-muted small mb-3">預計包含以下功能：</p>
                                    <ul className="text-muted small">
                                        <li>選擇物資與批號產生 QR Code</li>
                                        <li>批次產生多個標籤</li>
                                        <li>自訂標籤版面配置</li>
                                        <li>預覽與列印整合</li>
                                    </ul>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => (window.location.href = '/resources/inventory')}
                                    >
                                        <InventoryIcon size={16} style={{ verticalAlign: '-3px' }} /> 前往物資入庫
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    )}

                    {activeTab === 'history' && (
                        <Card>
                            <Card.Body>
                                <Alert variant="info">
                                    列印歷史已整合至「敏感稽核查詢」頁面的「貼紙列印」分頁。
                                </Alert>
                                <Button
                                    variant="primary"
                                    onClick={() => (window.location.href = '/sensitive-audit')}
                                >
                                    前往敏感稽核查詢
                                </Button>
                            </Card.Body>
                        </Card>
                    )}
                </>
            )}

            {/* 新增模板彈窗 */}
            <Modal show={showTemplateModal} onHide={() => setShowTemplateModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>新增貼紙模板</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3" controlId="label-template-name">
                            <Form.Label>模板名稱 *</Form.Label>
                            <Form.Control
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="例：40x30mm 藥品標籤"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="label-template-desc">
                            <Form.Label>描述</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={templateDesc}
                                onChange={(e) => setTemplateDesc(e.target.value)}
                                placeholder="選填"
                            />
                        </Form.Group>

                        <div className="row">
                            <div className="col-6">
                                <Form.Group className="mb-3" controlId="label-template-width">
                                    <Form.Label>寬度 (mm)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={templateWidth}
                                        onChange={(e) => setTemplateWidth(parseInt(e.target.value))}
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-6">
                                <Form.Group className="mb-3" controlId="label-template-height">
                                    <Form.Label>高度 (mm)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={templateHeight}
                                        onChange={(e) => setTemplateHeight(parseInt(e.target.value))}
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label id="label-template-target-types-label">適用目標類型</Form.Label>
                            <div role="group" aria-labelledby="label-template-target-types-label">
                                {['lot', 'asset'].map((type) => (
                                    <Form.Check
                                        key={type}
                                        id={`label-template-target-type-${type}`}
                                        inline
                                        type="checkbox"
                                        label={type}
                                        checked={selectedTargetTypes.includes(type)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedTargetTypes([...selectedTargetTypes, type]);
                                            } else {
                                                setSelectedTargetTypes(selectedTargetTypes.filter((t) => t !== type));
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label id="label-template-control-levels-label">適用管控等級</Form.Label>
                            <div role="group" aria-labelledby="label-template-control-levels-label">
                                {['controlled', 'medical', 'asset'].map((level) => (
                                    <Form.Check
                                        key={level}
                                        id={`label-template-control-level-${level}`}
                                        inline
                                        type="checkbox"
                                        label={level}
                                        checked={selectedControlLevels.includes(level)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedControlLevels([...selectedControlLevels, level]);
                                            } else {
                                                setSelectedControlLevels(selectedControlLevels.filter((l) => l !== level));
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowTemplateModal(false)}>
                        取消
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCreateTemplate}
                        disabled={loading || !templateName}
                    >
                        {loading ? '創建中...' : '創建模板'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
