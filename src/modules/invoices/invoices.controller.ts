import {
  Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvoicesService } from './invoices.service';
import { UpdateInvoiceDto, MarkPaidDto, ListInvoicesQueryDto } from './dto/invoices.dto';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List auth user's invoices (as worker or employer)" })
  list(
    @Request() req: { user: { id: string } },
    @Query() query: ListInvoicesQueryDto,
  ) {
    return this.invoicesService.list(req.user.id, query);
  }

  // Static route before parameterised
  // (No static sub-routes needed here — all are /:id/*)

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice detail (worker or employer on the hire)' })
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.invoicesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update invoice notes/GST (employer, DRAFT/PENDING only)' })
  update(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(id, req.user.id, dto);
  }

  @Post(':id/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send invoice to worker (employer only)' })
  send(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.invoicesService.send(id, req.user.id);
  }

  @Post(':id/mark-paid')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record payment (employer only)' })
  markPaid(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: MarkPaidDto,
  ) {
    return this.invoicesService.markPaid(id, req.user.id, dto);
  }

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get signed R2 URL for PDF download (1h expiry)' })
  getPdfUrl(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.invoicesService.getPdfUrl(id, req.user.id);
  }
}
