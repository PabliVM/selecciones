# Seguridad de la información — RM Convocatorias

| Requisito | Estado | Dónde |
|---|---|---|
| RGPD | Parcial (código) + falta parte legal | Aviso en login, acceso por roles, datos solo tras login, cierre por inactividad |
| ISO 27001–27005 | Controles técnicos aplicados; certificación = organizacional | Ver tabla de controles |
| VPN | Infraestructura, no código | Ver “VPN” |
| Cifrado | Sí | HTTPS/TLS + HSTS (`vercel.json`); Firestore cifra en reposo (AES-256) |
| Doble factor | Sí (SMS, Firebase MFA) | `app.js` › SEGURIDAD; botón 🛡️/⚠️ en cabecera |

## Pasos obligatorios en consolas (sin esto no funciona)
1. **Reglas Firestore**: copiar `firestore.rules` en Firebase › Firestore › Reglas › Publicar.
   - Antes: crear en `userRoles` el doc `{email-en-minúsculas}` con `{email, role:"editor"}` para el primer admin.
   - Cada usuario debe tener doc en `userRoles` (lector/editor) o no verá datos.
2. **2FA**: Firebase › Authentication › Configuración › *Actualizar a Identity Platform* (plan Blaze) › *Autenticación multifactor* › activar **SMS**. Añadir el dominio de la app en *Dominios autorizados*.
3. Cuando todos tengan 2FA: `SEC_REQUIRE_2FA=true` en `app.js` y descomentar `mfa()` en `firestore.rules` (añadir `&& mfa()` a `hasRole()`).
4. **Vercel**: variable opcional `FIREBASE_WEB_API_KEY`. Mantener `ANTHROPIC_API_KEY` solo en Vercel.
5. **Google Cloud › Credenciales**: restringir la API key de Firebase por HTTP referrer al dominio de la app.

## Controles ISO 27002 aplicados
| Control | Implementación |
|---|---|
| 5.15 / 8.3 Control de acceso | Roles lector/editor; reglas Firestore en servidor |
| 8.5 Autenticación segura | Email+contraseña + 2FA SMS |
| 8.24 Criptografía | TLS, HSTS, cifrado en reposo de Google Cloud |
| 8.9 Configuración segura | Cabeceras: HSTS, nosniff, X-Frame-Options, Referrer/Permissions-Policy |
| 8.26 Seguridad de aplicaciones | API `/api/convocatoria` exige token Firebase; sin CORS abierto; errores sin detalles internos |
| 5.18 / 8.1 Sesiones | Sesión por pestaña; cierre automático a los 30 min |

## Organizacional (no es código; lo exige la auditoría)
- **RGPD**: Registro de Actividades de Tratamiento, base jurídica revisada por el DPO (datos de **menores**), EIPD/DPIA, contrato de encargado con Google (DPA) y Anthropic, plazos de conservación, procedimiento de derechos ARSOPL y de brechas (72 h). Revisar el texto del aviso con Legal.
- **ISO 27001–27005**: SGSI, alcance, política de seguridad, análisis de riesgos (27005), declaración de aplicabilidad, auditorías internas. Se certifica la organización, no la app.
- **VPN**: una web pública no “tiene” VPN. Opciones: publicar la app solo en red interna/VPN corporativa, o ponerla detrás de Cloudflare Access / Zero Trust / IAP con SSO del club. Decisión de IT del club.
- **IA**: las fotos/textos enviados al análisis salen a Anthropic (EE. UU.) → incluir en RAT y DPA.
