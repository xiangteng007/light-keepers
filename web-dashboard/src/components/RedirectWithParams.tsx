/**
 * RedirectWithParams — 帶路徑參數的 redirect（R1 IA 收斂用）
 *
 * 例：<Route path="/manuals/:id" element={<RedirectWithParams to="/knowledge/manuals/:id" />} />
 */
import { Navigate, useParams, generatePath } from 'react-router-dom';

export default function RedirectWithParams({ to }: { to: string }) {
    const params = useParams();
    return <Navigate to={generatePath(to, params)} replace />;
}
