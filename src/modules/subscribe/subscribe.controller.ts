import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SubscribeService } from './subscribe.service';
import { CreateSubscribeDto } from './dto/create-subscribe.dto';
import { UpdateSubscribeDto } from './dto/update-subscribe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@Controller('admin/subscribe')
export class SubscribeController {
  constructor(private readonly subscribeService: SubscribeService) {}
  
  @Post()
  create(@Body() createSubscribeDto: CreateSubscribeDto) {
    try {
      return this.subscribeService.create(createSubscribeDto);
    } catch (error) {
      return {
        success: false,
        message: error.message
      }
    }
  }
  
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
   try{
    return this.subscribeService.findAll();
  }catch (error) {
      return {
        success: false,
        message: error.message
      }
    }
  }

  
}
