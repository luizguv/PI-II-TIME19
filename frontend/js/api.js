/* Autor: Vinicius Zorzetto — RA:24008052
 * Sessão validada pelo servidor; cookie HttpOnly não é lido nem salvo em localStorage.
 */
// objeto PI2 com funcoes compartilhadas entre as telas
window.PI2 = (() => {
  // endereco do login, tempo limite e se esta na tela de login
  const LOGIN_URL = '/html/login.html';
  const TIMEOUT_MS = 25000;
  const naTelaDeLogin = location.pathname.endsWith('/login.html');

  // funcao que chama a api com o cookie da sessao
  async function request(path, options = {}) {
    // bloqueia abrir o arquivo direto, sem servidor
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

    // le a resposta em json
    const data = await response.json().catch(() => ({ mensagem: 'Resposta inválida do servidor.' }));

    // erro: 401 volta para o login
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

  // funcao que cria um elemento html com texto e classe
  function element(tag, value, className) {
    const node = document.createElement(tag);
    if (value != null) node.textContent = String(value);
    if (className) node.className = className;
    return node;
  }

  // funcao que mostra mensagem de erro ou sucesso
  function message(node, text, error = true) {
    node.textContent = text;
    node.hidden = !text;
    node.className = `form-message active ${error ? 'error' : 'success'}`;
    node.setAttribute('role', 'alert');
  }

  // funcao que formata data para o padrao brasileiro
  function date(value) {
    if (!value) return 'Não definido';

    const somenteData = value.length === 10;
    const parsed = new Date(somenteData ? `${value}T12:00:00` : value);
    const formato = somenteData
      ? { dateStyle: 'short' }
      : { dateStyle: 'short', timeStyle: 'short' };

    return parsed.toLocaleString('pt-BR', formato);
  }

  // funcao que liga os links sair ao logout
  function configurarLinksSair() {
    document.querySelectorAll('a').forEach(link => {
      if (link.textContent.trim() !== 'Sair') return;

      link.href = LOGIN_URL;
      link.addEventListener('click', async event => { // FLUXO:SAIR 2/5 evento click
        event.preventDefault();
        try {
          await request('/logout', { method: 'POST', body: '{}' }); // FLUXO:SAIR 3/5 POST /api/logout
          location.replace(LOGIN_URL);
        } catch (error) {
          alert(error.message);
        }
      });
    });
  }

  // consulta da sessao ao abrir tela interna
  const ready = naTelaDeLogin
    ? Promise.resolve(null)
    : request('/sessao').then(({ usuario }) => { // FLUXO:SESSAO 1/4 GET /api/sessao ao abrir tela interna
        // mostra o nome do usuario no menu
        const nav = document.querySelector('nav, .navegacao');
        if (nav) {
          nav.append(element('span', `${usuario.nome} · ${usuario.perfil}`, 'session-user'));
        }
        configurarLinksSair();
        return usuario;
      });

  // ignora erro da sessao quando a pagina ja foi redirecionada
  ready.catch(() => {});

  // funcoes disponiveis no PI2
  return { request, element, message, date, ready };
})();
