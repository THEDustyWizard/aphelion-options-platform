"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            res.status(400).json({
                error: 'Validation Error',
                message: error.details.map(d => d.message).join(', '),
                timestamp: new Date().toISOString()
            });
            return;
        }
        req.body = value;
        next();
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.middleware.js.map