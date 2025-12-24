import { IsEmail, IsOptional, IsString, MinLength, IsBoolean } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @IsOptional()
    displayName?: string;
}

export class LoginDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    password: string;
}

export class TokenResponseDto {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    user: {
        id: string;
        email?: string;
        phone?: string;
        displayName?: string;
        roles: string[];
        roleLevel: number;
        roleDisplayName: string;
    };
}

// 個人資料更新
export class UpdateProfileDto {
    @IsString()
    @IsOptional()
    displayName?: string;

    @IsString()
    @IsOptional()
    avatarUrl?: string;
}

// 變更密碼
export class ChangePasswordDto {
    @IsString()
    currentPassword: string;

    @IsString()
    @MinLength(6)
    newPassword: string;
}

// 通知偏好設定
export class UpdatePreferencesDto {
    @IsBoolean()
    @IsOptional()
    alertNotifications?: boolean;

    @IsBoolean()
    @IsOptional()
    taskNotifications?: boolean;

    @IsBoolean()
    @IsOptional()
    trainingNotifications?: boolean;
}


