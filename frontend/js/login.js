
/*
  Autor: Vinicius Zorzetto
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: Validação e integração da tela de login com o back-end.
*/

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordRequirements = document.getElementById("passwordRequirements");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");

const passwordRules = [
    {
        id: "reqLength",
        validate: password => password.length >= 8,
        description: "Pelo menos 8 caracteres"
    },
    {
        id: "reqUppercase",
        validate: password => /[A-Z]/.test(password),
        description: "Pelo menos 1 letra maiúscula"
    },
    {
        id: "reqLowercase",
        validate: password => /[a-z]/.test(password),
        description: "Pelo menos 1 letra minúscula"
    },
    {
        id: "reqNumber",
        validate: password => /[0-9]/.test(password),
        description: "Pelo menos 1 número"
    },
    {
        id: "reqSpecial",
        validate: password => /[^A-Za-z0-9]/.test(password),
        description: "Pelo menos 1 caractere especial"
    }
];

function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.add("active");
}

function clearLoginError() {
    loginError.textContent = "";
    loginError.classList.remove("active");
}

function updatePasswordRequirements() {
    const password = passwordInput.value;

    passwordRequirements.style.display =
        password.length > 0 ? "block" : "none";

    passwordRules.forEach(rule => {
        const element = document.getElementById(rule.id);
        const valid = rule.validate(password);

        element.textContent =
            `${valid ? "✓" : "✗"} ${rule.description}`;

        element.classList.toggle("valid", valid);
    });
}

passwordInput.addEventListener("input", function () {
    updatePasswordRequirements();
    clearLoginError();
});

emailInput.addEventListener("input", clearLoginError);

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearLoginError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password.trim()) {
        showLoginError("Preencha o e-mail e a senha.");
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        showLoginError("Digite um endereço de e-mail válido.");
        emailInput.focus();
        return;
    }

    const failedRules = passwordRules.filter(
        rule => !rule.validate(password)
    );

    if (failedRules.length > 0) {
        updatePasswordRequirements();
        showLoginError("A senha não atende a todos os requisitos exibidos.");
        passwordInput.focus();
        return;
    }

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

        let data;

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            showLoginError(
                data.mensagem || "Erro ao realizar login."
            );
            return;
        }

        alert(data.mensagem || "Solicitação de login enviada.");
        console.log("Resposta do login:", data);

    } catch (error) {
        console.error("Erro ao conectar com o servidor:", error);

        showLoginError(
            "Não foi possível conectar ao servidor. Verifique se o backend está rodando."
        );
    }
});

forgotPasswordLink.addEventListener("click", function (event) {
    event.preventDefault();

    showLoginError(
        "A recuperação de senha ainda não está disponível."
    );
});
