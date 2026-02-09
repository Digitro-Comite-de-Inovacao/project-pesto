import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  generateReportEmailHTML,
  generateReportEmailText,
  type ReportData,
} from '@/lib/email/reportTemplate';

const resend = new Resend(process.env.RESEND_API_KEY);

const RECIPIENT_EMAIL = 'ncs@digitro.com';
const SENDER_EMAIL = 'Mulher Amiga <noreply@inovacao.digitro.com>';

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    emailId: string;
  };
}

/**
 * Sanitizes a string value, returning undefined for null, "null", empty, or whitespace-only values
 */
function sanitizeString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null') return undefined;
  return trimmed;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();

    // Sanitize and validate victim name (required)
    const victimName = sanitizeString(body.victimName);
    if (!victimName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Campo obrigatório não informado: victimName',
        },
        { status: 400 }
      );
    }

    // Build report data with proper sanitization
    const reportData: ReportData = {
      victimName,
      aggressorName: sanitizeString(body.aggressorName),
      location: sanitizeString(body.location),
      locationDetails: sanitizeString(body.locationDetails),
      isImmediate: Boolean(body.isImmediate),
      hasWeapon: Boolean(body.hasWeapon),
      hasFirearm: Boolean(body.hasFirearm),
      isIntoxicated: Boolean(body.isIntoxicated),
      hasMinors: Boolean(body.hasMinors),
      hasInjuries: Boolean(body.hasInjuries),
      isRecurring: Boolean(body.isRecurring),
      hasRestrainingOrder: Boolean(body.hasRestrainingOrder),
      additionalInfo: sanitizeString(body.additionalInfo),
      reporterPhone: sanitizeString(body.reporterPhone),
      timestamp: sanitizeString(body.timestamp) || new Date().toISOString(),
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
