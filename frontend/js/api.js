/* Autor: Vinicius Zorzetto — RA:24008052
 * Sessão validada pelo servidor; cookie HttpOnly não é lido nem salvo em localStorage.
 */
window.PI2 = (() => {
  const LOGIN_URL = '/html/login.html';
  const TIMEOUT_MS = 25000;
  const naTelaDeLogin = location.pathname.endsWith('/login.html');

  // Chama /api na mesma origem para enviar o cookie da sessão.
  async function request(path, options = {}) {
    if (!['http:', 'https:'].includes(location.protocol)) {
      throw new Error('Abra http://localhost:3000 para usar o sistema.');
    }

    let response;
    try {
      response = await fetch(`/api${path}`, {
        ...options,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new Error('Não foi possível conectar à API. Verifique servidor, VPN e tente novamente.');
    }

    const data = await response.json().catch(() => ({ mensagem: 'Resposta inválida do servidor.' }));

    if (!response.ok) {
      if (response.status === 401 && !naTelaDeLogin) {
        location.replace(LOGIN_URL);
      }
      const error = new Error(data.mensagem || 'Não foi possível concluir a operação.');
      error.status = response.status;
      throw error;
    }

    return data;
  }

  // Cria um elemento com texto (via textContent, sem risco de HTML injetado) e classe opcionais.
  function element(tag, value, className) {
    const node = document.createElement(tag);
    if (value != null) node.textContent = String(value);
    if (className) node.className = className;
    return node;
  }

  // Exibe uma mensagem de erro ou sucesso; texto vazio esconde o elemento.
  function message(node, text, error = true) {
    node.textContent = text;
    node.hidden = !text;
    node.className = `form-message active ${error ? 'error' : 'success'}`;
    node.setAttribute('role', 'alert');
  }

  // Formata "AAAA-MM-DD" como data e valores com horário como data e hora.
  function date(value) {
    if (!value) return 'Não definido';

    const somenteData = value.length === 10;
    const parsed = new Date(somenteData ? `${value}T12:00:00` : value);
    const formato = somenteData
      ? { dateStyle: 'short' }
      : { dateStyle: 'short', timeStyle: 'short' };

    return parsed.toLocaleString('pt-BR', formato);
  }

  // Liga os links "Sair" ao logout no servidor.
  function configurarLinksSair() {
    document.querySelectorAll('a').forEach(link => {
      if (link.textContent.trim() !== 'Sair') return;

      link.href = LOGIN_URL;
      link.addEventListener('click', async event => {
        event.preventDefault();
        try {
          await request('/logout', { method: 'POST', body: '{}' });
          location.replace(LOGIN_URL);
        } catch (error) {
          alert(error.message);
        }
      });
    });
  }

  // Telas internas consultam /sessao antes de carregar os dados.
  const ready = naTelaDeLogin
    ? Promise.resolve(null)
    : request('/sessao').then(({ usuario }) => {
        const nav = document.querySelector('nav, .navegacao');
        if (nav) {
          nav.append(element('span', `${usuario.nome} · ${usuario.perfil}`, 'session-user'));
        }
        configurarLinksSair();
        return usuario;
      });

  // Evita rejeição não tratada quando uma sessão expirada redireciona a página.
  ready.catch(() => {});

  return { request, element, message, date, ready };
})();
