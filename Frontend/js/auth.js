(function () {
  const TOKEN_KEY = 'icat_token';
  const USER_KEY = 'icat_user';

  function apiUrl(path) {
    const base = (window.API_URL || '').replace(/\/$/, '');
    return base + path;
  }

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  async function login(email, password) {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.message || 'No se pudo iniciar sesión');
    }
    saveSession(data.token, data.user);
    return data;
  }

  async function register(nombre, email, password) {
    const res = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.message || 'No se pudo registrar');
    }
    saveSession(data.token, data.user);
    return data;
  }

  async function me() {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(apiUrl('/api/auth/me'), {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) {
      clearSession();
      return null;
    }
    const data = await res.json();
    return data.user || null;
  }

  function logout() {
    clearSession();
    window.location.href = 'index.html';
  }

  window.Auth = {
    login,
    register,
    me,
    logout,
    getToken,
    getUser,
    isLoggedIn,
  };
})();