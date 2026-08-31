/* =====================================================
   TELA DE LOGIN
===================================================== */

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");


/* =====================================================
   ENVIO DO FORMULÁRIO
===================================================== */

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;


    /* Validação básica */

    if (!email || !password) {

        loginError.textContent =
            "Preencha o e-mail e a senha.";

        loginError.classList.add("active");

        return;

    }


    /*

       Neste momento o projeto ainda não possui
       um sistema de autenticação conectado ao
       back-end.

       A validação real será implementada quando
       o back-end estiver integrado.

    */

    loginError.classList.remove("active");

    console.log("Tentativa de login:", {
        email: email
    });


    alert("Login recebido! A autenticação será integrada posteriormente.");

});