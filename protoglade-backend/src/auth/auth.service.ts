import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    ) {}

    async register(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
        data: { email, password: hash, name },
    });
    
    const { password: _, ...safeUser } = user;
    return safeUser;      
    }

    async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload);

    return { accessToken };
    }

    async updateProfile(userId: string, data: { name?: string; email?: string }) {
    // If email is being changed, check it's not already in use
    if (data.email) {
        const existing = await this.prisma.user.findFirst({
        where: { 
            email: data.email,
            NOT: { id: userId }
        }
        });
        if (existing) throw new ConflictException('Email already in use');
    }

    const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        },
    });

    const { password: _, ...safeUser } = user;
    return safeUser;
    }
}
