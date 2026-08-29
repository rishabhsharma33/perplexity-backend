import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    return this.buildAuthResponse(user);
  }

  async validateUser(email: string, password: string): Promise<UserDocument> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await user.comparePassword(password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  login(user: UserDocument) {
    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: UserDocument) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: user.toJSON(),
    };
  }
}
