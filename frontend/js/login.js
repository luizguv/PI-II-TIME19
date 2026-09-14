/*
  Autor: Vinicius Zorzetto
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: Integração da tela de login com o back-end.
*/

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // Validação básica

    if (!email || !password) {

        loginError.textContent = "Preencha o e-mail e a senha.";
        loginError.classList.add("active");

        return;
    }

    loginError.classList.remove("active");

    try {

        const response = await fetch("http://localhost:3000/api/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                senha: password
            })
        });

        const data = await response.json();

        if (!response.ok) {

            loginError.textContent = data.mensagem || "Erro ao realizar login.";
            loginError.classList.add("active");

            return;
        }

        console.log("Login realizado:", data);

        alert(data.mensagem);

    } catch (error) {

        console.error("Erro ao conectar com o servidor:", error);

        loginError.textContent =
            "Não foi possível conectar ao servidor.";

        loginError.classList.add("active");
    }
});