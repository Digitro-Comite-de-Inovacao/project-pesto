import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  generateReportEmailHTML,
  generateReportEmailText,
  type ReportData,
} from '@/lib/email/reportTemplate';

const resend = new Resend(process.env.RESEND_API_KEY);

const RECIPIENT_EMAIL = 'pedro.felicio@digitro.com';
const SENDER_EMAIL = 'Mulher Amiga <noreply@inovacao.digitro.com>';

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    emailId: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.victimName || typeof body.victimName !== 'string' || body.victimName.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Campo obrigatório não informado: victimName',
        },
        { status: 400 }
      );
    }

    // Build report data with proper typing
    const reportData: ReportData = {
      victimName: body.victimName.trim(),
      aggressorName: body.aggressorName?.trim() || undefined,
      location: body.location?.trim() || undefined,
      locationDetails: body.locationDetails?.trim() || undefined,
      isImmediate: Boolean(body.isImmediate),
      hasWeapon: Boolean(body.hasWeapon),
      hasFirearm: Boolean(body.hasFirearm),
      isIntoxicated: Boolean(body.isIntoxicated),
      hasMinors: Boolean(body.hasMinors),
      hasInjuries: Boolean(body.hasInjuries),
      isRecurring: Boolean(body.isRecurring),
      hasRestrainingOrder: Boolean(body.hasRestrainingOrder),
      additionalInfo: body.additionalInfo?.trim() || undefined,
      reporterPhone: body.reporterPhone?.trim() || undefined,
      timestamp: body.timestamp || new Date().toISOString(),
    };

    // Generate email content
    const htmlContent = generateReportEmailHTML(reportData);
    const textContent = generateReportEmailText(reportData);

    // Build subject line
    const urgencyPrefix = reportData.isImmediate ? '[URGENTE] ' : '';
    const subject = `${urgencyPrefix}Alerta de Ocorrência - ${reportData.victimName}`;

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: RECIPIENT_EMAIL,
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Falha ao enviar email: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Relatório enviado com sucesso',
      data: {
        emailId: data?.id || 'unknown',
      },
    });
  } catch (err) {
    console.error('Unexpected error in send-report:', err);

    const errorMessage = err instanceof Error ? err.message : 'Erro interno do servidor';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
