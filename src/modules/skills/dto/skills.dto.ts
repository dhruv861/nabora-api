import { IsString, IsNotEmpty, IsNumber, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddUserSkillDto {
  @ApiProperty({ example: 'clxyz123' })
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @Min(0)
  @Max(50)
  yearsExp: number = 0;
}

export class AddUserSkillsDto {
  @ApiProperty({ type: [AddUserSkillDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddUserSkillDto)
  skills: AddUserSkillDto[];
}
