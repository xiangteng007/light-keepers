import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

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

