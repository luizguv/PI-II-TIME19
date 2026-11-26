/* Autor: Vinicius Zorzetto — RA:24008052
 * Login real: erros da API na tela, opção lembrar e navegação após autenticação.
 */
const form = document.getElementById('loginForm');
const feedback = document.getElementById('loginError');
const button = form.querySelector('button[type=submit]');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showError(text) {
  PI2.message(feedback, text);
}

// Retorna a mensagem de erro de validação, ou null se os dados estiverem ok.
function validate(email, senha) {
  if (!email || !senha.trim()) return 'Preencha o e-mail e a senha.';
  if (!EMAIL_REGEX.test(email)) return 'Digite um endereço de e-mail válido.';
  if (senha.length > 256) return 'A senha deve ter até 256 caracteres.';
  return null;
}

// Entrar envia as credenciais; a API devolve o cookie se a validação passar.
form.addEventListener('submit', async event => {
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

  button.disabled = true;
  button.textContent = 'Entrando…';

  try {
    await PI2.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha, lembrar }),
    });
    location.replace('/html/dashboard.html');
  } catch (error) {
    showError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar';
  }
});

form.addEventListener('input', () => showError(''));

// O link orienta a procurar o administrador para recuperar o acesso.
document.getElementById('forgotPasswordLink').addEventListener('click', event => {
  event.preventDefault();
  showError('Para recuperar o acesso, entre em contato com o administrador do projeto.');
});
