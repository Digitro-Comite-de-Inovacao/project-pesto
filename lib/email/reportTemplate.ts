export interface ReportData {
  victimName: string;
  aggressorName?: string;
  location?: string;
  locationDetails?: string;
  isImmediate?: boolean;
  hasWeapon?: boolean;
  hasFirearm?: boolean;
  isIntoxicated?: boolean;
  hasMinors?: boolean;
  hasInjuries?: boolean;
  isRecurring?: boolean;
  hasRestrainingOrder?: boolean;
  additionalInfo?: string;
  reporterPhone?: string;
  timestamp?: string;
}

interface RiskIndicator {
  label: string;
  severity: 'critical' | 'warning';
}

function formatTimestamp(timestamp?: string): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRiskIndicators(data: ReportData): RiskIndicator[] {
  const indicators: RiskIndicator[] = [];

  if (data.hasFirearm) {
    indicators.push({ label: 'Possui arma de fogo', severity: 'critical' });
  }
  if (data.hasWeapon) {
    indicators.push({ label: 'Possui arma branca ou objeto perigoso', severity: 'critical' });
  }
  if (data.hasInjuries) {
    indicators.push({ label: 'Vítima com lesões visíveis', severity: 'critical' });
  }
  if (data.isIntoxicated) {
    indicators.push({ label: 'Agressor sob efeito de álcool/drogas', severity: 'critical' });
  }
  if (data.isRecurring) {
    indicators.push({ label: 'Situação recorrente', severity: 'critical' });
  }
  if (data.hasRestrainingOrder) {
    indicators.push({ label: 'Medida protetiva vigente', severity: 'critical' });
  }
  if (data.hasMinors) {
    indicators.push({ label: 'Menores presentes no local', severity: 'warning' });
  }

  return indicators;
}

export function generateReportEmailHTML(data: ReportData): string {
  const timestamp = formatTimestamp(data.timestamp);
  const riskIndicators = getRiskIndicators(data);
  const isImmediate = data.isImmediate ?? false;

  const hasLocationInfo = data.location || data.locationDetails;
  const hasAggressorInfo = data.aggressorName;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Alerta de Ocorrência - Mulher Amiga</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 24px 0;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; max-width: 600px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #17203a 0%, #1e2a4a 100%); padding: 28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="70" style="vertical-align: middle;">
                    <img src="https://project-pesto.vercel.app/logo.png" alt="Guarda Municipal" width="70" height="70" style="display: block; border-radius: 8px;" />
                  </td>
                  <td width="20"></td>
                  <td style="vertical-align: middle;">
                    <h1 style="margin: 0; padding: 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.2;">GUARDA MUNICIPAL</h1>
                    <p style="margin: 4px 0 0 0; padding: 0; font-size: 16px; color: #b8860b; font-weight: 600; letter-spacing: 0.5px;">Mulher Amiga</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Badge -->
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <!-- Alert Title -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: ${isImmediate ? '#fef2f2' : '#fffbeb'}; border: 2px solid ${isImmediate ? '#b91c1c' : '#b8860b'}; border-radius: 8px; padding: 12px 20px;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 20px; line-height: 1; vertical-align: middle; padding-right: 12px;">${isImmediate ? '🚨' : '⚠️'}</td>
                              <td style="vertical-align: middle;">
                                <span style="font-size: 18px; font-weight: 700; color: ${isImmediate ? '#b91c1c' : '#92400e'}; text-transform: uppercase; letter-spacing: 0.5px;">
                                  ALERTA DE OCORRÊNCIA
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Urgency Indicator -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                      <tr>
                        <td style="background-color: ${isImmediate ? '#b91c1c' : '#17203a'}; border-radius: 6px; padding: 10px 16px;">
                          <span style="font-size: 13px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
                            ${isImmediate ? '🔴 URGÊNCIA IMEDIATA' : '🔵 PRIORIDADE PADRÃO'}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Victim Information Section -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <!-- Section Header -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td>
                          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px;">
                            Informações da Vítima
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 8px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="border-top: 2px solid #b8860b; width: 40px;"></td>
                              <td></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Victim Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="24" style="font-size: 16px; line-height: 1; vertical-align: top; color: #64748b; padding-right: 12px;">👤</td>
                              <td>
                                <span style="font-size: 12px; color: #64748b; display: block;">Nome</span>
                                <span style="font-size: 16px; font-weight: 600; color: #1e293b;">${data.victimName}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${data.reporterPhone ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="24" style="font-size: 16px; line-height: 1; vertical-align: top; color: #64748b; padding-right: 12px;">📞</td>
                              <td>
                                <span style="font-size: 12px; color: #64748b; display: block;">Telefone de Contato</span>
                                <span style="font-size: 16px; font-weight: 600; color: #1e293b;">${data.reporterPhone}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Aggressor Information Section -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <!-- Section Header -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td>
                          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px;">
                            Informações do Agressor
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 8px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="border-top: 2px solid #b8860b; width: 40px;"></td>
                              <td></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Aggressor Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="24" style="font-size: 16px; line-height: 1; vertical-align: top; color: #64748b; padding-right: 12px;">⚠️</td>
                              <td>
                                <span style="font-size: 12px; color: #64748b; display: block;">Nome</span>
                                <span style="font-size: 16px; font-weight: ${hasAggressorInfo ? '600' : '400'}; color: ${hasAggressorInfo ? '#1e293b' : '#94a3b8'}; ${!hasAggressorInfo ? 'font-style: italic;' : ''}">${data.aggressorName || 'Não informado'}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Location Section -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <!-- Section Header -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td>
                          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px;">
                            Localização
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 8px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="border-top: 2px solid #b8860b; width: 40px;"></td>
                              <td></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Location Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="24" style="font-size: 16px; line-height: 1; vertical-align: top; color: #64748b; padding-right: 12px;">📍</td>
                              <td>
                                <span style="font-size: 12px; color: #64748b; display: block;">Endereço</span>
                                <span style="font-size: 16px; font-weight: ${hasLocationInfo ? '600' : '400'}; color: ${hasLocationInfo ? '#1e293b' : '#94a3b8'}; ${!hasLocationInfo ? 'font-style: italic;' : ''}">${data.location || 'Não informado'}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${data.locationDetails ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="24" style="font-size: 16px; line-height: 1; vertical-align: top; color: #64748b; padding-right: 12px;">🏠</td>
                              <td>
                                <span style="font-size: 12px; color: #64748b; display: block;">Complemento</span>
                                <span style="font-size: 16px; font-weight: 600; color: #1e293b;">${data.locationDetails}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Risk Indicators Section (only if there are any) -->
          ${riskIndicators.length > 0 ? `
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <!-- Section Header -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td>
                          <span style="font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 1.5px;">
                            ⚠️ Indicadores de Risco
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 8px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="border-top: 2px solid #b91c1c; width: 40px;"></td>
                              <td></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Risk Items -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${riskIndicators.map(indicator => `
                      <tr>
                        <td style="padding: 6px 0;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" style="vertical-align: middle;">
                                <table width="20" height="20" cellpadding="0" cellspacing="0" border="0" style="background-color: ${indicator.severity === 'critical' ? '#b91c1c' : '#d97706'}; border-radius: 50%;">
                                  <tr>
                                    <td align="center" valign="middle" style="font-size: 10px; color: #ffffff; line-height: 20px;">●</td>
                                  </tr>
                                </table>
                              </td>
                              <td style="font-size: 15px; font-weight: 500; color: ${indicator.severity === 'critical' ? '#991b1b' : '#92400e'};">${indicator.label}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      `).join('')}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Additional Information Section (only if provided) -->
          ${data.additionalInfo ? `
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <!-- Section Header -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td>
                          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px;">
                            Informações Adicionais
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 8px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="border-top: 2px solid #b8860b; width: 40px;"></td>
                              <td></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Content -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #ffffff; border-left: 3px solid #b8860b; border-radius: 4px; padding: 16px;">
                          <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.6;">${data.additionalInfo}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #17203a; padding: 24px 40px; margin-top: 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">
                      Registro gerado em
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #ffffff;">
                      ${timestamp}
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 16px; border-top: 1px solid #334155; padding-top: 16px;">
                      <tr>
                        <td align="center">
                          <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.6;">
                            Este é um alerta automático do sistema Mulher Amiga.<br>
                            Guarda Municipal de Florianópolis - Santa Catarina
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateReportEmailText(data: ReportData): string {
  const timestamp = formatTimestamp(data.timestamp);
  const riskIndicators = getRiskIndicators(data);
  const isImmediate = data.isImmediate ?? false;

  let text = `
GUARDA MUNICIPAL - MULHER AMIGA
===============================

${'='.repeat(40)}
${isImmediate ? '🚨 URGÊNCIA IMEDIATA' : '🔵 PRIORIDADE PADRÃO'}
${'='.repeat(40)}

ALERTA DE OCORRÊNCIA
--------------------

INFORMAÇÕES DA VÍTIMA
---------------------
Nome: ${data.victimName}
${data.reporterPhone ? `Telefone: ${data.reporterPhone}` : ''}

INFORMAÇÕES DO AGRESSOR
-----------------------
Nome: ${data.aggressorName || 'Não informado'}

LOCALIZAÇÃO
-----------
Endereço: ${data.location || 'Não informado'}
${data.locationDetails ? `Complemento: ${data.locationDetails}` : ''}
`;

  if (riskIndicators.length > 0) {
    text += `
INDICADORES DE RISCO
--------------------
${riskIndicators.map(i => `• ${i.label}`).join('\n')}
`;
  }

  if (data.additionalInfo) {
    text += `
INFORMAÇÕES ADICIONAIS
----------------------
${data.additionalInfo}
`;
  }

  text += `
---

Registro gerado em: ${timestamp}

Este é um alerta automático do sistema Mulher Amiga.
Guarda Municipal de Florianópolis - Santa Catarina
  `.trim();

  return text;
}
