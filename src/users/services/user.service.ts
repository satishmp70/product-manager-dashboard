import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import type { IUserRepository } from '../interfaces/user-repository.interface';
import { User, Role } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await this.hashPassword(createUserDto.password);
    const user = await this.userRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
      role: createUserDto.role || Role.USER,
    });

    const { password, ...result } = user;
    return result;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findById(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const { password, ...result } = user;
    return result;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: Role;
  }) {
    const page = params.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Number(params.limit) : 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.email = {
        contains: params.search,
      };
    }
    if (params.role) {
      where.role = params.role;
    }

    const [users, total] = await Promise.all([
      this.userRepository.findAll({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.userRepository.count({ where }),
    ]);

    const usersWithoutPassword = users.map(({ password, ...user }) => user);

    return {
      success: true,
      data: usersWithoutPassword,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    // Check if user exists
    await this.findById(id);

    const updateData: any = {};
    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findByEmail(updateUserDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already in use');
      }
      updateData.email = updateUserDto.email;
    }

    if (updateUserDto.password) {
      updateData.password = await this.hashPassword(updateUserDto.password);
    }

    if (updateUserDto.role) {
      updateData.role = updateUserDto.role;
    }

    const updatedUser = await this.userRepository.update(id, updateData);
    const { password, ...result } = updatedUser;
    return result;
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    await this.findById(id);
    await this.userRepository.delete(id);
    return {
      success: true,
      message: `User with ID ${id} successfully deleted`,
    };
  }
}
