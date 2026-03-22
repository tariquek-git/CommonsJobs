import { apiHandler } from '../../lib/api-handler.js';
import { extractToken, extractJti, revokeToken } from '../../lib/auth.js';

export default apiHandler(
  { methods: ['POST'], auth: 'admin', name: 'auth/admin-logout' },
  async (req, res) => {
    const token = extractToken(req as unknown as Request);
    if (token) {
      const jti = extractJti(token);
      if (jti) revokeToken(jti);
    }
    return res.status(200).json({ success: true });
  },
);
