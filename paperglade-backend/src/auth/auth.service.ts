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

    return this.prisma.user.create({
        data: { email, password: hash, name },
    });
    }

    async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid email or password');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Invalid email or password');

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload);

    return { accessToken };
    }

}
