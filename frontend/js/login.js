/* Autor: Vinicius Zorzetto — RA:24008052
 * Login real: erros da API na tela, opção lembrar e navegação após autenticação.
 */
const form = document.getElementById('loginForm');
const feedback = document.getElementById('loginError');
form.addEventListener('submit', async event => {
  event.preventDefault();
  PI2.message(feedback,'');
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('password').value;
  if (!email || !senha.trim()) { PI2.message(feedback,'Preencha o e-mail e a senha.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { PI2.message(feedback,'Digite um endereço de e-mail válido.'); return; }
  if (senha.length > 256) { PI2.message(feedback,'A senha deve ter até 256 caracteres.'); return; }
  const button = form.querySelector('button[type=submit]'); button.disabled = true; button.textContent = 'Entrando…';
  try {
    await PI2.request('/login',{method:'POST',body:JSON.stringify({email,senha,lembrar:document.getElementById('remember').checked})});
    location.replace('/html/dashboard.html');
  } catch(error) { PI2.message(feedback,error.message); }
  finally { button.disabled = false; button.textContent = 'Entrar'; }
});
form.addEventListener('input',()=>PI2.message(feedback,''));
document.getElementById('forgotPasswordLink').addEventListener('click',event=>{
  event.preventDefault(); PI2.message(feedback,'Para recuperar o acesso, entre em contato com o administrador do projeto.');
});
