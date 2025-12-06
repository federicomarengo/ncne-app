import { DatosEmailCupon } from '@/app/types/email';
import { formatearMonto, formatearFecha, obtenerNombreMes } from '@/app/utils/email/enviarEmail';

/**
 * Template HTML profesional para email de cupón
 * Diseño responsive y compatible con la mayoría de clientes de email
 */
export function EmailCuponTemplate(datos: DatosEmailCupon): string {
  const { socio, cupon, items, embarcaciones, club, banco, urlPortal } = datos;

  const nombreCompleto = `${socio.nombre} ${socio.apellido}`;
  const nombreMes = obtenerNombreMes(cupon.periodo_mes);
  const fechaVencimientoFormateada = formatearFecha(cupon.fecha_vencimiento);

  // Generar filas de items del cupón
  const itemsHTML = items.map(item => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 8px; color: #374151; font-size: 14px;">${item.descripcion}</td>
      ${item.cantidad > 1 ? `<td style="padding: 10px 8px; color: #6b7280; font-size: 14px; text-align: center;">${item.cantidad}</td>` : ''}
      <td style="padding: 10px 8px; color: #111827; font-size: 14px; text-align: right; font-weight: 600;">${formatearMonto(item.subtotal)}</td>
    </tr>
  `).join('');

  // Generar lista de embarcaciones si existen
  const embarcacionesHTML = embarcaciones.length > 0 ? `
    <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin-top: 15px;">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #374151; font-size: 14px;">
        Embarcaciones registradas:
      </p>
      ${embarcaciones.map(emb => `
        <p style="margin: 5px 0; color: #6b7280; font-size: 13px;">
          • ${emb.nombre} (${emb.tipo} - ${emb.eslora_pies} pies)
        </p>
      `).join('')}
    </div>
  ` : '';

  // Link al portal con token del socio (nota: el token se debe generar en la API)
  const linkPortal = `${urlPortal}?socio=${socio.numero_socio}`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Cupón ${nombreMes} ${cupon.periodo_anio}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Contenedor principal -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 0; padding: 20px 0; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 0;">
        
        <!-- Card del email -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0066cc 0%, #004999 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                ${club.nombre}
              </h1>
            </td>
          </tr>
          
          <!-- Saludo Personalizado -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <p style="margin: 0 0 8px 0; font-size: 16px; color: #6b7280;">Hola <strong style="color: #111827;">${nombreCompleto}</strong>,</p>
              <p style="margin: 0; font-size: 16px; color: #6b7280;">
                Te enviamos tu cupón del mes de <strong style="color: #111827;">${nombreMes} ${cupon.periodo_anio}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Resumen del Cupón -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #0066cc; border-radius: 8px; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                      Cupón N°
                    </p>
                    <p style="margin: 0; font-size: 18px; color: #111827; font-weight: 600;">
                      ${cupon.numero_cupon}
                    </p>
                  </div>
                  <div style="text-align: right;">
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                      Socio N°
                    </p>
                    <p style="margin: 0; font-size: 18px; color: #111827; font-weight: 600;">
                      ${socio.numero_socio}
                    </p>
                  </div>
                </div>
                <div style="border-top: 1px solid #bfdbfe; margin: 16px 0; padding-top: 16px;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
                    <strong>Vencimiento:</strong> ${fechaVencimientoFormateada}
                  </p>
                  <p style="margin: 0; font-size: 32px; color: #0066cc; font-weight: 700;">
                    ${formatearMonto(cupon.monto_total)}
                  </p>
                </div>
              </div>
              
              ${embarcacionesHTML}
            </td>
          </tr>
          
          <!-- Desglose de Cargos -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827; font-weight: 600;">
                Detalle de Cargos
              </h2>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 12px 8px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Concepto</th>
                    <th style="padding: 12px 8px; text-align: right; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                  <tr style="background: #f9fafb;">
                    <td style="padding: 14px 8px; font-weight: 700; color: #111827; font-size: 15px;">TOTAL</td>
                    <td style="padding: 14px 8px; text-align: right; font-weight: 700; color: #0066cc; font-size: 16px;">${formatearMonto(cupon.monto_total)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Botones de Acción -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="${linkPortal}" style="display: inline-block; background: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; transition: background 0.2s;">
                      Ver Mi Historial
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 15px 0 0 0; font-size: 13px; color: #9ca3af;">
                Accede al portal de socios para ver tus cupones y pagos
              </p>
            </td>
          </tr>
          
          <!-- Información de Pago -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #92400e; font-weight: 600;">
                  💳 Información de Pago
                </h3>
                <p style="margin: 0 0 15px 0; color: #78350f; font-size: 14px;"><strong>Para depósitos o transferencias:</strong></p>
                <div style="background: white; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
                  ${banco.nombre ? `<p style="margin: 0 0 8px 0; color: #78350f; font-size: 14px;"><strong>${banco.nombre}</strong></p>` : ''}
                  ${banco.tipo_cuenta ? `<p style="margin: 4px 0; color: #78350f; font-size: 14px;">${banco.tipo_cuenta}</p>` : ''}
                  ${banco.cbu ? `
                    <p style="margin: 12px 0 8px 0; color: #78350f; font-size: 14px;"><strong>CBU:</strong></p>
                    <div style="background: #f9fafb; border-radius: 6px; padding: 12px; font-family: 'Courier New', monospace; font-size: 18px; color: #111827; font-weight: 600; letter-spacing: 2px; text-align: center; border: 1px solid #e5e7eb;">
                      ${banco.cbu}
                    </div>
                  ` : ''}
                  ${banco.titular ? `<p style="margin: 12px 0 4px 0; color: #78350f; font-size: 14px;"><strong>NOMBRE:</strong> ${banco.titular}</p>` : ''}
                </div>
                ${banco.alias ? `
                  <p style="margin: 12px 0 8px 0; color: #78350f; font-size: 14px;">
                    <strong>Alias:</strong> <span style="font-family: 'Courier New', monospace; font-size: 15px; background: white; padding: 6px 12px; border-radius: 4px;">${banco.alias}</span>
                  </p>
                ` : ''}
              </div>
            </td>
          </tr>
          
          <!-- Instrucciones sobre Comprobantes -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #991b1b; font-weight: 600;">
                  ⚠️ IMPORTANTE: Envío de Comprobantes
                </h3>
                <p style="margin: 0 0 12px 0; color: #7f1d1d; font-size: 15px; font-weight: 600; line-height: 1.5;">
                  Es <strong>IMPRESCINDIBLE</strong>, para que se acredite el pago, que envíen el comprobante del mismo:
                </p>
                <div style="background: white; border-radius: 6px; padding: 16px; margin: 12px 0;">
                  ${club.telefono ? (() => {
                    // Normalizar teléfono para WhatsApp (remover caracteres no numéricos y agregar prefijo 54 si no lo tiene)
                    const numeros = club.telefono.replace(/\D/g, '');
                    let telefonoWhatsApp = numeros;
                    if (!numeros.startsWith('54')) {
                      if (numeros.startsWith('0')) {
                        telefonoWhatsApp = '54' + numeros.substring(1);
                      } else if (numeros.length === 9 || numeros.length === 10) {
                        telefonoWhatsApp = '54' + numeros;
                      } else if (numeros.length === 11 && numeros.startsWith('0')) {
                        telefonoWhatsApp = '54' + numeros.substring(1);
                      }
                    }
                    // Formatear teléfono para mostrar
                    let telefonoFormateado = club.telefono;
                    if (numeros.length === 10) {
                      telefonoFormateado = numeros.substring(0, 3) + '-' + numeros.substring(3);
                    } else if (numeros.length === 9) {
                      telefonoFormateado = numeros.substring(0, 4) + '-' + numeros.substring(4);
                    }
                    return `
                      <p style="margin: 0 0 8px 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
                        📱 <strong>Vía WhatsApp:</strong> <a href="https://wa.me/${telefonoWhatsApp}" style="color: #0066cc; text-decoration: none; font-weight: 600;">${telefonoFormateado}</a>
                      </p>
                    `;
                  })() : ''}
                  ${club.email ? `
                    <p style="margin: ${club.telefono ? '8px' : '0'} 0 0 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
                      ✉️ <strong>Por email:</strong> <a href="mailto:${club.email}" style="color: #0066cc; text-decoration: none; font-weight: 600;">${club.email}</a>
                    </p>
                  ` : ''}
                </div>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 16px 0;">
                  <p style="margin: 0 0 8px 0; color: #78350f; font-size: 14px; font-weight: 600;">
                    ✅ CUANDO ES NECESARIO enviar comprobante:
                  </p>
                  <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.5;">
                    Cuando son cuentas de terceros o empresas y no se puede identificar al socio
                  </p>
                </div>
                <div style="background: #d1fae5; border-left: 4px solid #10b981; border-radius: 6px; padding: 12px; margin: 12px 0 0 0;">
                  <p style="margin: 0 0 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">
                    ❌ NO ES NECESARIO cuando:
                  </p>
                  <p style="margin: 0; color: #065f46; font-size: 13px; line-height: 1.5;">
                    Cuando son cuentas personales a nombre del socio
                  </p>
                </div>
                <p style="margin: 16px 0 0 0; color: #7f1d1d; font-size: 13px; line-height: 1.5; font-style: italic;">
                  <strong>Nota:</strong> Ya hay varios casos de transferencias de <strong>MONTOS IMPORTANTES</strong> sin poder acreditar al Socio correspondiente.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Instrucciones Generales -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background: #f3f4f6; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #111827; font-weight: 600;">
                  ℹ️ Otras Informaciones
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                  <li style="margin-bottom: 8px;">Accede al portal de socios para ver tus cupones y pagos históricos</li>
                  <li>Ante cualquier consulta, no dudes en contactarnos</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Firma de Tesorería -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: right;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Atte.<br>
                <strong style="color: #111827;">Tesorería</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #1f2937; color: white; padding: 30px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${club.nombre}</p>
              ${club.direccion ? `<p style="margin: 8px 0; font-size: 13px; color: #d1d5db;">${club.direccion}</p>` : ''}
              <div style="margin: 16px 0 8px 0;">
                ${club.telefono ? `<span style="color: #d1d5db; font-size: 13px; margin: 0 12px;">📞 ${club.telefono}</span>` : ''}
                ${club.email ? `<span style="color: #d1d5db; font-size: 13px; margin: 0 12px;">✉️ ${club.email}</span>` : ''}
              </div>
              ${club.web ? `
                <p style="margin: 12px 0 0 0;">
                  <a href="${club.web}" style="color: #fbbf24; text-decoration: none; font-size: 13px; font-weight: 500;">
                    Visitar sitio web →
                  </a>
                </p>
              ` : ''}
              <p style="margin: 20px 0 0 0; font-size: 11px; color: #9ca3af; line-height: 1.4;">
                Este es un email automático. Por favor no respondas a este mensaje.<br>
                Para consultas, utiliza los medios de contacto indicados arriba.
              </p>
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

