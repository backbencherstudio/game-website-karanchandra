// external imports
import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
//internal imports
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from '../../common/repository/user/user.repository';
import { MailService } from '../../mail/mail.service';
import { UcodeRepository } from '../../common/repository/ucode/ucode.repository';


@Injectable()
export class AuthService extends PrismaClient {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {
    super();
  }

  async me(userId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          id: true,
          email: true,
          type: true,
          created_at: true,
          subscriptions: {
            where: {
              status: 'active',
              deleted_at: null
            },
            select: {
              stripe_subscription_id: true,
              status: true,
              plan_type: true,
              current_period_end: true
            },
            take: 1
          }
        },
      });
  
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user) {
        return {
          success: true,
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async validateUser(
    email: string,
    pass: string,
    token?: string,
  ): Promise<any> {
    const _password = pass;
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      const _isValidPassword = await UserRepository.validatePassword({
        email: email,
        password: _password,
      });
      if (_isValidPassword) {
        const { password, ...result } = user;
        return result;
      } else {
        throw new UnauthorizedException('Password not matched');
        // return {
        //   success: false,
        //   message: 'Password not matched',
        // };
      }
    } else {
      throw new UnauthorizedException('Email not found');
      // return {
      //   success: false,
      //   message: 'Email not found',
      // };
    }
  }

  async login({ email, userId }) {
    try {
      const payload = { email: email, sub: userId };

      // Get user with payment-related information
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          type: true,
          subscriptions: {
            select: {
              status: true,
              plan_type: true,
              current_period_end: true,
            },
          },
          payment_transactions: {
            select: {
              status: true,
              type: true,
            },
            orderBy: {
              created_at: 'desc',
            },
            take: 1,
          },
        },
      });

      if (!userExists) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const token = this.jwtService.sign(payload);

      return {
        success: true,
        message: 'Logged in successfully',
        authorization: {
          token: token,
          type: 'bearer',
        },
        type: userExists.type,
        subscription: userExists.subscriptions?.[0] || null,
        last_payment_status:
          userExists.payment_transactions?.[0]?.status || null,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  }

  async register({
    first_name,
    last_name,
    email,
    password,
    type,
  }: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    type?: string;
  }) {
    try {
      const userEmailExist = await UserRepository.exist({
        field: 'email',
        value: String(email),
      });

      if (userEmailExist) {
        return {
          statusCode: 401,
          message: 'Email already exist',
        };
      }

      const user = await UserRepository.createUser({
        first_name,
        last_name,
        email,
        password,
        type: type || 'user',
      });

      if (!user || !user.data) {
        return {
          success: user.success,
          message: user.message,
        };
      }

      // Generate verification token
      const token = await UcodeRepository.createVerificationToken({
        userId: user.data.id,
        email: email,
      });
      if (!token.success) {
        return {
          success: token.success,
          message: token.message,
        };
      }

      // Send verification email
      // await this.mailService.sendVerificationLink({
      //   email,
      //   name: `${first_name} ${last_name}`,
      //   token: token.data.token,
      //   type: type,
      // });

      // return {
      //   success: true,
      //   message: 'We have sent a verification link to your email',
      // };
      return {
        success: true,
        message: 'Account created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async forgotPassword(email) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.first_name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async resetPassword({ email, token, password }) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await UserRepository.changePassword({
            email: email,
            password: password,
          });

          // delete otp code
          await UcodeRepository.deleteToken({
            email: email,
            token: token,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verifyEmail({ email, token }) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              email_verified_at: new Date(Date.now()),
            },
          });

          // delete otp code
          // await UcodeRepository.deleteToken({
          //   email: email,
          //   token: token,
          // });

          return {
            success: true,
            message: 'Email verified successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      const user = await UserRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.first_name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a verification code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changePassword({ user_id, oldPassword, newPassword }) {
    try {
      const user = await UserRepository.getUserDetails(user_id);

      if (user) {
        const _isValidPassword = await UserRepository.validatePassword({
          email: user.email,
          password: oldPassword,
        });
        if (_isValidPassword) {
          await UserRepository.changePassword({
            email: user.email,
            password: newPassword,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid password',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async requestEmailChange(user_id: string, email: string) {
    try {
      const user = await UserRepository.getUserDetails(user_id);
      if (user) {
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          email: email,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: email,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changeEmail({
    user_id,
    new_email,
    token,
  }: {
    user_id: string;
    new_email: string;
    token: string;
  }) {
    try {
      const user = await UserRepository.getUserDetails(user_id);

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: new_email,
          token: token,
          forEmailChange: true,
        });

        if (existToken) {
          await UserRepository.changeEmail({
            user_id: user.id,
            new_email: new_email,
          });

          // delete otp code
          await UcodeRepository.deleteToken({
            email: new_email,
            token: token,
          });

          return {
            success: true,
            message: 'Email updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
