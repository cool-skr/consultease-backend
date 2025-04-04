import jwt from 'jsonwebtoken';

export const checkAuth = (req, res, next) => {
    try {
        const decoded = jwt.verify(req.headers.token, 'Secret key');
        req.userData = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            message: 'Auth Failed',
        });
    }
};