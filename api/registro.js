/**
 * /api/registro — Registro de TikTok News For Creators → Brevo
 *
 * Función serverless de Vercel. Recibe el formulario de la página, crea (o actualiza)
 * el contacto en Brevo, lo agrega a la lista del evento y, si hay plantilla configurada,
 * le envía el correo de confirmación.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   BREVO_API_KEY      (obligatoria) API key de Brevo: SMTP & API → API Keys
 *   BREVO_LIST_ID      (obligatoria) ID numérico de la lista del evento
 *   BREVO_TEMPLATE_ID  (opcional)    ID de la plantilla del correo "Gracias por registrarte"
 *
 * Atributos de contacto que usa (créalos en Brevo → Contactos → Configuración → Atributos,
 * tipo Texto, con estos nombres exactos):
 *   FIRSTNAME, LASTNAME  (ya existen por defecto)
 *   WHATSAPP, TIKTOK, CUENTA_HOTMART, EVENTO
 */

const BREVO = 'https://api.brevo.com/v3';
const EVENTO = 'TikTok News For Creators · 13 oct 2026';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const { BREVO_API_KEY, BREVO_LIST_ID, BREVO_TEMPLATE_ID } = process.env;
  if (!BREVO_API_KEY || !BREVO_LIST_ID) {
    console.error('Faltan BREVO_API_KEY o BREVO_LIST_ID en las variables de entorno.');
    return res.status(500).json({ error: 'El registro no está disponible en este momento. Inténtelo más tarde.' });
  }

  // Vercel ya parsea JSON, pero aceptamos texto por si acaso
  let d = req.body || {};
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = {}; } }

  // Honeypot anti-spam: los bots llenan el campo oculto "empresa"
  if (d.empresa) return res.status(200).json({ ok: true });

  const clean = v => String(v || '').trim().slice(0, 200);
  const nombre = clean(d.nombre);
  const email = clean(d.email).toLowerCase();
  const tiktok = clean(d.tiktok);
  const hotmart = clean(d.hotmart);
  const lada = clean(d.lada).replace(/\s*DO$/, '');          // "+1 DO" → "+1"
  const tel = clean(d.tel).replace(/\D/g, '');

  // Validación en servidor (no confiar solo en el navegador)
  if (!nombre || !tiktok || !hotmart) return res.status(400).json({ error: 'Le pedimos completar todos los campos.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Por favor, verifique su correo electrónico.' });
  if (tel.length < 7 || tel.length > 15) return res.status(400).json({ error: 'Por favor, escriba su número de WhatsApp completo.' });

  const [first, ...rest] = nombre.split(/\s+/);
  const whatsapp = `${lada}${tel}`;                          // formato E.164: +525512345678

  const full = {
    FIRSTNAME: first,
    LASTNAME: rest.join(' '),
    WHATSAPP: whatsapp,
    TIKTOK: tiktok.startsWith('@') ? tiktok : `@${tiktok}`,
    CUENTA_HOTMART: hotmart,
    EVENTO,
  };

  const headers = { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' };
  const listId = Number(BREVO_LIST_ID);

  const createContact = attributes => fetch(`${BREVO}/contacts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, attributes, listIds: [listId], updateEnabled: true }),
  });

  try {
    let r = await createContact(full);

    // Si algún atributo personalizado no existe en Brevo, guardamos al menos nombre + lista
    if (r.status === 400) {
      const body = await r.json().catch(() => ({}));
      console.error('Brevo 400:', body);
      if (/attribute/i.test(body.message || '')) {
        r = await createContact({ FIRSTNAME: full.FIRSTNAME, LASTNAME: full.LASTNAME });
      } else {
        return res.status(400).json({ error: 'No pudimos registrar ese correo. Verifíquelo e inténtelo de nuevo.' });
      }
    }

    // 201 = creado, 204 = ya existía y se actualizó (también queda en la lista)
    if (r.status !== 201 && r.status !== 204) {
      console.error('Brevo contacts error:', r.status, await r.text().catch(() => ''));
      return res.status(502).json({ error: 'No fue posible completar su registro. Inténtelo nuevamente en unos minutos.' });
    }

    // Correo de confirmación (opcional). Si falla, el registro igual queda guardado.
    if (BREVO_TEMPLATE_ID) {
      const m = await fetch(`${BREVO}/smtp/email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          templateId: Number(BREVO_TEMPLATE_ID),
          to: [{ email, name: nombre }],
          params: { NOMBRE: first },
        }),
      });
      if (!m.ok) console.error('Brevo email error:', m.status, await m.text().catch(() => ''));
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Error al conectar con Brevo:', e);
    return res.status(502).json({ error: 'No fue posible completar su registro. Inténtelo nuevamente en unos minutos.' });
  }
};
