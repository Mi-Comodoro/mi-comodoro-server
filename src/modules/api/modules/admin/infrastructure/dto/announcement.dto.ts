import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum AnnouncementSegment {
  ALL = 'all',
  FREE = 'free',
  TRIAL = 'trial',
  PLUS = 'plus',
  PRO = 'pro',
  PARTNER = 'partner',
}

export class CreateAnnouncementDto {
  @ApiProperty({ description: 'Título del anuncio' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Cuerpo del mensaje' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ enum: AnnouncementSegment, description: 'Segmento destinatario' })
  @IsEnum(AnnouncementSegment)
  segment: AnnouncementSegment;
}

export class AnnouncementPreviewQueryDto {
  @ApiProperty({ enum: AnnouncementSegment })
  @IsEnum(AnnouncementSegment)
  segment: AnnouncementSegment;
}

export class AnnouncementResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() recipientCount: number;
}

export class AnnouncementItemDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() segment: string;
  @ApiProperty() recipientCount: number;
  @ApiProperty() sentAt: Date;
  @ApiProperty() sentBy: string;
}
