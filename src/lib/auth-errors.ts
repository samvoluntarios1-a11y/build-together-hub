type AuthFailure = { code?: string; message?: string; status?: number };

export function authErrorMessage(error: unknown): string {
  const failure = error && typeof error === "object" ? error as AuthFailure : {};
  switch (failure.code) {
    case "invalid_credentials":
      return "El email o la contraseña no coinciden. Revisá el email exacto de tu cuenta o usá ‘Olvidé mi contraseña’.";
    case "email_not_confirmed":
      return "Primero confirmá tu cuenta desde el enlace que recibiste por email. Revisá también la carpeta de spam.";
    case "signup_disabled":
      return "La creación de cuentas está deshabilitada. Contactá al administrador.";
    case "email_provider_disabled":
      return "El acceso por email está deshabilitado. Contactá al administrador.";
    case "over_email_send_rate_limit":
      return "Se alcanzó el límite de emails de confirmación. Esperá antes de volver a intentarlo.";
    case "over_request_rate_limit":
      return "Hubo demasiados intentos seguidos. Esperá unos minutos y volvé a intentar.";
    case "weak_password":
      return "Elegí una contraseña más segura, de al menos 8 caracteres y que no uses en otros sitios.";
    case "user_already_exists":
      return "Ya existe una cuenta con ese email. Iniciá sesión o recuperá tu contraseña.";
  }
  if (failure.message?.includes("fetch") || failure.message?.includes("Network")) {
    return "No pudimos conectar con el servicio de acceso. Revisá tu conexión y volvé a intentar.";
  }
  return "No pudimos completar la solicitud. Volvé a intentar; si continúa, contactá al administrador.";
}