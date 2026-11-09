/* Autor: Vinicius Zorzetto — RA:24008052
 * Sessão validada pelo servidor; cookie HttpOnly não é lido nem salvo em localStorage.
 */
window.PI2 = (() => {
  async function request(path, options = {}) {
    if (!['http:', 'https:'].includes(location.protocol)) throw new Error('Abra http://localhost:3000 para usar o sistema.');
    let response;
    try {
      response = await fetch(`/api${path}`, {...options, credentials: 'same-origin',
        headers: {'Content-Type':'application/json',...options.headers}, signal: AbortSignal.timeout(25000)});
    } catch { throw new Error('Não foi possível conectar à API. Verifique servidor, VPN e tente novamente.'); }
    const data = await response.json().catch(()=>({mensagem:'Resposta inválida do servidor.'}));
    if (!response.ok) {
      if (response.status === 401 && !location.pathname.endsWith('/login.html')) location.replace('/html/login.html');
      throw Object.assign(new Error(data.mensagem || 'Não foi possível concluir a operação.'), {status:response.status});
    }
    return data;
  }
  function element(tag, value, className) {
    const node = document.createElement(tag);
    if (value != null) node.textContent = String(value);
    if (className) node.className = className;
    return node;
  }
  function message(node, text, error = true) {
    node.textContent = text;
    node.hidden = !text;
    node.className = `form-message active ${error ? 'error' : 'success'}`;
    node.setAttribute('role', 'alert');
  }
  const date = value => value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleString('pt-BR', value.length === 10 ? {dateStyle:'short'} : {dateStyle:'short', timeStyle:'short'}) : 'Não definido';
  const ready = location.pathname.endsWith('/login.html') ? Promise.resolve(null) : request('/sessao').then(({usuario}) => {
    const nav = document.querySelector('nav, .navegacao');
    if (nav) nav.append(element('span', `${usuario.nome} · ${usuario.perfil}`, 'session-user'));
    document.querySelectorAll('a').forEach(link => {
      if (link.textContent.trim() !== 'Sair') return;
      link.href = '/html/login.html';
      link.addEventListener('click', async event => {
        event.preventDefault();
        try { await request('/logout',{method:'POST',body:'{}'}); location.replace('/html/login.html'); }
        catch(error) { alert(error.message); }
      });
    });
    return usuario;
  });
  // Evita rejeição não tratada quando uma sessão expirada redireciona a página.
  ready.catch(()=>{});
  return {request,element,message,date,ready};
})();
