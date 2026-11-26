/* Autor: Vinicius Zorzetto — RA:24008052
 * Login real: erros da API na tela, opção lembrar e navegação após autenticação.
 */
// elementos da tela
const form = document.getElementById('loginForm');
const feedback = document.getElementById('loginError');
const button = form.querySelector('button[type=submit]');

// formato valido de e-mail
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// funcao que mostra erro no login
function showError(text) {
  PI2.message(feedback, text);
}

// funcao que valida e-mail e senha
function validate(email, senha) {
  if (!email || !senha.trim()) return 'Preencha o e-mail e a senha.';
  if (!EMAIL_REGEX.test(email)) return 'Digite um endereço de e-mail válido.';
  if (senha.length > 256) return 'A senha deve ter até 256 caracteres.';
  return null;
}

// envio do formulario de login
form.addEventListener('submit', async event => { // FLUXO:ENTRAR 2/5 evento submit
  event.preventDefault();
  showError('');

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('password').value;
  const lembrar = document.getElementById('remember').checked;

  const erro = validate(email, senha);
  if (erro) {
    showError(erro);
    return;
  }

  // trava o botao enquanto envia
  button.disabled = true;
  button.textContent = 'Entrando…';

  try {
    await PI2.request('/login', { // FLUXO:ENTRAR 3/5 POST /api/login
      method: 'POST',
      body: JSON.stringify({ email, senha, lembrar }),
    });
    // login ok: vai para o dashboard
    location.replace('/html/dashboard.html');
  } catch (error) {
    showError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar';
  }
});

// digitar apaga a mensagem de erro
form.addEventListener('input', () => showError(''));

// link esqueci minha senha
document.getElementById('forgotPasswordLink').addEventListener('click', event => {
  event.preventDefault();
  showError('Para recuperar o acesso, entre em contato com o administrador do projeto.');
});
