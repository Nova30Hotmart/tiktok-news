# TikTok News For Creators · Registro con Brevo

```
tiktok-news/
├── index.html          ← la página (el formulario envía a /api/registro)
├── api/
│   └── registro.js     ← función de Vercel que guarda el registro en Brevo
└── email-gracias-presencial.html  ← plantilla del correo de confirmación
```

## 1. En Brevo

1. **API key:** SMTP & API → API Keys → *Generate a new API key*. Cópiala (solo se muestra una vez).
2. **Lista:** Contactos → Listas → crea "TikTok News For Creators". Anota su **ID** (el número que aparece en la lista o en la URL).
3. **Atributos:** Contactos → Configuración → Atributos de contacto → crea estos, tipo **Texto**, con el nombre exacto:
   - `WHATSAPP`
   - `TIKTOK`
   - `CUENTA_HOTMART`
   - `EVENTO`

   (`FIRSTNAME` y `LASTNAME` ya existen por defecto.)
4. **Correo de confirmación (opcional):** Campañas → Plantillas → nueva plantilla → *Pega tu código* → pega `email-gracias-presencial.html`. Actívala y anota su **ID**.
   El remitente se configura en la plantilla.

## 2. En Vercel

1. Sube la carpeta completa al repo de GitHub (con la carpeta `api/` en la raíz).
2. Vercel → el proyecto → **Settings → Environment Variables**:

   | Nombre | Valor |
   |---|---|
   | `BREVO_API_KEY` | la API key del paso 1 |
   | `BREVO_LIST_ID` | el ID de la lista |
   | `BREVO_TEMPLATE_ID` | el ID de la plantilla (opcional) |

3. Haz **Redeploy** para que tome las variables.

## 3. Probar

Regístrate tú mismo en la página publicada y revisa que:
- el contacto aparezca en la lista con WhatsApp, TikTok y cuenta de Hotmart;
- te llegue el correo de confirmación (si configuraste la plantilla).

Si algo falla, los errores quedan en Vercel → el proyecto → **Logs** (buscan "Brevo").

## Notas

- Si alguien se registra dos veces con el mismo correo, Brevo actualiza sus datos en vez de duplicarlo.
- Si olvidas crear algún atributo, el registro no se pierde: se guarda con nombre, correo y lista, y el error aparece en los Logs.
- La API key vive solo en Vercel; nunca queda expuesta en la página.
- Alternativa al correo por plantilla: en Brevo → Automatizaciones, crea "Contacto agregado a la lista → enviar correo". En ese caso deja vacío `BREVO_TEMPLATE_ID` para no mandar dos correos.
