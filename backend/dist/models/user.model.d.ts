import { BaseEntity } from './base.entity';
export declare class User extends BaseEntity {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    role: string;
    active: boolean;
    lastLoginAt?: Date;
}
//# sourceMappingURL=user.model.d.ts.map